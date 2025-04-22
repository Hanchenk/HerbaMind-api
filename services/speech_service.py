import base64
import io
import os
import tempfile
import uuid
import json
from datetime import datetime
import requests

class SpeechService:
    """语音输入服务"""
    
    def __init__(self):
        """初始化语音服务"""
        self.speech_history = {}
        self.try_load_history()
        
    def try_load_history(self):
        """尝试加载语音历史"""
        try:
            if os.path.exists('data/speech_history.json'):
                with open('data/speech_history.json', 'r', encoding='utf-8') as f:
                    self.speech_history = json.load(f)
        except Exception as e:
            print(f"加载语音历史失败: {e}")
            self.speech_history = {}
            
    def try_save_history(self):
        """尝试保存语音历史"""
        try:
            os.makedirs('data', exist_ok=True)
            with open('data/speech_history.json', 'w', encoding='utf-8') as f:
                json.dump(self.speech_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存语音历史失败: {e}")
            
    def speech_to_text(self, audio_data_base64, user_id=None):
        """
        语音转文本 - 简化版本，避免依赖speech_recognition
        
        Args:
            audio_data_base64: Base64编码的音频数据
            user_id: 用户ID，可选
            
        Returns:
            转换后的文本
        """
        try:
            # 解码Base64音频数据
            audio_data = base64.b64decode(audio_data_base64)
            
            # 创建临时文件保存音频
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            temp_file.write(audio_data)
            temp_file.close()
            
            # 由于无法使用speech_recognition，返回一个提示消息
            text = "语音识别功能暂时不可用。请稍后我们会修复此问题。"
            
            # 删除临时文件
            os.unlink(temp_file.name)
            
            # 如果提供了用户ID，记录语音历史
            if user_id:
                self._record_speech(user_id, text)
                
            return {"success": True, "text": text}
            
        except Exception as e:
            print(f"语音识别错误: {e}")
            return {"success": False, "text": "处理语音时发生错误", "error": str(e)}
            
    def _record_speech(self, user_id, text):
        """记录语音历史"""
        if str(user_id) not in self.speech_history:
            self.speech_history[str(user_id)] = []
            
        self.speech_history[str(user_id)].append({
            "id": str(uuid.uuid4()),
            "text": text,
            "timestamp": datetime.now().isoformat()
        })
        
        # 如果记录过多，只保留最近50条
        if len(self.speech_history[str(user_id)]) > 50:
            self.speech_history[str(user_id)] = self.speech_history[str(user_id)][-50:]
            
        self.try_save_history()
        
    def get_user_speech_history(self, user_id, limit=10):
        """获取用户语音历史"""
        if str(user_id) not in self.speech_history:
            return []
            
        # 返回最近的记录
        return self.speech_history[str(user_id)][-limit:] 