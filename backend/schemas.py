from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

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
    plant_name: str  # 植物名称
    scientific_name: str  # 学名
    status: str  # 健康状态
    problem_judgment: str  # 问题判断
    severity: str  # 严重程度中文
    severityValue: int  # 严重程度进度条值
    handling_suggestions: list[str]  # 处理建议（数组）
    need_product: bool  # 是否需要产品
    plant_introduction: str  # 植物简介

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

# 会员购买响应
class MembershipPurchaseResponse(BaseModel):
    success: bool
    message: str
    is_vip: bool
