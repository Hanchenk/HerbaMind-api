import json
import os
from datetime import datetime
import numpy as np
from collections import Counter

class FeedbackService:
    """用户反馈和学习机制服务"""
    
    def __init__(self):
        """初始化反馈服务"""
        self.feedbacks = {}
        self.knowledge_base = {}
        self.user_preferences = {}
        self.try_load_data()
        
    def try_load_data(self):
        """尝试加载保存的反馈数据和知识库"""
        try:
            # 加载反馈数据
            if os.path.exists('data/feedbacks.json'):
                with open('data/feedbacks.json', 'r', encoding='utf-8') as f:
                    self.feedbacks = json.load(f)
                    
            # 加载知识库
            if os.path.exists('data/knowledge_base.json'):
                with open('data/knowledge_base.json', 'r', encoding='utf-8') as f:
                    self.knowledge_base = json.load(f)
                    
            # 加载用户偏好
            if os.path.exists('data/user_preferences.json'):
                with open('data/user_preferences.json', 'r', encoding='utf-8') as f:
                    self.user_preferences = json.load(f)
                    
        except Exception as e:
            print(f"加载反馈和知识库数据失败: {e}")
            self.feedbacks = {}
            self.knowledge_base = {}
            self.user_preferences = {}
            
    def try_save_data(self):
        """尝试保存反馈数据和知识库"""
        try:
            os.makedirs('data', exist_ok=True)
            
            # 保存反馈数据
            with open('data/feedbacks.json', 'w', encoding='utf-8') as f:
                json.dump(self.feedbacks, f, ensure_ascii=False, indent=2)
                
            # 保存知识库
            with open('data/knowledge_base.json', 'w', encoding='utf-8') as f:
                json.dump(self.knowledge_base, f, ensure_ascii=False, indent=2)
                
            # 保存用户偏好
            with open('data/user_preferences.json', 'w', encoding='utf-8') as f:
                json.dump(self.user_preferences, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"保存反馈和知识库数据失败: {e}")
    
    def add_feedback(self, user_id, conversation_id, message_id, rating, comment=None):
        """添加用户对回答的反馈"""
        feedback_id = f"fb-{int(datetime.now().timestamp())}"
        
        if str(user_id) not in self.feedbacks:
            self.feedbacks[str(user_id)] = {}
            
        feedback = {
            "id": feedback_id,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "rating": rating,  # 1-5分
            "comment": comment,
            "timestamp": datetime.now().isoformat()
        }
        
        self.feedbacks[str(user_id)][feedback_id] = feedback
        
        # 更新用户偏好
        self._update_user_preferences(user_id, conversation_id, message_id)
        
        self.try_save_data()
        return feedback
        
    def _update_user_preferences(self, user_id, conversation_id, message_id):
        """更新用户偏好"""
        if str(user_id) not in self.user_preferences:
            self.user_preferences[str(user_id)] = {
                "topics": Counter(),
                "interaction_times": [],
                "favorite_questions": []
            }
            
        # 记录交互时间
        self.user_preferences[str(user_id)]["interaction_times"].append(
            datetime.now().isoformat()
        )
        
        # 如果交互记录太多，只保留最近100条
        if len(self.user_preferences[str(user_id)]["interaction_times"]) > 100:
            self.user_preferences[str(user_id)]["interaction_times"] = \
                self.user_preferences[str(user_id)]["interaction_times"][-100:]
        
    def add_knowledge(self, topic, content, source="user_feedback"):
        """添加新知识到知识库"""
        knowledge_id = f"k-{int(datetime.now().timestamp())}"
        
        if topic not in self.knowledge_base:
            self.knowledge_base[topic] = {}
            
        knowledge = {
            "id": knowledge_id,
            "content": content,
            "source": source,
            "created_at": datetime.now().isoformat(),
            "used_count": 0
        }
        
        self.knowledge_base[topic][knowledge_id] = knowledge
        self.try_save_data()
        return knowledge
        
    def get_recommendations(self, user_id, current_topic=None, count=3):
        """获取给用户的个性化推荐"""
        recommendations = []
        
        # 如果用户不存在，返回空列表
        if str(user_id) not in self.user_preferences:
            return []
            
        user_prefs = self.user_preferences[str(user_id)]
        
        # 基于当前话题的推荐
        if current_topic and current_topic in self.knowledge_base:
            topic_knowledge = list(self.knowledge_base[current_topic].values())
            # 按使用次数排序
            topic_knowledge.sort(key=lambda x: x["used_count"], reverse=True)
            
            # 取前两个最常用的知识点
            for k in topic_knowledge[:min(2, len(topic_knowledge))]:
                recommendations.append({
                    "type": "knowledge",
                    "topic": current_topic,
                    "content": k["content"],
                    "reason": f"与您当前问题'{current_topic}'相关的热门知识点"
                })
        
        # 基于用户历史偏好的推荐
        if user_prefs["topics"]:
            # 获取用户最感兴趣的话题
            favorite_topics = user_prefs["topics"].most_common(3)
            for topic, _ in favorite_topics:
                if topic in self.knowledge_base and len(recommendations) < count:
                    # 随机选择该话题下的一个知识点
                    topic_knowledge = list(self.knowledge_base[topic].values())
                    if topic_knowledge:
                        import random
                        k = random.choice(topic_knowledge)
                        
                        # 避免重复推荐
                        if not any(r.get("content") == k["content"] for r in recommendations):
                            recommendations.append({
                                "type": "knowledge",
                                "topic": topic,
                                "content": k["content"],
                                "reason": f"基于您的兴趣'{topic}'推荐"
                            })
        
        # 如果推荐数量不足，添加一些通用推荐
        general_topics = ["客服技巧", "常见问题", "产品使用指南"]
        while len(recommendations) < count:
            for topic in general_topics:
                if topic in self.knowledge_base and len(recommendations) < count:
                    topic_knowledge = list(self.knowledge_base[topic].values())
                    if topic_knowledge:
                        import random
                        k = random.choice(topic_knowledge)
                        
                        # 避免重复推荐
                        if not any(r.get("content") == k["content"] for r in recommendations):
                            recommendations.append({
                                "type": "general",
                                "topic": topic,
                                "content": k["content"],
                                "reason": "您可能感兴趣的内容"
                            })
        
        # 确保不超过请求的数量
        return recommendations[:count]
        
    def record_topic_interest(self, user_id, topic, weight=1):
        """记录用户对某个话题的兴趣"""
        if str(user_id) not in self.user_preferences:
            self.user_preferences[str(user_id)] = {
                "topics": Counter(),
                "interaction_times": [],
                "favorite_questions": []
            }
            
        self.user_preferences[str(user_id)]["topics"][topic] += weight
        self.try_save_data()
        
    def get_feedbacks_by_conversation(self, conversation_id):
        """获取特定对话的所有反馈"""
        result = []
        for user_feedbacks in self.feedbacks.values():
            for feedback in user_feedbacks.values():
                if feedback["conversation_id"] == conversation_id:
                    result.append(feedback)
        return result
        
    def get_most_common_topics(self, count=5):
        """获取最常见的话题"""
        all_topics = Counter()
        for user_prefs in self.user_preferences.values():
            all_topics.update(user_prefs["topics"])
            
        return all_topics.most_common(count)
        
    # 初始化一些默认知识，实际应用中可以使用更专业的内容
    def initialize_default_knowledge(self):
        """初始化一些默认知识"""
        if not self.knowledge_base:
            default_knowledge = {
                "客服技巧": [
                    "保持耐心和同理心是良好客服体验的基础。",
                    "使用积极的语言，即使是在处理投诉时。",
                    "提供清晰的解决步骤，而不仅仅是解决方案。"
                ],
                "常见问题": [
                    "账户无法登录通常可以通过重置密码解决。",
                    "系统响应缓慢可能是由于网络连接问题或服务器负载高。",
                    "数据同步问题通常可以通过刷新或重新登录解决。"
                ],
                "产品使用指南": [
                    "新功能使用前建议查看帮助文档以获得最佳体验。",
                    "定期备份数据可以防止意外丢失。",
                    "使用快捷键可以显著提高操作效率。"
                ]
            }
            
            # 添加默认知识到知识库
            for topic, contents in default_knowledge.items():
                for content in contents:
                    self.add_knowledge(topic, content, "default")
                    
            print("已初始化默认知识库") 