# 体育博彩系统后端开发指南

> 本文档面向新手开发者，帮助你快速理解项目结构和开发流程。

## 目录

- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [代码详解](#代码详解)
- [如何新增接口](#如何新增接口)
- [常见问题](#常见问题)

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| Koa2 | 2.7+ | Web 框架 |
| MongoDB | 8.x | 数据库 |
| Mongoose | 9.x | MongoDB ODM |

### 为什么选择这些技术？

- **Koa2**: 轻量级、基于 async/await 的 Web 框架，代码简洁易读
- **MongoDB**: 文档型数据库，适合存储 JSON 格式的数据，对体育赔率这类嵌套数据非常友好
- **Mongoose**: 提供 Schema 定义、数据验证、查询构建等功能，让操作 MongoDB 更加方便

---

## 项目结构

```
manager-server/
├── app.js                      # 🚀 应用入口文件
├── bin/
│   └── www                     # 服务器启动脚本
├── config/                     # ⚙️ 配置文件夹
│   ├── index.js                # 应用配置（数据库地址、端口等）
│   └── db.js                   # 数据库连接模块
├── models/                     # 📦 数据模型层（定义数据结构）
│   ├── index.js                # 统一导出所有模型
│   ├── match.js                # 比赛模型
│   ├── league.js               # 联赛模型
│   ├── betOrder.js             # 投注订单模型
│   ├── account.js              # 账户模型
│   └── balanceLog.js           # 余额日志模型
├── services/                   # 🔧 业务逻辑层（核心业务代码）
│   ├── index.js                # 统一导出
│   ├── matchService.js         # 比赛相关业务
│   ├── betService.js           # 投注相关业务
│   ├── balanceService.js       # 余额相关业务
│   ├── accountService.js       # 账户历史业务
│   └── admin/                  # 📋 后台管理业务逻辑
│       ├── index.js
│       ├── matchAdminService.js
│       ├── leagueAdminService.js
│       ├── betOrderAdminService.js
│       └── accountAdminService.js
├── controllers/                # 🎮 控制器层（处理请求和响应）
│   ├── index.js                # 统一导出
│   ├── matchController.js      # 比赛控制器
│   ├── betController.js        # 投注控制器
│   ├── balanceController.js    # 余额控制器
│   ├── accountController.js    # 账户控制器
│   ├── systemController.js     # 系统控制器
│   └── admin/                  # 📋 后台管理控制器
│       ├── index.js
│       ├── matchAdminController.js
│       ├── leagueAdminController.js
│       ├── betOrderAdminController.js
│       └── accountAdminController.js
├── routes/                     # 🛣️ 路由层（定义 URL 路径）
│   ├── api/                    # 用户端 API
│   │   ├── index.js            # API 路由汇总
│   │   ├── match.js            # /match 路由
│   │   ├── bet.js              # /bet 路由
│   │   ├── balance.js          # /balance 路由
│   │   ├── account.js          # /account 路由
│   │   └── system.js           # /system 路由
│   └── admin/                  # 📋 后台管理 API
│       ├── index.js
│       ├── match.js
│       ├── league.js
│       ├── betOrder.js
│       └── account.js
├── utils/                      # 🔨 工具函数
│   ├── response.js             # 统一响应格式
│   └── log4j.js                # 日志工具
├── scripts/                    # 📜 脚本
│   └── initDb.js               # 数据库初始化脚本
├── docs/                       # 📚 文档
├── logs/                       # 📝 日志文件
└── package.json                # 项目配置
```

---

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js 18+
- MongoDB 8.x（并确保 MongoDB 服务正在运行）
- pnpm（包管理器）

### 2. 安装依赖

```bash
cd manager-server
pnpm install
```

### 3. 初始化数据库

这一步会创建数据库集合并插入示例数据：

```bash
pnpm run init-db
```

成功输出：
```
🚀 开始初始化数据库...
✅ MongoDB 连接成功
💰 初始化账户...
⚽ 插入比赛数据...
🏆 插入联赛数据...
✅ 数据库初始化完成!
```

### 4. 启动开发服务器

```bash
pnpm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. 测试接口

```bash
# 获取余额
curl http://localhost:3000/api/v1/balance

# 获取滚球比赛
curl http://localhost:3000/api/v1/match/live
```

---

## 架构设计

### 分层架构

项目采用经典的 **分层架构**，每一层都有明确的职责：

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端请求                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Routes（路由层）                                            │
│  职责：定义 URL 路径，将请求分发给对应的控制器                    │
│  文件：routes/api/*.js                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Controllers（控制器层）                                      │
│  职责：处理 HTTP 请求，参数校验，调用 Service，返回响应           │
│  文件：controllers/*.js                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Services（业务逻辑层）                                       │
│  职责：实现核心业务逻辑，操作数据模型                            │
│  文件：services/*.js                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Models（数据模型层）                                         │
│  职责：定义数据结构，与数据库交互                               │
│  文件：models/*.js                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       MongoDB 数据库                         │
└─────────────────────────────────────────────────────────────┘
```

### 为什么要分层？

1. **职责分离**：每层只做一件事，代码更清晰
2. **易于维护**：修改业务逻辑只需要改 Service 层
3. **便于测试**：可以单独测试每一层
4. **可复用**：Service 层可以被多个 Controller 调用

---

## 代码详解

### 1. 数据模型（Model）

以投注订单模型为例 `models/betOrder.js`：

```javascript
const mongoose = require('mongoose')

// 定义数据结构（Schema）
const betOrderSchema = new mongoose.Schema({
  // 订单号（唯一）
  orderId: {
    type: String,        // 数据类型
    required: true,      // 必填
    unique: true,        // 唯一
    index: true          // 创建索引，加快查询
  },
  
  // 投注金额
  amount: {
    type: Number,
    required: true,
    min: 0               // 最小值校验
  },
  
  // 状态枚举
  status: {
    type: String,
    enum: ['pending', 'settled', 'cancelled'],  // 只能是这几个值
    default: 'pending'   // 默认值
  }
}, {
  timestamps: true       // 自动添加 createdAt 和 updatedAt 字段
})

// 创建并导出模型
module.exports = mongoose.model('BetOrder', betOrderSchema)
```

**知识点**：
- `Schema` 定义数据的结构和约束
- `type` 指定字段类型（String, Number, Date, Boolean 等）
- `required` 表示必填字段
- `enum` 限制字段只能是指定的值
- `timestamps: true` 自动管理创建和更新时间

---

### 2. 业务逻辑层（Service）

以投注服务为例 `services/betService.js`：

```javascript
const { BetOrder } = require('../models')
const balanceService = require('./balanceService')

class BetService {
  /**
   * 提交投注
   */
  async placeBet(betData) {
    const { amount, odds, ...rest } = betData
    
    // 1. 生成订单号
    const orderId = this.generateOrderId()
    
    // 2. 计算预计可赢金额
    const potentialWin = amount * odds
    
    // 3. 扣除余额（调用余额服务）
    await balanceService.deductForBet(amount, orderId)
    
    // 4. 创建投注订单
    const order = await BetOrder.create({
      orderId,
      amount,
      odds,
      potentialWin,
      status: 'pending',
      ...rest
    })
    
    return order
  }
  
  /**
   * 生成订单号
   */
  generateOrderId() {
    return `OU${Date.now()}${Math.floor(Math.random() * 1000)}`
  }
}

// 导出单例
module.exports = new BetService()
```

**知识点**：
- Service 层封装业务逻辑，不关心 HTTP 请求
- 可以调用其他 Service（如 `balanceService`）
- 使用 `async/await` 处理异步操作
- 导出单例模式，整个应用共享一个实例

---

### 3. 控制器层（Controller）

以投注控制器为例 `controllers/betController.js`：

```javascript
const { betService } = require('../services')
const { success, error, paramError } = require('../utils/response')

class BetController {
  /**
   * 提交投注
   * POST /bet/place
   */
  async placeBet(ctx) {
    try {
      // 1. 获取请求参数
      const betData = ctx.request.body
      
      // 2. 参数校验
      if (!betData.matchId) {
        paramError(ctx, '缺少必填参数: matchId')
        return
      }
      
      if (betData.amount <= 0) {
        paramError(ctx, '投注金额必须大于0')
        return
      }
      
      // 3. 调用 Service 处理业务
      const order = await betService.placeBet(betData)
      
      // 4. 返回成功响应
      success(ctx, order, '投注成功')
      
    } catch (err) {
      // 5. 错误处理
      error(ctx, err.message)
    }
  }
}

module.exports = new BetController()
```

**知识点**：
- `ctx` 是 Koa 的上下文对象，包含请求和响应信息
- `ctx.request.body` 获取 POST 请求的 JSON 数据
- `ctx.query` 获取 URL 查询参数（GET 请求）
- `ctx.params` 获取 URL 路径参数（如 `/bet/:orderId`）
- 使用 try-catch 处理异常

---

### 4. 路由层（Route）

以投注路由为例 `routes/api/bet.js`：

```javascript
const router = require('koa-router')()
const { betController } = require('../../controllers')

// POST /api/v1/bet/place
router.post('/place', betController.placeBet)

// GET /api/v1/bet/pending
router.get('/pending', betController.getPendingBets)

// GET /api/v1/bet/records
router.get('/records', betController.getBetRecords)

// POST /api/v1/bet/settle/:orderId
router.post('/settle/:orderId', betController.settleBet)

module.exports = router
```

**知识点**：
- `router.get()` 处理 GET 请求
- `router.post()` 处理 POST 请求
- `:orderId` 是路径参数，在控制器中用 `ctx.params.orderId` 获取

---

### 5. 统一响应格式

`utils/response.js`：

```javascript
/**
 * 成功响应
 */
function success(ctx, data = null, message = 'success') {
  ctx.body = {
    code: 200,
    message,
    data
  }
}

/**
 * 错误响应
 */
function error(ctx, message = '操作失败', code = 400) {
  ctx.body = {
    code,
    message,
    data: null
  }
}

module.exports = { success, error, paramError, serverError }
```

**为什么需要统一响应格式？**
- 前端可以用统一的方式处理响应
- 通过 `code` 判断成功还是失败
- 错误信息统一在 `message` 字段

---

## 如何新增接口

假设我们要新增一个「取消投注」的接口：`POST /api/v1/bet/cancel/:orderId`

### 第一步：在 Service 层添加业务逻辑

编辑 `services/betService.js`：

```javascript
class BetService {
  // ... 已有代码 ...
  
  /**
   * 取消投注
   * @param {string} orderId - 订单号
   */
  async cancelBet(orderId) {
    // 1. 查找订单
    const order = await BetOrder.findOne({ orderId })
    
    if (!order) {
      throw new Error('订单不存在')
    }
    
    if (order.status !== 'pending') {
      throw new Error('只能取消待结算的订单')
    }
    
    // 2. 退还金额
    await balanceService.creditForWin(order.amount, orderId)
    
    // 3. 更新订单状态
    order.status = 'cancelled'
    await order.save()
    
    return order
  }
}
```

### 第二步：在 Controller 层添加请求处理

编辑 `controllers/betController.js`：

```javascript
class BetController {
  // ... 已有代码 ...
  
  /**
   * 取消投注
   * POST /bet/cancel/:orderId
   */
  async cancelBet(ctx) {
    try {
      const { orderId } = ctx.params
      
      if (!orderId) {
        paramError(ctx, '缺少订单号')
        return
      }
      
      const order = await betService.cancelBet(orderId)
      success(ctx, order, '取消成功')
      
    } catch (err) {
      error(ctx, err.message)
    }
  }
}
```

### 第三步：在 Route 层添加路由

编辑 `routes/api/bet.js`：

```javascript
// 在已有路由后面添加
router.post('/cancel/:orderId', betController.cancelBet)
```

### 完成！

重启服务器后，新接口就可以使用了：

```bash
curl -X POST http://localhost:3000/api/v1/bet/cancel/OU1234567890
```

---

## 常见问题

### Q1: MongoDB 连接失败怎么办？

检查：
1. MongoDB 服务是否启动：`brew services start mongodb-community`（Mac）
2. 连接地址是否正确：查看 `config/index.js` 中的 `mongo.uri`
3. 端口是否被占用：默认端口 27017

### Q2: 如何查看数据库数据？

推荐使用 MongoDB Compass（官方图形界面工具）或命令行：

```bash
# 连接数据库
mongosh

# 切换到项目数据库
use sports_betting

# 查看所有集合
show collections

# 查看比赛数据
db.matches.find().pretty()

# 查看投注订单
db.bet_orders.find().pretty()
```

### Q3: 如何重置数据库？

```bash
pnpm run init-db
```

这会清空所有数据并重新插入示例数据。

### Q4: 接口报错如何调试？

1. 查看终端输出的错误信息
2. 查看 `logs/` 目录下的日志文件
3. 在 Service 层添加 `console.log()` 打印变量
4. 使用 Postman 或 curl 测试接口

### Q5: 如何添加新的数据模型？

1. 在 `models/` 目录创建新文件（如 `newModel.js`）
2. 定义 Schema 和导出 Model
3. 在 `models/index.js` 中导出新模型
4. 在 Service 层引入并使用

---

## API 接口速查表

### 用户端接口 `/api/v1`

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 比赛 | GET | `/api/v1/match/live` | 获取滚球比赛列表 |
| 比赛 | GET | `/api/v1/match/today` | 获取今日比赛列表 |
| 比赛 | GET | `/api/v1/match/leagues` | 获取早盘联赛列表 |
| 比赛 | GET | `/api/v1/match/early` | 获取早盘比赛列表 |
| 投注 | POST | `/api/v1/bet/place` | 提交投注 |
| 投注 | GET | `/api/v1/bet/pending` | 获取待结算投注 |
| 投注 | GET | `/api/v1/bet/records` | 获取投注记录 |
| 投注 | POST | `/api/v1/bet/settle/:orderId` | 结算投注 |
| 账户 | GET | `/api/v1/account/history` | 获取账户历史 |
| 余额 | GET | `/api/v1/balance` | 获取当前余额 |
| 余额 | POST | `/api/v1/balance/update` | 更新余额 |
| 系统 | GET | `/api/v1/system/time` | 获取系统时间 |

### 后台管理接口 `/api/v1/admin`

后台管理系统提供完整的 CRUD 接口，支持分页、搜索、批量操作等功能。

| 模块 | 路径前缀 | 支持操作 |
|------|---------|---------|
| 比赛管理 | `/admin/match` | 列表、详情、创建、更新、删除、批量删除、更新状态、更新比分 |
| 联赛管理 | `/admin/league` | 列表、全部、详情、创建、更新、删除、批量删除、国家列表 |
| 投注订单 | `/admin/bet-order` | 列表、统计、详情、创建、更新、删除、批量删除、批量结算、取消 |
| 账户管理 | `/admin/account` | 账户信息、设置余额、余额日志、余额统计、删除日志 |

> 📖 详细接口文档请查看 [ADMIN_API_DOCUMENT.md](./ADMIN_API_DOCUMENT.md)
>
> 🔥 后台前端开发请查看 [ADMIN_FRONTEND_GUIDE.md](./ADMIN_FRONTEND_GUIDE.md)

---

## 后台管理模块开发示例

后台管理模块与用户端模块结构相同，都遵循分层架构。以下是新增后台管理接口的步骤：

### 1. 创建 Admin Service

```javascript
// services/admin/xxxAdminService.js
const { Model } = require('../../models')

class XxxAdminService {
  // 列表查询（带分页）
  async getList({ keyword, page = 1, pageSize = 20 }) {
    const query = {}
    if (keyword) {
      query.name = new RegExp(keyword, 'i')
    }
    
    const total = await Model.countDocuments(query)
    const list = await Model.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
    
    return { total, page, pageSize, list }
  }
  
  // 创建
  async create(data) {
    return await Model.create(data)
  }
  
  // 更新
  async update(id, data) {
    const item = await Model.findById(id)
    if (!item) throw new Error('记录不存在')
    Object.assign(item, data)
    await item.save()
    return item
  }
  
  // 删除
  async delete(id) {
    await Model.deleteOne({ _id: id })
    return { message: '删除成功' }
  }
}

module.exports = new XxxAdminService()
```

### 2. 创建 Admin Controller

```javascript
// controllers/admin/xxxAdminController.js
const { xxxAdminService } = require('../../services/admin')
const { success, error } = require('../../utils/response')

class XxxAdminController {
  async getList(ctx) {
    try {
      const { keyword, page, pageSize } = ctx.query
      const result = await xxxAdminService.getList({ keyword, page, pageSize })
      success(ctx, result)
    } catch (err) {
      error(ctx, err.message)
    }
  }
  
  async create(ctx) {
    try {
      const data = ctx.request.body
      const item = await xxxAdminService.create(data)
      success(ctx, item, '创建成功')
    } catch (err) {
      error(ctx, err.message)
    }
  }
}

module.exports = new XxxAdminController()
```

### 3. 创建 Admin Route

```javascript
// routes/admin/xxx.js
const router = require('koa-router')()
const { xxxAdminController } = require('../../controllers/admin')

router.get('/list', xxxAdminController.getList)
router.post('/create', xxxAdminController.create)
router.put('/update/:id', xxxAdminController.update)
router.delete('/delete/:id', xxxAdminController.delete)

module.exports = router
```

---

## 下一步学习

1. **阅读源码**：从 `app.js` 开始，顺着请求流程阅读各层代码
2. **尝试修改**：修改一个现有接口，添加新的字段
3. **新增功能**：按照上面的步骤，新增一个完整的接口
4. **学习后台管理**：阅读 `services/admin/` 目录下的代码，了解 CRUD 的实现方式
5. **学习 Mongoose**：[官方文档](https://mongoosejs.com/docs/guide.html)
6. **学习 Koa**：[官方文档](https://koajs.com/)

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [API_DOCUMENT.md](./API_DOCUMENT.md) | 用户端 API 接口文档 |
| [ADMIN_API_DOCUMENT.md](./ADMIN_API_DOCUMENT.md) | 后台管理 API 接口文档 |
| [ADMIN_FRONTEND_GUIDE.md](./ADMIN_FRONTEND_GUIDE.md) | 后台管理前端开发指南 |
| [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | 数据库设计文档 |

---

> 📧 如有问题，请联系项目负责人。
