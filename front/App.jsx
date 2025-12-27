import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 认证相关状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState('login'); // 'login' 或 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser(token);
    }
  }, []);

  // 获取当前用户信息
  const fetchCurrentUser = async (token) => {
    try {
      const response = await axios.get('http://localhost:8000/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  // 用户注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/register', {
        username,
        email,
        password
      });
      alert('注册成功！请登录');
      setShowAuthForm('login');
      setPassword('');
    } catch (error) {
      alert(error.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 用户登录
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/login', {
        username,
        password
      });
      const token = response.data.access_token;
      localStorage.setItem('token', token);
      await fetchCurrentUser(token);
      setUsername('');
      setPassword('');
      setEmail('');
    } catch (error) {
      alert(error.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 用户登出
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setResult(null);
    setPreview(null);
    setSelectedFile(null);
  };

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
    
    const token = localStorage.getItem('token');

    setLoading(true);
    try {
      // 这里的 URL 对应 FastAPI 的地址
      const response = await axios.post('http://localhost:8000/predict', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(response.data);
    } catch (error) {
      console.error("识别出错:", error);
      if (error.response?.status === 401) {
        alert("登录已过期，请重新登录");
        handleLogout();
      } else {
        alert("服务器连接失败，请检查后端是否启动");
      }
    } finally {
      setLoading(false);
    }
  };

  // 未登录时显示登录/注册表单
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-green-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-green-800 mb-8">🌿 AI 植物健康助手</h1>
        
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="flex mb-6 border-b">
            <button
              className={`flex-1 py-2 ${showAuthForm === 'login' ? 'border-b-2 border-green-600 text-green-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setShowAuthForm('login')}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 ${showAuthForm === 'register' ? 'border-b-2 border-green-600 text-green-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setShowAuthForm('register')}
            >
              注册
            </button>
          </div>

          {showAuthForm === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  minLength="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  minLength="6"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 已登录时显示主应用
  return (
    <div className="min-h-screen bg-green-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-800">🌿 AI 植物健康助手</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">欢迎, {currentUser?.username}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          >
            登出
          </button>
        </div>
      </div>

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