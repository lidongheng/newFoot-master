---
name: dh-worldcup-analysis
description: |
  针对2026世界杯比赛的全流程分析助手。覆盖赛前球队画像、赛中逐场预测/复盘、世界杯独特策略分析。
  始终从专家视角出发，帮用户多想一步。遇到不确定的问题主动与用户确认。
  支持：大名单分析、球队画像、赛前分析、赛后复盘、小组出线策略、挑对手分析、默契球识别、赛程疲劳度分析。
  当用户提到"世界杯"、"国家队"、"小组赛"、"淘汰赛"、"大名单"、"球队画像"、
  "出线"、"挑对手"、"默契球"、"赛程疲劳"时使用此技能。
---

# 2026世界杯分析工作流程

**SKILL**: dh-worldcup-analysis
**创建时间**: 2026-04-06
**版本**: v1.0

---

## 项目概览

本项目专门针对2026世界杯（48队赛制），分析体系分三个阶段：
1. **赛前**：48队大名单收集、球队画像分析、小组实力评估
2. **赛中**：逐场赛前预测 + 赛后复盘
3. **策略**：小组出线路径、挑对手、默契球识别、赛程疲劳度

## 关键差异：世界杯 vs 联赛

| 维度 | 联赛(league-analyzer) | 世界杯(cup-analyzer) |
|------|---------------------|---------------------|
| 盘路榜 | 有（20+轮数据积累） | 无（小组赛仅3轮） |
| 广实定位 | 俱乐部档次 | 国家队档次（需重新建立） |
| 球队磨合 | 高（每周训练比赛） | 低（集训有限） |
| 战意分析 | 保级/争冠 | 出线/挑对手/保留实力 |
| 默契球 | 极少 | 小组赛第3轮有风险 |
| 赛程疲劳 | 一般 | 跨三国旅行+紧密赛程 |

---

## 文件路径说明

### 数据文件
```
cup-analyzer/theWorldCup/data/
├── c75.js                    # 世界杯赛程数据（球探体育）
├── 冠军赔率.md                # 各队冠军赔率
└── 球队与序号对照表.md        # 球队ID对照
```

### 规则文件
```
cup-analyzer/theWorldCup/rule/
├── group-stage-rule.md        # 小组赛规则（48队12组）
└── 16th-finals-rule.md        # 32强对阵规则（上下半区）
```

### 大名单
```
cup-analyzer/theWorldCup/squad/
├── group-A/ ~ group-L/       # 按小组分类的26人大名单
```

### 球队画像
```
cup-analyzer/theWorldCup/teamProfile/
├── {球队名}.md                # 每队一个画像文件
```

### 赛前报告
```
cup-analyzer/theWorldCup/report/
├── group-stage/round-{1,2,3}/ # 小组赛
├── round-of-32/               # 32强
├── round-of-16/               # 16强
├── quarter-finals/            # 8强
├── semi-finals/               # 半决赛
└── final/                     # 决赛
```

### 赛后复盘
```
cup-analyzer/theWorldCup/postMatchSummary/
└── (与report相同的目录结构)
```

### 策略分析
```
cup-analyzer/theWorldCup/strategy/
├── group-path-analysis.md     # 小组出线路径
├── opponent-selection.md      # 挑对手策略
├── tacit-match-detection.md   # 默契球风险
└── fatigue-schedule.md        # 赛程疲劳度
```

### 球队简介（AI只读）
```
cup-analyzer/theWorldCup/description/
└── {球队名}.md                # 东恒编辑的球队背景信息
```

### 比赛素材
```
cup-analyzer/theWorldCup/news/
└── {阶段}/{对阵}/
    ├── 统计信息.md
    ├── {主队}大名单.md
    └── {客队}大名单.md
```

---

## 阶段一：赛前球队分析

### 工具和脚本
```bash
cd cup-analyzer/crawler-server

# 爬取单个球队大名单
node crawlers/squadCrawler.js --team {球队序号}

# 批量爬取48队大名单
node crawlers/squadCrawler.js

# 生成大名单 Markdown（按小组分类）
node processors/squadProcessor.js

# 生成球队画像
node processors/teamProfileGenerator.js

# 生成策略分析报告
node processors/strategyAnalyzer.js
```

### 球队画像分析维度

从26人大名单数据自动推算：
- **年龄结构**：平均年龄、年龄分布（年轻/当打/老将比例）→ 经验值和体能
- **身高分析**：平均身高、高点数量 → 定位球能力和空中对抗
- **身价分析**：总身价、平均身价、身价TOP5 → 整体硬实力档次
- **位置深度**：每位置人数、核心球员替补质量 → 抗伤病能力
- **打法推断**：结合阵型、球员特点推断战术体系
- **球队目标**：结合身价档次 + 冠军赔率 → 定目标（夺冠/四强/八强/出线/陪跑）

---

## 阶段二：赛中逐场分析

### 赛前分析流程

复用 `dh-match-predict-analysis` SKILL 的工作流，但有以下适配：

#### 与联赛分析的差异处理

1. **无盘路榜**：世界杯场次太少，无法建立盘路榜
   - 替代方案：使用各球员所在俱乐部的联赛盘路表现作间接参考
   - 重点参考冠军赔率和身价档次来定位球队实力

2. **广实定位需重建**：国家队档次 ≠ 俱乐部档次
   - 参考冠军赔率划分国家队档次
   - 档次对应的理论盘口需要重新建立
   - 赛前参考 `cup-analyzer/theWorldCup/data/冠军赔率.md`

3. **磨合度因素**：国家队球员来自不同俱乐部
   - 分析核心球员是否来自同一俱乐部（天然配合默契）
   - 分析教练执教时间和战术体系成熟度
   - 首场比赛尤其要关注磨合问题

4. **战意分析升级**：
   - 小组赛第1轮：所有队全力以赴
   - 小组赛第2轮：部分强队开始考虑名次（挑对手）
   - 小组赛第3轮：出线/淘汰已定的球队可能保留/放弃
   - 淘汰赛：一场定胜负，战意通常不是问题

### 赛前分析报告模板

报告存放路径: `cup-analyzer/theWorldCup/report/{阶段}/{轮次}/{主队}_vs_{客队}.md`

**报告结构**：沿用联赛分析模板的大框架，但以下部分做世界杯适配：

#### 一、球员信息
- 与联赛相同：大名单、伤病、预测首发、实际首发
- **新增**：标注核心球员的俱乐部赛季表现

#### 二、分析时必看
- 与联赛相同（警醒自己的话）

#### 三、发布会信息
- 与联赛相同

#### 四、盘口解析
- **亚盘**：由于无盘路榜，重点分析：
  - 国家队档次定位（替代广实定位）
  - 冠军赔率反映的实力差距
  - 水位/拉力分析（与联赛相同）
- **大小球**：参考两队预选赛/友谊赛的进球数据
- **历史同赔**：如有之前世界杯的同赔数据可参考
- ⚠️ **无亚盘盘路榜、无大小盘路榜**

#### 五、主客队近况
- **交锋历史**：国家队层面的历史交锋（不限于世界杯）
- **近况**：预选赛/友谊赛近期表现
- **积分榜**：小组赛积分（仅小组赛阶段）
- **未来赛程**：淘汰赛路径推演

#### 六、世界杯特别分析（新增）
- **出线形势**：当前积分、出线概率
- **挑对手分析**：不同名次对应的32强对手
- **保留实力风险**：是否可能轮换主力
- **赛程疲劳度**：距上场比赛间隔天数

#### 七、结果
- 与联赛相同

#### 八、舆情
- 与联赛相同

### 赛后复盘流程

复用 `dh-post-match-analysis` SKILL 的多专家深度分析流程。

复盘存放路径: `cup-analyzer/theWorldCup/postMatchSummary/{阶段}/{轮次}/{主队}_vs_{客队}.md`

赛后数据爬取：
```bash
cd cup-analyzer/crawler-server
node crawlers/matchDataCrawler.js --match {比赛ID}
```

---

## 阶段三：世界杯独特策略

### 1. 小组赛挑对手（第2、3轮）

核心逻辑：
- 读取 `16th-finals-rule.md` 中的上下半区对阵规则
- 小组第1、第2、最佳第3的淘汰赛路径不同
- 冠军级球队会选择更有利的半区路径

分析文件: `cup-analyzer/theWorldCup/strategy/opponent-selection.md`

### 2. 默契球识别

触发条件检测：
- 同组最后一轮，两队同时开赛
- 某个特定比分对双方都有利
- 双方无仇恨、无利益冲突
- 历史上有默契球先例

分析文件: `cup-analyzer/theWorldCup/strategy/tacit-match-detection.md`

### 3. 赛程疲劳度

分析维度：
- 两场比赛间隔天数（≤3天为紧密赛程）
- 跨时区旅行距离
- 轮换可能性评估

分析文件: `cup-analyzer/theWorldCup/strategy/fatigue-schedule.md`

### 4. 保留实力识别

信号指标：
- 已确定出线/淘汰
- 淘汰赛对手已确定且较弱
- 赛程紧密 + 后面对手强
- 该国家队历史上是否有"保留实力"传统

---

## 国家队档次定位（替代广实定位）

基于冠军赔率划分：

| 档次 | 赔率范围 | 代表球队 | 理论让球基准 |
|------|---------|---------|------------|
| 超一档 | ≤ 8.00 | 西班牙、英格兰、巴西、法国、阿根廷 | 让1.5-2球 |
| 一档 | 8.01-16.00 | 葡萄牙、德国 | 让1-1.5球 |
| 二档 | 16.01-30.00 | 荷兰、挪威 | 让0.75-1球 |
| 三档 | 30.01-50.00 | 意大利、比利时 | 让0.5-0.75球 |
| 四档 | > 50.00 | 其他球队 | 让0-0.5球 |

**注意**：
- 以上为参考基准，实际盘口还需考虑主客场、状态、伤病等因素
- 世界杯小组赛名义上无主客场，但先报名的一方视为"主队"
- 赛事举办地（美国/加拿大/墨西哥）的球队有一定主场优势

---

## 工具与脚本

| 脚本 | 用途 |
|------|------|
| `crawler-server/crawlers/squadCrawler.js` | 爬取球队大名单 |
| `crawler-server/crawlers/matchDataCrawler.js` | 爬取赛后数据 |
| `crawler-server/crawlers/oddsCrawler.js` | 爬取盘口赔率 |
| `crawler-server/crawlers/scheduleCrawler.js` | 更新赛程比分 |
| `crawler-server/processors/squadProcessor.js` | 大名单清洗生成MD |
| `crawler-server/processors/teamProfileGenerator.js` | 球队画像生成 |
| `crawler-server/processors/strategyAnalyzer.js` | 策略分析报告生成 |

---

## 参考文件索引

| 需要什么 | 去哪找 |
|---------|-------|
| 赛程数据 | `cup-analyzer/theWorldCup/data/c75.js` |
| 冠军赔率 | `cup-analyzer/theWorldCup/data/冠军赔率.md` |
| 球队序号 | `cup-analyzer/theWorldCup/data/球队与序号对照表.md` |
| 小组赛规则 | `cup-analyzer/theWorldCup/rule/group-stage-rule.md` |
| 32强对阵规则 | `cup-analyzer/theWorldCup/rule/16th-finals-rule.md` |
| 出线路径分析 | `cup-analyzer/theWorldCup/strategy/group-path-analysis.md` |
| 挑对手策略 | `cup-analyzer/theWorldCup/strategy/opponent-selection.md` |

---

> **东恒出品** | AI Native Coder · 独立开发者
