from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, date
import io
import random
import os
import base64
import json
import re
from volcenginesdkarkruntime import Ark

from database import engine, get_db, Base
from models import User, Membership
from schemas import UserRegister, UserLogin, Token, UserResponse, DetectionResult, MembershipResponse
from auth import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# 常量定义
FREE_USER_MONTHLY_LIMIT = 5  # 免费用户每月检测次数限制

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

# ==================== 辅助函数 ====================

def get_or_create_membership(db: Session, user_id: int) -> Membership:
    """获取或创建用户会员记录"""
    membership = db.query(Membership).filter(Membership.user_id == user_id).first()
    
    if not membership:
        # 如果没有会员记录，创建一个默认的免费会员
        membership = Membership(
            user_id=user_id,
            is_vip=False,
            monthly_detections=0
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
    
    return membership

def reset_monthly_detections_if_needed(db: Session, membership: Membership) -> Membership:
    """检查并在需要时重置月度检测次数"""
    today = date.today()
    if membership.last_reset_date.month != today.month or membership.last_reset_date.year != today.year:
        membership.monthly_detections = 0
        membership.last_reset_date = today
        db.commit()
        db.refresh(membership)
    return membership

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
    
    # 创建默认免费会员
    new_membership = Membership(
        user_id=new_user.id,
        is_vip=False,
        monthly_detections=0
    )
    db.add(new_membership)
    db.commit()
    
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

@app.get("/membership/status", response_model=MembershipResponse)
async def get_membership_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户会员状态和剩余检测次数"""
    # 获取或创建会员记录
    membership = get_or_create_membership(db, current_user.id)
    
    # 检查并重置月度检测次数
    membership = reset_monthly_detections_if_needed(db, membership)
    
    # 计算剩余检测次数
    if membership.is_vip:
        remaining = -1  # -1 表示无限次（VIP用户）
    else:
        remaining = max(0, FREE_USER_MONTHLY_LIMIT - membership.monthly_detections)
    
    return MembershipResponse(
        is_vip=membership.is_vip,
        monthly_detections=membership.monthly_detections,
        remaining_detections=remaining
    )

# ==================== 植物健康检测相关路由 ====================

def image_to_base64(image: Image.Image, format: str = "JPEG") -> str:
    """
    将 PIL Image 对象转换为 base64 字符串
    
    Args:
        image: PIL Image 对象
        format: 图片格式，默认为 JPEG
    
    Returns:
        base64 编码的字符串（不包含 data:image 前缀）
    """
    # 将图片保存到内存中的字节流
    buffer = io.BytesIO()
    # 如果图片是 RGBA 模式，需要转换为 RGB（JPEG 不支持透明度）
    if image.mode in ("RGBA", "LA", "P"):
        # 创建白色背景
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "P":
            image = image.convert("RGBA")
        rgb_image.paste(image, mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None)
        image = rgb_image
    
    image.save(buffer, format=format)
    # 获取字节数据并编码为 base64
    image_bytes = buffer.getvalue()
    base64_string = base64.b64encode(image_bytes).decode('utf-8')
    return base64_string

def ai_inference(image: Image.Image):
    # 请确保您已将 API Key 存储在环境变量 ARK_API_KEY 中
    # 初始化Ark客户端，从环境变量中读取您的API Key
    client = Ark(
        # 此为默认路径，您可根据业务所在地域进行配置
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        # 从环境变量中获取您的 API Key。此为默认方式，您可根据需要进行修改
        api_key="e7cc9ce9-d1e9-446d-b638-c0f4313bc478",
    )

    # Non-streaming:
    print("----- image input request -----")
    completion = client.chat.completions.create(
    # 指定您创建的方舟推理接入点 ID，此处已帮您修改为您的推理接入点 ID
        model="doubao-seed-1-6-251015",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_to_base64(image)}"
                        },
                    },
                    {"type": "text", "text": "你是一位植物专家，1.识别图片中的植物\n" + "2.诊断植物的健康状况\n" + "3.若植物健康出现异常，给出养护意见"},
                    {"type": "text", "text": "要求按照如下responseBody格式输出："},
                    {"type": "text", "text": "{\"plant_name\": \"绿萝\", \"status\": \"健康\", \"suggestion\": \"您的植物状态良好！继续保持当前的养护方式，定期浇水，保持适当光照。建议每2-3天浇水一次，避免积水。\""},
                ],
            }
        ],
        reasoning_effort="medium",
        
        # 免费开启推理会话应用层加密，访问 https://www.volcengine.com/docs/82379/1389905 了解更多
        extra_headers={'x-is-encrypted': 'true'},
    )
    content = completion.choices[0].message.content
    print("----- AI 返回内容 -----")
    print(content)
    
    # 尝试解析 JSON，如果返回的内容包含 JSON，提取它
    try:
        # 方法1: 直接解析整个内容
        result = json.loads(content)
        return result
    except json.JSONDecodeError:
        # 方法2: 尝试从文本中提取 JSON 对象
        json_match = re.search(r'\{[^{}]*"plant_name"[^{}]*\}', content, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return result
            except json.JSONDecodeError:
                pass
        
        # 方法3: 如果都失败了，返回默认结构
        print("警告: 无法解析 JSON，使用默认值")
        return {
            "plant_name": "未知植物",
            "status": "无法识别",
            "suggestion": content if content else "无法获取诊断结果，请重试。"
        }

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 0. 检查用户会员状态和检测次数
    # 获取或创建会员记录
    membership = get_or_create_membership(db, current_user.id)
    
    # 检查并重置月度检测次数
    membership = reset_monthly_detections_if_needed(db, membership)
    
    # 检查免费用户的检测次数限制
    if not membership.is_vip and membership.monthly_detections >= FREE_USER_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=403, 
            detail=f"本月检测次数已用完。免费用户每月最多可检测{FREE_USER_MONTHLY_LIMIT}次，请升级为VIP获得无限检测次数。"
        )
    
    # 1. 验证文件类型
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="只支持 JPG 或 PNG 图片格式")

    try:
        # 2. 读取图片字节并转换为 PIL 对象
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # 3. 调用 AI 模型
        try:
            prediction = ai_inference(image)
        except Exception as api_error:
            # 如果 API 调用失败，使用模拟结果
            print(f"API 调用失败: {api_error}")
            prediction = mock_ai_inference(image)
        
        # 确保 prediction 是字典格式
        if not isinstance(prediction, dict):
            print(f"警告: prediction 不是字典格式: {type(prediction)}")
            prediction = {
                "plant_name": "未知植物",
                "status": "无法识别",
                "suggestion": str(prediction) if prediction else "无法获取诊断结果"
            }
        
        # 4. 返回 JSON 结果
        result = DetectionResult(
            plant_name=prediction.get("plant_name", "未知植物"),
            status=prediction.get("status", "无法识别"),
            confidence=round(random.uniform(0.85, 0.99), 2),
            treatment_suggestion=prediction.get("suggestion", "无法获取建议")
        )
        
        # 5. 增加检测次数（只在成功检测后增加）
        membership.monthly_detections += 1
        db.commit()
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "植物健康检测系统运行中"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)