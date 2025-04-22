import json
import os
import time
import hashlib
import secrets
from datetime import datetime, timedelta

class UserService:
    """用户管理服务"""
    
    def __init__(self):
        """初始化用户服务"""
        self.users = {}
        self.tokens = {}
        self.try_load_users()
        
    def try_load_users(self):
        """尝试加载保存的用户数据"""
        # 简单实现，可替换为数据库存储
        try:
            if os.path.exists('data/users.json'):
                with open('data/users.json', 'r', encoding='utf-8') as f:
                    self.users = json.load(f)
        except Exception as e:
            print(f"加载用户数据失败: {e}")
            # 确保是dict
            self.users = {}
            
    def try_save_users(self):
        """尝试保存用户数据"""
        try:
            os.makedirs('data', exist_ok=True)
            # 不保存密码明文和token
            safe_users = {}
            for user_id, user in self.users.items():
                safe_user = user.copy()
                if 'password' in safe_user:
                    del safe_user['password']  # 不保存密码明文
                safe_users[user_id] = safe_user
                
            with open('data/users.json', 'w', encoding='utf-8') as f:
                json.dump(safe_users, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存用户数据失败: {e}")
            
    def hash_password(self, password):
        """密码哈希"""
        return hashlib.sha256(password.encode()).hexdigest()
        
    def register(self, username, password, nickname=None):
        """注册新用户"""
        # 检查用户名是否已存在
        for user_id, user in self.users.items():
            if user.get('username') == username:
                return None, "用户名已存在"
                
        # 创建新用户
        user_id = str(int(time.time()))
        user = {
            "id": user_id,
            "username": username,
            "password_hash": self.hash_password(password),
            "nickname": nickname or username,
            "created_at": datetime.now().isoformat(),
            "avatar": None  # 可以设置为颜色或头像URL
        }
        
        self.users[user_id] = user
        self.try_save_users()
        
        # 生成token
        token = self.generate_token(user_id)
        
        # 返回不包含密码的用户信息
        safe_user = user.copy()
        del safe_user['password_hash']
        
        return safe_user, token
        
    def login(self, username, password):
        """用户登录"""
        for user_id, user in self.users.items():
            if user.get('username') == username:
                # 验证密码
                if user.get('password_hash') == self.hash_password(password):
                    # 生成token
                    token = self.generate_token(user_id)
                    
                    # 返回不包含密码的用户信息
                    safe_user = user.copy()
                    if 'password_hash' in safe_user:
                        del safe_user['password_hash']
                        
                    return safe_user, token
                    
                return None, "密码错误"
                
        return None, "用户不存在"
        
    def generate_token(self, user_id):
        """生成认证令牌"""
        token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=7)  # Token有效期7天
        
        self.tokens[token] = {
            "user_id": user_id,
            "expires_at": expires_at.isoformat()
        }
        
        return token
        
    def verify_token(self, token):
        """验证令牌并返回用户ID"""
        if token not in self.tokens:
            return None
            
        token_data = self.tokens[token]
        expires_at = datetime.fromisoformat(token_data['expires_at'])
        
        # 检查是否过期
        if datetime.now() > expires_at:
            del self.tokens[token]
            return None
            
        return token_data['user_id']
        
    def get_user(self, user_id):
        """获取用户信息"""
        user = self.users.get(str(user_id))
        if user:
            # 返回不包含密码的用户信息
            safe_user = user.copy()
            if 'password_hash' in safe_user:
                del safe_user['password_hash']
            return safe_user
        return None 