from flask import render_template, request, jsonify, redirect, url_for, g
import time
from functools import wraps
from services.ai_service import AIService
from services.conversation_service import ConversationService
from services.user_service import UserService
from services.feedback_service import FeedbackService
from services.speech_service import SpeechService

# 初始化服务
ai_service = AIService()
conversation_service = ConversationService()
user_service = UserService()
feedback_service = FeedbackService()
speech_service = SpeechService()

def login_required(f):
    """验证用户登录的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': '未授权访问'}), 401
            
        token = auth_header.split(' ')[1]
        user_id = user_service.verify_token(token)
        
        if not user_id:
            return jsonify({'error': '无效或已过期的令牌'}), 401
            
        # 将用户ID设置到g对象中，供视图函数使用
        g.user_id = user_id
        g.user = user_service.get_user(user_id)
        
        return f(*args, **kwargs)
    return decorated_function

def register_routes(app):
    @app.route('/')
    def index():
        return render_template('index.html', page='login')


    @app.route('/chat')
    def chat():
        return render_template('index.html', page='chat')


    # API 路由
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.json
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'message': '请提供用户名和密码'}), 400
            
        user, token_or_error = user_service.login(username, password)
        
        if user:
            return jsonify({
                'success': True, 
                'token': token_or_error,
                'user': user
            })
        else:
            return jsonify({'success': False, 'message': token_or_error}), 401


    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.json
        username = data.get('username')
        password = data.get('password')
        nickname = data.get('nickname')

        if not username or not password:
            return jsonify({'success': False, 'message': '请提供用户名和密码'}), 400
            
        user, token_or_error = user_service.register(username, password, nickname)
        
        if user:
            # 为新用户创建初始对话
            conversation = conversation_service.create_conversation(user['id'])
            # 添加欢迎消息
            conversation_service.add_message(
                user['id'], 
                conversation['id'], 
                'assistant',
                '你好！我是AI客服助手，有什么可以帮助你的吗？'
            )
            
            return jsonify({
                'success': True, 
                'token': token_or_error,
                'user': user
            })
        else:
            return jsonify({'success': False, 'message': token_or_error}), 400


    @app.route('/api/verify-token', methods=['GET'])
    @login_required
    def verify_token():
        # 如果能执行到这里，说明令牌有效
        return jsonify({'valid': True, 'user': g.user})


    @app.route('/api/conversations', methods=['GET'])
    @login_required
    def get_conversations():
        conversations = conversation_service.extract_conversation_list(g.user_id)
        return jsonify({'conversations': conversations})
        
        
    @app.route('/api/conversations/<conversation_id>', methods=['GET'])
    @login_required
    def get_conversation(conversation_id):
        conversation = conversation_service.get_conversation(g.user_id, conversation_id)
        
        if not conversation:
            return jsonify({'error': '对话不存在'}), 404
            
        return jsonify({'conversation': conversation})
        
        
    @app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
    @login_required
    def delete_conversation(conversation_id):
        """删除指定对话"""
        success = conversation_service.delete_conversation(g.user_id, conversation_id)
        
        if success:
            return jsonify({'success': True, 'message': '对话已删除'})
        else:
            return jsonify({'error': '删除对话失败，对话可能不存在'}), 404
        
        
    @app.route('/api/conversations/new', methods=['POST'])
    @login_required
    def create_new_conversation():
        data = request.json
        title = data.get('title')
        
        conversation = conversation_service.create_conversation(g.user_id, title)
        
        # 添加欢迎消息
        conversation_service.add_message(
            g.user_id, 
            conversation['id'], 
            'assistant',
            '你好！我是AI客服助手，有什么可以帮助你的吗？'
        )
        
        return jsonify({'success': True, 'conversation': conversation})


    @app.route('/api/chat', methods=['POST'])
    @login_required
    def send_message():
        data = request.json
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        topic = data.get('topic')  # 可选参数

        if not message:
            return jsonify({'error': '消息不能为空'}), 400
            
        # 如果没有指定对话ID，创建新对话
        if not conversation_id:
            conversation = conversation_service.create_conversation(g.user_id)
            conversation_id = conversation['id']
        else:
            # 验证对话是否存在
            conversation = conversation_service.get_conversation(g.user_id, conversation_id)
            if not conversation:
                return jsonify({'error': '对话不存在'}), 404
                
        # 保存用户消息
        conversation_service.add_message(g.user_id, conversation_id, 'user', message)
        
        # 获取对话历史
        messages = conversation_service.get_messages_for_api(g.user_id, conversation_id)
        
        try:
            # 如果提供了话题，记录用户兴趣
            if topic:
                feedback_service.record_topic_interest(g.user_id, topic)
            
            # 调用AI服务
            response = ai_service.chat(messages)
            ai_response = ai_service.get_response_text(response)
            
            # 保存AI回复
            conversation_service.add_message(g.user_id, conversation_id, 'assistant', ai_response)
            
            # 如果是新对话，更新标题
            if len(messages) <= 2:  # 只有系统消息和用户第一条消息
                title = message
                if len(title) > 20:
                    title = title[:20] + "..."
                # 更新对话标题
                conversation['title'] = title
                conversation_service.try_save_conversations()
            
            # 获取个性化推荐
            recommendations = feedback_service.get_recommendations(g.user_id, current_topic=topic)
            
            return jsonify({
                'success': True,
                'conversation_id': conversation_id,
                'title': conversation['title'],
                'response': ai_response,
                'recommendations': recommendations
            })
            
        except Exception as e:
            print(f"AI服务调用错误: {e}")
            return jsonify({'error': f'AI服务调用失败: {str(e)}'}), 500
            
    
    @app.route('/api/speech', methods=['POST'])
    @login_required
    def speech_recognition():
        data = request.json
        audio_data = data.get('audio')
        
        if not audio_data:
            return jsonify({'error': '未提供音频数据'}), 400
        
        # 处理语音识别
        result = speech_service.speech_to_text(audio_data, g.user_id)
        
        return jsonify(result)
    
    
    @app.route('/api/feedback', methods=['POST'])
    @login_required
    def add_feedback():
        data = request.json
        conversation_id = data.get('conversation_id')
        message_id = data.get('message_id')
        rating = data.get('rating')
        comment = data.get('comment')
        
        if not conversation_id or not message_id or rating is None:
            return jsonify({'error': '参数不足'}), 400
        
        # 评分必须在1-5之间
        if not (1 <= rating <= 5):
            return jsonify({'error': '评分必须在1-5之间'}), 400
            
        # 添加反馈
        feedback = feedback_service.add_feedback(
            g.user_id, conversation_id, message_id, rating, comment
        )
        
        return jsonify({'success': True, 'feedback': feedback})
    
    
    @app.route('/api/recommendations', methods=['GET'])
    @login_required
    def get_recommendations():
        topic = request.args.get('topic')
        count = request.args.get('count', 3, type=int)
        
        recommendations = feedback_service.get_recommendations(g.user_id, current_topic=topic, count=count)
        
        return jsonify({'recommendations': recommendations})
    
    
    @app.route('/api/knowledge', methods=['POST'])
    @login_required
    def add_knowledge():
        data = request.json
        topic = data.get('topic')
        content = data.get('content')
        
        if not topic or not content:
            return jsonify({'error': '话题和内容不能为空'}), 400
            
        knowledge = feedback_service.add_knowledge(topic, content, f"user_{g.user_id}")
        
        return jsonify({'success': True, 'knowledge': knowledge}) 