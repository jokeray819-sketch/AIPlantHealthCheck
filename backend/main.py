from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, date, datetime
import io
import random
import os
import base64
import json
import re
import uuid
from pathlib import Path
from volcenginesdkarkruntime import Ark
from typing import List

from database import engine, get_db, Base
from models import User, Membership, DiagnosisHistory, MyPlant, Reminder
from schemas import (
    UserRegister, UserLogin, Token, UserResponse, DetectionResult, 
    MembershipResponse, MembershipPurchaseRequest, MembershipPurchaseResponse,
    DiagnosisHistoryResponse, MyPlantCreate, MyPlantUpdate, MyPlantResponse,
    ReminderCreate, ReminderUpdate, ReminderResponse
)
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

# 提醒类型映射
REMINDER_TYPE_MAPPING = {
    "浇水提醒": "watering",
    "复查提醒": "re_examination"
}

# 图片存储配置
IMAGES_DIR = Path(__file__).parent / "images"
IMAGES_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI 植物健康检测 API")

# 静态文件服务（用于提供图片访问）
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

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

def check_vip_access(db: Session, user_id: int) -> bool:
    """检查用户是否为VIP"""
    membership = get_or_create_membership(db, user_id)
    if not membership.is_vip:
        raise HTTPException(
            status_code=403,
            detail="此功能仅限VIP用户使用，请升级为VIP获得完整功能访问权限。"
        )
    return True

async def save_image(file: UploadFile) -> str:
    """保存上传的图片并返回URL"""
    # 验证文件扩展名
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。仅支持: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # 读取文件内容
    contents = await file.read()
    
    # 验证文件大小
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大。最大支持 {MAX_IMAGE_SIZE / 1024 / 1024}MB"
        )
    
    # 生成唯一文件名
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = IMAGES_DIR / unique_filename
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # 返回可访问的URL路径
    return f"/images/{unique_filename}"

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

@app.post("/membership/purchase", response_model=MembershipPurchaseResponse)
async def purchase_membership(
    purchase_data: MembershipPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """购买会员（通过区块链钱包支付）"""
    import re
    
    # 验证钱包类型
    valid_wallet_types = ["eth", "ckb"]
    if purchase_data.wallet_type not in valid_wallet_types:
        raise HTTPException(status_code=400, detail="无效的钱包类型")
    
    # 根据钱包类型验证交易哈希和地址格式
    if purchase_data.wallet_type == "eth":
        # 以太坊交易哈希：0x + 64位十六进制
        tx_hash_pattern = r'^0x[a-fA-F0-9]{64}$'
        if not re.match(tx_hash_pattern, purchase_data.transaction_hash):
            raise HTTPException(status_code=400, detail="无效的以太坊交易哈希格式")
        
        # 以太坊地址：0x + 40位十六进制
        wallet_pattern = r'^0x[a-fA-F0-9]{40}$'
        if not re.match(wallet_pattern, purchase_data.wallet_address):
            raise HTTPException(status_code=400, detail="无效的以太坊钱包地址格式")
    elif purchase_data.wallet_type == "ckb":
        # CKB交易哈希：0x + 64位十六进制（与以太坊相同格式）
        tx_hash_pattern = r'^0x[a-fA-F0-9]{64}$'
        if not re.match(tx_hash_pattern, purchase_data.transaction_hash):
            raise HTTPException(status_code=400, detail="无效的CKB交易哈希格式")
        
        # CKB地址：通常以ckb开头，较长的地址
        # 这里简化验证，实际应使用CKB SDK验证
        if not purchase_data.wallet_address or len(purchase_data.wallet_address) < 20:
            raise HTTPException(status_code=400, detail="无效的CKB钱包地址格式")
    
    # 验证会员套餐类型
    valid_plans = ["monthly", "quarterly", "yearly"]
    if purchase_data.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="无效的会员套餐类型")
    
    # 套餐名称映射
    plan_names = {
        "monthly": "月度",
        "quarterly": "季度",
        "yearly": "年度"
    }
    
    # 在实际生产环境中，这里应该：
    # 1. 验证区块链交易是否真实存在
    # 2. 验证交易金额是否正确
    # 3. 验证交易是否已被确认
    # 4. 防止重复使用同一交易哈希
    # 
    # 对于ETH: 验证Sepolia测试网交易
    # 对于CKB: 验证Nervos Network交易
    # 
    # 为了演示，我们直接将用户升级为VIP
    
    try:
        # 获取或创建会员记录
        membership = get_or_create_membership(db, current_user.id)
        
        # 升级为VIP
        membership.is_vip = True
        db.commit()
        db.refresh(membership)
        
        wallet_type_name = "以太坊" if purchase_data.wallet_type == "eth" else "CKB"
        return MembershipPurchaseResponse(
            success=True,
            message=f"恭喜！您已通过{wallet_type_name}钱包成功开通{plan_names[purchase_data.plan]}会员",
            is_vip=True
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"会员开通失败: {str(e)}")

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
            "plant_introduction": "常见室内观叶植物，喜温暖湿润环境，耐阴性强。",
            "reminder_type": "浇水提醒",
            "reminder_reason": "绿萝喜湿润环境，定期浇水可保持土壤湿度，促进植株健康生长。",
            "reminder_days": 5
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
            "plant_introduction": "热带观叶植物，耐旱性较强，喜温暖湿润环境。",
            "reminder_type": "浇水提醒",
            "reminder_reason": "发财树补水后需要定期浇水，避免再次干旱导致叶片萎蔫。",
            "reminder_days": 7
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
            "plant_introduction": "常见观赏花卉，花期长，喜阳光充足环境。",
            "reminder_type": "复查提醒",
            "reminder_reason": "喷施杀虫剂后需要观察效果，确认虫害是否得到控制，避免虫害复发或扩散。",
            "reminder_days": 5
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
            "plant_introduction": "多年生常绿草本植物，适应性强，易养护。",
            "reminder_type": "复查提醒",
            "reminder_reason": "施肥后需要观察植株生长情况，确认营养是否充足，叶片是否恢复正常。",
            "reminder_days": 10
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
            "plant_introduction": "热带观叶植物，叶片宽大，喜高温多湿环境。",
            "reminder_type": "复查提醒",
            "reminder_reason": "光照调整后需要观察叶片恢复情况，确认新位置光照是否合适，避免持续灼伤。",
            "reminder_days": 7
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
            "plant_introduction": "大型观叶植物，叶片独特，适合室内摆放。",
            "reminder_type": "复查提醒",
            "reminder_reason": "使用杀菌剂治疗后需要观察病害是否得到控制，防止病菌扩散到其他叶片。",
            "reminder_days": 5
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
        # 读取图片数据一次，用于保存和AI分析
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # 保存图片（使用已读取的数据）
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = IMAGES_DIR / unique_filename
        with open(file_path, "wb") as f:
            f.write(image_data)
        image_url = f"/images/{unique_filename}"
        
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
            plant_introduction=prediction.get("plant_introduction", "无植物信息"),
            reminder_type=prediction.get("reminder_type", "无"),
            reminder_reason=prediction.get("reminder_reason", ""),
            reminder_days=prediction.get("reminder_days", 0)
        )
        
        # 保存诊断历史
        diagnosis_history = DiagnosisHistory(
            user_id=current_user.id,
            plant_name=result.plant_name,
            scientific_name=result.scientific_name,
            status=result.status,
            problem_judgment=result.problem_judgment,
            severity=result.severity,
            severity_value=result.severityValue,
            handling_suggestions=json.dumps(result.handling_suggestions, ensure_ascii=False),
            need_product=result.need_product,
            plant_introduction=result.plant_introduction,
            image_url=image_url  # 保存图片URL
        )
        db.add(diagnosis_history)
        
        # 增加检测次数（仅在成功检测后）
        membership.monthly_detections += 1
        
        # 一起提交，确保原子性
        db.commit()
        db.refresh(diagnosis_history)  # 刷新以获取生成的ID
        
        # 添加诊断ID到结果中
        result.diagnosis_id = diagnosis_history.id
        
        # 自动创建提醒（如果AI建议需要提醒）
        if result.reminder_type and result.reminder_type != "无" and result.reminder_days > 0:
            # 计算提醒日期
            scheduled_date = datetime.now() + timedelta(days=result.reminder_days)
            
            # 确定提醒类型映射
            reminder_type_en = REMINDER_TYPE_MAPPING.get(result.reminder_type, "re_examination")
            
            # 创建提醒标题和消息
            title = f"{result.reminder_type}: {result.plant_name}"
            message = result.reminder_reason or f"建议{result.reminder_days}天后{'浇水' if reminder_type_en == 'watering' else '复查'}"
            
            # 创建提醒
            auto_reminder = Reminder(
                user_id=current_user.id,
                plant_id=None,  # 暂时不关联具体植物，用户可以后续添加到"我的植物"
                reminder_type=reminder_type_en,
                title=title,
                message=message,
                reminder_reason=result.reminder_reason,
                scheduled_date=scheduled_date
            )
            db.add(auto_reminder)
            db.commit()
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

# ==================== 诊断历史相关路由 ====================

@app.get("/diagnosis-history", response_model=List[DiagnosisHistoryResponse])
async def get_diagnosis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """获取当前用户的诊断历史（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    histories = db.query(DiagnosisHistory).filter(
        DiagnosisHistory.user_id == current_user.id
    ).order_by(DiagnosisHistory.created_at.desc()).offset(skip).limit(limit).all()
    return histories

@app.get("/diagnosis-history/{history_id}", response_model=DiagnosisHistoryResponse)
async def get_diagnosis_history_by_id(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定诊断历史详情（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    history = db.query(DiagnosisHistory).filter(
        DiagnosisHistory.id == history_id,
        DiagnosisHistory.user_id == current_user.id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="诊断历史不存在")
    
    return history

@app.delete("/diagnosis-history/{history_id}")
async def delete_diagnosis_history(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除指定诊断历史"""
    history = db.query(DiagnosisHistory).filter(
        DiagnosisHistory.id == history_id,
        DiagnosisHistory.user_id == current_user.id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="诊断历史不存在")
    
    db.delete(history)
    db.commit()
    return {"message": "诊断历史已删除"}

# ==================== 我的植物相关路由 ====================

@app.get("/my-plants", response_model=List[MyPlantResponse])
async def get_my_plants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有植物（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    plants = db.query(MyPlant).filter(
        MyPlant.user_id == current_user.id
    ).order_by(MyPlant.created_at.desc()).all()
    return plants

@app.get("/my-plants/{plant_id}", response_model=MyPlantResponse)
async def get_my_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定植物详情（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    plant = db.query(MyPlant).filter(
        MyPlant.id == plant_id,
        MyPlant.user_id == current_user.id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="植物不存在")
    
    return plant

@app.post("/my-plants", response_model=MyPlantResponse)
async def create_my_plant(
    plant: MyPlantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新的植物记录（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    # 如果提供了diagnosis_id，验证并获取诊断历史信息
    if plant.diagnosis_id:
        diagnosis = db.query(DiagnosisHistory).filter(
            DiagnosisHistory.id == plant.diagnosis_id,
            DiagnosisHistory.user_id == current_user.id
        ).first()
        
        if not diagnosis:
            raise HTTPException(status_code=404, detail="诊断历史不存在")
        
        # 如果未提供植物信息，从诊断历史中获取
        if not plant.plant_name:
            plant.plant_name = diagnosis.plant_name
        if not plant.scientific_name:
            plant.scientific_name = diagnosis.scientific_name
        if not plant.status:
            plant.status = diagnosis.status
        if not plant.image_url:
            plant.image_url = diagnosis.image_url
    
    # 计算下次浇水日期
    next_watering_date = None
    if plant.watering_frequency and plant.last_watered:
        next_watering_date = plant.last_watered + timedelta(days=plant.watering_frequency)
    
    new_plant = MyPlant(
        user_id=current_user.id,
        plant_name=plant.plant_name,
        scientific_name=plant.scientific_name,
        nickname=plant.nickname,
        status=plant.status,
        last_diagnosis_id=plant.diagnosis_id,  # 绑定诊断历史
        image_url=plant.image_url,
        notes=plant.notes,
        watering_frequency=plant.watering_frequency,
        last_watered=plant.last_watered,
        next_watering_date=next_watering_date
    )
    
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    
    # 如果设置了浇水频率，创建浇水提醒
    if next_watering_date:
        watering_reminder = Reminder(
            user_id=current_user.id,
            plant_id=new_plant.id,
            reminder_type="watering",
            title=f"浇水提醒: {plant.nickname or plant.plant_name}",
            message=f"该给 {plant.nickname or plant.plant_name} 浇水了！",
            reminder_reason=f"根据{plant.watering_frequency}天的浇水周期，需要定期补充水分以保持土壤湿度。",
            scheduled_date=datetime.combine(next_watering_date, datetime.min.time())
        )
        db.add(watering_reminder)
        db.commit()
    
    return new_plant

@app.put("/my-plants/{plant_id}", response_model=MyPlantResponse)
async def update_my_plant(
    plant_id: int,
    plant_update: MyPlantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新植物信息（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    plant = db.query(MyPlant).filter(
        MyPlant.id == plant_id,
        MyPlant.user_id == current_user.id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="植物不存在")
    
    # 更新字段
    update_data = plant_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plant, field, value)
    
    # 更新下次浇水日期
    if plant.watering_frequency and plant.last_watered:
        plant.next_watering_date = plant.last_watered + timedelta(days=plant.watering_frequency)
        
        # 更新或创建浇水提醒
        existing_reminder = db.query(Reminder).filter(
            Reminder.plant_id == plant_id,
            Reminder.reminder_type == "watering",
            Reminder.is_completed == False
        ).first()
        
        if existing_reminder:
            existing_reminder.scheduled_date = datetime.combine(plant.next_watering_date, datetime.min.time())
            existing_reminder.title = f"浇水提醒: {plant.nickname or plant.plant_name}"
            existing_reminder.message = f"该给 {plant.nickname or plant.plant_name} 浇水了！"
            existing_reminder.reminder_reason = f"根据{plant.watering_frequency}天的浇水周期，需要定期补充水分以保持土壤湿度。"
        else:
            new_reminder = Reminder(
                user_id=current_user.id,
                plant_id=plant_id,
                reminder_type="watering",
                title=f"浇水提醒: {plant.nickname or plant.plant_name}",
                message=f"该给 {plant.nickname or plant.plant_name} 浇水了！",
                reminder_reason=f"根据{plant.watering_frequency}天的浇水周期，需要定期补充水分以保持土壤湿度。",
                scheduled_date=datetime.combine(plant.next_watering_date, datetime.min.time())
            )
            db.add(new_reminder)
    
    db.commit()
    db.refresh(plant)
    return plant

@app.delete("/my-plants/{plant_id}")
async def delete_my_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除植物（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    plant = db.query(MyPlant).filter(
        MyPlant.id == plant_id,
        MyPlant.user_id == current_user.id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="植物不存在")
    
    db.delete(plant)
    db.commit()
    return {"message": "植物已删除"}

@app.post("/my-plants/{plant_id}/water")
async def water_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """记录浇水（仅VIP用户）"""
    check_vip_access(db, current_user.id)
    
    plant = db.query(MyPlant).filter(
        MyPlant.id == plant_id,
        MyPlant.user_id == current_user.id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="植物不存在")
    
    # 更新浇水记录
    plant.last_watered = date.today()
    if plant.watering_frequency:
        plant.next_watering_date = plant.last_watered + timedelta(days=plant.watering_frequency)
        
        # 标记当前浇水提醒为已完成
        db.query(Reminder).filter(
            Reminder.plant_id == plant_id,
            Reminder.reminder_type == "watering",
            Reminder.is_completed == False
        ).update({"is_completed": True})
        
        # 创建下次浇水提醒
        new_reminder = Reminder(
            user_id=current_user.id,
            plant_id=plant_id,
            reminder_type="watering",
            title=f"浇水提醒: {plant.nickname or plant.plant_name}",
            message=f"该给 {plant.nickname or plant.plant_name} 浇水了！",
            reminder_reason=f"根据{plant.watering_frequency}天的浇水周期，需要定期补充水分以保持土壤湿度。",
            scheduled_date=datetime.combine(plant.next_watering_date, datetime.min.time())
        )
        db.add(new_reminder)
    
    db.commit()
    db.refresh(plant)
    return {"message": "浇水记录已更新", "next_watering_date": plant.next_watering_date}

# ==================== 提醒相关路由 ====================

@app.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    reminder_type: str = None,
    is_completed: bool = None
):
    """获取当前用户的提醒"""
    query = db.query(Reminder).filter(Reminder.user_id == current_user.id)
    
    if reminder_type:
        query = query.filter(Reminder.reminder_type == reminder_type)
    
    if is_completed is not None:
        query = query.filter(Reminder.is_completed == is_completed)
    
    reminders = query.order_by(Reminder.scheduled_date).all()
    return reminders

@app.get("/reminders/unread-count")
async def get_unread_reminders_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取未读提醒数量（提醒规则：执行日期在3天内的提醒都会显示）"""
    current_time = datetime.now()
    three_days_later = current_time + timedelta(days=3)
    
    count = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_read == False,
        Reminder.is_completed == False,
        Reminder.scheduled_date <= three_days_later  # 执行日期在3天内的都要提醒
    ).count()
    return {"unread_count": count}

@app.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新提醒"""
    new_reminder = Reminder(
        user_id=current_user.id,
        plant_id=reminder.plant_id,
        reminder_type=reminder.reminder_type,
        title=reminder.title,
        message=reminder.message,
        reminder_reason=reminder.reminder_reason,
        scheduled_date=reminder.scheduled_date
    )
    
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    return new_reminder

@app.put("/reminders/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新提醒状态"""
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id
    ).first()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="提醒不存在")
    
    update_data = reminder_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reminder, field, value)
    
    db.commit()
    db.refresh(reminder)
    return reminder

@app.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除提醒"""
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id
    ).first()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="提醒不存在")
    
    db.delete(reminder)
    db.commit()
    return {"message": "提醒已删除"}

@app.post("/reminders/create-reexamination/{plant_id}")
async def create_reexamination_reminder(
    plant_id: int,
    days: int = 7,  # Default: remind after 7 days
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """为指定植物创建复查提醒"""
    plant = db.query(MyPlant).filter(
        MyPlant.id == plant_id,
        MyPlant.user_id == current_user.id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="植物不存在")
    
    scheduled_date = datetime.now() + timedelta(days=days)
    
    new_reminder = Reminder(
        user_id=current_user.id,
        plant_id=plant_id,
        reminder_type="re_examination",
        title=f"复查提醒: {plant.nickname or plant.plant_name}",
        message=f"建议再次拍照检查 {plant.nickname or plant.plant_name} 的健康状况",
        reminder_reason=f"经过{days}天的养护，需要检查植物恢复情况，确认问题是否得到解决。",
        scheduled_date=scheduled_date
    )
    
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    return new_reminder

# ==================== 图片上传相关路由 ====================

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """上传植物图片（所有登录用户可用，用于植物诊断）"""
    image_url = await save_image(file)
    return {"image_url": image_url, "message": "图片上传成功"}

@app.get("/")
def read_root():
    return {"message": "植物健康检测系统运行中"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)