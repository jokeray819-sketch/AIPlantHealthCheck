from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
import io
import random

app = FastAPI(title="AI 植物健康检测 API")

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 定义返回的数据结构
class DetectionResult(BaseModel):
    plant_name: str
    status: str
    confidence: float
    treatment_suggestion: str

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
async def predict_plant_health(file: UploadFile = File(...)):
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