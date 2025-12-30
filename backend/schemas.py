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

# 检测结果（保留原有的）
class DetectionResult(BaseModel):
    plant_name: str
    status: str
    confidence: float
    treatment_suggestion: str

# 会员状态响应
class MembershipResponse(BaseModel):
    is_vip: bool
    monthly_detections: int
    remaining_detections: int  # 剩余检测次数。对于VIP用户为-1表示无限制
    
    class Config:
        from_attributes = True
