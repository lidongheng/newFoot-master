# 体育博彩移动端应用 (Huangguang)

一个基于 Vue 3 + Vant + Pinia 开发的体育博彩移动端 Web 应用。

## 📱 功能特性

### 页面功能

| 页面 | 路由 | 功能描述 |
|------|------|---------|
| 今日赛事 | `/` | 首页，显示今日赛事（支持空状态显示） |
| 滚球赛事 | `/live` | 实时比赛列表，支持投注 |
| 早盘 | `/early` | 未来赛事，日期选择和联赛筛选 |
| 帐户历史 | `/account` | 账户交易和投注历史记录 |
| 我的赛事 | `/my-events` | 收藏的赛事 |
| 投注记录 | `/bet-records` | 投注历史记录 |

### 核心功能

1. **赛事浏览**
   - 按运动类型筛选（足球、篮球、电竞、网球、排球等）
   - 按时间筛选（赛前、滚球、全部、下一小时等）
   - 按玩法筛选（主要玩法、让球&大小、角球、波胆等）

2. **投注功能**
   - 点击赔率快速投注
   - 支持滚球让球、大小球、独赢
   - 滚球列表每 5 秒刷新，封盘赔率不可点击
   - 变盘后展示最新盘口并要求重新确认
   - 自定义数字键盘
   - 快捷金额（+100、+500、+1000）
   - 投注确认和成功提示
   - 添加到注单功能

3. **账户管理**
   - 账户余额显示
   - 历史记录查询
   - 日期范围筛选

## 🛠 技术栈

- **框架**: Vue 3 (Composition API)
- **UI 组件库**: Vant 3
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **CSS 预处理器**: Less
- **图标**: 自定义 SVG 图标

## 📂 项目结构

```
src/
├── assets/
│   └── styles/
│       └── global.less      # 全局样式和CSS变量
├── components/
│   ├── TopNavBar.vue        # 顶部导航栏
│   ├── SportCategoryBar.vue # 运动分类栏
│   ├── BottomTabBar.vue     # 底部标签栏
│   ├── SubFilterTabs.vue    # 子筛选标签
│   ├── PlayTypeFilter.vue   # 玩法筛选
│   ├── MatchCard.vue        # 比赛卡片
│   └── BetPopup.vue         # 投注弹窗
├── views/
│   ├── HomeView.vue         # 首页/今日赛事
│   ├── LiveBettingView.vue  # 滚球赛事
│   ├── EarlyBettingView.vue # 早盘
│   ├── AccountHistoryView.vue # 帐户历史
│   ├── MyEventsView.vue     # 我的赛事
│   └── BetRecordsView.vue   # 投注记录
├── store/
│   └── index.js             # Pinia Store (用户、投注、比赛、账户)
├── router/
│   └── index.js             # 路由配置
├── App.vue                  # 根组件
└── main.js                  # 入口文件
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run serve
```

### 生产构建

```bash
pnpm run build
```

## 🎨 设计规范

### 配色方案

| 类型 | 颜色值 | 用途 |
|------|--------|------|
| 主色 | `#5D5346` | 顶部导航、页面头部 |
| 强调色 | `#C5A35A` | 金色高亮、选中状态 |
| 红色 | `#C5483D` | 赔率、盈利数字 |
| 绿色 | `#4CAF50` | 投注按钮、成功状态 |

### 字体大小

- 超小: 10px
- 小: 12px
- 中: 14px
- 大: 16px
- 超大: 18px

### 间距

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- xxl: 24px

## 📝 使用说明

### 投注流程

1. 在滚球赛事页面浏览比赛
2. 点击想要投注的赔率
3. 弹出投注面板，输入金额
4. 点击"下注"按钮确认
5. 投注成功后显示确认信息

### 页面导航

- **顶部导航**: 切换首页、滚球、热门、今日、即将开赛、早盘、冠军
- **运动分类**: 切换不同运动类型
- **底部标签栏**: 切换滚球/热门/今日，访问电视直播、我的赛事、注单、投注记录、账户

## 🔧 配置说明

### vue.config.js

项目使用默认 Vue CLI 配置，可根据需要修改：

```javascript
module.exports = {
  // 生产环境关闭 source map
  productionSourceMap: false,
  // 开发服务器配置
  devServer: {
    port: 8080
  }
}
```

## 📄 版本历史

### v0.1.0

- 初始版本
- 实现所有核心页面和功能
- 支持投注流程

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📜 许可证

MIT License
