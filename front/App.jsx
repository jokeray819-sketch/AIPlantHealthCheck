import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 处理文件选择
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // 创建本地预览链接
      setResult(null);
    }
  };

  // 提交到后端
  const handleSubmit = async () => {
    if (!selectedFile) return alert("请先选择一张图片");

    const formData = new FormData();
    formData.append('file', selectedFile);

    setLoading(true);
    try {
      // 这里的 URL 对应 FastAPI 的地址
      const response = await axios.post('http://localhost:8000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error("识别出错:", error);
      alert("服务器连接失败，请检查后端是否启动");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-green-800 mb-8">🌿 AI 植物健康助手</h1>

      {/* 上传区域 */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md border-2 border-dashed border-green-200 text-center">
        {preview ? (
          <img src={preview} alt="预览" className="max-h-64 mx-auto rounded-lg mb-4" />
        ) : (
          <div className="py-12 text-gray-400">请上传植物叶片照片</div>
        )}
        
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 mb-4"
          accept="image/*"
        />

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {loading ? '识别中...' : '开始智能检测'}
        </button>
      </div>

      {/* 结果展示区域 */}
      {result && (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg w-full max-w-md animate-fade-in">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">检测报告</h2>
          <div className="space-y-3">
            <p><span className="font-semibold text-gray-600">植物名称：</span> {result.plant_name}</p>
            <p>
              <span className="font-semibold text-gray-600">健康状态：</span> 
              <span className={`ml-2 px-2 py-1 rounded text-sm ${result.status === '健康' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result.status}
              </span>
            </p>
            <p><span className="font-semibold text-gray-600">置信度：</span> {(result.confidence * 100).toFixed(1)}%</p>
            <div className="bg-orange-50 p-4 rounded-lg mt-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">💡 处理建议：</p>
              <p className="text-sm text-orange-700">{result.treatment_suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;