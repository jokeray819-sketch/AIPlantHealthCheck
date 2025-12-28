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
    # 根据设计文件中的三种测试结果，返回不同的诊断结果
    results = [
        # 结果1: 健康植物
        {
            "plant_name": "绿萝", 
            "status": "健康", 
            "suggestion": "您的植物状态良好！继续保持当前的养护方式，定期浇水，保持适当光照。建议每2-3天浇水一次，避免积水。"
        },
        # 结果2: 早疫病
        {
            "plant_name": "番茄", 
            "status": "早疫病", 
            "suggestion": "检测到早疫病症状。建议立即采取以下措施：1) 移除并销毁受感染的叶片；2) 使用波尔多液或代森锰锌进行喷洒；3) 改善通风条件；4) 减少叶面喷水。"
        },
        # 结果3: 黑斑病
        {
            "plant_name": "月季", 
            "status": "黑斑病", 
            "suggestion": "检测到黑斑病。处理方案：1) 及时清理落叶和病叶；2) 使用杀菌剂（如多菌灵）每7-10天喷洒一次；3) 保持良好通风；4) 避免晚间浇水，减少叶面湿度。"
        },
        # 结果4: 缺肥症状
        {
            "plant_name": "吊兰", 
            "status": "缺肥", 
            "suggestion": "植物显示缺肥症状。建议：1) 使用均衡型液态肥料，每2周施肥一次；2) 注意氮磷钾比例为20-20-20；3) 施肥后充分浇水；4) 避免过度施肥导致肥害。"
        },
        # 结果5: 虫害
        {
            "plant_name": "玫瑰", 
            "status": "虫害", 
            "suggestion": "检测到虫害。处理建议：1) 使用杀虫剂（如吡虫啉）喷洒叶片正反面；2) 对于少量害虫可手工清除；3) 保持环境清洁；4) 定期检查植物，早发现早治疗。"
        }
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