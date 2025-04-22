document.addEventListener('DOMContentLoaded', () => {
  // 元素引用
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');
  
  // 显示注册表单
  showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });
  
  // 显示登录表单
  showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
  
  // 登录逻辑
  loginButton.addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
      loginError.textContent = '请输入用户名和密码';
      loginError.classList.remove('hidden');
      return;
    }
    
    try {
      // 这里替换为实际的登录API调用
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 登录成功，保存用户信息和令牌
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // 强制刷新页面跳转到主应用页面，确保正确加载
        window.location.href = '/chat';
      } else {
        // 显示错误消息
        loginError.textContent = data.message || '登录失败，请检查用户名和密码';
        loginError.classList.remove('hidden');
      }
    } catch (error) {
      console.error('登录错误:', error);
      loginError.textContent = '网络错误，请稍后重试';
      loginError.classList.remove('hidden');
    }
  });
  
  // 注册逻辑
  registerButton.addEventListener('click', async () => {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const nickname = document.getElementById('nickname').value.trim();
    
    if (!username || !password) {
      registerError.textContent = '请输入用户名和密码';
      registerError.classList.remove('hidden');
      return;
    }
    
    try {
      // 这里替换为实际的注册API调用
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, nickname }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 注册成功，保存用户信息和令牌
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // 强制刷新页面跳转到主应用页面，确保正确加载
        window.location.href = '/chat';
      } else {
        // 显示错误消息
        registerError.textContent = data.message || '注册失败，请尝试其他用户名';
        registerError.classList.remove('hidden');
      }
    } catch (error) {
      console.error('注册错误:', error);
      registerError.textContent = '网络错误，请稍后重试';
      registerError.classList.remove('hidden');
    }
  });
  
  // 检查是否已登录
  const token = localStorage.getItem('token');
  if (token) {
    // 验证令牌有效性
    fetch('/api/verify-token', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.ok) {
        // 令牌有效，跳转到主应用页面
        window.location.href = '/chat';
      } else {
        // 令牌无效，清除存储的数据
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    })
    .catch(error => {
      console.error('验证令牌错误:', error);
    });
  }
}); 