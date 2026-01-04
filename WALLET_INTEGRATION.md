# CKB Wallet Integration Guide

## 概述 (Overview)

本项目已成功集成 CKB 钱包支持，包括 JoyID 和 UTXO 钱包。集成基于 CCC (Common Cryptocurrency Components) 库实现。

This project has successfully integrated CKB wallet support, including JoyID and UTXO wallets. The integration is based on the CCC (Common Cryptocurrency Components) library.

## 参考文档 (Reference Documentation)

- **CCC 官方文档**: https://docs.ckbccc.com/
- **使用的包**: `@ckb-ccc/connector-react@^0.0.19`

## 支持的钱包 (Supported Wallets)

### 1. JoyID
- **类型**: Web 钱包
- **特点**: 无密码认证（生物识别/密钥）
- **平台**: 跨平台（桌面、移动）
- **适用场景**: 适合需要快速、安全访问且无需管理私钥的用户

### 2. UTXO 钱包
- **示例**: Neuron、CKB CLI 等
- **类型**: 完整钱包应用
- **平台**: 桌面应用
- **适用场景**: 适合需要完全控制私钥和 UTXO 的高级用户

## 技术实现 (Technical Implementation)

### 1. Provider 配置

在 `front/main.jsx` 中，使用 CCC Provider 包装应用：

```jsx
import { ccc } from "@ckb-ccc/connector-react";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ccc.Provider>
      <App />
    </ccc.Provider>
  </React.StrictMode>,
)
```

### 2. React Hooks 使用

在 `front/App.jsx` 中使用 CCC 提供的 hooks：

```jsx
const { open: openConnector, disconnect, client, wallet, signerInfo } = ccc.useCcc();
const signer = ccc.useSigner();
```

### 3. 连接钱包

```jsx
const connectCkbWallet = async () => {
  try {
    // 打开 CCC 内置的钱包选择器
    await openConnector();
    
    if (signer) {
      const addresses = await signer.getAddresses();
      if (addresses && addresses.length > 0) {
        setWalletAddress(addresses[0]);
        setWalletConnected(true);
        return addresses[0];
      }
    }
    return null;
  } catch (error) {
    console.error('连接钱包失败:', error);
    return null;
  }
};
```

### 4. 构建交易

```jsx
// 构建 CKB 交易
const tx = ccc.Transaction.from({
  outputs: [{
    lock: await ccc.Address.fromString(recipientAddress, client).getScript(),
    capacity: priceInShannons,
  }],
});

// 完成交易（添加输入和找零）
await tx.completeInputsByCapacity(signer);
await tx.completeFeeBy(signer, 1000); // 费率: 1000 shannons/byte

// 签名并发送
const txHash = await signer.sendTransaction(tx);
```

## 使用说明 (Usage Instructions)

### 用户端

1. **连接钱包**
   - 点击"连接钱包并支付"按钮
   - 系统会自动显示所有可用的钱包
   - 选择您想使用的钱包（JoyID 或 UTXO 钱包）
   - 按照钱包的提示完成连接

2. **支付流程**
   - 添加商品到购物车
   - 进入结算页面
   - 选择 CKB 作为支付方式
   - 如未连接钱包，点击按钮连接
   - 确认交易详情
   - 在钱包中签名交易

3. **会员购买**
   - 选择会员套餐
   - 选择 CKB 支付
   - 连接钱包（如未连接）
   - 确认支付金额
   - 完成交易

### 开发者端

#### 安装依赖

```bash
cd front
npm install
```

#### 本地开发

```bash
npm run dev
```

应用将在 http://localhost:3000 或 http://localhost:3001 启动

#### 构建生产版本

```bash
npm run build
```

## 网络配置 (Network Configuration)

- **网络**: CKB Testnet（测试网）
- **RPC**: 使用 CCC 的默认测试网端点
- **脚本**: 使用 CCC 库的 TESTNET_SCRIPTS

## 安全考虑 (Security Considerations)

1. ✅ 私钥永远不会存储在应用中
2. ✅ 所有交易参数都经过验证
3. ✅ 签名前显示交易详情
4. ✅ 验证收款地址
5. ✅ 开发/测试使用测试网
6. ⚠️ 建议：生产环境实施交易金额限制
7. ⚠️ 建议：大额交易添加确认对话框

## 故障排除 (Troubleshooting)

### 问题：钱包选择器没有出现
**解决方案**:
- 检查 Provider 是否正确包装在 main.jsx 中
- 查看浏览器控制台错误信息
- 确认已安装钱包插件/应用

### 问题："请先连接CKB钱包"错误
**解决方案**:
- 确保在发送交易前钱包已连接
- 检查 signer 对象是否可用
- 验证钱包连接状态

### 问题：交易失败
**解决方案**:
- 确认有足够的 CKB 余额
- 检查网络是否设置为测试网
- 验证收款地址格式正确
- 查看交易详细错误信息

### 问题：地址未显示
**解决方案**:
- 检查 signer.getAddresses() 返回有效地址
- 验证钱包已正确连接
- 检查 useEffect 依赖项

## API 参考 (API Reference)

### useCcc() Hook

返回对象包含：
- `open`: 打开钱包连接器的函数
- `disconnect`: 断开钱包连接的函数
- `client`: CKB 客户端实例
- `wallet`: 当前连接的钱包信息
- `signerInfo`: 签名器信息

### useSigner() Hook

返回：
- `signer`: 当前钱包的签名器实例，用于签署交易

### 常用方法

```typescript
// 获取地址
const addresses = await signer.getAddresses();

// 构建交易
const tx = ccc.Transaction.from({ outputs: [...] });

// 完成交易输入
await tx.completeInputsByCapacity(signer);

// 设置手续费
await tx.completeFeeBy(signer, feeRate);

// 发送交易
const txHash = await signer.sendTransaction(tx);

// 解析地址
const addressObj = await ccc.Address.fromString(address, client);
const script = addressObj.getScript();
```

## 测试建议 (Testing Recommendations)

### 手动测试清单

- [ ] 钱包连接流程
  - [ ] JoyID 连接
  - [ ] UTXO 钱包连接
  - [ ] 钱包地址正确显示
  
- [ ] 支付流程
  - [ ] 购物车结算
  - [ ] CKB 支付选择
  - [ ] 交易提交成功
  - [ ] 交易哈希接收
  
- [ ] 会员购买
  - [ ] 套餐选择
  - [ ] CKB 支付
  - [ ] 交易完成
  
- [ ] 钱包断开
  - [ ] 登出时断开
  - [ ] 地址清除

### 浏览器测试

- Chrome/Edge（扩展支持）
- 移动浏览器（JoyID 移动流程）
- 弹窗未被拦截验证

## 未来增强 (Future Enhancements)

1. 在页头添加钱包连接状态指示器
2. UI 中显示钱包余额
3. 从钱包添加交易历史
4. 支持主网配置
5. 自定义 RPC 端点配置
6. 实施交易确认轮询
7. 多语言支持优化
8. 添加钱包切换功能

## 更新日志 (Changelog)

### v1.0.0 (2026-01-04)
- ✅ 集成 CCC Provider
- ✅ 实现 JoyID 钱包支持
- ✅ 实现 UTXO 钱包支持
- ✅ 更新交易构建逻辑
- ✅ 添加钱包状态同步
- ✅ 更新 UI 显示
- ✅ 通过安全检查

## 贡献指南 (Contributing)

如需对钱包集成进行改进：

1. 遵循现有代码风格
2. 确保所有测试通过
3. 更新相关文档
4. 提交 Pull Request 前进行充分测试
5. 在测试网上验证更改

## 许可证 (License)

本项目遵循主项目的许可证。

## 联系方式 (Contact)

如有问题或建议，请通过 GitHub Issues 联系。

---

**注意**: 本文档会随着功能更新而更新。请定期检查最新版本。
