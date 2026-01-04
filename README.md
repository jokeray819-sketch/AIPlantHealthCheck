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
- ✅ **会员系统**（区块链支付）
  - 免费用户：每月5次检测
  - VIP会员：无限次检测
  - 支持 MetaMask (以太坊) 钱包支付
  - 支持 CKB 钱包支付（自动检测 JoyID、UTXO、SupeRISE 等）

## 快速开始

### 🐳 Docker 部署（推荐）

使用 Docker Compose 一键部署所有服务（包括数据库）：

```bash
# 1. 克隆项目
git clone https://github.com/jokeray819-sketch/AIPlantHealthCheck.git
cd AIPlantHealthCheck

# 2. 配置环境变量
cp .env.docker .env
# 编辑 .env 文件，修改数据库密码和密钥

# 3. 启动所有服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost
# 后端 API: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

详细的 Docker 部署说明请参考：[Docker 部署指南](DOCKER_DEPLOYMENT.md)

### 手动部署

#### 后端设置

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

#### 前端设置

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

### 会员相关
- `GET /membership/status` - 获取会员状态和剩余检测次数
- `POST /membership/purchase` - 购买会员（区块链支付）

### 植物检测
- `POST /predict` - 上传植物图片进行健康检测（需要登录）

## 技术栈

### 后端
- FastAPI - 现代化的 Python Web 框架
- SQLAlchemy - ORM 数据库工具
- PyMySQL - MySQL 数据库驱动
- python-jose - JWT 令牌处理
- bcrypt - 密码加密

### 前端
- React - UI 框架
- Vite - 构建工具
- Axios - HTTP 客户端
- TailwindCSS - CSS 框架
- MetaMask - 以太坊钱包集成
- @ckb-ccc/connector-react - CKB 钱包集成（支持 JoyID、SupeRISE 等）

## 会员功能

本系统支持基于区块链的会员购买功能：

### 会员权益
- 🆓 **免费用户**：每月5次检测
- 💎 **VIP会员**：无限次检测 + 优先AI模型 + 专属标识 + 优先客服

### 套餐价格
- 月度会员：0.001 ETH
- 季度会员：0.0025 ETH（优惠）
- 年度会员：0.008 ETH（最划算）

### 支付方式

本系统支持多种区块链钱包支付：

#### 以太坊 (ETH)
- 使用 MetaMask 钱包
- 在 Sepolia 测试网进行交易

#### Nervos CKB
系统自动检测并支持所有 CKB 兼容钱包，包括：
- **JoyID** - Web 端钱包
- **UTXO 钱包** - Neuron 等桌面钱包
- **SupeRISE** - 支持 BTC & CKB 的多链钱包 ✨
- 其他 CKB 兼容钱包

在 CKB Testnet 测试网进行交易。点击"连接钱包"后，系统会自动显示所有已安装的可用钱包供您选择。

详细说明请参考：
- [会员功能文档](MEMBERSHIP_FEATURE.md)
- [CKB 钱包集成文档](WALLET_INTEGRATION.md)
- [SupeRISE 集成文档](SUPERISE_INTEGRATION.md)

## 开发说明

1. 数据库表会在首次运行时自动创建
2. 密码使用 bcrypt 算法加密（bcrypt 自动处理 72 字节限制）
3. API 访问需要在请求头中携带 JWT token：`Authorization: Bearer <token>`
4. 生产环境请修改 `.env` 中的 SECRET_KEY 和数据库密码

## License

MIT
