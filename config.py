import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    # 应用密钥，用于会话安全等
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change-in-production'
    
    # DeepSeek API配置
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY') or 'sk-2969bada3d4146309b45085e708a5a9c'
    DEEPSEEK_BASE_URL = os.environ.get('DEEPSEEK_BASE_URL') or 'https://api.deepseek.com'
    DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL') or 'deepseek-chat'
    
    # 系统初始提示词 - 客服场景
    SYSTEM_PROMPT = """你是一个机器人客服，请遵循以下规则：
1. 始终保持礼貌和专业的态度
2. 提供简洁、准确的信息
3. 如果不确定问题的答案，请坦诚表明
4. 不要编造信息或提供虚假建议
5. 对于用户的复杂问题，提供分步骤的解答
6. 避免使用过于技术性的术语，保持语言通俗易懂
7. 在回答过程中，表现出积极的服务态度
8. 当用户问候时，以热情但不过度热情的方式回应
9. 优先解决用户的核心问题，然后再提供额外信息
10. 如果被要求提供联系方式或其他具体后续服务，引导用户联系相关部门

请记住，你的目标是高效解决用户问题并提供出色的服务体验。"""
    
    # 数据库配置（如果需要）
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    # SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 其他配置...
    DEBUG = True 