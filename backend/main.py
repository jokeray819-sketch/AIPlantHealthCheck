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
UNLIMITED_DETECTIONS = -1  # VIP用户无限检测次数（使用-1表示）
DEFAULT_SEVERITY_VALUE = 30  # 默认严重程度值
HOST = os.getenv("HOST", "0.0.0.0")

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
        remaining = UNLIMITED_DETECTIONS  # VIP用户无限检测
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
    default_prompt = "你是一位植物专家，1.识别图片中的植物\n" + "2.诊断植物的健康状况\n" + "3.若植物健康出现异常，给出养护意见;要求按照如下responseBody格式输出：{\"plant_name\": \"绿萝\", \"status\": \"健康\", \"suggestion\": \"您的植物状态良好！继续保持当前的养护方式，定期浇水，保持适当光照。建议每2-3天浇水一次，避免积水。\"}"
    # 读取 prompt.md 文件内容
    prompt_file_path = os.path.join(os.path.dirname(__file__), "prompt.md")
    try:
        with open(prompt_file_path, "r", encoding="utf-8") as f:
            prompt_content = f.read()
        print("----- 读取 prompt.md 内容 -----")
        print(prompt_content)
    except FileNotFoundError:
        print(f"警告: 未找到 prompt.md 文件，路径: {prompt_file_path}")
        prompt_content = default_prompt
    except Exception as e:
        print(f"警告: 读取 prompt.md 文件时出错: {e}")
        prompt_content = default_prompt
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
                    {"type": "text", "text": prompt_content}
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
            "scientific_name": "Unknown",
            "status": "无法识别",
            "problem_judgment": content if content else "无法获取诊断结果，请重试。",
            "severity": "轻度",
            "severityValue": DEFAULT_SEVERITY_VALUE,
            "handling_suggestions": ["请重新拍摄清晰的植物照片", "确保光线充足", "尽量拍摄叶片细节"],
            "need_product": False,
            "plant_introduction": "暂无植物信息"
        }

# 模拟 AI 推理过程 (实际开发时这里替换为你的 PyTorch/TensorFlow 模型)
def mock_ai_inference(image: Image.Image):
    # 根据新的响应格式返回模拟结果
    results = [
        # 结果1: 健康植物
        {
            "plant_name": "绿萝",
            "scientific_name": "Epipremnum aureum",
            "status": "健康",
            "problem_judgment": "植株长势良好，叶片翠绿无异常",
            "severity": "轻度",
            "severityValue": 30,
            "handling_suggestions": [
                "施加适量的液体肥料",
                "每月施肥一次，遵循薄肥勤施原则",
                "增加光照时间，促进光合作用"
            ],
            "need_product": False,
            "plant_introduction": "常见室内观叶植物，喜温暖湿润环境，耐阴性强。"
        },
        # 结果2: 缺水
        {
            "plant_name": "发财树",
            "scientific_name": "Pachira aquatica",
            "status": "缺水",
            "problem_judgment": "叶片下垂萎蔫，土壤干燥板结",
            "severity": "中度",
            "severityValue": 50,
            "handling_suggestions": [
                "立即浇透水，直至盆底有水流出",
                "放置在通风处，避免积水",
                "后续保持土壤微湿，不干不浇"
            ],
            "need_product": False,
            "plant_introduction": "热带观叶植物，耐旱性较强，喜温暖湿润环境。"
        },
        # 结果3: 虫害
        {
            "plant_name": "月季",
            "scientific_name": "Rosa chinensis",
            "status": "虫害",
            "problem_judgment": "叶片背面出现蚜虫，伴随叶片卷曲发黄",
            "severity": "中度",
            "severityValue": 50,
            "handling_suggestions": [
                "用清水冲洗叶片背面虫体",
                "喷施专用杀虫剂",
                "放置通风处减少虫害复发"
            ],
            "need_product": True,
            "plant_introduction": "常见观赏花卉，花期长，喜阳光充足环境。"
        },
        # 结果4: 缺肥
        {
            "plant_name": "吊兰",
            "scientific_name": "Chlorophytum comosum",
            "status": "缺肥",
            "problem_judgment": "叶片发黄，生长缓慢，缺乏光泽",
            "severity": "轻度",
            "severityValue": 30,
            "handling_suggestions": [
                "使用均衡型液态肥料，每2周施肥一次",
                "注意氮磷钾比例为20-20-20",
                "施肥后充分浇水，避免烧根"
            ],
            "need_product": True,
            "plant_introduction": "多年生常绿草本植物，适应性强，易养护。"
        },
        # 结果5: 光照不当
        {
            "plant_name": "海芋",
            "scientific_name": "Alocasia amazonica",
            "status": "光照不当",
            "problem_judgment": "叶片出现灼伤斑点，颜色变褐",
            "severity": "轻度",
            "severityValue": 30,
            "handling_suggestions": [
                "将植物移至散射光充足的位置",
                "避免阳光直射，特别是夏季中午",
                "定期旋转花盆，使植物均匀受光"
            ],
            "need_product": False,
            "plant_introduction": "热带观叶植物，叶片宽大，喜高温多湿环境。"
        },
        # 结果6: 病害
        {
            "plant_name": "龟背竹",
            "scientific_name": "Monstera deliciosa",
            "status": "病害",
            "problem_judgment": "叶片出现褐色斑点，边缘枯黄",
            "severity": "中度",
            "severityValue": 50,
            "handling_suggestions": [
                "及时清理病叶，避免病菌扩散",
                "使用杀菌剂喷洒叶片正反面",
                "改善通风条件，减少湿度"
            ],
            "need_product": True,
            "plant_introduction": "大型观叶植物，叶片独特，适合室内摆放。"
        }
    ]
    return random.choice(results)

@app.post("/predict", response_model=DetectionResult)
async def predict_plant_health(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 检查用户会员状态和检测次数
    membership = get_or_create_membership(db, current_user.id)
    membership = reset_monthly_detections_if_needed(db, membership)
    
    # 检查免费用户的检测次数限制
    if not membership.is_vip and membership.monthly_detections >= FREE_USER_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=403, 
            detail=f"本月检测次数已用完。免费用户每月最多可检测{FREE_USER_MONTHLY_LIMIT}次，请升级为VIP获得无限检测次数。"
        )
    
    # 验证文件类型
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="只支持 JPG 或 PNG 图片格式")

    try:
        # 读取图片字节并转换为 PIL 对象
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # 调用 AI 模型
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
                "scientific_name": "Unknown",
                "status": "无法识别",
                "problem_judgment": "无法识别植物健康状态",
                "severity": "轻度",
                "severityValue": DEFAULT_SEVERITY_VALUE,
                "handling_suggestions": ["请重新拍摄清晰的植物照片", "确保光线充足", "尽量拍摄叶片细节"],
                "need_product": False,
                "plant_introduction": str(prediction) if prediction else "无法获取植物信息"
            }
        
        # 返回检测结果
        result = DetectionResult(
            plant_name=prediction.get("plant_name", "未知植物"),
            scientific_name=prediction.get("scientific_name", "Unknown"),
            status=prediction.get("status", "无法识别"),
            problem_judgment=prediction.get("problem_judgment", "无法识别问题"),
            severity=prediction.get("severity", "轻度"),
            severityValue=prediction.get("severityValue", DEFAULT_SEVERITY_VALUE),
            handling_suggestions=prediction.get("handling_suggestions", ["请重新检测"]),
            need_product=prediction.get("need_product", False),
            plant_introduction=prediction.get("plant_introduction", "无植物信息")
        )
        
        # 增加检测次数（仅在成功检测后）
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