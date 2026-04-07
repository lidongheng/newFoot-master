# 后台管理系统前端开发指南

> 本文档面向前端开发者，提供完整的后台管理系统开发所需信息。

## 目录

- [一、系统概述](#一系统概述)
- [二、技术建议](#二技术建议)
- [三、API 调用规范](#三api-调用规范)
- [四、数据结构定义](#四数据结构定义)
- [五、页面功能设计](#五页面功能设计)
- [六、接口详细说明](#六接口详细说明)
- [七、前端代码示例](#七前端代码示例)
- [八、常见问题](#八常见问题)

---

## 一、系统概述

### 1.1 系统简介

体育博彩后台管理系统，用于管理比赛、联赛、投注订单和账户信息。

### 1.2 功能模块

| 模块 | 功能描述 |
|------|---------|
| 比赛管理 | 比赛的增删改查、状态管理、比分更新 |
| 联赛管理 | 联赛的增删改查、国家分类管理 |
| 投注订单 | 订单查询、结算、取消、统计分析 |
| 账户管理 | 余额查看、调整、变动日志查询 |

### 1.3 接口基础信息

```
基础 URL: http://localhost:3000/api/v1/admin
请求格式: JSON
响应格式: JSON
```

---

## 二、技术建议

### 2.1 推荐技术栈

| 类型 | 推荐方案 | 备选方案 |
|------|---------|---------|
| 框架 | Vue 3 + TypeScript | React + TypeScript |
| UI 库 | Element Plus | Ant Design Vue |
| 状态管理 | Pinia | Vuex 4 |
| HTTP 客户端 | Axios | Fetch API |
| 构建工具 | Vite | Webpack |

### 2.2 项目结构建议

```
admin-frontend/
├── src/
│   ├── api/                    # API 接口封装
│   │   ├── index.ts            # Axios 实例配置
│   │   ├── match.ts            # 比赛接口
│   │   ├── league.ts           # 联赛接口
│   │   ├── betOrder.ts         # 投注订单接口
│   │   └── account.ts          # 账户接口
│   ├── views/                  # 页面组件
│   │   ├── match/
│   │   │   ├── MatchList.vue   # 比赛列表
│   │   │   └── MatchForm.vue   # 比赛表单
│   │   ├── league/
│   │   ├── betOrder/
│   │   └── account/
│   ├── components/             # 通用组件
│   ├── types/                  # TypeScript 类型定义
│   ├── utils/                  # 工具函数
│   └── router/                 # 路由配置
```

---

## 三、API 调用规范

### 3.1 统一响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  code: 200
  message: string
  data: T
}

// 错误响应
interface ErrorResponse {
  code: 400 | 404 | 500
  message: string
  data: null
}

// 分页数据
interface PaginatedData<T> {
  total: number        // 总条数
  page: number         // 当前页
  pageSize: number     // 每页条数
  totalPages: number   // 总页数
  list: T[]            // 数据列表
}
```

### 3.2 请求头配置

```typescript
const headers = {
  'Content-Type': 'application/json'
}
```

### 3.3 HTTP 方法规范

| 操作 | HTTP 方法 | 示例 |
|------|----------|------|
| 查询列表 | GET | `GET /admin/match/list?page=1` |
| 查询详情 | GET | `GET /admin/match/detail/123` |
| 创建 | POST | `POST /admin/match/create` |
| 更新 | PUT | `PUT /admin/match/update/123` |
| 删除 | DELETE | `DELETE /admin/match/delete/123` |
| 批量操作 | POST | `POST /admin/match/batch-delete` |

### 3.4 错误处理

```typescript
// 推荐的错误处理方式
async function handleRequest<T>(request: Promise<Response>): Promise<T> {
  try {
    const res = await request
    const data = await res.json()
    
    if (data.code === 200) {
      return data.data
    } else {
      // 显示错误提示
      ElMessage.error(data.message)
      throw new Error(data.message)
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后重试')
    throw error
  }
}
```

---

## 四、数据结构定义

### 4.1 比赛 (Match)

```typescript
interface Match {
  _id: string                    // MongoDB ID
  matchId: string                // 比赛唯一标识
  
  // 联赛信息
  league: string                 // 联赛名称
  leagueIcon: string             // 联赛图标 (emoji)
  
  // 球队信息
  homeTeam: string               // 主队名称
  awayTeam: string               // 客队名称
  
  // 比分
  homeScore: number              // 主队得分
  awayScore: number              // 客队得分
  
  // 状态
  status: 'upcoming' | 'live' | 'finished'  // 比赛状态
  period: string                 // 比赛时段 (上半场/下半场/中场休息)
  minute: number                 // 当前分钟
  
  // 时间
  startTime: string              // 开赛时间 (ISO 8601)
  
  // 功能标识
  hasVideo: boolean              // 是否有视频
  hasCashOut: boolean            // 是否可提前兑现
  isLive: boolean                // 是否滚球
  
  // 赔率
  odds: MatchOdds
  
  // 时间戳
  createdAt: string
  updatedAt: string
}

interface MatchOdds {
  handicap: {                    // 让球盘
    home: { value: string; odds: number }
    away: { value: string; odds: number }
  }
  overUnder: {                   // 大小球
    over: { value: string; odds: number }
    under: { value: string; odds: number }
  }
  moneyline: {                   // 独赢盘
    home: { label: string; odds: number }
    draw: { label: string; odds: number }
    away: { label: string; odds: number }
  }
}
```

### 4.2 联赛 (League)

```typescript
interface League {
  _id: string
  leagueId: string               // 联赛唯一标识
  name: string                   // 联赛名称
  country: string                // 国家
  flag: string                   // 国旗 emoji
  matchCount: number             // 比赛数量
  createdAt: string
  updatedAt: string
}
```

### 4.3 投注订单 (BetOrder)

```typescript
interface BetOrder {
  _id: string
  orderId: string                // 订单号
  
  // 比赛信息
  matchId: string
  league: string
  homeTeam: string
  awayTeam: string
  homeScore: number              // 下注时比分
  awayScore: number
  
  // 投注信息
  betType: string                // 投注类型 (如: 足球 (滚球) 让球)
  selection: string              // 选择项 (如: 麦克阿瑟)
  value: string                  // 盘口值 (如: -0.5)
  odds: number                   // 赔率
  
  // 金额
  amount: number                 // 投注金额
  potentialWin: number           // 预计可赢
  actualWin: number | null       // 实际赢取 (结算后)
  
  // 状态
  status: 'pending' | 'settled' | 'cancelled'
  result: 'win' | 'lose' | 'push' | 'half_win' | 'half_lose' | null
  
  // 最终比分
  finalHomeScore: number | null
  finalAwayScore: number | null
  
  // 时间
  createdAt: string
  settledAt: string | null
}

// 订单统计
interface BetOrderStats {
  totalAmount: number            // 总投注金额
  totalPotentialWin: number      // 总预计可赢
  totalActualWin: number         // 总实际赢取
  pendingCount: number           // 待结算数量
  settledCount: number           // 已结算数量
  totalCount: number             // 总数量
}
```

### 4.4 账户 (Account)

```typescript
interface Account {
  _id: string
  balance: number                // 当前余额
  createdAt: string
  updatedAt: string
}

// 余额变动日志
interface BalanceLog {
  _id: string
  type: 'bet' | 'win' | 'deposit' | 'withdraw' | 'adjust'
  amount: number                 // 变动金额 (正数增加，负数减少)
  balanceBefore: number          // 变动前余额
  balanceAfter: number           // 变动后余额
  relatedOrderId: string | null  // 关联订单号
  remark: string                 // 备注
  createdAt: string
}

// 余额统计
interface BalanceStats {
  totalDeposit: number           // 总充值
  totalWithdraw: number          // 总提现
  totalBet: number               // 总投注
  totalWin: number               // 总赢取
  totalAdjust: number            // 总调整
  count: number                  // 日志条数
}
```

### 4.5 枚举值说明

```typescript
// 比赛状态
const MatchStatus = {
  upcoming: '未开始',
  live: '进行中',
  finished: '已结束'
}

// 订单状态
const OrderStatus = {
  pending: '待结算',
  settled: '已结算',
  cancelled: '已取消'
}

// 结算结果
const SettleResult = {
  win: '赢',
  lose: '输',
  push: '走水',
  half_win: '赢半',
  half_lose: '输半'
}

// 余额变动类型
const BalanceLogType = {
  bet: '投注',
  win: '中奖',
  deposit: '充值',
  withdraw: '提现',
  adjust: '调整'
}
```

---

## 五、页面功能设计

### 5.1 比赛管理页面

#### 列表页功能

| 功能 | 说明 |
|------|------|
| 搜索 | 支持按球队名称、比赛ID搜索 |
| 筛选 | 按状态(未开始/进行中/已结束)、联赛筛选 |
| 分页 | 默认每页20条 |
| 操作 | 编辑、删除、更新状态、更新比分 |
| 批量操作 | 批量删除 |

#### 表格列建议

| 列名 | 字段 | 宽度 | 说明 |
|------|------|------|------|
| 比赛ID | matchId | 150px | |
| 联赛 | league + leagueIcon | 180px | 显示图标+名称 |
| 主队 | homeTeam | 120px | |
| 客队 | awayTeam | 120px | |
| 比分 | homeScore - awayScore | 80px | 居中显示 |
| 状态 | status | 100px | 使用 Tag 组件 |
| 开赛时间 | startTime | 160px | 格式化显示 |
| 操作 | - | 200px | 编辑/删除/更多 |

#### 表单字段

```typescript
interface MatchForm {
  matchId: string        // 必填，唯一
  league: string         // 必填，下拉选择
  leagueIcon: string     // 自动填充
  homeTeam: string       // 必填
  awayTeam: string       // 必填
  startTime: Date        // 必填，日期时间选择器
  status: string         // 下拉选择
  hasVideo: boolean      // 开关
  hasCashOut: boolean    // 开关
  odds: MatchOdds        // 嵌套表单
}
```

---

### 5.2 联赛管理页面

#### 列表页功能

| 功能 | 说明 |
|------|------|
| 搜索 | 按联赛名称、ID搜索 |
| 筛选 | 按国家筛选 |
| 操作 | 编辑、删除 |

#### 表格列

| 列名 | 字段 | 宽度 |
|------|------|------|
| 联赛ID | leagueId | 120px |
| 国旗 | flag | 60px |
| 联赛名称 | name | 200px |
| 国家 | country | 120px |
| 比赛数量 | matchCount | 100px |
| 操作 | - | 150px |

---

### 5.3 投注订单页面

#### 列表页功能

| 功能 | 说明 |
|------|------|
| 搜索 | 按订单号、球队、联赛搜索 |
| 筛选 | 按状态、结果、日期范围筛选 |
| 统计卡片 | 显示总投注、总赢取、待结算等统计 |
| 操作 | 查看详情、结算、取消 |
| 批量操作 | 批量结算、批量删除 |

#### 统计卡片设计

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  总投注金额   │  总预计可赢   │  总实际赢取   │   待结算     │
│   ¥50,000    │   ¥45,000    │   ¥30,000    │    10 单     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

#### 表格列

| 列名 | 字段 | 宽度 |
|------|------|------|
| 订单号 | orderId | 180px |
| 比赛 | homeTeam vs awayTeam | 200px |
| 投注类型 | betType | 150px |
| 选择 | selection + value | 120px |
| 赔率 | odds | 80px |
| 投注金额 | amount | 100px |
| 状态 | status | 100px |
| 结果 | result | 80px |
| 下注时间 | createdAt | 160px |
| 操作 | - | 150px |

---

### 5.4 账户管理页面

#### 功能模块

1. **账户概览卡片**
   - 当前余额（大字醒目显示）
   - 快速调整余额按钮

2. **余额变动日志列表**
   - 支持按类型、日期筛选
   - 显示每笔变动详情

3. **统计图表**（可选）
   - 余额变动趋势图
   - 各类型变动占比饼图

---

## 六、接口详细说明

### 6.1 比赛管理接口

#### 获取比赛列表
```
GET /admin/match/list
```

**请求参数**
```typescript
interface MatchListParams {
  status?: 'upcoming' | 'live' | 'finished'
  league?: string      // 模糊搜索
  keyword?: string     // 搜索球队/比赛ID
  page?: number        // 默认 1
  pageSize?: number    // 默认 20
}
```

**响应数据**
```typescript
interface MatchListResponse {
  code: 200
  message: 'success'
  data: PaginatedData<Match>
}
```

---

#### 创建比赛
```
POST /admin/match/create
```

**请求体**
```json
{
  "matchId": "EPL_2026_01_20_001",
  "league": "英格兰超级联赛",
  "leagueIcon": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "homeTeam": "阿森纳",
  "awayTeam": "切尔西",
  "startTime": "2026-01-20T15:00:00.000Z",
  "status": "upcoming",
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

---

#### 更新比赛状态
```
PUT /admin/match/status/:id
```

**请求体**
```json
{
  "status": "live"
}
```

---

#### 更新比分
```
PUT /admin/match/score/:id
```

**请求体**
```json
{
  "homeScore": 2,
  "awayScore": 1
}
```

---

### 6.2 投注订单接口

#### 批量结算
```
POST /admin/bet-order/batch-settle
```

**请求体**
```json
{
  "ids": ["id1", "id2", "id3"],
  "result": "win",
  "finalHomeScore": 2,
  "finalAwayScore": 1
}
```

**result 可选值及金额计算**

| 结果 | 说明 | 返还金额计算 |
|------|------|-------------|
| win | 全赢 | 本金 + 预计可赢 |
| half_win | 赢半 | 本金 + 预计可赢 / 2 |
| push | 走水 | 本金 |
| half_lose | 输半 | 本金 / 2 |
| lose | 全输 | 0 |

---

### 6.3 账户接口

#### 设置余额
```
POST /admin/account/set-balance
```

**请求体**
```json
{
  "balance": 100000,
  "remark": "系统调整"
}
```

> ⚠️ 注意：这是直接设置余额值，不是增减操作

---

## 七、前端代码示例

### 7.1 Axios 封装

```typescript
// src/api/index.ts
import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 10000
})

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 200) {
      return data
    } else {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
  },
  (error) => {
    ElMessage.error('网络错误，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
```

### 7.2 比赛接口封装

```typescript
// src/api/match.ts
import request from './index'
import type { Match, PaginatedData } from '@/types'

// 获取比赛列表
export function getMatchList(params: {
  status?: string
  league?: string
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedData<Match>> {
  return request.get('/match/list', { params })
}

// 获取比赛详情
export function getMatchDetail(id: string): Promise<Match> {
  return request.get(`/match/detail/${id}`)
}

// 创建比赛
export function createMatch(data: Partial<Match>): Promise<Match> {
  return request.post('/match/create', data)
}

// 更新比赛
export function updateMatch(id: string, data: Partial<Match>): Promise<Match> {
  return request.put(`/match/update/${id}`, data)
}

// 删除比赛
export function deleteMatch(id: string): Promise<void> {
  return request.delete(`/match/delete/${id}`)
}

// 批量删除
export function batchDeleteMatches(ids: string[]): Promise<{ deletedCount: number }> {
  return request.post('/match/batch-delete', { ids })
}

// 更新状态
export function updateMatchStatus(id: string, status: string): Promise<Match> {
  return request.put(`/match/status/${id}`, { status })
}

// 更新比分
export function updateMatchScore(id: string, homeScore: number, awayScore: number): Promise<Match> {
  return request.put(`/match/score/${id}`, { homeScore, awayScore })
}
```

### 7.3 联赛接口封装

```typescript
// src/api/league.ts
import request from './index'
import type { League, PaginatedData } from '@/types'

export function getLeagueList(params: {
  country?: string
  keyword?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedData<League>> {
  return request.get('/league/list', { params })
}

export function getAllLeagues(): Promise<League[]> {
  return request.get('/league/all')
}

export function getCountries(): Promise<string[]> {
  return request.get('/league/countries')
}

export function createLeague(data: Partial<League>): Promise<League> {
  return request.post('/league/create', data)
}

export function updateLeague(id: string, data: Partial<League>): Promise<League> {
  return request.put(`/league/update/${id}`, data)
}

export function deleteLeague(id: string): Promise<void> {
  return request.delete(`/league/delete/${id}`)
}
```

### 7.4 投注订单接口封装

```typescript
// src/api/betOrder.ts
import request from './index'
import type { BetOrder, BetOrderStats, PaginatedData } from '@/types'

interface BetOrderListResponse extends PaginatedData<BetOrder> {
  stats: BetOrderStats
}

export function getBetOrderList(params: {
  status?: string
  result?: string
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<BetOrderListResponse> {
  return request.get('/bet-order/list', { params })
}

export function getBetOrderStats(): Promise<BetOrderStats> {
  return request.get('/bet-order/stats')
}

export function cancelBetOrder(id: string): Promise<BetOrder> {
  return request.post(`/bet-order/cancel/${id}`)
}

export function batchSettleBetOrders(data: {
  ids: string[]
  result: string
  finalHomeScore?: number
  finalAwayScore?: number
}): Promise<{ settledCount: number; orders: BetOrder[] }> {
  return request.post('/bet-order/batch-settle', data)
}
```

### 7.5 账户接口封装

```typescript
// src/api/account.ts
import request from './index'
import type { Account, BalanceLog, BalanceStats, PaginatedData } from '@/types'

export function getAccountInfo(): Promise<Account> {
  return request.get('/account/info')
}

export function setBalance(balance: number, remark?: string): Promise<Account> {
  return request.post('/account/set-balance', { balance, remark })
}

export function getBalanceLogs(params: {
  type?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedData<BalanceLog>> {
  return request.get('/account/balance-logs', { params })
}

export function getBalanceStats(params?: {
  startDate?: string
  endDate?: string
}): Promise<BalanceStats> {
  return request.get('/account/balance-stats', { params })
}
```

### 7.6 Vue 组件示例

```vue
<!-- src/views/match/MatchList.vue -->
<template>
  <div class="match-list">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="未开始" value="upcoming" />
            <el-option label="进行中" value="live" />
            <el-option label="已结束" value="finished" />
          </el-select>
        </el-form-item>
        <el-form-item label="联赛">
          <el-input v-model="searchForm.league" placeholder="联赛名称" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="球队/比赛ID" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleCreate">新增比赛</el-button>
      <el-button type="danger" :disabled="!selectedIds.length" @click="handleBatchDelete">
        批量删除 ({{ selectedIds.length }})
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table 
      :data="tableData" 
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="matchId" label="比赛ID" width="150" />
      <el-table-column label="联赛" width="180">
        <template #default="{ row }">
          {{ row.leagueIcon }} {{ row.league }}
        </template>
      </el-table-column>
      <el-table-column prop="homeTeam" label="主队" width="120" />
      <el-table-column prop="awayTeam" label="客队" width="120" />
      <el-table-column label="比分" width="80" align="center">
        <template #default="{ row }">
          {{ row.homeScore }} - {{ row.awayScore }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开赛时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @size-change="fetchData"
      @current-change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMatchList, deleteMatch, batchDeleteMatches } from '@/api/match'
import type { Match } from '@/types'

const loading = ref(false)
const tableData = ref<Match[]>([])
const selectedIds = ref<string[]>([])

const searchForm = reactive({
  status: '',
  league: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const data = await getMatchList({
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    tableData.value = data.list
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 重置
function handleReset() {
  searchForm.status = ''
  searchForm.league = ''
  searchForm.keyword = ''
  handleSearch()
}

// 删除
async function handleDelete(row: Match) {
  await ElMessageBox.confirm('确定删除该比赛吗？', '提示')
  await deleteMatch(row._id)
  ElMessage.success('删除成功')
  fetchData()
}

// 批量删除
async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 场比赛吗？`, '提示')
  await batchDeleteMatches(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  fetchData()
}

// 状态相关
function getStatusType(status: string) {
  const types: Record<string, string> = {
    upcoming: 'info',
    live: 'success',
    finished: 'warning'
  }
  return types[status] || 'info'
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    upcoming: '未开始',
    live: '进行中',
    finished: '已结束'
  }
  return texts[status] || status
}

// 格式化日期
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(fetchData)
</script>
```

---

## 八、常见问题

### Q1: 如何处理接口跨域？

开发环境配置 Vite 代理：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

### Q2: 日期时间如何处理？

- 后端返回 ISO 8601 格式字符串
- 前端使用 `new Date()` 解析
- 推荐使用 dayjs 库格式化显示

```typescript
import dayjs from 'dayjs'

// 显示格式化
dayjs(dateStr).format('YYYY-MM-DD HH:mm')

// 提交给后端
new Date(dateValue).toISOString()
```

### Q3: 表单验证规则示例？

```typescript
const rules = {
  matchId: [
    { required: true, message: '请输入比赛ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  league: [
    { required: true, message: '请选择联赛', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择开赛时间', trigger: 'change' }
  ],
  'odds.handicap.home.odds': [
    { required: true, message: '请输入赔率', trigger: 'blur' },
    { type: 'number', min: 0, message: '赔率必须大于0', trigger: 'blur' }
  ]
}
```

### Q4: 如何优化大量数据的表格性能？

1. 使用虚拟滚动（el-table-v2）
2. 合理设置分页大小
3. 避免在表格中使用复杂的计算属性

---

## 附录：接口速查表

### 比赛管理
```
GET    /admin/match/list              获取列表
GET    /admin/match/detail/:id        获取详情
POST   /admin/match/create            创建
PUT    /admin/match/update/:id        更新
DELETE /admin/match/delete/:id        删除
POST   /admin/match/batch-delete      批量删除
PUT    /admin/match/status/:id        更新状态
PUT    /admin/match/score/:id         更新比分
```

### 联赛管理
```
GET    /admin/league/list             获取列表
GET    /admin/league/all              获取全部
GET    /admin/league/countries        获取国家
GET    /admin/league/detail/:id       获取详情
POST   /admin/league/create           创建
PUT    /admin/league/update/:id       更新
DELETE /admin/league/delete/:id       删除
POST   /admin/league/batch-delete     批量删除
```

### 投注订单管理
```
GET    /admin/bet-order/list          获取列表
GET    /admin/bet-order/stats         获取统计
GET    /admin/bet-order/detail/:id    获取详情
POST   /admin/bet-order/create        创建
PUT    /admin/bet-order/update/:id    更新
DELETE /admin/bet-order/delete/:id    删除
POST   /admin/bet-order/batch-delete  批量删除
POST   /admin/bet-order/batch-settle  批量结算
POST   /admin/bet-order/cancel/:id    取消订单
```

### 账户管理
```
GET    /admin/account/info                    获取账户
POST   /admin/account/set-balance             设置余额
GET    /admin/account/balance-logs            获取日志
GET    /admin/account/balance-stats           获取统计
GET    /admin/account/balance-log/:id         获取日志详情
DELETE /admin/account/balance-log/:id         删除日志
POST   /admin/account/balance-logs/batch-delete  批量删除日志
```
