# Docker 部署指南

本项目支持使用 Docker 和 Docker Compose 进行快速部署。

## 目录结构

```
AIPlantHealthCheck/
├── docker-compose.yml          # Docker Compose 编排文件
├── .env.docker                 # Docker 环境变量示例
├── backend/
│   ├── Dockerfile              # 后端 Dockerfile
│   └── .dockerignore          # 后端 Docker 忽略文件
└── front/
    ├── Dockerfile              # 前端 Dockerfile
    ├── .dockerignore          # 前端 Docker 忽略文件
    └── nginx.conf             # Nginx 配置文件
```

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 一键部署

1. **克隆项目**
```bash
git clone https://github.com/jokeray819-sketch/AIPlantHealthCheck.git
cd AIPlantHealthCheck
```

2. **配置环境变量**
```bash
cp .env.docker .env
# 编辑 .env 文件，修改数据库密码和密钥
nano .env
```

3. **启动所有服务**
```bash
docker-compose up -d
```

4. **查看服务状态**
```bash
docker-compose ps
```

5. **访问应用**
- 前端: http://localhost
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 详细说明

### 服务组成

项目包含三个主要服务：

1. **mysql**: MySQL 8.0 数据库
   - 端口: 3306
   - 数据持久化: mysql_data volume

2. **backend**: FastAPI 后端服务
   - 端口: 8000
   - 图片存储: backend_images volume

3. **frontend**: React 前端 (Nginx)
   - 端口: 80
   - 基于 Nginx 的生产环境部署

### 环境变量配置

编辑 `.env` 文件配置以下变量：

```bash
# 数据库配置
DB_HOST=mysql                           # 数据库主机（Docker 内部使用服务名）
DB_PORT=3306                            # 数据库端口
DB_USER=plant_user                      # 数据库用户名
DB_PASSWORD=your_password_here          # 数据库密码（必须修改）
DB_NAME=plant_health_db                 # 数据库名称

# JWT 配置
SECRET_KEY=your-secret-key-here         # JWT 密钥（必须修改）
ALGORITHM=HS256                         # 加密算法
ACCESS_TOKEN_EXPIRE_MINUTES=30          # Token 过期时间（分钟）
```

**重要**: 生产环境必须修改 `DB_PASSWORD` 和 `SECRET_KEY`！

### 常用命令

#### 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 启动并重新构建
docker-compose up -d --build

# 只启动特定服务
docker-compose up -d backend
```

#### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

#### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

#### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

#### 进入容器
```bash
# 进入后端容器
docker-compose exec backend bash

# 进入数据库容器
docker-compose exec mysql bash

# 进入前端容器
docker-compose exec frontend sh
```

#### 查看服务状态
```bash
docker-compose ps
```

## 单独构建和运行

### 后端

```bash
# 构建镜像
cd backend
docker build -t plant-health-backend .

# 运行容器
docker run -d \
  --name plant-health-backend \
  -p 8000:8000 \
  -e DB_HOST=your_db_host \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e DB_NAME=plant_health_db \
  -e SECRET_KEY=your_secret_key \
  plant-health-backend
```

### 前端

```bash
# 构建镜像
cd front
docker build -t plant-health-frontend .

# 运行容器
docker run -d \
  --name plant-health-frontend \
  -p 80:80 \
  plant-health-frontend
```

### 数据库

```bash
# 运行 MySQL
docker run -d \
  --name plant-health-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=plant_health_db \
  -e MYSQL_USER=plant_user \
  -e MYSQL_PASSWORD=your_password \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0
```

## 生产环境部署建议

### 1. 安全配置

- **修改默认密码**: 确保修改 `DB_PASSWORD` 和 `SECRET_KEY`
- **使用环境变量**: 不要在代码中硬编码敏感信息
- **启用 HTTPS**: 在前端 Nginx 配置中添加 SSL 证书
- **限制端口访问**: 不要暴露数据库端口到公网

### 2. 性能优化

- **使用生产数据库**: 考虑使用云数据库服务（如 AWS RDS、阿里云 RDS）
- **CDN 加速**: 使用 CDN 加速前端静态资源
- **负载均衡**: 部署多个后端实例，使用 Nginx 或云负载均衡器

### 3. 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p plant_health_db > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p plant_health_db < backup.sql

# 备份图片
docker run --rm -v plant-health-backend_images:/data -v $(pwd):/backup alpine tar czf /backup/images_backup.tar.gz -C /data .

# 恢复图片
docker run --rm -v plant-health-backend_images:/data -v $(pwd):/backup alpine tar xzf /backup/images_backup.tar.gz -C /data
```

### 4. 监控和日志

```bash
# 设置日志大小限制（在 docker-compose.yml 中）
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 5. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 查看更新状态
docker-compose ps
```

## 故障排查

### 服务无法启动

1. 检查日志
```bash
docker-compose logs backend
```

2. 检查端口占用
```bash
lsof -i :8000  # 后端
lsof -i :80    # 前端
lsof -i :3306  # 数据库
```

3. 检查数据库连接
```bash
docker-compose exec backend ping mysql
```

### 数据库初始化失败

```bash
# 删除数据卷重新初始化
docker-compose down -v
docker-compose up -d
```

### 前端无法访问后端

检查 Docker 网络配置和服务间通信：
```bash
docker network inspect plant-health-network
```

## 开发环境 vs 生产环境

### 开发环境
- 使用 `docker-compose.yml` 直接启动
- 端口映射到本地
- 启用详细日志
- 可以挂载源代码进行热重载

### 生产环境
- 使用环境变量文件
- 配置 HTTPS
- 启用日志轮转
- 使用 Docker Swarm 或 Kubernetes 进行编排
- 配置健康检查和自动重启

## 常见问题

**Q: 如何更改默认端口？**
A: 编辑 `docker-compose.yml` 中的 ports 配置，例如将前端改为 `"8080:80"`

**Q: 如何查看数据库数据？**
A: 可以使用 MySQL 客户端连接到 `localhost:3306`，或使用以下命令：
```bash
docker-compose exec mysql mysql -u root -p plant_health_db
```

**Q: 如何清理所有 Docker 资源？**
A: 
```bash
docker-compose down -v
docker system prune -a
```

**Q: 如何只更新前端或后端？**
A: 
```bash
# 只重建后端
docker-compose up -d --build backend

# 只重建前端
docker-compose up -d --build frontend
```

## 技术栈

- **后端**: Python 3.11 + FastAPI + MySQL
- **前端**: Node.js 18 + React + Vite + Nginx
- **容器化**: Docker + Docker Compose
- **Web服务器**: Nginx (Alpine Linux)

## 支持

如有问题，请查看项目 README.md 或提交 Issue。
