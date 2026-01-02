# 会员功能使用说明

## 功能概述

本项目新增了会员购买功能，用户可以通过区块链钱包支付开通VIP会员，享受无限次植物健康检测等专属权益。

**支持的支付方式：**
- ✅ **以太坊 (ETH)** - 通过MetaMask钱包，Sepolia测试网
- ✅ **CKB** - 通过CCC库集成多种CKB钱包，CKB测试网
  - **JoyID钱包** - Web端轻量级钱包（测试网）
  - **UTXO钱包** - Neuron等原生CKB钱包（测试网）

## 功能特性

### 会员权益
- ✅ **无限次植物健康检测** - VIP用户不受每月5次的检测限制
- ✅ **优先使用最新AI模型** - 优先体验最新的植物识别技术
- ✅ **专属会员标识** - 在个人中心显示VIP标识
- ✅ **7x24小时优先客服支持** - 优先获得技术支持

### 套餐选择

#### 以太坊支付 (Sepolia测试网)
1. **月度会员** - 0.001 ETH / 30天
2. **季度会员** - 0.0025 ETH / 90天（优惠）
3. **年度会员** - 0.008 ETH / 365天（最划算）

#### CKB支付 (CKB测试网)
1. **月度会员** - 100 CKB / 30天
2. **季度会员** - 250 CKB / 90天（优惠）
3. **年度会员** - 800 CKB / 365天（最划算）

## 使用流程

### 前端操作

1. **登录账号**
   - 用户必须先登录才能购买会员

2. **进入会员购买页面**
   - 在"我的"页面点击"立即开通会员"按钮
   - 弹出会员购买模态框

3. **选择支付方式**
   - 选择以太坊(ETH)或CKB支付
   - 以太坊使用Sepolia测试网
   - CKB使用测试网（Testnet）

4. **选择CKB钱包类型（仅CKB支付）**
   - **JoyID钱包** - 无需下载，Web端直接使用
   - **UTXO钱包** - Neuron等原生CKB钱包

5. **选择套餐**
   - 在模态框中选择月度、季度或年度会员套餐
   - 价格会根据选择的支付方式自动切换

6. **连接钱包并支付**
   - 点击"连接钱包并支付"按钮
   - **以太坊用户**: 浏览器提示连接MetaMask，自动切换到Sepolia测试网
   - **CKB用户**: 
     - JoyID - 浏览器自动唤起JoyID认证页面
     - UTXO钱包 - 连接Neuron等CKB原生钱包
   - 确认钱包连接后，会自动发起支付交易
   - 在钱包中确认交易

7. **完成购买**
   - 交易确认后，后端自动升级用户为VIP
   - 会员状态即时更新

### 后端接口

#### 1. 获取会员状态
```http
GET /membership/status
Authorization: Bearer <token>
```

响应：
```json
{
  "is_vip": false,
  "monthly_detections": 3,
  "remaining_detections": 2
}
```

#### 2. 购买会员
```http
POST /membership/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "transaction_hash": "0x1234567890abcdef...",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // 以太坊地址
  "plan": "monthly",
  "wallet_type": "eth"  // "eth" 或 "ckb"
}
```

**CKB支付示例:**
```json
{
  "transaction_hash": "0x1234567890abcdef...",
  "wallet_address": "ckb1qyqr...",  // CKB地址
  "plan": "monthly",
  "wallet_type": "ckb"
}
```
  "transaction_hash": "0x1234567890abcdef...",
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "plan": "monthly"
}
```

响应：
```json
{
  "success": true,
  "message": "恭喜！您已成功开通monthly会员",
  "is_vip": true
}
```

## 技术实现

### 前端技术
- **React Hooks** - 使用useState管理会员状态和模态框
- **MetaMask** - 使用window.ethereum API进行以太坊钱包连接和支付
- **CCC (CKB Connector)** - 使用@ckb-ccc/connector-react进行CKB钱包集成
- **多钱包支持** - 通过CCC库支持JoyID和UTXO钱包
- **Axios** - 调用后端API确认支付

### 后端技术
- **FastAPI** - RESTful API框架
- **Pydantic** - 数据验证
- **SQLAlchemy** - 数据库ORM

### 区块链集成
- **以太坊** - 使用以太坊Sepolia测试网进行支付，通过MetaMask
- **CKB** - 使用CCC库进行UTXO交易构建和签名（测试网）
  - CCC (CKBers' Codebase): https://github.com/ckb-devrel/ccc
  - 使用`@ckb-ccc/connector-react`包
  - 连接到CKB测试网（ClientPublicTestnet）
  - **JoyID钱包**: SignerCkbPublicKey + SignerType.JoyID
  - **UTXO钱包**: SignerCkbPublicKey + SignerType.CKB (Neuron等)
  - 自动完成UTXO输入选择和找零计算
- 交易哈希存储在后端用于验证

## 安全说明

### 当前实现（演示版本）
- 后端接收交易哈希后直接升级用户为VIP
- **不进行链上交易验证**

### 生产环境改进建议
1. **验证交易真实性**
   - **以太坊**: 使用Web3.js或ethers.js验证交易是否存在于Sepolia测试网
   - **CKB**: 使用CCC的client查询链上交易状态
   - 验证交易接收地址是否正确
   - 验证交易金额是否符合套餐价格

2. **防止重复使用**
   - 将已使用的交易哈希存储在数据库
   - 检查交易哈希是否已被使用

3. **交易确认**
   - **以太坊**: 等待交易被区块链确认（建议至少6个确认）
   - **CKB**: 等待交易上链并确认（建议至少24个确认）
   - 监听交易状态变化

4. **错误处理**
   - 处理交易失败情况
   - 实现退款机制
   - 添加交易超时处理

## 环境要求

### 前端
- **以太坊支付**: 浏览器需安装MetaMask插件，钱包需有足够的测试ETH余额
- **CKB支付**: 
  - **JoyID**: 浏览器支持，无需安装，自动唤起Web钱包
  - **UTXO钱包**: 需安装Neuron或其他CKB原生钱包
- **依赖包**: `@ckb-ccc/connector-react` (已包含在package.json中)

### 后端
- Python 3.8+
- FastAPI
- SQLAlchemy
- MySQL数据库

## CCC集成代码示例

### 连接JoyID钱包
```javascript
import { ccc } from "@ckb-ccc/connector-react";

const connectJoyID = async () => {
  // 创建JoyID类型的signer（测试网）
  const signer = new ccc.SignerCkbPublicKey(
    new ccc.ClientPublicTestnet(),
    ccc.SignerType.JoyID
  );
  
  // 连接钱包
  await signer.connect();
  
  // 获取地址
  const addresses = await signer.getAddressObjs();
  return addresses[0].toString();
};
```

### 连接UTXO钱包
```javascript
import { ccc } from "@ckb-ccc/connector-react";

const connectUTXOWallet = async () => {
  // 创建CKB（UTXO）类型的signer（测试网）
  const signer = new ccc.SignerCkbPublicKey(
    new ccc.ClientPublicTestnet(),
    ccc.SignerType.CKB  // 用于Neuron等原生钱包
  );
  
  // 连接钱包
  await signer.connect();
  
  // 获取地址
  const addresses = await signer.getAddressObjs();
  return addresses[0].toString();
};
```

### 发送CKB交易
```javascript
// 构建交易
const tx = ccc.Transaction.from({
  outputs: [{
    lock: await ccc.Address.fromString(recipientAddress, signer.client).getScript(),
    capacity: ccc.fixedPointFrom("10000000000"), // 100 CKB in shannons
  }],
});

// 自动完成输入和找零
await tx.completeInputsByCapacity(signer);
await tx.completeFeeBy(signer, 1000); // fee rate

// 签名并发送
const txHash = await signer.sendTransaction(tx);
```

## 测试指南

### 前提条件
1. 安装MetaMask浏览器插件
2. 创建或导入测试钱包
3. 切换到测试网络（如Sepolia或Goerli）
4. 获取测试ETH（从测试网faucet）

### 后端测试
```bash
# 启动后端服务
cd backend
python main.py

# 测试会员状态接口
curl -X GET http://localhost:8000/membership/status \
  -H "Authorization: Bearer <your_token>"

# 测试会员购买接口
curl -X POST http://localhost:8000/membership/purchase \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "plan": "monthly"
  }'
```

### 前端测试
```bash
# 启动前端服务
cd front
npm run dev

# 访问 http://localhost:3000
# 1. 注册/登录账号
# 2. 进入"我的"页面
# 3. 点击"立即开通会员"
# 4. 选择套餐并完成支付流程
```

### 测试钱包支付
1. 安装MetaMask浏览器插件
2. 创建或导入测试钱包
3. 切换到测试网络（如Sepolia）
4. 获取测试ETH（从faucet）
5. 在应用中尝试购买会员

### 验证会员状态
1. 购买成功后，检查"我的"页面会员状态
2. 尝试进行植物检测，验证无限次检测功能
3. 查看个人中心的VIP标识

## 注意事项

1. **测试环境**
   - 建议先在以太坊测试网（Sepolia、Goerli）进行测试
   - 不要在主网使用真实资金测试

2. **Gas费用**
   - 实际支付金额 = 套餐价格 + Gas费
   - Gas费用根据网络拥堵情况动态变化

3. **交易延迟**
   - 区块链交易需要时间确认
   - 当前实现未等待交易确认，可能存在风险

4. **钱包安全**
   - 妥善保管私钥和助记词
   - 不要在不安全的环境使用钱包

## 未来改进方向

1. **支付网关优化**
   - 集成Layer 2解决方案降低gas费
   - 支持多种加密货币支付
   - 添加法币支付选项

2. **会员管理**
   - 添加会员到期时间
   - 实现自动续费功能
   - 提供会员优惠码

3. **用户体验**
   - 添加支付进度提示
   - 优化钱包连接流程
   - 提供详细的支付帮助文档

## 相关文件

- 前端：`/front/App.jsx`
- 后端：`/backend/main.py`
- 数据模型：`/backend/models.py`
- API模式：`/backend/schemas.py`

## 联系支持

如有问题，请联系开发团队或提交Issue。
