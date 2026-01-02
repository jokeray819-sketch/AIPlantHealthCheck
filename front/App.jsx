import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ccc } from "@ckb-ccc/connector-react";

// 常量定义
const AI_ANALYSIS_DELAY = 1500; // AI分析页面显示时间（毫秒）
//const BASE_URL = 'http://192.168.11.252:8000';
const BASE_URL = 'http://127.0.0.1:8000';
// 区块链支付配置（生产环境应从环境变量读取）
const PAYMENT_RECIPIENT_ADDRESS = '0x84Ae0feD8a61E79920A9c01cb60D3c7da26Ea2A7'; // eth sepolia 收款地址

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
  
  // 会员相关状态
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [selectedWalletType, setSelectedWalletType] = useState('eth'); // 'eth' or 'ckb'
  const [selectedCkbWallet, setSelectedCkbWallet] = useState('joyid'); // 'joyid' or 'utxo'
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

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
      const response = await axios.get(`${BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCurrentUser(response.data);
      setIsAuthenticated(true);
      // 获取会员状态
      await fetchMembershipStatus(token);
    } catch (error) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  // 获取会员状态
  const fetchMembershipStatus = async (token) => {
    try {
      const response = await axios.get(`${BASE_URL}/membership/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMembershipStatus(response.data);
    } catch (error) {
      console.error('获取会员状态失败:', error);
      setMembershipStatus(null);
    }
  };

  // 用户注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/register`, {
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
      const response = await axios.post(`${BASE_URL}/login`, {
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
    setMembershipStatus(null);
    setResult(null);
    setPreview(null);
    setSelectedFile(null);
  };

  // 连接以太坊钱包
  const connectEthWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // 请求切换到Sepolia测试网
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia testnet chainId
          });
        } catch (switchError) {
          // 如果Sepolia网络不存在，添加它
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } else {
            throw switchError;
          }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        return accounts[0];
      } catch (error) {
        console.error('连接以太坊钱包失败:', error);
        alert('连接以太坊钱包失败，请确保已安装MetaMask并已解锁');
        return null;
      }
    } else {
      alert('请先安装MetaMask钱包插件！');
      return null;
    }
  };

  // 连接CKB钱包（使用CCC库）
  const connectCkbWallet = async () => {
    try {
      let signer;
      
      if (selectedCkbWallet === 'joyid') {
        // 使用CCC连接JoyID钱包（测试网）
        signer = new ccc.SignerCkbPublicKey(
          new ccc.ClientPublicTestnet(),
          ccc.SignerType.JoyID
        );
      } else if (selectedCkbWallet === 'utxo') {
        // 使用CCC连接UTXO钱包（如CKB官方钱包、Neuron等）（测试网）
        signer = new ccc.SignerCkbPublicKey(
          new ccc.ClientPublicTestnet(),
          ccc.SignerType.CKB
        );
      } else {
        throw new Error('不支持的CKB钱包类型');
      }
      
      // 连接钱包
      await signer.connect();
      
      // 获取地址
      const address = await signer.getAddressObjs();
      if (address && address.length > 0) {
        const addressStr = address[0].toString();
        setWalletAddress(addressStr);
        setWalletConnected(true);
        // 保存signer以便后续使用
        window.ckbSigner = signer;
        return addressStr;
      }
    } catch (error) {
      console.error('连接CKB钱包失败:', error);
      const walletName = selectedCkbWallet === 'joyid' ? 'JoyID' : 'UTXO';
      alert(`连接${walletName}钱包失败，请重试\n` + (error.message || ''));
      return null;
    }
  };

  // 连接钱包（根据选择的类型）
  const connectWallet = async () => {
    if (selectedWalletType === 'eth') {
      return await connectEthWallet();
    } else if (selectedWalletType === 'ckb') {
      return await connectCkbWallet();
    }
    return null;
  };

  // 购买会员
  const handlePurchaseMembership = async () => {
    if (!isAuthenticated) {
      alert('请先登录');
      setShowMembershipModal(false);
      setShowAuthModal(true);
      return;
    }

    setPurchaseLoading(true);
    try {
      // 如果钱包未连接，先连接
      let address = walletAddress;
      if (!walletConnected) {
        address = await connectWallet();
        if (!address) {
          setPurchaseLoading(false);
          return;
        }
      }

      let txHash;

      if (selectedWalletType === 'eth') {
        // 以太坊支付流程
        const pricesInWei = {
          monthly: '1000000000000000',    // 0.001 ETH
          quarterly: '2500000000000000',  // 0.0025 ETH
          yearly: '8000000000000000'      // 0.008 ETH
        };

        const transactionParameters = {
          to: PAYMENT_RECIPIENT_ADDRESS,
          from: address,
          value: '0x' + BigInt(pricesInWei[selectedPlan]).toString(16),
        };

        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });
      } else if (selectedWalletType === 'ckb') {
        // CKB支付流程（使用CCC库）
        const pricesInCKB = {
          monthly: '10000000000',      // 100 CKB (in shannons: 100 * 10^8)
          quarterly: '25000000000',    // 250 CKB
          yearly: '80000000000'        // 800 CKB
        };

        // 使用CCC发送CKB交易
        if (window.ckbSigner) {
          const signer = window.ckbSigner;
          
          // 构建交易
          const tx = ccc.Transaction.from({
            outputs: [{
              lock: await ccc.Address.fromString(PAYMENT_RECIPIENT_ADDRESS, signer.client).getScript(),
              capacity: ccc.fixedPointFrom(pricesInCKB[selectedPlan]),
            }],
          });
          
          // 完成交易（添加输入和找零）
          await tx.completeInputsByCapacity(signer);
          await tx.completeFeeBy(signer, 1000); // 1000 shannons/byte fee rate
          
          // 签名并发送交易
          txHash = await signer.sendTransaction(tx);
        } else {
          throw new Error('请先连接CKB钱包');
        }
      }

      console.log('交易哈希:', txHash);

      // 调用后端API确认购买
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}/membership/purchase`, {
        transaction_hash: txHash,
        wallet_address: address,
        plan: selectedPlan,
        wallet_type: selectedWalletType
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        alert(response.data.message);
        // 刷新会员状态
        await fetchMembershipStatus(token);
        setShowMembershipModal(false);
      }
    } catch (error) {
      console.error('购买失败:', error);
      if (error.code === 4001) {
        alert('您取消了交易');
      } else {
        alert(error.response?.data?.detail || error.message || '购买失败，请重试');
      }
    } finally {
      setPurchaseLoading(false);
    }
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
      const response = await axios.post(`${BASE_URL}/predict`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(response.data);
      
      // 刷新会员状态以更新剩余检测次数
      await fetchMembershipStatus(token);
      
      // 分析完成后跳转到诊断结果页面
      setTimeout(() => {
        setShowAnalyzingPage(false);
        setShowResultPage(true);
      }, AI_ANALYSIS_DELAY);
    } catch (error) {
      console.error("识别出错:", error);
      setShowAnalyzingPage(false);
      if (error.response?.status === 401) {
        alert("登录已过期，请重新登录");
        handleLogout();
      } else if (error.response?.status === 403) {
        alert(error.response?.data?.detail || "检测次数已用完");
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
    </div>
  );

  // 渲染拍照/上传页面
  const renderCapturePage = () => (
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
            <h3 className="text-lg font-bold text-dark mb-1">{result.plant_name}</h3>
            <p className="text-sm text-medium italic mb-2">{result.scientific_name}</p>
            <p className="text-sm text-dark">{result.plant_introduction}</p>
          </div>
          
          {/* 健康状况 */}
          <div className="bg-white rounded-lg p-4 mb-4 card-shadow">
            <h3 className="font-semibold text-dark mb-3">
              <i className="fas fa-heartbeat mr-2 text-danger"></i>
              健康状况
            </h3>
            
            <div className="mb-3">
              <p className="text-sm text-medium mb-1">问题判断</p>
              <p className="text-sm text-dark mb-2">{result.problem_judgment}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${result.status === '健康' ? 'bg-green-100 text-green-700' : 'bg-warning/20 text-warning'}`}>
                {result.status}
              </span>
            </div>
            
            {/* 严重程度 */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-medium">严重程度</p>
                <p className="text-sm font-medium text-dark">{result.severity}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    result.severityValue <= 30 ? 'bg-green-500' : 
                    result.severityValue <= 50 ? 'bg-yellow-500' : 
                    result.severityValue <= 80 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.severityValue}%` }}
                ></div>
              </div>
            </div>
            
            {/* 处理建议 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-secondary mb-2">
                <i className="fas fa-lightbulb mr-1"></i>
                处理建议
              </p>
              <ol className="text-sm text-dark space-y-1">
                {(result.handling_suggestions || []).map((suggestion, index) => (
                  <li key={index} className="flex">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          
          {/* 免责声明 */}
          <div className="text-xs text-medium text-center bg-white p-3 rounded-lg card-shadow mb-4">
            <p>免责声明：AI 建议仅供参考，不等同于专业医疗建议。</p>
            <p>如有严重问题，请咨询专业园艺师。</p>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-3 mb-3">
            <button 
              onClick={() => {
                alert('保存功能开发中...');
              }}
              className="flex-1 bg-white text-primary border border-primary py-3 rounded-lg font-medium btn-shadow transition hover:bg-primary/5"
            >
              <i className="fas fa-bookmark mr-2"></i>
              保存我的植物
            </button>
            <button 
              onClick={() => {
                setShowResultPage(false);
                setCurrentPage('shop');
              }}
              className="flex-1 bg-primary text-white py-3 rounded-lg font-medium btn-shadow transition hover:bg-primary/90"
            >
              <i className="fas fa-shopping-cart mr-2"></i>
              查看推荐产品
            </button>
          </div>
          
          <button 
            onClick={() => {
              setShowResultPage(false);
              setShowCapturePage(true);
              setPreview(null);
              setSelectedFile(null);
              setResult(null);
            }}
            className="w-full bg-gray-100 text-dark py-3 rounded-lg font-medium transition hover:bg-gray-200"
          >
            重新检测
          </button>
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
      {isAuthenticated && (
        <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-4 mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">会员状态</h3>
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
              {membershipStatus?.is_vip ? 'VIP用户' : '免费用户'}
            </span>
          </div>
          <p className="text-sm mb-3">
            本月剩余诊断次数: <span className="font-bold">
              {membershipStatus ? (
                membershipStatus.is_vip ? '无限' : `${membershipStatus.remaining_detections}/5`
              ) : '加载中...'}
            </span>
          </p>
          {!membershipStatus?.is_vip && (
            <button 
              onClick={() => setShowMembershipModal(true)}
              className="w-full bg-white text-primary font-medium py-2 rounded-lg btn-shadow transition hover:bg-white/90"
            >
              立即开通会员
            </button>
          )}
        </div>
      )}

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

        {/* 会员购买模态框 */}
        {showMembershipModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembershipModal(false)}>
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-dark">开通会员</h3>
                <button onClick={() => setShowMembershipModal(false)} className="text-medium" aria-label="关闭">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* 会员权益 */}
              <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-4 mb-6 text-white">
                <h4 className="font-bold text-lg mb-3">会员专属权益</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    <span>无限次植物健康检测</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    <span>优先使用最新AI模型</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    <span>专属会员标识</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    <span>7x24小时优先客服支持</span>
                  </div>
                </div>
              </div>

              {/* 支付方式选择 */}
              <div className="mb-6">
                <h4 className="font-semibold text-dark mb-3">选择支付方式</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => {
                      setSelectedWalletType('eth');
                      setWalletConnected(false);
                      setWalletAddress('');
                    }}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition text-center ${selectedWalletType === 'eth' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <div className="text-2xl mb-2">
                      <i className="fab fa-ethereum"></i>
                    </div>
                    <h5 className="font-semibold text-dark text-sm">以太坊</h5>
                    <p className="text-xs text-medium mt-1">Sepolia测试网</p>
                  </div>
                  <div 
                    onClick={() => {
                      setSelectedWalletType('ckb');
                      setWalletConnected(false);
                      setWalletAddress('');
                    }}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition text-center ${selectedWalletType === 'ckb' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <div className="text-2xl mb-2">
                      <i className="fas fa-coins"></i>
                    </div>
                    <h5 className="font-semibold text-dark text-sm">CKB</h5>
                    <p className="text-xs text-medium mt-1">Testnet测试网</p>
                  </div>
                </div>
              </div>

              {/* CKB钱包类型选择 - 仅在选择CKB时显示 */}
              {selectedWalletType === 'ckb' && (
                <div className="mb-6">
                  <h4 className="font-semibold text-dark mb-3">选择CKB钱包</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => {
                        setSelectedCkbWallet('joyid');
                        setWalletConnected(false);
                        setWalletAddress('');
                      }}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition text-center ${selectedCkbWallet === 'joyid' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                    >
                      <div className="text-xl mb-1">
                        <i className="fas fa-smile"></i>
                      </div>
                      <h5 className="font-semibold text-dark text-xs">JoyID</h5>
                      <p className="text-xs text-medium mt-1">Web钱包</p>
                    </div>
                    <div 
                      onClick={() => {
                        setSelectedCkbWallet('utxo');
                        setWalletConnected(false);
                        setWalletAddress('');
                      }}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition text-center ${selectedCkbWallet === 'utxo' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                    >
                      <div className="text-xl mb-1">
                        <i className="fas fa-wallet"></i>
                      </div>
                      <h5 className="font-semibold text-dark text-xs">UTXO钱包</h5>
                      <p className="text-xs text-medium mt-1">Neuron等</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 套餐选择 */}
              <div className="mb-6">
                <h4 className="font-semibold text-dark mb-3">选择套餐</h4>
                <div className="space-y-3">
                  <div 
                    onClick={() => setSelectedPlan('monthly')}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition ${selectedPlan === 'monthly' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-semibold text-dark">月度会员</h5>
                        <p className="text-sm text-medium">30天无限检测</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {selectedWalletType === 'eth' ? '0.001 ETH' : '100 CKB'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedPlan('quarterly')}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition relative ${selectedPlan === 'quarterly' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <span className="absolute top-2 right-2 bg-warning text-white text-xs px-2 py-0.5 rounded-full">优惠</span>
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-semibold text-dark">季度会员</h5>
                        <p className="text-sm text-medium">90天无限检测</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {selectedWalletType === 'eth' ? '0.0025 ETH' : '250 CKB'}
                        </p>
                        <p className="text-xs text-medium line-through">
                          {selectedWalletType === 'eth' ? '0.003 ETH' : '300 CKB'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSelectedPlan('yearly')}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition relative ${selectedPlan === 'yearly' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`}
                  >
                    <span className="absolute top-2 right-2 bg-danger text-white text-xs px-2 py-0.5 rounded-full">最划算</span>
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-semibold text-dark">年度会员</h5>
                        <p className="text-sm text-medium">365天无限检测</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {selectedWalletType === 'eth' ? '0.008 ETH' : '800 CKB'}
                        </p>
                        <p className="text-xs text-medium line-through">
                          {selectedWalletType === 'eth' ? '0.012 ETH' : '1200 CKB'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 钱包连接状态 */}
              {walletConnected && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                  <i className="fas fa-wallet"></i>
                  <span>钱包已连接: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              )}

              {/* 支付按钮 */}
              <button
                onClick={handlePurchaseMembership}
                disabled={purchaseLoading}
                className={`w-full py-3 rounded-lg font-medium text-white btn-shadow transition flex items-center justify-center gap-2 ${purchaseLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'}`}
              >
                <i className="fas fa-wallet"></i>
                <span>{purchaseLoading ? '处理中...' : walletConnected ? '确认支付' : '连接钱包并支付'}</span>
              </button>

              {/* 提示信息 */}
              <div className="mt-4 text-xs text-medium text-center">
                {selectedWalletType === 'eth' ? (
                  <>
                    <p>支付使用以太坊Sepolia测试网（MetaMask）</p>
                    <p className="mt-1">请确保您的钱包有足够的测试ETH余额</p>
                  </>
                ) : (
                  <>
                    <p>支付使用CKB钱包（{selectedCkbWallet === 'joyid' ? 'JoyID' : 'UTXO钱包'}）</p>
                    <p className="mt-1">请确保您的钱包有足够的CKB余额</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
