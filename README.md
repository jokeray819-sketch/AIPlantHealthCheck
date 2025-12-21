# AI Plant Health Check Platform

AI植物健康检测平台 - 基于Blazor的智能植物健康监测系统

## 项目概述

该平台为前后端不分离的单体应用，用于植物健康检测和管理。

### 技术栈

- **开发语言**: C# (.NET 10.0)
- **前端框架**: Blazor Server
- **后端框架**: NetCorePal
- **数据库**: MySQL (使用 Pomelo.EntityFrameworkCore.MySql)
- **缓存中间件**: Redis (使用 StackExchange.Redis)
- **消息队列**: RabbitMQ (使用 RabbitMQ.Client)

## 项目结构

```
AIPlantHealthCheck/
├── src/
│   └── AIPlantHealthCheck/
│       ├── Components/          # Blazor组件
│       ├── Data/               # 数据访问层
│       ├── Models/             # 数据模型
│       ├── Services/           # 业务服务层
│       ├── Infrastructure/     # 基础设施层
│       │   ├── Redis/         # Redis服务
│       │   └── RabbitMQ/      # RabbitMQ服务
│       ├── wwwroot/           # 静态资源
│       ├── Program.cs         # 应用程序入口
│       └── appsettings.json   # 配置文件
└── AIPlantHealthCheck.sln     # 解决方案文件
```

## 环境要求

- .NET 10.0 SDK 或更高版本
- MySQL 8.0 或更高版本
- Redis 6.0 或更高版本
- RabbitMQ 3.x 或更高版本

## 配置说明

在 `appsettings.json` 或 `appsettings.Development.json` 中配置以下连接字符串：

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=AIPlantHealthCheck;User=root;Password=yourpassword;",
    "Redis": "localhost:6379",
    "RabbitMQ": "amqp://guest:guest@localhost:5672"
  }
}
```

### 数据库设置

1. 确保 MySQL 服务正在运行
2. 创建数据库：
   ```sql
   CREATE DATABASE AIPlantHealthCheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. 运行数据库迁移：
   ```bash
   cd src/AIPlantHealthCheck
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

### Redis设置

确保 Redis 服务正在运行：
```bash
# 使用 Docker 运行 Redis（可选）
docker run -d -p 6379:6379 --name redis redis:latest
```

### RabbitMQ设置

确保 RabbitMQ 服务正在运行：
```bash
# 使用 Docker 运行 RabbitMQ（可选）
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management
```

访问管理界面: http://localhost:15672 (默认用户名/密码: guest/guest)

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/jokeray819-sketch/AIPlantHealthCheck.git
cd AIPlantHealthCheck
```

### 2. 还原依赖

```bash
dotnet restore
```

### 3. 构建项目

```bash
dotnet build
```

### 4. 运行项目

```bash
cd src/AIPlantHealthCheck
dotnet run
```

应用程序将在 https://localhost:5001 或 http://localhost:5000 上运行。

## 开发指南

### 添加新的实体

1. 在 `Models/` 目录中创建实体类
2. 在 `ApplicationDbContext.cs` 中添加 DbSet
3. 创建并应用数据库迁移

### 使用 Redis 缓存

```csharp
// 注入 RedisService
private readonly RedisService _redisService;

// 设置缓存
await _redisService.SetAsync("key", "value", TimeSpan.FromMinutes(30));

// 获取缓存
var value = await _redisService.GetAsync("key");
```

### 使用 RabbitMQ 消息队列

```csharp
// 注入 RabbitMQService
private readonly RabbitMQService _rabbitMQService;

// 发布消息
await _rabbitMQService.PublishMessageAsync("queue-name", "message content");
```

## 许可证

本项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

## 贡献

欢迎提交问题和拉取请求！

## 联系方式

如有问题，请通过 GitHub Issues 联系我们。
