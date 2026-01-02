# 新增功能说明

本次更新新增了三个主要功能模块，增强了植物健康检测系统的完整性和用户体验。

## 1. 诊断历史功能 (Diagnosis History)

### 功能描述
自动记录每位登录用户的植物健康诊断历史，方便用户回顾之前的诊断结果。

### 数据库模型
- **表名**: `diagnosis_histories`
- **主要字段**:
  - `user_id`: 用户ID（外键）
  - `plant_name`: 植物名称
  - `scientific_name`: 学名
  - `status`: 健康状态
  - `problem_judgment`: 问题判断
  - `severity`: 严重程度
  - `handling_suggestions`: 处理建议（JSON格式）
  - `created_at`: 诊断时间

### API 端点
- `GET /diagnosis-history` - 获取当前用户的诊断历史（支持分页）
- `GET /diagnosis-history/{history_id}` - 获取指定诊断历史详情
- `DELETE /diagnosis-history/{history_id}` - 删除指定诊断历史

### 前端功能
- 在"我的"页面点击"诊断历史"查看所有历史记录
- 显示植物名称、健康状态、诊断时间等关键信息
- 支持查看每条历史的详细信息

## 2. 我的植物功能 (My Plants)

### 功能描述
允许用户管理自己的植物，包括添加、编辑、删除植物信息，设置浇水提醒等。

### 数据库模型
- **表名**: `my_plants`
- **主要字段**:
  - `user_id`: 用户ID（外键）
  - `plant_name`: 植物名称
  - `nickname`: 用户给植物起的昵称
  - `watering_frequency`: 浇水频率（天数）
  - `last_watered`: 上次浇水日期
  - `next_watering_date`: 下次浇水日期
  - `notes`: 用户备注

### API 端点
- `GET /my-plants` - 获取当前用户的所有植物
- `GET /my-plants/{plant_id}` - 获取指定植物详情
- `POST /my-plants` - 创建新的植物记录
- `PUT /my-plants/{plant_id}` - 更新植物信息
- `DELETE /my-plants/{plant_id}` - 删除植物
- `POST /my-plants/{plant_id}/water` - 记录浇水

### 前端功能
- 在"我的"页面点击"我的植物"查看所有植物
- 点击"+"按钮添加新植物
- 点击植物卡片查看详情
- 在植物详情页可以：
  - 记录浇水（自动更新下次浇水日期）
  - 创建复查提醒
  - 删除植物
- 从诊断结果页面"保存我的植物"快速添加

## 3. 提醒消息功能 (Reminders)

### 功能描述
提供两种类型的提醒：浇水提醒和复查提醒（建议再次拍照检查植物健康）。

### 数据库模型
- **表名**: `reminders`
- **主要字段**:
  - `user_id`: 用户ID（外键）
  - `plant_id`: 关联的植物ID（可选）
  - `reminder_type`: 提醒类型（`watering` 或 `re_examination`）
  - `title`: 提醒标题
  - `message`: 提醒内容
  - `scheduled_date`: 计划提醒时间
  - `is_completed`: 是否已完成
  - `is_read`: 是否已读

### API 端点
- `GET /reminders` - 获取当前用户的提醒（支持类型和状态过滤）
- `GET /reminders/unread-count` - 获取未读提醒数量
- `POST /reminders` - 创建新提醒
- `PUT /reminders/{reminder_id}` - 更新提醒状态（标记为已读/已完成）
- `DELETE /reminders/{reminder_id}` - 删除提醒
- `POST /reminders/create-reexamination/{plant_id}` - 为指定植物创建复查提醒

### 提醒自动创建
1. **浇水提醒**：
   - 添加植物时，如果设置了浇水频率，自动创建浇水提醒
   - 记录浇水后，自动创建下一次浇水提醒
   
2. **复查提醒**：
   - 用户可以在植物详情页手动创建复查提醒
   - 默认为7天后提醒

### 前端功能
- 在"我的"页面点击"提醒消息"查看所有提醒
- 提醒图标显示未读数量红点
- 支持标记提醒为已完成
- 提醒分为两种类型：
  - 浇水提醒（蓝色水滴图标）
  - 复查提醒（绿色相机图标）

## 使用流程示例

### 场景1：诊断并保存植物
1. 用户登录后拍照诊断植物
2. 查看诊断结果（自动保存到诊断历史）
3. 点击"保存我的植物"，给植物起昵称
4. 植物被添加到"我的植物"

### 场景2：设置浇水提醒
1. 进入"我的植物"
2. 点击植物进入详情页
3. 点击"记录浇水"
4. 系统自动根据浇水频率创建下次浇水提醒
5. 在"提醒消息"中可以看到浇水提醒

### 场景3：创建复查提醒
1. 进入植物详情页
2. 点击"创建复查提醒"
3. 系统创建7天后的复查提醒
4. 7天后在"提醒消息"中收到复查提醒

## 技术实现

### 后端技术
- FastAPI RESTful API
- SQLAlchemy ORM
- MySQL数据库
- 事务处理确保数据一致性

### 前端技术
- React状态管理
- Axios异步请求
- 响应式UI设计
- 实时数据更新

## 数据关系

```
User (用户)
├── DiagnosisHistory (诊断历史) - 一对多
├── MyPlant (我的植物) - 一对多
│   └── Reminder (提醒) - 一对多
└── Reminder (提醒) - 一对多
```

## 安全性

- 所有API端点都需要JWT认证
- 用户只能访问和操作自己的数据
- 数据库外键约束确保数据完整性
- 级联删除保护（删除用户时自动删除相关数据）

## 未来改进方向

1. 支持上传植物照片
2. 支持更多提醒类型（施肥提醒、修剪提醒等）
3. 支持自定义提醒时间
4. 添加植物生长日记功能
5. 支持分享植物信息到社交平台
