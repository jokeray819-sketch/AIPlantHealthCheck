# Docker 部署文件说明

本次为项目添加了完整的 Docker 部署支持，包含前后端分离部署和数据库集成。

## 📦 创建的文件

### 1. 后端 Docker 配置

#### `backend/Dockerfile`
- **功能**: 后端 Python/FastAPI 应用容器化
- **基础镜像**: python:3.11-slim
- **特点**:
  - 安装必要的系统依赖（gcc, mysql-client）
  - 使用 pip 安装 Python 依赖
  - 创建图片存储目录
  - 暴露 8000 端口
  - 使用 uvicorn 启动 FastAPI 应用

#### `backend/.dockerignore`
- **功能**: 排除不需要打包到镜像的文件
- **排除内容**: 
  - Python 缓存文件 (__pycache__, *.pyc)
  - 虚拟环境 (venv, env)
  - .env 文件
  - 上传的图片（将使用 volume 挂载）

### 2. 前端 Docker 配置

#### `front/Dockerfile`
- **功能**: 前端 React 应用容器化（多阶段构建）
- **阶段 1 - 构建**: 
  - 基础镜像: node:18-alpine
  - 安装依赖并构建生产版本
- **阶段 2 - 运行**:
  - 基础镜像: nginx:alpine
  - 复制构建产物到 nginx
  - 配置 nginx 服务器
  - 暴露 80 端口

#### `front/.dockerignore`
- **功能**: 排除不需要打包的前端文件
- **排除内容**:
  - node_modules
  - 构建输出 (dist, .vite)
  - IDE 配置文件

#### `front/nginx.conf`
- **功能**: Nginx 生产环境配置
- **特点**:
  - SPA 路由支持（所有路由指向 index.html）
  - Gzip 压缩优化
  - 静态资源缓存（1年）
  - 安全头配置

### 3. Docker Compose 编排

#### `docker-compose.yml` (开发/测试环境)
- **服务组成**:
  - **mysql**: MySQL 8.0 数据库
    - 自动初始化数据库（使用 init_db.sql）
    - 数据持久化（mysql_data volume）
    - 健康检查
  - **backend**: FastAPI 后端服务
    - 依赖 MySQL 启动
    - 环境变量配置
    - 图片存储 volume
  - **frontend**: React 前端（Nginx）
    - 依赖后端服务
    - 端口 80

#### `docker-compose.prod.yml` (生产环境)
- **额外特性**:
  - 容器自动重启策略
  - 日志轮转配置（10MB x 3 文件）
  - 健康检查配置
  - 只在本地监听端口（安全性）
  - 支持 SSL/HTTPS（443 端口）

### 4. 配置文件

#### `.env.docker`
- **功能**: Docker 环境变量模板
- **包含配置**:
  - 数据库连接信息
  - JWT 认证配置
  - 提供默认值

### 5. 文档

#### `DOCKER_DEPLOYMENT.md`
- **功能**: 完整的 Docker 部署文档
- **内容包括**:
  - 快速开始指南
  - 详细服务说明
  - 常用命令参考
  - 单独构建运行说明
  - 生产环境部署建议
  - 故障排查指南
  - 常见问题解答

### 6. 工具脚本

#### `deploy.sh`
- **功能**: 一键部署脚本
- **特性**:
  - 自动检查 Docker 环境
  - 交互式配置 .env 文件
  - 支持开发/生产环境选择
  - 自动停止旧容器
  - 显示服务状态和访问地址

### 7. 文档更新

#### `README.md`
- **更新内容**: 在"快速开始"部分添加 Docker 部署说明
- **位置**: 置于最前面，作为推荐部署方式

## 🚀 使用方法

### 方法 1: 使用一键部署脚本（推荐）

```bash
./deploy.sh
```

### 方法 2: 手动使用 Docker Compose

```bash
# 1. 配置环境变量
cp .env.docker .env
nano .env

# 2. 启动所有服务
docker compose up -d

# 3. 访问应用
# 前端: http://localhost
# 后端: http://localhost:8000
```

## 🏗️ 架构说明

```
                    ┌─────────────────┐
                    │   用户浏览器    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Frontend (80)  │
                    │  Nginx + React  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Backend (8000)  │
                    │  FastAPI        │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  MySQL (3306)   │
                    │  Database       │
                    └─────────────────┘
```

所有服务通过 Docker 网络 `plant-health-network` 互相通信。

## ✅ 验证结果

- ✅ `docker-compose.yml` 语法验证通过
- ✅ `docker-compose.prod.yml` 语法验证通过
- ✅ 所有 Dockerfile 语法正确
- ✅ .dockerignore 文件配置完整
- ✅ 文档完整，包含使用说明

## 🔐 安全注意事项

1. **必须修改默认密码**: 生产环境务必修改 `.env` 中的 `DB_PASSWORD` 和 `SECRET_KEY`
2. **端口安全**: 生产环境建议使用 `docker-compose.prod.yml`，限制端口监听
3. **HTTPS**: 生产环境应配置 SSL 证书
4. **数据备份**: 定期备份 MySQL 数据和上传的图片

## 📊 技术栈

- **容器化**: Docker 20.10+, Docker Compose 2.0+
- **后端容器**: Python 3.11 + FastAPI + uvicorn
- **前端容器**: Node.js 18 (构建) + Nginx Alpine (运行)
- **数据库**: MySQL 8.0
- **Web 服务器**: Nginx (Alpine Linux)

## 🎯 特点

1. **开箱即用**: 一条命令启动所有服务
2. **多阶段构建**: 前端使用多阶段构建，减小镜像体积
3. **生产就绪**: 包含日志、健康检查、自动重启
4. **数据持久化**: 使用 Docker volumes 保存数据
5. **环境隔离**: 每个服务独立容器运行
6. **易于扩展**: 可轻松添加更多服务（如 Redis、消息队列）

## 📝 后续优化建议

1. 添加 Redis 缓存服务
2. 配置 CI/CD 自动构建镜像
3. 使用 Docker Swarm 或 Kubernetes 进行集群部署
4. 添加监控服务（Prometheus + Grafana）
5. 配置自动备份脚本
