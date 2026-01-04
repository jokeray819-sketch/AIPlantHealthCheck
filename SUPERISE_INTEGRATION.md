# SupeRISE 钱包集成文档

## 概述

本系统已成功集成 SupeRISE 钱包，SupeRISE 是一款支持 Bitcoin 和 Nervos CKB 的安全多链钱包。用户现在可以使用 SupeRISE 钱包进行会员购买和商品支付。

## SupeRISE 介绍

SupeRISE 是专为 Bitcoin (BTC) 和 Nervos CKB 资产管理设计的安全、用户友好的区块链钱包。它提供：

- **多链支持**：同时管理 Bitcoin 和 Nervos CKB 资产
- **高级安全性**：银行级加密和私钥完全控制
- **移动优先**：为 Android 和 iOS 设备优化
- **实时更新**：快速交易和实时余额显示
- **投资组合追踪**：市场分析和投资组合管理

## 技术实现

### 前端集成

系统使用 `@ckb-ccc/connector-react` 库来集成 SupeRISE 钱包：

```javascript
import { ccc } from "@ckb-ccc/connector-react";

// 连接 SupeRISE 钱包
// SupeRISE 使用标准 CKB 签名协议，因此使用 CKB SignerType
const signer = new ccc.SignerCkbPublicKey(
  new ccc.ClientPublicTestnet(),
  ccc.SignerType.CKB
);

await signer.connect();
const address = await signer.getAddressObjs();
```

**注意**：SupeRISE 钱包兼容标准的 CKB 签名协议，因此在技术实现上使用 `ccc.SignerType.CKB`。用户在浏览器中安装 SupeRISE 扩展后，连接时会自动识别并使用 SupeRISE 钱包。

### 支持的功能

1. **会员购买**
   - 用户可以选择 CKB 钱包类型为 SupeRISE
   - 支持月度、季度、年度会员套餐
   - 使用 CKB 代币支付

2. **商品购买**
   - 在购物车结账时可选择 SupeRISE 钱包
   - 支持 CKB 代币支付商品

### 用户界面

在会员购买和商品结账页面，用户可以看到三种 CKB 钱包选项：

1. **JoyID** - Web 钱包
2. **UTXO 钱包** - Neuron 等桌面钱包
3. **SupeRISE** - BTC & CKB 多链钱包 ✨ 新增

## 使用流程

### 购买会员

1. 进入"我的"页面
2. 点击"升级为VIP"
3. 选择支付方式为"CKB"
4. 在 CKB 钱包类型中选择"SupeRISE"
5. 点击"连接钱包"
6. 在 SupeRISE 钱包中授权连接
7. 选择会员套餐
8. 确认支付

### 购买商品

1. 在商城页面添加商品到购物车
2. 点击购物车图标
3. 点击"去结算"
4. 选择支付方式为"CKB"
5. 在 CKB 钱包类型中选择"SupeRISE"
6. 点击"连接钱包"
7. 在 SupeRISE 钱包中授权连接
8. 确认支付

## 测试网络

当前系统使用 **CKB Testnet（测试网）** 进行交易。请确保：

- 在 SupeRISE 钱包中切换到测试网络
- 账户中有足够的测试网 CKB 代币
- 可以从 CKB 测试网水龙头获取测试代币

## 价格配置

会员套餐价格（CKB Testnet）：

- 月度会员：100 CKB (10,000,000,000 shannons)
- 季度会员：250 CKB (25,000,000,000 shannons)
- 年度会员：800 CKB (80,000,000,000 shannons)

商品支付：按照当前汇率换算
- 1 CNY ≈ 1 CKB (简化测试汇率)

## 安全性

1. **私钥安全**：私钥始终保存在用户的 SupeRISE 钱包中，系统不会接触私钥
2. **交易确认**：每笔交易都需要用户在 SupeRISE 钱包中手动确认
3. **地址验证**：系统验证 CKB 地址格式的正确性
4. **交易哈希验证**：每笔交易都会记录交易哈希用于追踪

## 故障排除

### 连接失败

**问题**：无法连接 SupeRISE 钱包

**解决方案**：
1. 确保已安装最新版本的 SupeRISE 钱包
2. 检查钱包是否已切换到测试网络
3. 尝试刷新页面后重新连接
4. 检查浏览器控制台是否有错误信息

### 交易失败

**问题**：支付时交易失败

**解决方案**：
1. 确保账户有足够的 CKB 余额
2. 检查网络连接是否正常
3. 确认是否在正确的网络（Testnet）
4. 重试交易

### 地址格式错误

**问题**：提示"无效的CKB钱包地址格式"

**解决方案**：
1. 确保使用的是 CKB 格式的地址（通常以 "ckb" 开头）
2. 确认地址长度符合要求（至少20个字符）
3. 检查地址是否包含特殊字符或空格

## 技术支持

如需帮助，请：

1. 查看 [SupeRISE 官方文档](https://www.superise.net/)
2. 参考 [CCC 集成文档](https://docs.ckbccc.com/)
3. 查看 [Nervos CKB 开发者资源](https://docs.nervos.org/)

## 后续计划

- [ ] 支持主网（Mainnet）交易
- [ ] 添加交易历史查询功能
- [ ] 集成更多 CKB 钱包类型
- [ ] 优化交易确认流程
- [ ] 添加交易状态实时监控

## 版本历史

### v1.0.0 (2026-01-04)
- ✅ 初始集成 SupeRISE 钱包
- ✅ 支持会员购买
- ✅ 支持商品购买
- ✅ 测试网环境部署
