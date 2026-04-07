# MongoDB 数据库设计文档（简化版）

## 数据库信息

- **数据库名**: `sports_betting`
- **MongoDB版本**: 8.2.3

---

## 集合设计

### 1. matches - 比赛表

```javascript
{
  _id: ObjectId,
  
  matchId: String,                  // 比赛ID（唯一）
  
  // 联赛信息
  league: String,                   // 联赛名称
  leagueIcon: String,               // 联赛图标（emoji）
  
  // 球队
  homeTeam: String,                 // 主队名称
  awayTeam: String,                 // 客队名称
  
  // 比分
  homeScore: Number,                // 主队得分
  awayScore: Number,                // 客队得分
  
  // 比赛状态
  status: String,                   // upcoming/live/finished
  period: String,                   // 上半场/下半场/中场休息
  minute: Number,                   // 当前分钟
  
  // 时间
  startTime: Date,                  // 开赛时间
  
  // 功能
  hasVideo: Boolean,                // 是否有视频
  hasCashOut: Boolean,              // 是否可提前兑现
  isLive: Boolean,                  // 是否滚球
  
  // 赔率
  odds: {
    handicap: {
      home: { value: String, odds: Number },
      away: { value: String, odds: Number }
    },
    overUnder: {
      over: { value: String, odds: Number },
      under: { value: String, odds: Number }
    },
    moneyline: {
      home: { label: String, odds: Number },
      draw: { label: String, odds: Number },
      away: { label: String, odds: Number }
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
```javascript
db.matches.createIndex({ "matchId": 1 }, { unique: true })
db.matches.createIndex({ "status": 1, "startTime": -1 })
db.matches.createIndex({ "isLive": 1 })
```

---

### 2. leagues - 联赛表（早盘用）

```javascript
{
  _id: ObjectId,
  
  leagueId: String,                 // 联赛ID
  name: String,                     // 联赛名称
  country: String,                  // 国家
  flag: String,                     // 国旗emoji
  matchCount: Number,               // 比赛数量
  
  createdAt: Date,
  updatedAt: Date
}
```

**索引**:
```javascript
db.leagues.createIndex({ "leagueId": 1 }, { unique: true })
db.leagues.createIndex({ "country": 1 })
```

---

### 3. bet_orders - 投注订单表

```javascript
{
  _id: ObjectId,
  
  orderId: String,                  // 订单号（唯一）
  
  // 比赛信息
  matchId: String,
  league: String,
  homeTeam: String,
  awayTeam: String,
  homeScore: Number,                // 下注时比分
  awayScore: Number,
  
  // 投注信息
  betType: String,                  // 足球 (滚球) 让球
  selection: String,                // 选择的球队/选项
  value: String,                    // 盘口值：-0.5
  odds: Number,                     // 赔率
  
  // 金额
  amount: Number,                   // 投注金额
  potentialWin: Number,             // 预计可赢
  actualWin: Number,                // 实际赢取（结算后）
  
  // 状态
  status: String,                   // pending/settled/cancelled
  result: String,                   // win/lose/push/half_win/half_lose
  
  // 最终比分
  finalHomeScore: Number,
  finalAwayScore: Number,
  
  // 时间
  createdAt: Date,
  settledAt: Date
}
```

**索引**:
```javascript
db.bet_orders.createIndex({ "orderId": 1 }, { unique: true })
db.bet_orders.createIndex({ "status": 1, "createdAt": -1 })
db.bet_orders.createIndex({ "createdAt": -1 })
```

---

### 4. account - 账户表（单用户）

```javascript
{
  _id: ObjectId,
  
  balance: Number,                  // 当前余额
  
  updatedAt: Date
}
```

---

### 5. balance_logs - 余额变动日志

```javascript
{
  _id: ObjectId,
  
  type: String,                     // bet/win/deposit/withdraw/adjust
  amount: Number,                   // 变动金额
  balanceBefore: Number,            // 变动前
  balanceAfter: Number,             // 变动后
  
  relatedOrderId: String,           // 关联订单号
  remark: String,                   // 备注
  
  createdAt: Date
}
```

**索引**:
```javascript
db.balance_logs.createIndex({ "createdAt": -1 })
db.balance_logs.createIndex({ "type": 1 })
```

---

## 初始化脚本

```javascript
// 连接数据库
use sports_betting

// 创建集合和索引
db.createCollection("matches")
db.matches.createIndex({ "matchId": 1 }, { unique: true })
db.matches.createIndex({ "status": 1, "startTime": -1 })
db.matches.createIndex({ "isLive": 1 })

db.createCollection("leagues")
db.leagues.createIndex({ "leagueId": 1 }, { unique: true })
db.leagues.createIndex({ "country": 1 })

db.createCollection("bet_orders")
db.bet_orders.createIndex({ "orderId": 1 }, { unique: true })
db.bet_orders.createIndex({ "status": 1, "createdAt": -1 })
db.bet_orders.createIndex({ "createdAt": -1 })

db.createCollection("account")
db.createCollection("balance_logs")
db.balance_logs.createIndex({ "createdAt": -1 })

// 初始化账户余额
db.account.insertOne({
  balance: 50000.00,
  updatedAt: new Date()
})

// 初始化示例比赛数据
db.matches.insertMany([
  {
    matchId: "match001",
    league: "澳大利亚甲组联赛",
    leagueIcon: "🇦🇺",
    homeTeam: "中央海岸水手",
    awayTeam: "麦克阿瑟",
    homeScore: 0,
    awayScore: 0,
    status: "live",
    period: "上半场",
    minute: 59,
    startTime: new Date(),
    hasVideo: true,
    hasCashOut: true,
    isLive: true,
    odds: {
      handicap: {
        home: { value: "+0.5", odds: 1.03 },
        away: { value: "-0.5", odds: 0.85 }
      },
      overUnder: {
        over: { value: "大 2.5", odds: 1.01 },
        under: { value: "小 2.5", odds: 0.86 }
      },
      moneyline: {
        home: { label: "主", odds: 4.05 },
        draw: { label: "和", odds: 3.45 },
        away: { label: "客", odds: 1.84 }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    matchId: "match002",
    league: "墨西哥超级联赛",
    leagueIcon: "🇲🇽",
    homeTeam: "阿苏尔",
    awayTeam: "普埃布拉",
    homeScore: 0,
    awayScore: 0,
    status: "live",
    period: "上半场",
    minute: 19,
    startTime: new Date(),
    hasVideo: true,
    hasCashOut: true,
    isLive: true,
    odds: {
      handicap: {
        home: { value: "-1", odds: 1.04 },
        away: { value: "+1", odds: 0.84 }
      },
      overUnder: {
        over: { value: "大 2.5/3", odds: 0.97 },
        under: { value: "小 2.5/3", odds: 0.89 }
      },
      moneyline: {
        home: { label: "主", odds: 1.56 },
        draw: { label: "和", odds: 4.20 },
        away: { label: "客", odds: 5.00 }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
])

// 初始化早盘联赛
db.leagues.insertMany([
  { leagueId: "epl", name: "英格兰超级联赛", country: "英格兰", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", matchCount: 10, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "epl-special", name: "英格兰超级联赛-特别投注", country: "英格兰", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", matchCount: 5, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "efl-cup", name: "英格兰联赛杯", country: "英格兰", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", matchCount: 8, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "championship", name: "英格兰冠军联赛", country: "英格兰", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", matchCount: 12, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "laliga", name: "西班牙甲级联赛", country: "西班牙", flag: "🇪🇸", matchCount: 10, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "copa-del-rey", name: "西班牙国王杯", country: "西班牙", flag: "🇪🇸", matchCount: 4, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "bundesliga", name: "德国甲级联赛", country: "德国", flag: "🇩🇪", matchCount: 9, createdAt: new Date(), updatedAt: new Date() },
  { leagueId: "2-bundesliga", name: "德国乙级联赛", country: "德国", flag: "🇩🇪", matchCount: 9, createdAt: new Date(), updatedAt: new Date() }
])

print("数据库初始化完成！")
```

---

## 数据关系

```
┌─────────────┐       ┌─────────────┐
│   matches   │       │   leagues   │
│   (比赛)    │       │   (联赛)    │
└──────┬──────┘       └─────────────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐
│ bet_orders  │──────►│   account   │
│  (投注单)   │       │   (账户)    │
└──────┬──────┘       └─────────────┘
       │
       ▼
┌─────────────┐
│balance_logs │
│ (余额日志)  │
└─────────────┘
```

---

## 后端 Koa2 项目结构（已实现）

```
manager-server/
├── app.js                       # 入口文件
├── config/
│   ├── index.js                 # 配置（MongoDB连接等）
│   └── db.js                    # 数据库连接模块
├── models/                      # 数据模型
│   ├── index.js
│   ├── match.js
│   ├── league.js
│   ├── betOrder.js
│   ├── account.js
│   └── balanceLog.js
├── services/                    # 业务逻辑
│   ├── index.js
│   ├── matchService.js
│   ├── betService.js
│   ├── balanceService.js
│   ├── accountService.js
│   └── admin/                   # 后台管理业务
│       ├── index.js
│       ├── matchAdminService.js
│       ├── leagueAdminService.js
│       ├── betOrderAdminService.js
│       └── accountAdminService.js
├── controllers/                 # 控制器
│   ├── index.js
│   ├── matchController.js
│   ├── betController.js
│   ├── balanceController.js
│   ├── accountController.js
│   ├── systemController.js
│   └── admin/                   # 后台管理控制器
│       ├── index.js
│       ├── matchAdminController.js
│       ├── leagueAdminController.js
│       ├── betOrderAdminController.js
│       └── accountAdminController.js
├── routes/                      # 路由
│   ├── api/                     # 用户端 API (/api/v1)
│   │   ├── index.js
│   │   ├── match.js
│   │   ├── bet.js
│   │   ├── balance.js
│   │   ├── account.js
│   │   └── system.js
│   └── admin/                   # 后台管理 API (/api/v1/admin)
│       ├── index.js
│       ├── match.js
│       ├── league.js
│       ├── betOrder.js
│       └── account.js
├── utils/                       # 工具函数
│   ├── response.js              # 统一响应格式
│   └── log4j.js                 # 日志工具
├── scripts/
│   └── initDb.js                # 数据库初始化脚本
├── docs/                        # 文档
└── package.json
```

---

## 核心业务逻辑

### 投注流程
```javascript
// betService.js
async function placeBet(betData) {
  // 1. 检查余额
  const account = await Account.findOne()
  if (account.balance < betData.amount) {
    throw new Error('余额不足')
  }
  
  // 2. 扣除余额
  const newBalance = account.balance - betData.amount
  await Account.updateOne({}, { balance: newBalance, updatedAt: new Date() })
  
  // 3. 记录余额变动
  await BalanceLog.create({
    type: 'bet',
    amount: -betData.amount,
    balanceBefore: account.balance,
    balanceAfter: newBalance,
    relatedOrderId: orderId,
    remark: '投注',
    createdAt: new Date()
  })
  
  // 4. 创建投注订单
  const order = await BetOrder.create({
    orderId: generateOrderId(),
    ...betData,
    status: 'pending',
    createdAt: new Date()
  })
  
  return order
}
```

### 结算流程
```javascript
// betService.js
async function settleBet(orderId, result, finalScore) {
  const order = await BetOrder.findOne({ orderId })
  if (!order || order.status !== 'pending') {
    throw new Error('订单不存在或已结算')
  }
  
  let actualWin = 0
  if (result === 'win') {
    actualWin = order.potentialWin
  } else if (result === 'half_win') {
    actualWin = order.potentialWin / 2
  } else if (result === 'push') {
    actualWin = order.amount  // 退还本金
  } else if (result === 'half_lose') {
    actualWin = order.amount / 2  // 退还一半本金
  }
  
  // 更新余额
  if (actualWin > 0) {
    const account = await Account.findOne()
    const newBalance = account.balance + actualWin
    await Account.updateOne({}, { balance: newBalance })
    
    await BalanceLog.create({
      type: 'win',
      amount: actualWin,
      balanceBefore: account.balance,
      balanceAfter: newBalance,
      relatedOrderId: orderId,
      createdAt: new Date()
    })
  }
  
  // 更新订单
  await BetOrder.updateOne({ orderId }, {
    status: 'settled',
    result,
    actualWin,
    finalHomeScore: finalScore.home,
    finalAwayScore: finalScore.away,
    settledAt: new Date()
  })
}
```
