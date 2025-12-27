from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import io
import random

from database import engine, get_db, Base
from models import User
from schemas import UserRegister, UserLogin, Token, UserResponse, DetectionResult
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI 植物健康检测 API")

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 用户认证相关路由 ====================

@app.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 检查邮箱是否已存在
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    
    # 创建新用户
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    db_user = authenticate_user(db, user.username, user.password)
    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return current_user

# ==================== 植物健康检测相关路由 ====================

# 模拟 AI 推理过程 (实际开发时这里替换为你的 PyTorch/TensorFlow 模型)
def mock_ai_inference(image: Image.Image):
    # 这里通常会有模型预测逻辑: model.predict(image)
    results = [
        {"plant_name": "番茄", "status": "健康", "suggestion": "保持当前光照和浇水频率。"},
        {"plant_name": "番茄", "status": "早疫病", "suggestion": "建议使用波尔多液进行喷洒，并修剪病叶。"},
        {"plant_name": "月季", "status": "黑斑病", "suggestion": "减少叶面喷水，保持通风，及时清理落叶。"}
    ]
    return random.choice(results)

@app.post("/predict", response_model=DetectionResult)
async def predict_plant_health(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # 1. 验证文件类型
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="只支持 JPG 或 PNG 图片格式")

    try:
        # 2. 读取图片字节并转换为 PIL 对象
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # 3. 调用 AI 模型 (此处为模拟)
        prediction = mock_ai_inference(image)
        
        # 4. 返回 JSON 结果
        return DetectionResult(
            plant_name=prediction["plant_name"],
            status=prediction["status"],
            confidence=round(random.uniform(0.85, 0.99), 2),
            treatment_suggestion=prediction["suggestion"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "植物健康检测系统运行中"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)