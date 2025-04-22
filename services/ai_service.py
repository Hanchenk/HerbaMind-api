from openai import OpenAI
from config import Config
import os

class AIService:
    """DeepSeek AI服务封装类"""
    
    def __init__(self, config=None):
        """初始化AI服务"""
        self.config = config or Config()
        
        # 设置环境变量，而不是通过客户端参数传递
        os.environ["OPENAI_API_KEY"] = self.config.DEEPSEEK_API_KEY
        os.environ["OPENAI_BASE_URL"] = self.config.DEEPSEEK_BASE_URL
        
        # 简化客户端初始化，避免使用可能不兼容的参数
        self.client = OpenAI()
        
    def chat(self, messages, stream=False):
        """
        调用DeepSeek聊天API
        
        Args:
            messages: 消息历史列表
            stream: 是否使用流式输出
            
        Returns:
            聊天完成对象
        """
        # 确保第一条消息是系统提示词
        if not messages or messages[0].get('role') != 'system':
            messages.insert(0, {
                "role": "system", 
                "content": self.config.SYSTEM_PROMPT
            })
            
        try:
            response = self.client.chat.completions.create(
                model=self.config.DEEPSEEK_MODEL,
                messages=messages,
                stream=stream
            )
            return response
        except Exception as e:
            print(f"API调用错误: {e}")
            # 返回一个简单的错误响应对象
            return type('obj', (object,), {
                'choices': [
                    type('obj', (object,), {
                        'message': type('obj', (object,), {
                            'content': f"抱歉，服务暂时不可用: {str(e)}"
                        })
                    })
                ]
            })
        
    def get_response_text(self, response):
        """从API响应中提取文本内容"""
        if hasattr(response, 'choices') and len(response.choices) > 0:
            return response.choices[0].message.content
        return "抱歉，我现在无法回答这个问题。" 