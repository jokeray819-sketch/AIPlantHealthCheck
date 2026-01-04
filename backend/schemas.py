from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# 用户注册请求
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

# 用户登录请求
class UserLogin(BaseModel):
    username: str
    password: str

# Token 响应
class Token(BaseModel):
    access_token: str
    token_type: str

# Token 数据
class TokenData(BaseModel):
    username: Optional[str] = None

# 用户响应
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# 检测结果
class DetectionResult(BaseModel):
    diagnosis_id: int = None  # 诊断历史ID（新增）
    plant_name: str  # 植物名称
    scientific_name: str  # 学名
    status: str  # 健康状态
    problem_judgment: str  # 问题判断
    severity: str  # 严重程度中文
    severityValue: int  # 严重程度进度条值
    handling_suggestions: list[str]  # 处理建议（数组）
    need_product: bool  # 是否需要产品
    plant_introduction: str  # 植物简介
    reminder_type: str = None  # 提醒类型：浇水提醒/复查提醒/无
    reminder_reason: str = None  # 提醒原因说明
    reminder_days: int = None  # 建议多少天后提醒

# 会员状态响应
class MembershipResponse(BaseModel):
    is_vip: bool
    monthly_detections: int
    remaining_detections: int  # 剩余检测次数。对于VIP用户为-1表示无限制
    
    class Config:
        from_attributes = True

# 会员购买请求
class MembershipPurchaseRequest(BaseModel):
    transaction_hash: str  # 区块链交易哈希
    wallet_address: str  # 钱包地址
    plan: str = Field(..., description="会员套餐类型: monthly, quarterly, yearly")
    wallet_type: str = Field(default="eth", description="钱包类型: eth, ckb")

# 会员购买响应
class MembershipPurchaseResponse(BaseModel):
    success: bool
    message: str
    is_vip: bool

# 诊断历史响应
class DiagnosisHistoryResponse(BaseModel):
    id: int
    user_id: int
    plant_name: str
    scientific_name: Optional[str]
    status: str
    problem_judgment: Optional[str]
    severity: Optional[str]
    severity_value: Optional[int]
    handling_suggestions: Optional[str]  # JSON string
    need_product: bool
    plant_introduction: Optional[str]
    image_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# 我的植物创建请求
class MyPlantCreate(BaseModel):
    plant_name: str = Field(..., min_length=1, max_length=100)
    scientific_name: Optional[str] = None
    nickname: Optional[str] = None
    status: Optional[str] = None
    diagnosis_id: Optional[int] = None  # 关联诊断历史ID
    image_url: Optional[str] = None
    notes: Optional[str] = None
    watering_frequency: Optional[int] = None  # Days
    last_watered: Optional[date] = None

# 我的植物更新请求
class MyPlantUpdate(BaseModel):
    plant_name: Optional[str] = None
    scientific_name: Optional[str] = None
    nickname: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    watering_frequency: Optional[int] = None
    last_watered: Optional[date] = None

# 我的植物响应
class MyPlantResponse(BaseModel):
    id: int
    user_id: int
    plant_name: str
    scientific_name: Optional[str]
    nickname: Optional[str]
    status: Optional[str]
    last_diagnosis_id: Optional[int]
    image_url: Optional[str]
    notes: Optional[str]
    watering_frequency: Optional[int]
    last_watered: Optional[date]
    next_watering_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# 提醒创建请求
class ReminderCreate(BaseModel):
    plant_id: Optional[int] = None
    reminder_type: str = Field(..., description="提醒类型: watering, re_examination")
    title: str = Field(..., min_length=1, max_length=200)
    message: Optional[str] = None
    reminder_reason: Optional[str] = None  # 提醒原因说明
    scheduled_date: datetime

# 提醒更新请求
class ReminderUpdate(BaseModel):
    is_completed: Optional[bool] = None
    is_read: Optional[bool] = None

# 提醒响应
class ReminderResponse(BaseModel):
    id: int
    user_id: int
    plant_id: Optional[int]
    reminder_type: str
    title: str
    message: Optional[str]
    reminder_reason: Optional[str]  # 提醒原因说明
    scheduled_date: datetime
    is_completed: bool
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# 产品响应
class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: str
    category: Optional[str]
    tag: Optional[str]
    icon_class: Optional[str]
    bg_gradient: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# 订单项响应
class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: str
    product: Optional[ProductResponse]
    
    class Config:
        from_attributes = True

# 订单创建请求
class OrderCreateRequest(BaseModel):
    items: List[dict]  # [{"product_id": 1, "quantity": 2}, ...]
    payment_method: str = Field(..., description="支付方式: eth, ckb")
    transaction_hash: str  # 区块链交易哈希
    wallet_address: str  # 钱包地址

# 订单响应
class OrderResponse(BaseModel):
    id: int
    user_id: int
    order_number: str
    total_amount: str
    payment_method: Optional[str]
    transaction_hash: Optional[str]
    wallet_address: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    items: Optional[List[OrderItemResponse]] = []
    
    class Config:
        from_attributes = True

class WalletConnectRequest(BaseModel):
    wallet_address: str
    wallet_provider: str = Field(..., description="Wallet app, e.g. superise, joyid")
    wallet_chain: str = Field(..., description="Chain type: eth, ckb")
    wallet_public_key: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class WalletConnectResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

