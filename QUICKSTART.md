# 快速开始指南

## 🎯 项目已完成并运行！

### ✅ 当前状态
- ✅ 智能合约已部署到 N42 测试网
- ✅ 前端应用正在运行
- ✅ 示例市场已创建并初始化

---

## 🚀 立即开始使用

### 1. 访问前端应用

打开浏览器访问：**http://localhost:5173/**

### 2. 配置 MetaMask 钱包

#### 添加 N42 测试网络

在 MetaMask 中手动添加网络：

```
网络名称：N42 Test Network
RPC URL：https://testrpc.n42.world
Chain ID：1142
货币符号：N
区块浏览器：https://testnet.n42.world/
```

或者点击前端的 "Switch to N42" 按钮自动添加。

### 3. 获取测试代币

#### N 代币（用于 Gas 费）
访问水龙头：https://n42.ai/faucet
输入您的钱包地址领取测试 N 代币

#### PRED 代币（用于交易）
1. 连接钱包到前端应用
2. 在控制台执行：
```javascript
// 或者直接在前端调用合约的 claimFromFaucet()
```

每24小时可领取 100 PRED 代币

### 4. 开始交易

1. 在首页查看所有市场
2. 点击市场卡片进入详情页
3. 选择 YES 或 NO
4. 输入交易金额
5. 点击购买按钮
6. 在 MetaMask 中确认交易

---

## 📊 已部署的合约地址

```json
{
  "PredictionToken": "0x38A70c040CA5F5439ad52d0e821063b0EC0B52b6",
  "MarketFactory": "0x54B8d8E2455946f2A5B8982283f2359812e815ce",
  "示例市场": "0x6B2031b6519268e623CA05F3683708Ed6C6F89df"
}
```

### 示例市场信息
- **问题**：Will BTC reach $100k by end of 2026?
- **当前价格**：
  - YES: 58.98%
  - NO: 41.02%
- **流动性**：101.65 PRED
- **状态**：Active ✅

---

## 🛠️ 开发命令

### 后端（智能合约）

```bash
# 编译合约
npm run compile

# 运行测试
npm test

# 部署到 N42 测试网
npm run deploy

# 查询市场
npm run query-markets

# 创建新市场
npm run create-market "Your question?" 30 100

# 测试交易
npm run test-trade

# 交互式控制台
npm run console
```

### 前端（React 应用）

```bash
cd frontend

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 🔍 功能说明

### 市场列表页（首页）
- 显示所有活跃和已结束的市场
- 实时价格更新（Yes/No 概率）
- 市场状态和倒计时
- 流动性信息

### 市场详情页
- 完整的市场信息
- 实时价格图表（Yes/No）
- 交易界面
  - 选择 Yes 或 No
  - 输入交易金额
  - 查看预期收益
  - 执行交易
- 用户持仓显示
- 流动性池信息

### Portfolio 页面
- 钱包余额（N 和 PRED）
- 所有持仓市场
- 历史交易记录

---

## 🎮 使用示例

### 场景 1：购买 Yes 份额

1. 访问 http://localhost:5173/
2. 连接 MetaMask
3. 点击示例市场："Will BTC reach $100k by end of 2026?"
4. 选择 **YES**
5. 输入金额：`10` PRED
6. 点击 "Buy YES"
7. 在 MetaMask 确认两次交易：
   - Approve PRED 代币
   - Buy Shares
8. 交易成功后，价格会上涨

### 场景 2：查看持仓

1. 点击顶部导航 "Portfolio"
2. 查看 PRED 余额
3. 查看所有参与的市场
4. 点击市场可查看详细持仓

---

## 🔐 安全提醒

- ⚠️ 这是测试网环境，仅用于学习和测试
- ⚠️ 不要在测试网钱包中存放真实资产
- ⚠️ 私钥已在 `.env` 中，确保不要提交到 Git
- ⚠️ 生产环境需要额外的安全措施

---

## 🐛 常见问题

### Q: 为什么交易失败？
A: 检查以下几点：
- 是否有足够的 N 代币支付 Gas
- 是否有足够的 PRED 代币
- 是否在正确的网络（N42 测试网）
- 是否授权了代币（Approve）

### Q: 价格如何计算？
A: 使用恒定乘积做市商（CPMM）公式：
```
Yes Price = noPool / (yesPool + noPool)
No Price = yesPool / (yesPool + noPool)
```
购买 Yes 会减少 yesPool，增加 noPool，从而提高 Yes 价格。

### Q: 如何创建新市场？
A: 使用命令：
```bash
npm run create-market "Your question?" 30 1000
```
参数：问题、持续时间（天）、初始流动性（PRED）

### Q: 前端无法连接合约？
A: 检查：
1. MetaMask 是否连接
2. 是否在 N42 测试网
3. 合约地址是否正确（查看 `frontend/src/contracts/deployment.json`）

---

## 📚 技术栈

### 后端
- Solidity 0.8.27
- Hardhat
- OpenZeppelin Contracts
- ethers.js v6

### 前端
- React 19 + TypeScript
- Vite 7
- TailwindCSS
- React Router v7
- ethers.js v6

---

## 🔗 有用链接

- **前端应用**：http://localhost:5173/
- **N42 浏览器**：https://testnet.n42.world/
- **N42 水龙头**：https://n42.ai/faucet
- **Token 合约**：https://testnet.n42.world/address/0x38A70c040CA5F5439ad52d0e821063b0EC0B52b6
- **Factory 合约**：https://testnet.n42.world/address/0x54B8d8E2455946f2A5B8982283f2359812e815ce
- **示例市场**：https://testnet.n42.world/address/0x6B2031b6519268e623CA05F3683708Ed6C6F89df

---

## 🎉 享受交易！

现在您可以：
1. ✅ 查看实时市场价格
2. ✅ 买卖 Yes/No 份额
3. ✅ 查看持仓和余额
4. ✅ 创建新的预测市场
5. ✅ 体验完整的 DApp 流程

**祝您交易愉快！** 🚀
