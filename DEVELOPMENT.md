# 开发和测试指南

## 环境要求

- Python 3.8+
- MySQL 5.7+ 或 MariaDB 10.3+
- Node.js 16+
- npm 或 yarn

## 后端设置步骤

### 1. 安装 Python 依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置数据库

#### 方式一：使用 MySQL 命令行

```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
source init_db.sql
```

#### 方式二：直接创建数据库

```sql
CREATE DATABASE IF NOT EXISTS plant_health_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，修改以下内容：
# - DB_HOST: 数据库主机地址（本地开发使用 localhost）
# - DB_PORT: 数据库端口（默认 3306）
# - DB_USER: 数据库用户名
# - DB_PASSWORD: 数据库密码
# - DB_NAME: 数据库名称（plant_health_db）
# - SECRET_KEY: JWT 密钥（生产环境必须修改）
```

### 4. 启动后端服务

```bash
# 方式一：直接运行
python main.py

# 方式二：使用 uvicorn（推荐开发时使用）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端 API 文档将在 http://localhost:8000/docs 可用

## 前端设置步骤

### 1. 安装依赖

```bash
cd front
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

前端应用将在 http://localhost:5173 运行

## 测试流程

### 1. 后端 API 测试

#### 测试用户注册

```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

预期响应：
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "created_at": "2024-01-01T00:00:00"
}
```

#### 测试用户登录

```bash
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

预期响应：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### 测试获取用户信息

```bash
# 使用上一步获得的 token
TOKEN="your_access_token_here"

curl -X GET "http://localhost:8000/users/me" \
  -H "Authorization: Bearer $TOKEN"
```

#### 测试植物检测（需要登录）

```bash
# 准备一张测试图片
curl -X POST "http://localhost:8000/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_plant.jpg"
```

### 2. 前端测试

1. 打开浏览器访问 http://localhost:5173
2. 测试注册功能：
   - 填写用户名（至少 3 个字符）
   - 填写邮箱
   - 填写密码（至少 6 个字符）
   - 点击"注册"按钮
   - 应该看到"注册成功！请登录"提示

3. 测试登录功能：
   - 切换到"登录"标签
   - 输入用户名和密码
   - 点击"登录"按钮
   - 登录成功后应该看到主界面

4. 测试植物检测：
   - 上传一张植物图片
   - 点击"开始智能检测"
   - 应该看到检测结果

5. 测试登出：
   - 点击"登出"按钮
   - 应该返回登录界面

## 数据库表结构

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 常见问题

### 1. 数据库连接失败

检查：
- MySQL 服务是否运行：`systemctl status mysql` 或 `service mysql status`
- `.env` 文件中的数据库配置是否正确
- 数据库用户是否有足够的权限

### 2. 密码加密失败

确保已安装 bcrypt：
```bash
pip install passlib[bcrypt]
```

### 3. JWT token 无效

- 检查 SECRET_KEY 是否正确配置
- 确认 token 是否过期（默认 30 分钟）
- 验证 Authorization 头格式：`Bearer <token>`

### 4. CORS 错误

后端已配置允许所有来源的请求（开发环境）。生产环境请在 `main.py` 中修改：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],  # 指定具体域名
    ...
)
```

## 安全注意事项

1. **生产环境必须修改**：
   - `.env` 中的 `SECRET_KEY`
   - 数据库密码
   - CORS 允许的域名

2. **HTTPS**：
   - 生产环境必须使用 HTTPS
   - JWT token 应该通过 HTTPS 传输

3. **密码策略**：
   - 当前最小长度为 6，生产环境建议增加
   - 可以添加密码复杂度要求

4. **输入验证**：
   - 所有用户输入都经过 Pydantic 验证
   - 文件上传已限制为 JPG/PNG 格式
