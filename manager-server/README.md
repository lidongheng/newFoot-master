# 体育博彩系统 - 后端服务

基于 Koa2 + MongoDB 的体育博彩后端 API 服务，包含用户端接口和后台管理系统接口。

## 🚀 快速开始

### 环境要求

- Node.js 18+
- MongoDB 8.x（确保服务已启动）
- pnpm（包管理器）

### 安装运行

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库（首次运行必须执行）
pnpm run init-db

# 3. 启动开发服务器
pnpm run dev
```

服务将运行在 `http://localhost:3000`

### 验证安装

```bash
# 测试接口是否正常
curl http://localhost:3000/api/v1/balance
# 应返回: {"code":200,"message":"success","data":{"balance":50000}}
```

---

## 📁 项目结构

```
manager-server/
├── app.js                       # 应用入口
├── config/                      # ⚙️ 配置
│   ├── index.js                 # 应用配置
│   └── db.js                    # 数据库连接
├── models/                      # 📦 数据模型
│   ├── match.js                 # 比赛
│   ├── league.js                # 联赛
│   ├── betOrder.js              # 投注订单
│   ├── account.js               # 账户
│   └── balanceLog.js            # 余额日志
├── services/                    # 🔧 业务逻辑
│   ├── matchService.js          # 比赛服务
│   ├── betService.js            # 投注服务
│   ├── balanceService.js        # 余额服务
│   ├── accountService.js        # 账户服务
│   └── admin/                   # 📋 后台管理服务
│       ├── matchAdminService.js
│       ├── leagueAdminService.js
│       ├── betOrderAdminService.js
│       └── accountAdminService.js
├── controllers/                 # 🎮 控制器
│   ├── matchController.js
│   ├── betController.js
│   ├── balanceController.js
│   ├── accountController.js
│   ├── systemController.js
│   └── admin/                   # 📋 后台管理控制器
│       ├── matchAdminController.js
│       ├── leagueAdminController.js
│       ├── betOrderAdminController.js
│       └── accountAdminController.js
├── routes/                      # 🛣️ 路由
│   ├── api/                     # 用户端 API
│   │   ├── match.js
│   │   ├── bet.js
│   │   ├── balance.js
│   │   ├── account.js
│   │   └── system.js
│   └── admin/                   # 后台管理 API
│       ├── match.js
│       ├── league.js
│       ├── betOrder.js
│       └── account.js
├── utils/                       # 🔨 工具
│   ├── response.js              # 统一响应
│   └── log4j.js                 # 日志
├── scripts/                     # 📜 脚本
│   └── initDb.js                # 数据库初始化
└── docs/                        # 📚 文档
```

---

## 📚 文档目录

| 文档 | 说明 | 适用对象 |
|------|------|---------|
| [API_DOCUMENT.md](./docs/API_DOCUMENT.md) | 用户端 API 接口文档 | 用户端前端开发 |
| [ADMIN_API_DOCUMENT.md](./docs/ADMIN_API_DOCUMENT.md) | 后台管理 API 接口文档 | 后台前端开发 |
| [ADMIN_FRONTEND_GUIDE.md](./docs/ADMIN_FRONTEND_GUIDE.md) | **🔥 后台前端完整开发指南** | 后台前端开发 |
| [DATABASE_DESIGN.md](./docs/DATABASE_DESIGN.md) | 数据库设计文档 | 全栈开发 |
| [DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) | 后端开发指南 | 后端开发 |

---

## 🔌 API 接口概览

### 用户端接口 `/api/v1`

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 比赛 | GET | `/match/live` | 获取滚球比赛 |
| 比赛 | GET | `/match/today` | 获取今日比赛 |
| 比赛 | GET | `/match/leagues` | 获取联赛列表 |
| 比赛 | GET | `/match/early` | 获取早盘比赛 |
| 投注 | POST | `/bet/place` | 提交投注 |
| 投注 | GET | `/bet/pending` | 待结算投注 |
| 投注 | GET | `/bet/records` | 投注记录 |
| 投注 | POST | `/bet/settle/:orderId` | 结算投注 |
| 账户 | GET | `/account/history` | 账户历史 |
| 余额 | GET | `/balance` | 获取余额 |
| 余额 | POST | `/balance/update` | 更新余额 |
| 系统 | GET | `/system/time` | 系统时间 |

### 后台管理接口 `/api/v1/admin`

| 模块 | 增 | 删 | 改 | 查 |
|------|:--:|:--:|:--:|:--:|
| 比赛管理 `/match` | ✅ | ✅ | ✅ | ✅ |
| 联赛管理 `/league` | ✅ | ✅ | ✅ | ✅ |
| 投注订单 `/bet-order` | ✅ | ✅ | ✅ | ✅ |
| 账户管理 `/account` | - | ✅ | ✅ | ✅ |

<details>
<summary>📋 点击展开完整接口列表</summary>

#### 比赛管理 `/api/v1/admin/match`
```
GET    /list              获取列表（分页、搜索）
GET    /detail/:id        获取详情
POST   /create            创建比赛
PUT    /update/:id        更新比赛
DELETE /delete/:id        删除比赛
POST   /batch-delete      批量删除
PUT    /status/:id        更新状态
PUT    /score/:id         更新比分
```

#### 联赛管理 `/api/v1/admin/league`
```
GET    /list              获取列表
GET    /all               获取全部（下拉选择用）
GET    /countries         获取国家列表
GET    /detail/:id        获取详情
POST   /create            创建联赛
PUT    /update/:id        更新联赛
DELETE /delete/:id        删除联赛
POST   /batch-delete      批量删除
```

#### 投注订单 `/api/v1/admin/bet-order`
```
GET    /list              获取列表（含统计）
GET    /stats             获取统计数据
GET    /detail/:id        获取详情
POST   /create            创建订单
PUT    /update/:id        更新订单
DELETE /delete/:id        删除订单
POST   /batch-delete      批量删除
POST   /batch-settle      批量结算
POST   /cancel/:id        取消订单
```

#### 账户管理 `/api/v1/admin/account`
```
GET    /info              获取账户信息
POST   /set-balance       设置余额
GET    /balance-logs      获取余额日志
GET    /balance-stats     获取余额统计
GET    /balance-log/:id   获取日志详情
DELETE /balance-log/:id   删除日志
POST   /balance-logs/batch-delete  批量删除日志
```

</details>

---

## 🛠️ 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 开发模式启动（热重载） |
| `pnpm run start` | 生产模式启动 |
| `pnpm run init-db` | 初始化/重置数据库 |

---

## 🔧 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Koa2 | 2.7+ | Web 框架 |
| MongoDB | 8.x | 数据库 |
| Mongoose | 9.x | ODM |
| Log4js | 6.x | 日志 |

---

## 📊 数据模型

| 集合 | 说明 | 主要字段 |
|------|------|---------|
| matches | 比赛 | matchId, league, homeTeam, awayTeam, odds |
| leagues | 联赛 | leagueId, name, country, flag |
| bet_orders | 投注订单 | orderId, amount, odds, status, result |
| account | 账户 | balance |
| balance_logs | 余额日志 | type, amount, balanceBefore, balanceAfter |

---

## 🔐 响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

---

## 📝 更新日志

### v1.1.0 - 后台管理系统
- ✅ 新增比赛管理 CRUD 接口
- ✅ 新增联赛管理 CRUD 接口
- ✅ 新增投注订单管理接口（含批量结算）
- ✅ 新增账户管理接口（余额设置、日志查询）
- ✅ 新增后台管理前端开发指南文档

### v1.0.0 - 基础功能
- ✅ 用户端比赛查询接口
- ✅ 投注下单和结算
- ✅ 账户余额管理
- ✅ 数据库初始化脚本
