nstall# AI客服聊天助手 - Flask应用

这是一个基于Flask的AI客服聊天助手应用，采用了模块化的设计结构，并集成了DeepSeek API实现智能对话功能。

## 项目结构

```
/
├── app.py                # 应用入口文件
├── config.py             # 配置文件
├── routes.py             # 路由模块
├── services/             # 服务模块
│   ├── __init__.py       # 服务包初始化
│   ├── ai_service.py     # AI服务封装
│   ├── user_service.py   # 用户管理服务
│   └── conversation_service.py  # 对话管理服务
├── static/               # 静态资源
│   └── js/               # JavaScript文件
│       ├── app.js        # 主应用JS
│       └── login.js      # 登录页面JS
├── templates/            # 模板文件
│   ├── components/       # 组件模板
│   │   ├── chat.html     # 聊天组件
│   │   ├── header.html   # 头部导航组件
│   │   └── sidebar.html  # 侧边栏组件
│   ├── index.html        # 主入口模板
│   ├── layout.html       # 基础布局模板
│   ├── login.html        # 登录页面内容
│   └── main.html         # 主应用页面内容
└── data/                 # 数据存储目录（自动创建）
```

## 依赖项

- Flask: Web框架
- OpenAI: 用于调用DeepSeek API的客户端库 
- python-dotenv: 环境变量管理

## 如何运行

1. 安装依赖项

```bash
pip install -r requirements.txt
```

2. 配置DeepSeek API密钥（可选，已内置默认密钥）

创建`.env`文件，添加以下内容：

```
DEEPSEEK_API_KEY=你的DeepSeek API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

3. 运行应用

```bash
python app.py
```

4. 在浏览器中访问 http://127.0.0.1:5000/

## 默认登录信息

首次运行时，系统会自动创建一个默认用户：

- 用户名: admin
- 密码: password

## DeepSeek API集成

本项目使用DeepSeek API实现智能对话功能，主要特点：

- 通过上下文注入与动态语义约束技术，实现定制化的客服行为
- 系统提示词定义了客服的行为规则和回答风格
- 完整的多轮对话记忆能力，保持上下文一致性
- 使用与OpenAI兼容的API格式，便于后续模型切换

## 功能特点

- 用户认证系统：注册、登录和令牌验证
- 对话管理：创建、加载和保存对话
- 实时AI响应：使用DeepSeek API生成回复
- 对话历史：本地存储用户的所有对话
- 响应式设计：适配不同屏幕尺寸
- 主题支持：自动检测系统暗/亮模式

## 自定义和扩展

您可以通过以下方式扩展和定制系统：

- **客服提示词调整**: 修改`config.py`中的`SYSTEM_PROMPT`变量
- **集成数据库**: 目前使用本地文件存储，可修改服务类以支持数据库
- **自定义UI**: 修改组件模板和CSS样式
- **添加新功能**: 在routes.py中添加新的路由和API接口

## 注意事项

- 这是一个演示应用，未实现所有生产级特性，如密码加密存储等
- 在生产环境中使用前，请添加适当的安全措施
- SECRET_KEY和API密钥应该在生产环境中更改为复杂的随机值
- 数据存储使用简单的JSON文件，生产环境建议使用数据库

## 许可证

MIT # HerbaMind-api
