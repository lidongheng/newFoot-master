# 后台管理系统 API 接口文档

## 基础信息

- **基础URL**: `http://localhost:3000/api/v1/admin`
- **数据格式**: JSON
- **请求头**: `Content-Type: application/json`

---

## 通用响应格式

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

### 分页数据结构
```json
{
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5,
  "list": [...]
}
```

---

## 一、比赛管理 `/admin/match`

### 1.1 获取比赛列表
**GET** `/admin/match/list`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态：upcoming/live/finished |
| league | string | 否 | 联赛名称（模糊搜索） |
| keyword | string | 否 | 关键词（搜索球队/比赛ID） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "list": [
      {
        "_id": "...",
        "matchId": "match001",
        "league": "英超",
        "homeTeam": "阿森纳",
        "awayTeam": "切尔西",
        "status": "upcoming",
        ...
      }
    ]
  }
}
```

---

### 1.2 获取比赛详情
**GET** `/admin/match/detail/:id`

**路径参数**
| 参数 | 说明 |
|------|------|
| id | MongoDB _id 或 matchId |

---

### 1.3 创建比赛
**POST** `/admin/match/create`

**请求参数**
```json
{
  "matchId": "match001",
  "league": "英超",
  "leagueIcon": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "homeTeam": "阿森纳",
  "awayTeam": "切尔西",
  "homeScore": 0,
  "awayScore": 0,
  "status": "upcoming",
  "period": "",
  "minute": 0,
  "startTime": "2026-01-20T15:00:00.000Z",
  "hasVideo": true,
  "hasCashOut": true,
  "isLive": false,
  "odds": {
    "handicap": {
      "home": { "value": "-0.5", "odds": 1.92 },
      "away": { "value": "+0.5", "odds": 1.88 }
    },
    "overUnder": {
      "over": { "value": "大 2.5", "odds": 1.95 },
      "under": { "value": "小 2.5", "odds": 1.85 }
    },
    "moneyline": {
      "home": { "label": "主", "odds": 1.80 },
      "draw": { "label": "和", "odds": 3.60 },
      "away": { "label": "客", "odds": 4.20 }
    }
  }
}
```

**必填字段**：matchId, league, homeTeam, awayTeam, startTime

---

### 1.4 更新比赛
**PUT** `/admin/match/update/:id`

**请求参数**：同创建，所有字段可选

---

### 1.5 删除比赛
**DELETE** `/admin/match/delete/:id`

---

### 1.6 批量删除比赛
**POST** `/admin/match/batch-delete`

**请求参数**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

---

### 1.7 更新比赛状态
**PUT** `/admin/match/status/:id`

**请求参数**
```json
{
  "status": "live"
}
```

**status 可选值**：upcoming, live, finished

---

### 1.8 更新比分
**PUT** `/admin/match/score/:id`

**请求参数**
```json
{
  "homeScore": 2,
  "awayScore": 1
}
```

---

## 二、联赛管理 `/admin/league`

### 2.1 获取联赛列表
**GET** `/admin/league/list`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| country | string | 否 | 国家（模糊搜索） |
| keyword | string | 否 | 关键词（搜索名称/ID） |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

---

### 2.2 获取所有联赛（下拉选择用）
**GET** `/admin/league/all`

返回不分页的完整列表，用于下拉选择框。

---

### 2.3 获取所有国家列表
**GET** `/admin/league/countries`

**响应示例**
```json
{
  "code": 200,
  "data": ["中国", "英格兰", "西班牙", "德国"]
}
```

---

### 2.4 获取联赛详情
**GET** `/admin/league/detail/:id`

---

### 2.5 创建联赛
**POST** `/admin/league/create`

**请求参数**
```json
{
  "leagueId": "laliga",
  "name": "西班牙甲级联赛",
  "country": "西班牙",
  "flag": "🇪🇸",
  "matchCount": 20
}
```

**必填字段**：leagueId, name, country

---

### 2.6 更新联赛
**PUT** `/admin/league/update/:id`

---

### 2.7 删除联赛
**DELETE** `/admin/league/delete/:id`

---

### 2.8 批量删除联赛
**POST** `/admin/league/batch-delete`

```json
{
  "ids": ["id1", "id2"]
}
```

---

## 三、投注订单管理 `/admin/bet-order`

### 3.1 获取订单列表
**GET** `/admin/bet-order/list`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | pending/settled/cancelled |
| result | string | 否 | win/lose/push/half_win/half_lose |
| keyword | string | 否 | 订单号/球队/联赛 |
| startDate | string | 否 | YYYY-MM-DD |
| endDate | string | 否 | YYYY-MM-DD |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

**响应示例**（含统计数据）
```json
{
  "code": 200,
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "stats": {
      "totalAmount": 50000,
      "totalPotentialWin": 45000,
      "totalActualWin": 30000,
      "pendingCount": 10,
      "settledCount": 90,
      "totalCount": 100
    },
    "list": [...]
  }
}
```

---

### 3.2 获取统计数据
**GET** `/admin/bet-order/stats`

返回全局统计数据。

---

### 3.3 获取订单详情
**GET** `/admin/bet-order/detail/:id`

---

### 3.4 创建订单（后台手动）
**POST** `/admin/bet-order/create`

**请求参数**
```json
{
  "matchId": "match001",
  "league": "英超",
  "homeTeam": "阿森纳",
  "awayTeam": "切尔西",
  "homeScore": 0,
  "awayScore": 0,
  "betType": "让球",
  "selection": "阿森纳",
  "value": "-0.5",
  "odds": 1.92,
  "amount": 100,
  "status": "pending"
}
```

---

### 3.5 更新订单
**PUT** `/admin/bet-order/update/:id`

> ⚠️ 已结算订单不允许修改投注信息

---

### 3.6 删除订单
**DELETE** `/admin/bet-order/delete/:id`

> 💰 待结算订单删除时会自动退还金额

---

### 3.7 批量删除订单
**POST** `/admin/bet-order/batch-delete`

```json
{
  "ids": ["id1", "id2"]
}
```

---

### 3.8 批量结算
**POST** `/admin/bet-order/batch-settle`

**请求参数**
```json
{
  "ids": ["id1", "id2", "id3"],
  "result": "win",
  "finalHomeScore": 2,
  "finalAwayScore": 1
}
```

**result 可选值**：
- `win` - 赢（返还本金 + 全部盈利）
- `half_win` - 赢半（返还本金 + 一半盈利）
- `push` - 走水（只返还本金）
- `half_lose` - 输半（返还一半本金）
- `lose` - 输（不返还）

---

### 3.9 取消订单
**POST** `/admin/bet-order/cancel/:id`

> 💰 取消订单会退还投注金额

---

## 四、账户管理 `/admin/account`

### 4.1 获取账户信息
**GET** `/admin/account/info`

**响应示例**
```json
{
  "code": 200,
  "data": {
    "_id": "...",
    "balance": 50000,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 4.2 设置账户余额
**POST** `/admin/account/set-balance`

**请求参数**
```json
{
  "balance": 100000,
  "remark": "系统调整"
}
```

> ⚠️ 这是直接设置余额，不是增减。会自动记录变动日志。

---

### 4.3 获取余额变动日志
**GET** `/admin/account/balance-logs`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | bet/win/deposit/withdraw/adjust |
| startDate | string | 否 | YYYY-MM-DD |
| endDate | string | 否 | YYYY-MM-DD |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

---

### 4.4 获取余额统计
**GET** `/admin/account/balance-stats`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | YYYY-MM-DD |
| endDate | string | 否 | YYYY-MM-DD |

**响应示例**
```json
{
  "code": 200,
  "data": {
    "totalDeposit": 100000,
    "totalWithdraw": 20000,
    "totalBet": 50000,
    "totalWin": 30000,
    "totalAdjust": 0,
    "count": 150
  }
}
```

---

### 4.5 获取余额日志详情
**GET** `/admin/account/balance-log/:id`

---

### 4.6 删除余额日志
**DELETE** `/admin/account/balance-log/:id`

---

### 4.7 批量删除余额日志
**POST** `/admin/account/balance-logs/batch-delete`

```json
{
  "ids": ["id1", "id2"]
}
```

---

## 接口速查表

### 比赛管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/match/list` | 获取列表 |
| GET | `/admin/match/detail/:id` | 获取详情 |
| POST | `/admin/match/create` | 创建 |
| PUT | `/admin/match/update/:id` | 更新 |
| DELETE | `/admin/match/delete/:id` | 删除 |
| POST | `/admin/match/batch-delete` | 批量删除 |
| PUT | `/admin/match/status/:id` | 更新状态 |
| PUT | `/admin/match/score/:id` | 更新比分 |

### 联赛管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/league/list` | 获取列表 |
| GET | `/admin/league/all` | 获取全部（下拉用） |
| GET | `/admin/league/countries` | 获取国家列表 |
| GET | `/admin/league/detail/:id` | 获取详情 |
| POST | `/admin/league/create` | 创建 |
| PUT | `/admin/league/update/:id` | 更新 |
| DELETE | `/admin/league/delete/:id` | 删除 |
| POST | `/admin/league/batch-delete` | 批量删除 |

### 投注订单管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/bet-order/list` | 获取列表 |
| GET | `/admin/bet-order/stats` | 获取统计 |
| GET | `/admin/bet-order/detail/:id` | 获取详情 |
| POST | `/admin/bet-order/create` | 创建 |
| PUT | `/admin/bet-order/update/:id` | 更新 |
| DELETE | `/admin/bet-order/delete/:id` | 删除 |
| POST | `/admin/bet-order/batch-delete` | 批量删除 |
| POST | `/admin/bet-order/batch-settle` | 批量结算 |
| POST | `/admin/bet-order/cancel/:id` | 取消订单 |

### 账户管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/account/info` | 获取账户信息 |
| POST | `/admin/account/set-balance` | 设置余额 |
| GET | `/admin/account/balance-logs` | 获取余额日志 |
| GET | `/admin/account/balance-stats` | 获取余额统计 |
| GET | `/admin/account/balance-log/:id` | 获取日志详情 |
| DELETE | `/admin/account/balance-log/:id` | 删除日志 |
| POST | `/admin/account/balance-logs/batch-delete` | 批量删除日志 |

---

## 前端调用示例

```javascript
// 获取比赛列表
async function getMatchList(params) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`/api/v1/admin/match/list?${query}`)
  return await res.json()
}

// 创建比赛
async function createMatch(data) {
  const res = await fetch('/api/v1/admin/match/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await res.json()
}

// 更新比赛
async function updateMatch(id, data) {
  const res = await fetch(`/api/v1/admin/match/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await res.json()
}

// 删除比赛
async function deleteMatch(id) {
  const res = await fetch(`/api/v1/admin/match/delete/${id}`, {
    method: 'DELETE'
  })
  return await res.json()
}

// 批量删除
async function batchDeleteMatches(ids) {
  const res = await fetch('/api/v1/admin/match/batch-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  return await res.json()
}
```
