import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  // 页面导航状态
  const [currentPage, setCurrentPage] = useState('detection'); // 'detection', 'shop', 'profile'
  const [showCapturePage, setShowCapturePage] = useState(false); // 显示拍照/上传页面
  const [showAnalyzingPage, setShowAnalyzingPage] = useState(false); // 显示AI分析中页面
  const [showResultPage, setShowResultPage] = useState(false); // 显示诊断结果页面
  
  // 植物识别相关状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 认证相关状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState('login'); // 'login' 或 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Refs for file inputs
  const fileInputRef = useRef(null);
  const captureFileInputRef = useRef(null);

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
      setShowAuthModal(false);
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
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  // 提交到后端
  const handleSubmit = async () => {
    if (!selectedFile) return alert("请先选择一张图片");

    // 进入AI分析中页面
    setShowCapturePage(false);
    setShowAnalyzingPage(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const token = localStorage.getItem('token');

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/predict', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(response.data);
      
      // 分析完成后跳转到诊断结果页面
      setTimeout(() => {
        setShowAnalyzingPage(false);
        setShowResultPage(true);
      }, 1500); // 模拟分析过程，1.5秒后显示结果
    } catch (error) {
      console.error("识别出错:", error);
      setShowAnalyzingPage(false);
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

  // 渲染健康检测页面
  const renderDetectionPage = () => (
    <div className="p-4 pb-20">
      {/* 顶部横幅 */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        <h1 className="text-3xl font-bold mb-2 text-shadow relative z-10">AI植物医生</h1>
        <p className="text-lg mb-4 relative z-10">一秒识别植物健康问题，智能提供解决方案</p>
        <div className="flex flex-wrap gap-2 relative z-10">
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">50+植物品种</span>
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">5大类问题识别</span>
          <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">专业养护建议</span>
        </div>
      </div>

      {/* 核心功能展示 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-dark mb-4">核心功能</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-4 card-shadow">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
              <i className="fas fa-leaf text-xl"></i>
            </div>
            <h3 className="font-semibold text-dark mb-1 text-sm">品种识别</h3>
            <p className="text-xs text-medium">识别50+常见室内植物</p>
          </div>
          <div className="bg-white rounded-lg p-4 card-shadow">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning mx-auto mb-2">
              <i className="fas fa-stethoscope text-xl"></i>
            </div>
            <h3 className="font-semibold text-dark mb-1 text-sm">健康诊断</h3>
            <p className="text-xs text-medium">5大类问题精准判断</p>
          </div>
          <div className="bg-white rounded-lg p-4 card-shadow">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-2">
              <i className="fas fa-lightbulb text-xl"></i>
            </div>
            <h3 className="font-semibold text-dark mb-1 text-sm">智能建议</h3>
            <p className="text-xs text-medium">3步解决植物问题</p>
          </div>
        </div>
      </div>

      {/* 检测按钮 */}
      <div className="flex flex-col gap-4 mb-8">
        <button 
          onClick={() => setShowCapturePage(true)}
          className="bg-primary text-white py-5 px-6 rounded-lg flex items-center justify-center gap-2 btn-shadow transition hover:bg-primary/90 text-lg"
        >
          <i className="fas fa-camera text-2xl"></i>
          <span>立即拍照检测</span>
        </button>
        <button 
          onClick={() => setShowCapturePage(true)}
          className="bg-white text-primary border border-primary py-5 px-6 rounded-lg flex items-center justify-center gap-2 btn-shadow transition hover:bg-primary/5 text-lg"
        >
          <i className="fas fa-upload text-2xl"></i>
          <span>上传图片检测</span>
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          onChange={handleFileChange} 
          className="hidden"
          accept="image/*"
        />
      </div>

      {/* 核心功能展示 */}
      <div className="mb-8">
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setShowCapturePage(false)} className="text-medium p-2">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="text-xl font-bold text-dark">拍摄植物照片</h2>
        <div className="w-8"></div>
      </div>
      
      {/* 拍照指导 */}
      <div className="bg-blue-50 text-secondary p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-1">拍摄建议</h3>
        <ul className="text-sm space-y-1">
          <li>• 确保植物光线充足</li>
          <li>• 聚焦在有问题的叶片上</li>
          <li>• 保持相机稳定，避免模糊</li>
          <li>• 尽量填满画面，减少背景干扰</li>
        </ul>
      </div>
      
      {/* 预览区域 */}
      <div className="w-full h-64 bg-gray-200 rounded-lg mb-4 overflow-hidden relative">
        {preview ? (
          <img src={preview} alt="预览图" className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <i className="fas fa-camera text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-500">选择照片进行检测</p>
          </div>
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex justify-center gap-6 mb-4">
        <button 
          onClick={() => captureFileInputRef.current?.click()}
          className="bg-gray-200 text-dark p-3 rounded-full"
        >
          <i className="fas fa-image text-xl"></i>
        </button>
        <button 
          onClick={() => {
            if (preview) {
              handleSubmit();
            } else {
              captureFileInputRef.current?.click();
            }
          }}
          className="bg-primary text-white p-6 rounded-full btn-shadow text-2xl"
        >
          <i className="fas fa-camera"></i>
        </button>
        <button 
          onClick={() => {
            setPreview(null);
            setSelectedFile(null);
          }}
          className="bg-gray-200 text-dark p-3 rounded-full"
        >
          <i className="fas fa-redo text-xl"></i>
        </button>
      </div>
      
      <input 
        ref={captureFileInputRef}
        type="file" 
        onChange={(e) => {
          handleFileChange(e);
        }}
        className="hidden"
        accept="image/*"
        capture="environment"
      />
      
      <p className="text-center text-sm text-medium">点击相机图标进行拍照或从相册选择</p>
    </div>
  );

  // 渲染AI分析中页面
  const renderAnalyzingPage = () => (
    <div className="p-4 pb-20 min-h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        {/* 分析动画 */}
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-8 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-microscope text-4xl text-primary"></i>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-dark mb-2">AI 分析中</h2>
        <p className="text-medium mb-8">正在识别植物健康状况...</p>
        
        {/* 分析步骤 */}
        <div className="space-y-3 text-left max-w-xs mx-auto">
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg card-shadow">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
              <i className="fas fa-check"></i>
            </div>
            <span className="text-dark">图像预处理</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg card-shadow">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <span className="text-dark">AI 模型分析</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg card-shadow opacity-50">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white">
              <i className="fas fa-clock"></i>
            </div>
            <span className="text-medium">生成诊断报告</span>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染诊断结果页面
  const renderResultPage = () => (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => {
          setShowResultPage(false);
          setPreview(null);
          setSelectedFile(null);
          setResult(null);
        }} className="text-medium p-2">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="text-xl font-bold text-dark">诊断结果</h2>
        <div className="w-8"></div>
      </div>
      
      {result && (
        <>
          {/* 植物图片 */}
          {preview && (
            <div className="mb-4">
              <img src={preview} alt="植物照片" className="w-full h-48 object-cover rounded-lg" />
            </div>
          )}
          
          {/* 植物信息 */}
          <div className="bg-white rounded-lg p-4 mb-4 card-shadow">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-dark">{result.plant_name}</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                置信度: {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* 健康状况 */}
          <div className="bg-white rounded-lg p-4 mb-4 card-shadow">
            <h3 className="font-semibold text-dark mb-3">
              <i className="fas fa-heartbeat mr-2 text-danger"></i>
              健康状况
            </h3>
            
            <div className="mb-3">
              <p className="text-sm text-medium mb-1">问题判断</p>
              <p className="font-medium text-dark">
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${result.status === '健康' ? 'bg-green-100 text-green-700' : 'bg-warning/20 text-warning'}`}>
                  {result.status}
                </span>
              </p>
            </div>
            
            {/* 处理建议 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-secondary mb-2">
                <i className="fas fa-lightbulb mr-1"></i>
                处理建议
              </p>
              <p className="text-sm text-dark">{result.treatment_suggestion}</p>
            </div>
          </div>
          
          {/* 免责声明 */}
          <div className="text-xs text-medium text-center bg-white p-3 rounded-lg card-shadow mb-4">
            <p>免责声明：AI 建议仅供参考，不等同于专业医疗建议。</p>
            <p>如有严重问题，请咨询专业园艺师。</p>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setShowResultPage(false);
                setShowCapturePage(true);
                setPreview(null);
                setSelectedFile(null);
                setResult(null);
              }}
              className="flex-1 bg-white text-primary border border-primary py-3 rounded-lg font-medium btn-shadow transition hover:bg-primary/5"
            >
              重新检测
            </button>
            <button 
              onClick={() => {
                setShowResultPage(false);
                setPreview(null);
                setSelectedFile(null);
                setResult(null);
              }}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-medium btn-shadow transition hover:bg-primary/90"
            >
              返回首页
            </button>
          </div>
        </>
      )}
    </div>
  );

  // 渲染商城页面
  const renderShopPage = () => (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-dark">商城</h2>
        <button className="text-secondary p-2 relative">
          <i className="fas fa-shopping-cart"></i>
          <span className="absolute top-0 right-0 w-4 h-4 bg-danger rounded-full text-white text-xs flex items-center justify-center">0</span>
        </button>
      </div>
      
      {/* 商品分类 */}
      <div className="flex overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        <button className="bg-primary text-white px-4 py-2 rounded-full text-sm whitespace-nowrap mr-3">全部商品</button>
        <button className="bg-white text-dark px-4 py-2 rounded-full text-sm whitespace-nowrap mr-3 card-shadow">肥料</button>
        <button className="bg-white text-dark px-4 py-2 rounded-full text-sm whitespace-nowrap mr-3 card-shadow">杀虫剂</button>
        <button className="bg-white text-dark px-4 py-2 rounded-full text-sm whitespace-nowrap mr-3 card-shadow">土壤改良</button>
        <button className="bg-white text-dark px-4 py-2 rounded-full text-sm whitespace-nowrap card-shadow">工具</button>
      </div>
      
      {/* 推荐商品 */}
      <div className="mb-6">
        <h3 className="font-semibold text-dark mb-3">为您推荐</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg overflow-hidden card-shadow">
            <div className="w-full h-32 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <i className="fas fa-leaf text-white text-4xl"></i>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-dark text-sm mb-1">植物营养液</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-accent font-bold">¥29.9</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">适用: 缺肥</span>
              </div>
              <button className="w-full bg-primary/10 text-primary text-sm py-1.5 rounded flex items-center justify-center">
                <i className="fas fa-shopping-cart mr-1"></i>
                <span>加入购物车</span>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg overflow-hidden card-shadow">
            <div className="w-full h-32 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <i className="fas fa-bug text-white text-4xl"></i>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-dark text-sm mb-1">杀虫剂</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-accent font-bold">¥39.9</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">适用: 虫害</span>
              </div>
              <button className="w-full bg-primary/10 text-primary text-sm py-1.5 rounded flex items-center justify-center">
                <i className="fas fa-shopping-cart mr-1"></i>
                <span>加入购物车</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 热门商品 */}
      <div>
        <h3 className="font-semibold text-dark mb-3">热门商品</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg overflow-hidden card-shadow">
            <div className="w-full h-32 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <i className="fas fa-tint text-white text-4xl"></i>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-dark text-sm mb-1">有机营养土</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-accent font-bold">¥49.9</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">土壤改良</span>
              </div>
              <button className="w-full bg-primary/10 text-primary text-sm py-1.5 rounded flex items-center justify-center">
                <i className="fas fa-shopping-cart mr-1"></i>
                <span>加入购物车</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg overflow-hidden card-shadow">
            <div className="w-full h-32 bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
              <i className="fas fa-medkit text-white text-4xl"></i>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-dark text-sm mb-1">植物修复剂</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-accent font-bold">¥35.9</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">病害治疗</span>
              </div>
              <button className="w-full bg-primary/10 text-primary text-sm py-1.5 rounded flex items-center justify-center">
                <i className="fas fa-shopping-cart mr-1"></i>
                <span>加入购物车</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染我的页面
  const renderProfilePage = () => (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-dark">我的</h2>
        <button className="text-medium p-2">
          <i className="fas fa-cog"></i>
        </button>
      </div>
      
      {/* 用户信息 */}
      <div className="bg-white rounded-lg p-4 mb-6 card-shadow flex items-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl mr-4">
          <i className="fas fa-user"></i>
        </div>
        <div className="flex-1">
          {isAuthenticated ? (
            <>
              <h3 className="font-semibold text-dark">{currentUser?.username}</h3>
              <p className="text-sm text-medium mb-2">{currentUser?.email}</p>
              <button onClick={handleLogout} className="bg-gray-200 text-dark text-sm px-4 py-1.5 rounded btn-shadow transition hover:bg-gray-300">
                退出登录
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-dark">未登录</h3>
              <p className="text-sm text-medium mb-2">登录后享受更多功能</p>
              <button onClick={() => setShowAuthModal(true)} className="bg-primary text-white text-sm px-4 py-1.5 rounded btn-shadow transition hover:bg-primary/90">
                登录/注册
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* 快捷入口 */}
      <div className="bg-white rounded-lg p-4 mb-6 card-shadow">
        <h3 className="font-semibold text-dark mb-3">快捷入口</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <button className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-success mb-1">
              <i className="fas fa-leaf"></i>
            </div>
            <span className="text-xs text-dark">我的植物</span>
          </button>
          <button className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-secondary mb-1">
              <i className="fas fa-history"></i>
            </div>
            <span className="text-xs text-dark">诊断历史</span>
          </button>
          <button className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-warning mb-1">
              <i className="fas fa-bell"></i>
            </div>
            <span className="text-xs text-dark">提醒消息</span>
          </button>
          <button className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
              <i className="fas fa-cog"></i>
            </div>
            <span className="text-xs text-dark">设置</span>
          </button>
        </div>
      </div>
      
      {/* 会员信息 */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-4 mb-6 text-white">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">会员状态</h3>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">免费用户</span>
        </div>
        <p className="text-sm mb-3">本月剩余诊断次数: <span className="font-bold">5/5</span></p>
        <button className="w-full bg-white text-primary font-medium py-2 rounded-lg btn-shadow transition hover:bg-white/90">
          立即开通会员
        </button>
      </div>

      {/* 功能列表 */}
      <div className="bg-white rounded-lg overflow-hidden mb-6 card-shadow">
        <div className="divide-y divide-gray-100">
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-secondary mr-3">
                <i className="fas fa-history"></i>
              </div>
              <span className="text-dark">诊断历史</span>
            </div>
            <i className="fas fa-angle-right text-gray-400"></i>
          </button>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-success mr-3">
                <i className="fas fa-trophy"></i>
              </div>
              <span className="text-dark">我的成就</span>
            </div>
            <i className="fas fa-angle-right text-gray-400"></i>
          </button>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-warning mr-3">
                <i className="fas fa-question-circle"></i>
              </div>
              <span className="text-dark">帮助与反馈</span>
            </div>
            <i className="fas fa-angle-right text-gray-400"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-md bg-white min-h-screen relative">
        {/* 页面内容 */}
        {showAnalyzingPage ? renderAnalyzingPage() : 
         showResultPage ? renderResultPage() :
         showCapturePage ? renderCapturePage() : (
          <>
            {currentPage === 'detection' && renderDetectionPage()}
            {currentPage === 'shop' && renderShopPage()}
            {currentPage === 'profile' && renderProfilePage()}
          </>
        )}

        {/* 底部导航栏 */}
        {!showCapturePage && !showAnalyzingPage && !showResultPage && (
          <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around py-2 z-10">
          <button
            className={`flex flex-col items-center justify-center px-4 py-1 ${currentPage === 'detection' ? 'text-primary' : 'text-medium'}`}
            onClick={() => setCurrentPage('detection')}
          >
            <i className="fas fa-camera text-lg"></i>
            <span className="text-xs mt-1">健康检测</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center px-4 py-1 ${currentPage === 'shop' ? 'text-primary' : 'text-medium'}`}
            onClick={() => setCurrentPage('shop')}
          >
            <i className="fas fa-shopping-bag text-lg"></i>
            <span className="text-xs mt-1">商城</span>
          </button>
          <button
            className={`flex flex-col items-center justify-center px-4 py-1 ${currentPage === 'profile' ? 'text-primary' : 'text-medium'}`}
            onClick={() => setCurrentPage('profile')}
          >
            <i className="fas fa-user text-lg"></i>
            <span className="text-xs mt-1">我的</span>
          </button>
        </nav>
        )}

        {/* 登录/注册模态框 */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAuthModal(false)}>
            <div className="bg-white rounded-lg w-full max-w-sm p-6" role="dialog" aria-labelledby="auth-modal-title" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 id="auth-modal-title" className="text-xl font-bold text-dark">{showAuthForm === 'login' ? '登录' : '注册'}</h3>
                <button onClick={() => setShowAuthModal(false)} className="text-medium" aria-label="关闭">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="flex mb-6 border-b">
                <button
                  className={`flex-1 py-2 ${showAuthForm === 'login' ? 'border-b-2 border-primary text-primary font-bold' : 'text-medium'}`}
                  onClick={() => setShowAuthForm('login')}
                >
                  登录
                </button>
                <button
                  className={`flex-1 py-2 ${showAuthForm === 'register' ? 'border-b-2 border-primary text-primary font-bold' : 'text-medium'}`}
                  onClick={() => setShowAuthForm('register')}
                >
                  注册
                </button>
              </div>

              {showAuthForm === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-medium mb-1">
                      <i className="fas fa-user mr-1"></i>用户名
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-medium mb-1">
                      <i className="fas fa-lock mr-1"></i>密码
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-medium text-white btn-shadow transition ${loading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'}`}
                  >
                    {loading ? '登录中...' : '登录'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-medium mb-1">
                      <i className="fas fa-user mr-1"></i>用户名
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      minLength="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-medium mb-1">
                      <i className="fas fa-envelope mr-1"></i>邮箱
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-medium mb-1">
                      <i className="fas fa-lock mr-1"></i>密码
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      minLength="6"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-medium text-white btn-shadow transition ${loading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'}`}
                  >
                    {loading ? '注册中...' : '注册'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
