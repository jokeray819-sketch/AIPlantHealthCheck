#!/bin/bash

# Docker 部署快速启动脚本
# 此脚本用于快速部署 AI 植物健康检测系统

set -e  # 遇到错误立即退出

echo "================================================"
echo "AI 植物健康检测系统 - Docker 部署脚本"
echo "================================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 未安装"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 确定使用的 Docker Compose 命令
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "✅ Docker 检查通过"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    echo "正在从 .env.docker 创建 .env 文件..."
    cp .env.docker .env
    echo ""
    echo "📝 请编辑 .env 文件并修改以下配置："
    echo "   - DB_PASSWORD: 数据库密码"
    echo "   - SECRET_KEY: JWT 密钥"
    echo ""
    read -p "是否现在编辑 .env 文件? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        echo "⚠️  警告: 使用默认配置部署存在安全风险！"
        echo "请在生产环境中务必修改密码和密钥！"
        echo ""
    fi
else
    echo "✅ 找到 .env 文件"
    echo ""
fi

# 询问部署模式
echo "请选择部署模式："
echo "1) 开发环境 (使用 docker-compose.yml)"
echo "2) 生产环境 (使用 docker-compose.prod.yml)"
read -p "请输入选项 (1 或 2, 默认: 1): " deploy_mode
deploy_mode=${deploy_mode:-1}

if [ "$deploy_mode" == "2" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "📦 使用生产环境配置"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "📦 使用开发环境配置"
fi
echo ""

# 询问是否重新构建
read -p "是否重新构建镜像? (y/n, 默认: y): " rebuild
rebuild=${rebuild:-y}
echo ""

# 停止已有容器
echo "🛑 停止已有容器..."
$DOCKER_COMPOSE -f $COMPOSE_FILE down
echo ""

# 启动服务
if [[ $rebuild =~ ^[Yy]$ ]]; then
    echo "🔨 构建并启动服务..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d --build
else
    echo "🚀 启动服务..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d
fi

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
$DOCKER_COMPOSE -f $COMPOSE_FILE ps

echo ""
echo "================================================"
echo "✅ 部署完成！"
echo "================================================"
echo ""
echo "📱 访问地址:"
echo "   前端:     http://localhost"
echo "   后端 API: http://localhost:8000"
echo "   API 文档: http://localhost:8000/docs"
echo ""
echo "📝 常用命令:"
echo "   查看日志: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
echo "   停止服务: $DOCKER_COMPOSE -f $COMPOSE_FILE down"
echo "   重启服务: $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
echo ""
echo "如需帮助，请查看 DOCKER_DEPLOYMENT.md"
echo "================================================"
