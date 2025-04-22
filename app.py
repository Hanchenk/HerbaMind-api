from flask import Flask
from config import Config
from routes import register_routes
from services.user_service import UserService
from services.feedback_service import FeedbackService
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 注册路由
    register_routes(app)
    
    # 如果没有用户，创建默认用户
    create_default_user()
    
    # 初始化反馈服务和知识库
    initialize_feedback_service()
    
    return app

def create_default_user():
    """创建默认用户"""
    # 检查是否已经有用户数据
    if not os.path.exists('data/users.json'):
        print("创建默认用户...")
        user_service = UserService()
        # 创建默认用户
        user, token = user_service.register("admin", "password", "管理员")
        if user:
            print(f"已创建默认用户: {user['username']}")
        else:
            print(f"创建默认用户失败: {token}")

def initialize_feedback_service():
    """初始化反馈服务和知识库"""
    # 检查是否已经有知识库数据
    if not os.path.exists('data/knowledge_base.json'):
        print("初始化知识库和反馈系统...")
        feedback_service = FeedbackService()
        feedback_service.initialize_default_knowledge()

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
