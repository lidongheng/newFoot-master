# 体育博彩系统 API 接口文档（简化版）

## 基础信息

- **后端框架**: Koa2
- **数据库**: MongoDB 8.2.3
- **基础URL**: `http://localhost:3000/api/v1`
- **数据格式**: JSON
- **认证方式**: 暂不需要（单用户）

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

---

## 一、比赛模块 `/match`

### 1.1 获取滚球比赛列表
**GET** `/match/live`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sportId | string | 否 | 体育类型，默认football |

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "matchId": "match001",
      "league": "澳大利亚甲组联赛",
      "leagueIcon": "🇦🇺",
      "homeTeam": "中央海岸水手",
      "awayTeam": "麦克阿瑟",
      "homeScore": 0,
      "awayScore": 0,
      "status": "live",
      "period": "上半场",
      "minute": 59,
      "startTime": "2026-01-18T10:00:00.000Z",
      "hasVideo": true,
      "hasCashOut": true,
      "odds": {
        "handicap": {
          "home": { "value": "+0.5", "odds": 1.03 },
          "away": { "value": "-0.5", "odds": 0.85 }
        },
        "overUnder": {
          "over": { "value": "大 2.5", "odds": 1.01 },
          "under": { "value": "小 2.5", "odds": 0.86 }
        },
        "moneyline": {
          "home": { "label": "主", "odds": 4.05 },
          "draw": { "label": "和", "odds": 3.45 },
          "away": { "label": "客", "odds": 1.84 }
        }
      }
    }
  ]
}
```

---

### 1.2 获取今日比赛列表
**GET** `/match/today`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sportId | string | 否 | 体育类型 |

**响应数据** - 结构同滚球比赛

---

### 1.3 获取早盘联赛列表
**GET** `/match/leagues`

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "country": "英格兰",
      "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      "leagues": [
        { "leagueId": "epl", "name": "英格兰超级联赛", "matchCount": 10 },
        { "leagueId": "efl", "name": "英格兰冠军联赛", "matchCount": 12 }
      ]
    },
    {
      "country": "西班牙",
      "flag": "🇪🇸",
      "leagues": [
        { "leagueId": "laliga", "name": "西班牙甲级联赛", "matchCount": 5 }
      ]
    }
  ]
}
```

---

### 1.4 获取早盘比赛列表
**GET** `/match/early`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| leagueIds | string | 否 | 联赛ID，多个用逗号分隔 |

**响应数据** - 结构同滚球比赛

---

## 二、投注模块 `/bet`

### 2.1 提交投注
**POST** `/bet/place`

**请求参数**
```json
{
  "matchId": "match001",
  "league": "澳大利亚甲组联赛",
  "homeTeam": "中央海岸水手",
  "awayTeam": "麦克阿瑟",
  "homeScore": 0,
  "awayScore": 0,
  "betType": "足球 (滚球) 让球",
  "selection": "麦克阿瑟",
  "value": "-0.5",
  "odds": 0.85,
  "amount": 50.00
}
```

**响应数据**
```json
{
  "code": 200,
  "message": "投注成功",
  "data": {
    "orderId": "OU1737235200123",
    "matchId": "match001",
    "league": "澳大利亚甲组联赛",
    "homeTeam": "中央海岸水手",
    "awayTeam": "麦克阿瑟",
    "homeScore": 0,
    "awayScore": 0,
    "betType": "足球 (滚球) 让球",
    "selection": "麦克阿瑟",
    "value": "-0.5",
    "odds": 0.85,
    "amount": 50.00,
    "potentialWin": 42.50,
    "status": "pending",
    "createdAt": "2026-01-18T10:30:00.000Z"
  }
}
```

---

### 2.2 获取待结算投注记录
**GET** `/bet/pending`

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "orderId": "OU1737235200123",
      "league": "澳大利亚甲组联赛",
      "homeTeam": "中央海岸水手",
      "awayTeam": "麦克阿瑟",
      "homeScore": 0,
      "awayScore": 0,
      "betType": "足球 (滚球) 让球",
      "selection": "麦克阿瑟",
      "value": "-0.5",
      "odds": 0.85,
      "amount": 50.00,
      "potentialWin": 42.50,
      "status": "pending",
      "createdAt": "2026-01-18T10:30:00.000Z"
    }
  ]
}
```

---

### 2.3 获取所有投注记录
**GET** `/bet/records`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | pending/settled/all |
| startDate | string | 否 | YYYY-MM-DD |
| endDate | string | 否 | YYYY-MM-DD |

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 10,
    "list": [
      {
        "orderId": "OU1737235200123",
        "league": "澳大利亚甲组联赛",
        "homeTeam": "中央海岸水手",
        "awayTeam": "麦克阿瑟",
        "homeScore": 0,
        "awayScore": 0,
        "betType": "足球 (滚球) 让球",
        "selection": "麦克阿瑟",
        "value": "-0.5",
        "odds": 0.85,
        "amount": 50.00,
        "potentialWin": 42.50,
        "actualWin": null,
        "status": "pending",
        "result": null,
        "createdAt": "2026-01-18T10:30:00.000Z",
        "settledAt": null
      }
    ]
  }
}
```

---

### 2.4 结算投注（手动/测试用）
**POST** `/bet/settle/:orderId`

**请求参数**
```json
{
  "result": "win",
  "finalHomeScore": 1,
  "finalAwayScore": 2
}
```

**result 可选值**：
- `win` - 赢
- `lose` - 输
- `push` - 走水（退还本金）
- `half_win` - 赢半
- `half_lose` - 输半

**响应数据**
```json
{
  "code": 200,
  "message": "结算成功",
  "data": {
    "orderId": "OU1737235200123",
    "result": "win",
    "actualWin": 42.50,
    "settledAt": "2026-01-18T12:00:00.000Z"
  }
}
```

---

## 三、账户历史模块 `/account`

### 3.1 获取账户历史
**GET** `/account/history`

**请求参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | YYYY-MM-DD |
| endDate | string | 是 | YYYY-MM-DD |

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": {
      "totalBetAmount": 22300,
      "totalValidAmount": 15000,
      "totalWinLoss": 3400.00
    },
    "dailyRecords": [
      {
        "date": "2026-01-18",
        "dateDisplay": "1月18日",
        "weekday": "星期日",
        "betAmount": null,
        "validAmount": null,
        "winLoss": null
      },
      {
        "date": "2026-01-17",
        "dateDisplay": "1月17日",
        "weekday": "星期六",
        "betAmount": 7300,
        "validAmount": 6720,
        "winLoss": 120.00
      }
    ]
  }
}
```

---

## 四、账户余额模块 `/balance`

### 4.1 获取当前余额
**GET** `/balance`

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "balance": 50000.00
  }
}
```

---

### 4.2 更新余额（充值/调整）
**POST** `/balance/update`

**请求参数**
```json
{
  "amount": 1000,
  "type": "deposit",
  "remark": "充值"
}
```

**type 可选值**：
- `deposit` - 充值（加）
- `withdraw` - 提现（减）
- `adjust` - 调整

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "balance": 51000.00
  }
}
```

---

## 五、系统模块 `/system`（预留）

### 5.1 获取系统时间
**GET** `/system/time`

**响应数据**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "serverTime": "2026-01-18T10:30:00.000Z",
    "timezone": "GMT-4"
  }
}
```

---

## 附录：前端调用示例

```javascript
// 前端 store 中替换 localStorage 为 API 调用

// 获取投注记录
async function fetchBetRecords() {
  const res = await fetch('/api/v1/bet/pending')
  const data = await res.json()
  if (data.code === 200) {
    betRecords.value = data.data
  }
}

// 提交投注
async function placeBet(betData) {
  const res = await fetch('/api/v1/bet/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(betData)
  })
  const data = await res.json()
  if (data.code === 200) {
    // 投注成功，刷新记录
    await fetchBetRecords()
    return data.data
  }
  throw new Error(data.message)
}
```
