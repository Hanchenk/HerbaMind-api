document.addEventListener('DOMContentLoaded', () => {
  // 应用状态管理
  const appState = {
    currentUser: null,
    conversations: [],
    currentConversation: null,
    isMenuOpen: false,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    currentRating: 0,
    currentFeedbackMessageId: null,
    
    // 初始化应用状态
    init() {
      // 从本地存储获取用户信息
      const userJson = localStorage.getItem('user');
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
        
        // 更新UI中的用户信息
        document.getElementById('username').textContent = this.currentUser.username;
        
        // 加载对话历史
        this.loadConversations();
        
        // 确保主界面元素正确显示
        document.getElementById('chat-area').classList.remove('hidden');
      } else {
        // 未登录，重定向到登录页面
        window.location.href = '/';
      }
    },
    
    // 加载对话历史
    async loadConversations() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.conversations = data.conversations || [];
          
          // 更新对话列表UI
          updateConversationList();
          
          // 如果有对话，默认加载第一个
          if (this.conversations.length > 0) {
            this.loadConversation(this.conversations[0].id);
          } else {
            // 如果没有对话历史，创建一个新的对话
            this.createNewConversation();
          }
        } else {
          console.error('加载对话失败:', await response.text());
          // 如果加载失败，创建一个新的对话确保页面正确显示
          this.createNewConversation();
        }
      } catch (error) {
        console.error('加载对话错误:', error);
        // 发生错误时，创建一个新的对话确保页面正确显示
        this.createNewConversation();
      }
    },
    
    // 加载特定对话
    async loadConversation(conversationId) {
      if (!conversationId) return;

      try {
        console.log('加载对话:', conversationId);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/conversations/${conversationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.currentConversation = data.conversation;
          
          // 更新UI
          if (document.getElementById('chat-title')) {
            document.getElementById('chat-title').textContent = this.currentConversation.title || 'AI助手';
          }
          
          // 清空聊天容器
          const chatContainer = document.getElementById('chat-container');
          if (chatContainer) {
            chatContainer.innerHTML = '';
            
            // 添加消息到UI
            if (this.currentConversation.messages && this.currentConversation.messages.length) {
              this.currentConversation.messages.forEach(msg => {
                // 跳过系统消息
                if (msg.role !== 'system') {
                  addMessageToUI(msg.content, msg.role);
                }
              });
            }
            
            // 滚动到底部
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
          
          // 更新对话列表UI，高亮当前对话
          updateConversationList();
        } else {
          console.error('加载对话详情失败:', await response.text());
        }
      } catch (error) {
        console.error('加载对话详情错误:', error);
      }
    },
    
    // 创建新对话
    async createNewConversation() {
      try {
        console.log('创建新对话');
        const token = localStorage.getItem('token');
        const response = await fetch('/api/conversations/new', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: '新对话'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.conversation) {
            this.currentConversation = data.conversation;
            
            // 更新UI
            if (document.getElementById('chat-title')) {
              document.getElementById('chat-title').textContent = this.currentConversation.title || '新对话';
            }
            
            // 清空聊天容器
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
              chatContainer.innerHTML = '';
              
              // 显示欢迎消息
              if (this.currentConversation.messages && this.currentConversation.messages.length) {
                this.currentConversation.messages.forEach(msg => {
                  // 跳过系统消息
                  if (msg.role !== 'system') {
                    addMessageToUI(msg.content, msg.role);
                  }
                });
              }
            }
            
            // 将新对话添加到列表
            this.conversations.unshift(this.currentConversation);
            
            // 更新对话列表UI
            updateConversationList();
            
            // 关闭侧边栏
            toggleSidebar(false);
          }
        } else {
          console.error('创建新对话失败:', await response.text());
        }
      } catch (error) {
        console.error('创建新对话错误:', error);
      }
    },
    
    // 删除对话
    async deleteConversation(conversationId) {
      if (!conversationId) return;
      
      try {
        console.log('删除对话:', conversationId);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          // 从本地对话列表中移除
          this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
          
          // 如果删除的是当前对话，切换到另一个对话或创建新对话
          if (this.currentConversation && this.currentConversation.id === conversationId) {
            if (this.conversations.length > 0) {
              this.loadConversation(this.conversations[0].id);
            } else {
              this.createNewConversation();
            }
          }
          
          // 更新对话列表UI
          updateConversationList();
        } else {
          console.error('删除对话失败:', await response.text());
          alert('删除对话失败，请稍后重试');
        }
      } catch (error) {
        console.error('删除对话错误:', error);
        alert('删除对话时发生错误');
      }
    },
    
    // 发送消息
    async sendMessage(content) {
      if (!content.trim() || !this.currentConversation) return;
      
      // 添加用户消息到UI
      addMessageToUI(content, 'user');
      
      // 显示"正在输入"指示器
      const typingId = showTypingIndicator();
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversation_id: this.currentConversation.id,
            message: content
          })
        });
        
        // 移除"正在输入"指示器
        removeTypingIndicator(typingId);
        
        if (response.ok) {
          const data = await response.json();
          
          // 添加AI回复到UI
          const messageId = addMessageToUI(data.response, 'assistant', true);
          
          // 更新当前对话的消息列表
          if (!this.currentConversation.messages) {
            this.currentConversation.messages = [];
          }
          
          // 添加用户消息和AI回复到对话历史
          this.currentConversation.messages.push(
            { role: 'user', content: content, timestamp: new Date().toISOString() },
            { role: 'assistant', content: data.response, timestamp: new Date().toISOString(), id: messageId }
          );
          
          // 更新标题和时间戳
          if (data.title) {
            this.currentConversation.title = data.title;
          }
          this.currentConversation.timestamp = new Date().toISOString();
          
          // 更新标题显示
          if (document.getElementById('chat-title')) {
            document.getElementById('chat-title').textContent = this.currentConversation.title || 'AI助手';
          }
          
          // 更新对话列表UI
          updateConversationList();
          
          // 显示推荐内容
          if (data.recommendations && data.recommendations.length > 0) {
            this.showRecommendations(data.recommendations);
          }
        } else {
          // 显示错误消息，但不在UI中显示
          const errorData = await response.json();
          console.error('发送消息失败:', errorData);
        }
      } catch (error) {
        // 只在控制台记录错误，不在UI中显示
        console.error('发送消息错误:', error);
        // 移除"正在输入"指示器，确保在发生错误时也能移除
        removeTypingIndicator(typingId);
      }
    },
    
    // 开始语音输入
    startRecording() {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持语音输入，请使用现代浏览器');
        return;
      }
      
      this.audioChunks = [];
      this.isRecording = true;
      
      // 显示录音UI
      document.getElementById('voice-modal').classList.remove('hidden');
      document.getElementById('start-recording').classList.add('hidden');
      document.getElementById('stop-recording').classList.remove('hidden');
      document.getElementById('voice-status').textContent = '正在录音...';
      
      // 获取麦克风权限并开始录制
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const options = { mimeType: 'audio/webm' };
          this.mediaRecorder = new MediaRecorder(stream, options);
          
          this.mediaRecorder.addEventListener('dataavailable', e => {
            if (e.data.size > 0) this.audioChunks.push(e.data);
          });
          
          this.mediaRecorder.addEventListener('stop', () => {
            // 在UI中隐藏录音状态
            document.getElementById('voice-status').textContent = '录音完成，正在处理...';
            
            // 处理录音数据
            this.processRecordedAudio();
            
            // 停止所有音轨
            stream.getTracks().forEach(track => track.stop());
          });
          
          // 开始录制
          this.mediaRecorder.start();
        })
        .catch(error => {
          console.error('获取麦克风失败:', error);
          alert('无法访问麦克风，请检查权限设置');
          this.isRecording = false;
          document.getElementById('voice-modal').classList.add('hidden');
        });
    },
    
    // 停止语音输入
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
      }
    },
    
    // 处理录音数据
    async processRecordedAudio() {
      try {
        if (this.audioChunks.length === 0) {
          document.getElementById('voice-status').textContent = '未检测到语音';
          setTimeout(() => {
            document.getElementById('voice-modal').classList.add('hidden');
            document.getElementById('start-recording').classList.remove('hidden');
            document.getElementById('stop-recording').classList.add('hidden');
          }, 1500);
          return;
        }
        
        // 合并音频块并转换为base64
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1]; // 移除 data:audio/webm;base64, 前缀
          
          // 发送到服务器进行识别
          const token = localStorage.getItem('token');
          const response = await fetch('/api/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              audio: base64Audio
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.text) {
              // 将识别结果填入输入框
              document.getElementById('message-input').textContent = data.text;
              updateCharCounter();
              
              // 关闭语音模态框
              document.getElementById('voice-modal').classList.add('hidden');
              document.getElementById('start-recording').classList.remove('hidden');
              document.getElementById('stop-recording').classList.add('hidden');
              
              // 如果识别成功，可以自动发送
              // this.sendMessage(data.text);
            } else {
              document.getElementById('voice-status').textContent = data.text || '语音识别失败';
              setTimeout(() => {
                document.getElementById('voice-modal').classList.add('hidden');
                document.getElementById('start-recording').classList.remove('hidden');
                document.getElementById('stop-recording').classList.add('hidden');
              }, 2000);
            }
          } else {
            document.getElementById('voice-status').textContent = '语音识别服务错误';
            setTimeout(() => {
              document.getElementById('voice-modal').classList.add('hidden');
              document.getElementById('start-recording').classList.remove('hidden');
              document.getElementById('stop-recording').classList.add('hidden');
            }, 2000);
          }
        };
        
        reader.readAsDataURL(audioBlob);
      } catch (error) {
        console.error('处理录音错误:', error);
        document.getElementById('voice-status').textContent = '处理录音时出错';
        setTimeout(() => {
          document.getElementById('voice-modal').classList.add('hidden');
          document.getElementById('start-recording').classList.remove('hidden');
          document.getElementById('stop-recording').classList.add('hidden');
        }, 2000);
      }
    },
    
    // 显示反馈模态框
    showFeedbackModal(messageId) {
      this.currentFeedbackMessageId = messageId;
      this.currentRating = 0;
      
      // 重置星级
      document.querySelectorAll('.rating-star').forEach(star => {
        star.classList.remove('text-yellow-400');
        star.classList.add('text-gray-300');
      });
      
      // 清空评论
      document.getElementById('feedback-comment').value = '';
      
      // 显示模态框
      document.getElementById('feedback-modal').classList.remove('hidden');
    },
    
    // 设置评分
    setRating(rating) {
      this.currentRating = rating;
      
      // 更新星级显示
      document.querySelectorAll('.rating-star').forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
          star.classList.remove('text-gray-300');
          star.classList.add('text-yellow-400');
        } else {
          star.classList.remove('text-yellow-400');
          star.classList.add('text-gray-300');
        }
      });
    },
    
    // 提交反馈
    async submitFeedback() {
      if (!this.currentRating || !this.currentFeedbackMessageId) {
        alert('请先给出评分');
        return;
      }
      
      try {
        const comment = document.getElementById('feedback-comment').value;
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversation_id: this.currentConversation.id,
            message_id: this.currentFeedbackMessageId,
            rating: this.currentRating,
            comment: comment
          })
        });
        
        if (response.ok) {
          // 关闭模态框
          document.getElementById('feedback-modal').classList.add('hidden');
          
          // 在消息上显示评分
          const messageDiv = document.getElementById(this.currentFeedbackMessageId);
          if (messageDiv) {
            const ratingDiv = document.createElement('div');
            ratingDiv.className = 'text-xs text-yellow-500 mt-1';
            ratingDiv.innerHTML = '您的评分: ' + '★'.repeat(this.currentRating) + '☆'.repeat(5 - this.currentRating);
            
            // 在消息内容后添加评分
            const contentDiv = messageDiv.querySelector('div:nth-child(2)');
            contentDiv.appendChild(ratingDiv);
          }
          
          // 重置状态
          this.currentFeedbackMessageId = null;
          this.currentRating = 0;
        } else {
          alert('提交反馈失败，请稍后重试');
        }
      } catch (error) {
        console.error('提交反馈错误:', error);
        alert('提交反馈时发生错误');
      }
    },
    
    // 显示推荐内容
    showRecommendations(recommendations) {
      if (!recommendations || recommendations.length === 0) return;
      
      const recommendationsContainer = document.getElementById('recommendations-container');
      const recommendationsList = document.getElementById('recommendations-list');
      
      // 清空现有推荐
      recommendationsList.innerHTML = '';
      
      // 添加新推荐
      recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'flex-shrink-0 w-64 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600';
        
        card.innerHTML = `
          <div class="text-xs font-medium text-primary dark:text-primary/90 mb-1">${rec.topic}</div>
          <div class="text-sm mb-1">${rec.content}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${rec.reason}</div>
        `;
        
        // 点击推荐卡片可以将内容填入输入框
        card.addEventListener('click', () => {
          document.getElementById('message-input').textContent = rec.content;
          updateCharCounter();
          
          // 隐藏推荐
          recommendationsContainer.classList.add('hidden');
        });
        
        recommendationsList.appendChild(card);
      });
      
      // 显示推荐容器
      recommendationsContainer.classList.remove('hidden');
    },
    
    // 退出登录
    logout() {
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 重定向到登录页面
      window.location.href = '/';
    }
  };
  
  // DOM元素
  const menuButton = document.getElementById('menu-button');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const closeSidebarBtn = document.getElementById('close-sidebar');
  const chatContainer = document.getElementById('chat-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const newChatButton = document.getElementById('new-chat-button');
  const logoutButton = document.getElementById('logout-button');
  const voiceInputButton = document.getElementById('voice-input-button');
  const voiceModal = document.getElementById('voice-modal');
  const startRecordingBtn = document.getElementById('start-recording');
  const stopRecordingBtn = document.getElementById('stop-recording');
  const cancelVoiceBtn = document.getElementById('cancel-voice');
  const voiceStatus = document.getElementById('voice-status');
  const feedbackModal = document.getElementById('feedback-modal');
  const submitFeedbackBtn = document.getElementById('submit-feedback');
  const cancelFeedbackBtn = document.getElementById('cancel-feedback');
  const ratingStars = document.querySelectorAll('.rating-star');
  const recommendationsContainer = document.getElementById('recommendations-container');
  const closeRecommendationsBtn = document.getElementById('close-recommendations');
  
  // 将消息添加到UI
  function addMessageToUI(content, role, withFeedback = false) {
    // 生成唯一消息ID
    const messageId = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `flex message-anim mb-4 ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    if (window.innerWidth >= 1024) {
      messageDiv.classList.add('desktop-message');
      if (role === 'user') {
        messageDiv.classList.add('user-message');
      } else {
        messageDiv.classList.add('ai-message');
      }
    }
    
    // 消息内容HTML
    let bubbleClass, avatarSvg;
    
    if (role === 'user') {
      bubbleClass = 'bg-chat-green text-gray-800';
      avatarSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      `;
    } else {
      bubbleClass = 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      avatarSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      `;
    }
    
    messageDiv.innerHTML = `
      <div class="flex items-end ${role === 'user' ? 'order-2 ml-2' : 'mr-2'}">
        <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
          ${avatarSvg}
        </div>
      </div>
      <div class="${bubbleClass} px-4 py-3 rounded-lg ${window.innerWidth >= 1024 ? 'message-bubble' : ''} shadow-sm max-w-[80%]">
        <div class="markdown-content">${marked.parse(content)}</div>
        ${withFeedback ? `
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-end">
            <button class="text-xs text-primary hover:text-primary/80 feedback-button" data-message-id="${messageId}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              反馈
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    // 添加消息到聊天容器
    chatContainer.appendChild(messageDiv);
    
    // 如果初始欢迎消息存在，并且这是新添加的消息，则移除欢迎消息
    const welcomeMsg = chatContainer.querySelector('.flex.justify-center.items-center.h-full');
    if (welcomeMsg && chatContainer.children.length > 1) {
      welcomeMsg.remove();
    }
    
    // 添加反馈按钮事件监听
    if (withFeedback) {
      const feedbackBtn = messageDiv.querySelector('.feedback-button');
      if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
          appState.showFeedbackModal(messageId);
        });
      }
    }
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageId;
  }
  
  // 显示"正在输入"指示器
  function showTypingIndicator() {
    const indicatorId = 'typing-' + Date.now();
    const indicatorDiv = document.createElement('div');
    indicatorDiv.id = indicatorId;
    indicatorDiv.className = 'flex justify-start message-anim mb-4';
    
    if (window.innerWidth >= 1024) {
      indicatorDiv.classList.add('desktop-message');
      indicatorDiv.classList.add('ai-message');
    }
    
    indicatorDiv.innerHTML = `
      <div class="flex items-end mr-2">
        <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg ${window.innerWidth >= 1024 ? 'message-bubble' : ''} shadow-sm">
        <div class="flex space-x-2">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    `;
    
    // 添加到聊天容器
    chatContainer.appendChild(indicatorDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return indicatorId;
  }
  
  // 移除"正在输入"指示器
  function removeTypingIndicator(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
      indicator.remove();
    }
  }
  
  // 检查是否为移动设备
  const isMobile = () => window.innerWidth < 768;
  
  // 初始化窗口大小处理并添加事件监听
  function handleWindowResize() {
    if (!isMobile()) {
      // 桌面端自动显示侧边栏
      sidebar.classList.add('translate-x-0');
      sidebar.classList.remove('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    } else {
      // 移动端默认隐藏侧边栏
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
      sidebarOverlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
    
    // 更新所有消息的样式类
    const allMessages = document.querySelectorAll('.message-anim');
    allMessages.forEach(msg => {
      if (window.innerWidth >= 1024) {
        // 添加桌面样式
        msg.classList.add('desktop-message');
        if (msg.classList.contains('justify-end')) {
          msg.classList.add('user-message');
        } else {
          msg.classList.add('ai-message');
        }
        
        // 更新消息气泡样式
        const bubbles = msg.querySelectorAll('.bg-chat-green, .bg-white, .dark\\:bg-gray-700');
        bubbles.forEach(bubble => {
          bubble.classList.add('message-bubble');
        });
      } else {
        // 移除桌面样式
        msg.classList.remove('desktop-message', 'user-message', 'ai-message');
        
        // 更新消息气泡样式
        const bubbles = msg.querySelectorAll('.bg-chat-green, .bg-white, .dark\\:bg-gray-700');
        bubbles.forEach(bubble => {
          bubble.classList.remove('message-bubble');
        });
      }
    });
  }
  
  // 初始化窗口大小处理并添加事件监听
  handleWindowResize();
  window.addEventListener('resize', handleWindowResize);
  
  // 侧边栏切换
  function toggleSidebar(show = null) {
    const sidebarVisible = sidebar.classList.contains('translate-x-0');
    const shouldShow = show !== null ? show : !sidebarVisible;
    
    if (shouldShow) {
      sidebar.classList.add('translate-x-0');
      sidebar.classList.remove('-translate-x-full');
      if (isMobile()) {
        sidebarOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    } else {
      if (isMobile()) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    }
  }
  
  // 更新对话列表UI
  function updateConversationList() {
    const historyList = document.getElementById('history-list');
    if (!historyList) {
      console.error('无法找到历史记录列表元素');
      return;
    }
    
    historyList.innerHTML = '';
    
    if (!appState.conversations || appState.conversations.length === 0) {
      historyList.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400 italic text-center p-4">暂无对话记录</div>';
      return;
    }
    
    appState.conversations.forEach(conversation => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors relative group';
      
      // 如果是当前对话，标记为激活状态
      if (appState.currentConversation && conversation.id === appState.currentConversation.id) {
        itemDiv.classList.add('bg-primary/10', 'dark:bg-primary/20');
      }
      
      // 格式化日期
      let formattedDate = '刚刚';
      if (conversation.timestamp) {
        const date = new Date(conversation.timestamp);
        formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
      }
      
      // 获取对话预览内容
      let previewContent = '无消息';
      if (conversation.last_message) {
        previewContent = conversation.last_message.content;
      } else if (conversation.messages && conversation.messages.length > 0) {
        // 查找最后一条非系统消息
        for (let i = conversation.messages.length - 1; i >= 0; i--) {
          if (conversation.messages[i].role !== 'system') {
            previewContent = conversation.messages[i].content;
            break;
          }
        }
      }
      
      // 截断预览内容
      if (previewContent && previewContent.length > 30) {
        previewContent = previewContent.substring(0, 30) + '...';
      }
      
      // 添加基本信息
      itemDiv.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1 truncate">
            <div class="font-medium text-sm">${conversation.title || '新对话'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              ${previewContent}
            </div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${formattedDate}</div>
        </div>
        
        <!-- 删除按钮 -->
        <button class="delete-conversation-btn absolute right-2 top-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                title="删除对话" data-conversation-id="${conversation.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      `;
      
      // 使用强制性点击事件监听 - 对话点击事件
      itemDiv.setAttribute('data-conversation-id', conversation.id);
      itemDiv.addEventListener('click', function(e) {
        // 如果点击的是删除按钮，不触发对话加载
        if (e.target.closest('.delete-conversation-btn')) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        const convId = this.getAttribute('data-conversation-id');
        console.log('点击历史记录:', convId);
        if (convId) {
          appState.loadConversation(convId);
          toggleSidebar(false);
        }
        return false;
      });
      
      historyList.appendChild(itemDiv);
      
      // 添加删除按钮的事件监听
      const deleteBtn = itemDiv.querySelector('.delete-conversation-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const convId = this.getAttribute('data-conversation-id');
          if (confirm('确定要删除这个对话吗？此操作不可撤销。')) {
            appState.deleteConversation(convId);
          }
          return false;
        });
      }
    });
  }
  
  // 字符计数器
  function updateCharCounter() {
    const count = messageInput.textContent.length;
    document.getElementById('char-counter').textContent = `${count}/2000`;
    
    // 如果超过2000个字符，禁止输入更多
    if (count > 2000) {
      messageInput.textContent = messageInput.textContent.substring(0, 2000);
    }
  }
  
  // 事件监听
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      console.log('点击菜单按钮');
      toggleSidebar();
    });
  }
  
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      console.log('点击关闭侧边栏按钮');
      toggleSidebar(false);
    });
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      console.log('点击侧边栏遮罩');
      toggleSidebar(false);
    });
  }
  
  if (newChatButton) {
    newChatButton.addEventListener('click', () => {
      console.log('点击新建对话按钮');
      appState.createNewConversation();
    });
  }
  
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      console.log('点击退出登录按钮');
      appState.logout();
    });
  }
  
  // 输入框事件
  if (messageInput) {
    messageInput.addEventListener('input', updateCharCounter);
    
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = messageInput.textContent.trim();
        if (content) {
          appState.sendMessage(content);
          messageInput.textContent = '';
          updateCharCounter();
        }
      }
    });
  }
  
  if (sendButton && messageInput) {
    sendButton.addEventListener('click', () => {
      const content = messageInput.textContent.trim();
      if (content) {
        appState.sendMessage(content);
        messageInput.textContent = '';
        updateCharCounter();
      }
    });
  }
  
  // 语音输入按钮事件
  if (voiceInputButton && voiceModal) {
    voiceInputButton.addEventListener('click', () => {
      voiceModal.classList.remove('hidden');
    });
  }
  
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener('click', () => {
      appState.startRecording();
    });
  }
  
  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener('click', () => {
      appState.stopRecording();
    });
  }
  
  if (cancelVoiceBtn && voiceModal) {
    cancelVoiceBtn.addEventListener('click', () => {
      // 如果正在录音，先停止
      if (appState.isRecording) {
        appState.stopRecording();
      }
      // 隐藏模态框
      voiceModal.classList.add('hidden');
      if (startRecordingBtn && stopRecordingBtn) {
        startRecordingBtn.classList.remove('hidden');
        stopRecordingBtn.classList.add('hidden');
      }
    });
  }
  
  // 评分星星事件
  if (ratingStars.length > 0) {
    ratingStars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        appState.setRating(rating);
      });
    });
  }
  
  // 反馈提交按钮事件
  if (submitFeedbackBtn) {
    submitFeedbackBtn.addEventListener('click', () => {
      appState.submitFeedback();
    });
  }
  
  // 取消反馈按钮事件
  if (cancelFeedbackBtn && feedbackModal) {
    cancelFeedbackBtn.addEventListener('click', () => {
      feedbackModal.classList.add('hidden');
    });
  }
  
  // 关闭推荐按钮事件
  if (closeRecommendationsBtn && recommendationsContainer) {
    closeRecommendationsBtn.addEventListener('click', () => {
      recommendationsContainer.classList.add('hidden');
    });
  }
  
  // 初始化应用
  console.log('初始化应用');
  appState.init();
}); 