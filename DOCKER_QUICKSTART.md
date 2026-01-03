# Docker 快速部署指南

> 本指南帮助您快速使用 Docker 部署 AI 植物健康检测系统

## 🎯 一键部署（最简单）

如果您已安装 Docker 和 Docker Compose，只需三步：

```bash
# 1. 克隆项目
git clone https://github.com/jokeray819-sketch/AIPlantHealthCheck.git
cd AIPlantHealthCheck

# 2. 运行部署脚本
./deploy.sh

# 3. 访问应用
# 浏览器打开 http://localhost
```

## 📋 前置要求

- Docker 20.10 或更高版本
- Docker Compose 2.0 或更高版本

### 安装 Docker

**Windows/Mac**: 下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux**:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get install docker-compose-plugin
```

验证安装：
```bash
docker --version
docker compose version
```

## 🚀 手动部署步骤

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑 .env 文件（重要！）
nano .env  # 或使用其他编辑器
```

**必须修改的配置**：
```env
DB_PASSWORD=your_strong_password_here    # 改为强密码
SECRET_KEY=your-secret-key-change-this   # 改为随机字符串
```

### 2. 启动服务

```bash
# 启动所有服务（包括数据库）
docker compose up -d

# 查看启动日志
docker compose logs -f
```

### 3. 验证部署

浏览器访问：
- 前端应用：http://localhost
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 📖 常用操作

### 查看服务状态
```bash
docker compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend   # 后端日志
docker compose logs -f frontend  # 前端日志
docker compose logs -f mysql     # 数据库日志
```

### 停止服务
```bash
docker compose down
```

### 重启服务
```bash
docker compose restart

# 重启特定服务
docker compose restart backend
```

### 更新代码后重新部署
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

### 进入容器调试
```bash
# 进入后端容器
docker compose exec backend bash

# 进入数据库容器
docker compose exec mysql bash
```

### 清理所有数据（谨慎使用）
```bash
# 停止并删除容器和数据卷
docker compose down -v
```

## 🔧 故障排查

### 问题 1: 端口被占用

**错误信息**: `port is already allocated`

**解决方法**:
```bash
# 检查端口占用
lsof -i :80      # 前端端口
lsof -i :8000    # 后端端口
lsof -i :3306    # 数据库端口

# 修改 docker-compose.yml 中的端口映射，例如：
ports:
  - "8080:80"    # 将前端改为 8080 端口
```

### 问题 2: 数据库连接失败

**解决方法**:
```bash
# 1. 检查数据库是否启动
docker compose ps mysql

# 2. 查看数据库日志
docker compose logs mysql

# 3. 等待数据库完全启动（首次启动需要时间）
docker compose logs -f mysql

# 4. 重启后端服务
docker compose restart backend
```

### 问题 3: 前端无法访问

**解决方法**:
```bash
# 1. 检查所有服务状态
docker compose ps

# 2. 检查前端日志
docker compose logs frontend

# 3. 重新构建前端
docker compose up -d --build frontend
```

### 问题 4: 容器启动后立即退出

**解决方法**:
```bash
# 查看容器日志找出错误原因
docker compose logs backend
docker compose logs frontend

# 检查 .env 文件配置是否正确
cat .env
```

## 🔐 生产环境部署

生产环境使用 `docker-compose.prod.yml`:

```bash
# 1. 使用生产配置启动
docker compose -f docker-compose.prod.yml up -d --build

# 2. 确保修改了安全配置
# - 强密码
# - 随机 SECRET_KEY
# - 配置 HTTPS

# 3. 设置定期备份
# 参考 DOCKER_DEPLOYMENT.md 中的备份章节
```

## 📊 服务端口说明

| 服务 | 容器内端口 | 主机端口 | 说明 |
|------|-----------|---------|------|
| Frontend | 80 | 80 | Web 前端 |
| Backend | 8000 | 8000 | API 服务 |
| MySQL | 3306 | 3306 | 数据库 |

## 💾 数据持久化

系统使用 Docker volumes 保存数据，即使删除容器，数据也会保留：

- `mysql_data`: 数据库数据
- `backend_images`: 用户上传的植物图片

### 备份数据

```bash
# 备份数据库
docker compose exec mysql mysqldump -u root -p plant_health_db > backup.sql

# 备份图片（需要单独处理）
docker run --rm \
  -v plant-health-backend_images:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/images_backup.tar.gz -C /data .
```

### 恢复数据

```bash
# 恢复数据库
docker compose exec -T mysql mysql -u root -p plant_health_db < backup.sql

# 恢复图片
docker run --rm \
  -v plant-health-backend_images:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/images_backup.tar.gz -C /data
```

## 🎓 学习资源

- [完整部署文档](DOCKER_DEPLOYMENT.md)
- [项目 README](README.md)
- [Docker 官方文档](https://docs.docker.com/)

## 💡 提示

1. **首次启动较慢**: 需要下载镜像和初始化数据库，请耐心等待
2. **开发模式**: 使用 `docker-compose.yml`
3. **生产模式**: 使用 `docker-compose.prod.yml`
4. **日志查看**: 善用 `docker compose logs -f` 命令
5. **安全第一**: 生产环境务必修改默认密码

## ❓ 获取帮助

遇到问题？

1. 查看 [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) 完整文档
2. 查看 [故障排查](#-故障排查) 部分
3. 在 GitHub 提交 Issue

---

**祝您部署顺利！** 🎉
