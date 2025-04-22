import time
import json
import os
from datetime import datetime
from config import Config

class ConversationService:
    """对话管理服务"""
    
    def __init__(self, config=None):
        """初始化会话服务"""
        self.config = config or Config()
        self.conversations = {}
        self.try_load_conversations()
        
    def try_load_conversations(self):
        """尝试加载保存的对话历史"""
        # 简单实现，可替换为数据库存储
        try:
            if os.path.exists('data/conversations.json'):
                with open('data/conversations.json', 'r', encoding='utf-8') as f:
                    self.conversations = json.load(f)
        except Exception as e:
            print(f"加载对话历史失败: {e}")
            # 确保是dict
            self.conversations = {}
            
    def try_save_conversations(self):
        """尝试保存对话历史"""
        try:
            os.makedirs('data', exist_ok=True)
            with open('data/conversations.json', 'w', encoding='utf-8') as f:
                json.dump(self.conversations, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存对话历史失败: {e}")
    
    def get_user_conversations(self, user_id):
        """获取用户的所有对话"""
        return self.conversations.get(str(user_id), {})
        
    def get_conversation(self, user_id, conversation_id):
        """获取特定对话"""
        user_convs = self.get_user_conversations(user_id)
        return user_convs.get(conversation_id)
        
    def create_conversation(self, user_id, title=None):
        """创建新对话"""
        conversation_id = f"conv-{int(time.time())}"
        
        if not title:
            title = f"新对话 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
        conversation = {
            "id": conversation_id,
            "title": title,
            "timestamp": datetime.now().isoformat(),
            "messages": []
        }
        
        # 确保用户ID存在
        if str(user_id) not in self.conversations:
            self.conversations[str(user_id)] = {}
            
        # 保存新对话
        self.conversations[str(user_id)][conversation_id] = conversation
        self.try_save_conversations()
        
        return conversation
        
    def add_message(self, user_id, conversation_id, role, content):
        """添加消息到对话"""
        conversation = self.get_conversation(user_id, conversation_id)
        
        if not conversation:
            return False
            
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        conversation["messages"].append(message)
        conversation["timestamp"] = datetime.now().isoformat()
        
        self.try_save_conversations()
        return True
        
    def get_messages_for_api(self, user_id, conversation_id):
        """获取适合API调用格式的消息列表"""
        conversation = self.get_conversation(user_id, conversation_id)
        
        if not conversation:
            return []
            
        # 转换为OpenAI API格式
        api_messages = []
        for msg in conversation["messages"]:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
            
        return api_messages
        
    def extract_conversation_list(self, user_id):
        """提取用户的对话列表摘要"""
        user_convs = self.get_user_conversations(user_id)
        
        conversation_list = []
        for conv_id, conv in user_convs.items():
            conv_summary = {
                "id": conv_id,
                "title": conv["title"],
                "timestamp": conv["timestamp"],
                "message_count": len(conv["messages"])
            }
            
            # 添加最后一条消息的预览
            if conv["messages"]:
                last_msg = conv["messages"][-1]
                content = last_msg["content"]
                if len(content) > 50:
                    content = content[:50] + "..."
                    
                conv_summary["last_message"] = {
                    "role": last_msg["role"],
                    "content": content,
                    "timestamp": last_msg["timestamp"]
                }
                
            conversation_list.append(conv_summary)
            
        # 按时间戳排序，最新的在前面
        conversation_list.sort(key=lambda x: x["timestamp"], reverse=True)
        return conversation_list
        
    def delete_conversation(self, user_id, conversation_id):
        """删除指定对话"""
        user_convs = self.get_user_conversations(user_id)
        
        if conversation_id in user_convs:
            # 删除对话
            del user_convs[conversation_id]
            self.try_save_conversations()
            return True
        return False 