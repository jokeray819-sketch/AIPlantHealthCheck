# AI 植物健康检测系统

一个基于 AI 的植物健康检测系统，支持用户注册、登录和植物疾病识别功能。

## 项目结构

```
AIPlantHealthCheck/
├── backend/          # FastAPI 后端
│   ├── main.py       # 主应用入口
│   ├── database.py   # 数据库配置
│   ├── models.py     # 数据库模型
│   ├── schemas.py    # Pydantic 模型
│   ├── auth.py       # 认证相关功能
│   ├── requirements.txt  # Python 依赖
│   ├── .env.example  # 环境变量示例
│   └── init_db.sql   # 数据库初始化脚本
└── front/            # React 前端
    ├── App.jsx       # 主应用组件
    ├── main.jsx      # 入口文件
    ├── index.html    # HTML 模板
    ├── package.json  # Node.js 依赖
    └── vite.config.js # Vite 配置
```

## 功能特性

- ✅ 用户注册和登录（JWT 认证）
- ✅ MySQL 数据库集成
- ✅ 植物健康检测（需要登录）
- ✅ 密码加密存储（bcrypt）
- ✅ RESTful API

## 快速开始

### 后端设置

1. 安装 Python 依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的数据库配置
```

3. 创建数据库：
```bash
mysql -u root -p < init_db.sql
```

4. 启动后端服务：
```bash
python main.py
# 或使用 uvicorn
uvicorn main:app --reload
```

后端 API 将运行在 http://localhost:8000

### 前端设置

1. 安装 Node.js 依赖：
```bash
cd front
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

前端应用将运行在 http://localhost:5173

## API 端点

### 认证相关
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `GET /users/me` - 获取当前用户信息

### 植物检测
- `POST /predict` - 上传植物图片进行健康检测（需要登录）

## 技术栈

### 后端
- FastAPI - 现代化的 Python Web 框架
- SQLAlchemy - ORM 数据库工具
- PyMySQL - MySQL 数据库驱动
- python-jose - JWT 令牌处理
- passlib - 密码加密

### 前端
- React - UI 框架
- Vite - 构建工具
- Axios - HTTP 客户端

## 开发说明

1. 数据库表会在首次运行时自动创建
2. 密码使用 bcrypt 算法加密（密码长度限制：72 字节）
3. API 访问需要在请求头中携带 JWT token：`Authorization: Bearer <token>`
4. 生产环境请修改 `.env` 中的 SECRET_KEY 和数据库密码

## License

MIT
