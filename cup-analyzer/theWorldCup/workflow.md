# 2026世界杯分析工作流程

## 赛事概览

- **时间**: 2026年6月11日 ~ 7月19日
- **地点**: 美国、加拿大、墨西哥
- **规模**: 48支球队，12个小组，每组4队
- **赛制**: 小组前2名 + 8个最佳第3名 → 32强单场淘汰制

### 赛程数据（与 crawler-server 统一）

- **主文件**：`theWorldCup/data/c75.js`（及同目录 `l75.js`、`bs75.js`；杯赛 `scheduleCrawler` **不**拉取 `td`）。
- **更新**：在 **`cup-analyzer/crawler-server`** 下执行 **`npx cross-env CUP_ANALYZER_CUP=theWorldCup node crawlers/scheduleCrawler.js`**（各系统相同；`package.json` 未单独封装世界杯赛程 npm 脚本）。若在 Bash / macOS 终端，也可写 `CUP_ANALYZER_CUP=theWorldCup node crawlers/scheduleCrawler.js`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。会写入 `theWorldCup/data/`，并把赛程主文件**同步拷贝**到 `crawler-server/match_center/c75.js`。
- **序号映射**：`config.resolveScheduleData('75', …)` 指向 **`theWorldCup/data/c75.js`**（国家队/杯赛场景与 `clubMatchAnalyzer` 的衔接见 `crawler-server/config` 与 `match_center/README.md`）。

## 三大阶段工作流

### 阶段一：赛前准备（世界杯开始前）

```
1. 爬取48队大名单
   └─ node crawlers/squadCrawler.js

2. 生成初选大名单 Markdown（按小组分类，人数通常多于正式26人）
   └─ node processors/squadProcessor.js
   └─ 输出到: squad/group-{A~L}/{球队名}.md

3. 手工确认最终26人并写入 squad-final（可先初始化再裁剪）
   └─ node processors/squadFinalInitializer.js
   └─ 输出到: squad-final/group-{A~L}/{球队名}.md（每队裁剪为恰好26人）；初始化会在 `## 统计摘要` 前插入 **`## 伤停` / `## 伤疑`** 占位，赛前在对应文件中填写（每行 `球衣号-姓名`）
   └─ 详见: squad-final/README.md

4. 生成球队画像
   └─ node processors/teamProfileGenerator.js（默认优先读 squad-final，无则回退 player_center JSON；若已填伤停/伤疑，画像「二、球队阵容」中会多出 **### 伤停 / ### 伤疑**）
   └─ 可选: --source raw 仅用 JSON；--team <序号> 只生成一队
   └─ 输出到: teamProfile/{球队名}.md
   └─ 分析: 年龄结构、身高、身价、位置深度、打法、目标

5. 生成策略分析报告
   └─ node processors/strategyAnalyzer.js
   └─ 输出到: strategy/ 目录下4个分析文件

6. 东恒手动补充
   └─ 编辑 description/{球队名}.md（球队背景、教练、战术、核心球员等）
```

### 阶段二：赛中分析（比赛开始后）

每场比赛流程：

```
赛前2-3天:
  1. 大名单与预测块：以 **`theWorldCup/squad-final/group-*/{队名}.md`** 为准（与 `teamProfile` 同源）；赛前更新该文件中的 **伤停 / 伤疑** 后可重跑 `teamProfileGenerator`。
     生成单场用文案（预测首发、预测替补=除首发与伤停外全部球员、伤疑、伤停；国家队无「落选」行）：
     `cd cup-analyzer/crawler-server && CUP_ANALYZER_CUP=theWorldCup node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`
  2. 收集素材、笔记 → news/{阶段}/{对阵}/
  3. 预测首发阵容（可与 `matchSquadGenerator` 输出对照）
  4. 查看交锋历史、近况
  5. 分析盘口（注意：无盘路榜，用冠军赔率做国家队档次定位）
  5b. 格雷厄姆式亚盘安全边际：记录 Market（初盘/临场）→ 写 Fair（合理让球）与一行推导链 → 算 Δ → 标注三档结论（值得投 / 观望 / 反向投），定义见下 **「亚盘安全边际（格雷厄姆式）」**
  6. 查看策略文件（出线形势、挑对手分析）
  7. 生成赛前报告 → `theWorldCup/report/{阶段}/{轮次}/{主队}_vs_{客队}.md`（大名单块见 **「赛前报告与大名单正文约定」**）

赛前2小时:
  8. 确认实际首发
  9. 更新临场盘口，并用 Fair / Market / Δ 复核三档结论（见「亚盘安全边际」）
  10. 最终投注决策

赛后:
  10. 爬取赛后数据: 在 `cup-analyzer/crawler-server` 使用 `matchDataCrawler` 等（比赛 ID 来自 `data/c75` 或赛后页）
  11. 赛后复盘 → postMatchSummary/{阶段}/{轮次}/{主队}_vs_{客队}.md
  12. 更新赛程数据: 先 `cd cup-analyzer/crawler-server`，再 `npx cross-env CUP_ANALYZER_CUP=theWorldCup node crawlers/scheduleCrawler.js`（更新 `theWorldCup/data/c75.js` 并同步 `match_center/c75.js`；Bash 简写与 Windows 见 [crawler-server/README.md](../crawler-server/README.md)）
```

### 赛前报告与大名单正文约定

`matchSquadGenerator.js` 输出的双方块（每队含 **预测首发、预测替补、伤疑、伤停**；国家队**无落选**行）应写入该场赛前报告 **`theWorldCup/report/{阶段}/{轮次}/{主队}_vs_{客队}.md`** 的正文，作为大名单与预测部分；可与模板、交锋、盘口等章节合并。**盘口章节须包含**：合理让球（Fair）、初盘/临场（Market）、Δ、三档结论（与下 **「亚盘安全边际」** 一致）；无独立 `prompts/match_analysis_template.md` 时，建议沿用 `epl/prompts/match_analysis_template.md` 中「四、盘口解析」结构。

### 阶段三：策略分析（贯穿全程）

```
小组赛第1轮结束后:
  - 更新各组积分
  - 分析第2轮挑对手策略
  - 评估各组出线形势

小组赛第2轮结束后:
  - 更新积分，确认提前出线/淘汰的球队
  - 分析第3轮默契球风险
  - 评估保留实力的球队
  - 计算最佳第3名的出线组合

小组赛结束后:
  - 确定32强对阵
  - 分析上下半区路径
  - 评估淘汰赛各队赛程疲劳度

每轮淘汰赛前:
  - 更新赛程疲劳度
  - 分析可能的轮换
```

## 关键决策原则

### 世界杯 vs 联赛的核心差异

1. **无盘路榜** → 用冠军赔率 + 身价档次替代广实定位；可与 `.cursor/rules/dh-match-predict-analysis/references/` 中自行维护的国家队/大赛档次笔记交叉核对（与同目录联赛 `*-team-strength.md` 一并管理）
2. **国家队磨合度低** → 分析核心球员是否来自同一俱乐部
3. **战意复杂** → 不仅是赢球，还有挑对手、保留实力、默契球
4. **赛程紧密** → 跨三国旅行 + 短间隔，轮换是关键因素
5. **一场定胜负** → 淘汰赛没有两回合，心理因素和临场发挥权重更大

### 亚盘安全边际（格雷厄姆式）

本节为单场**合理让球与市场盘口**的对比框架。与出线策略、挑对手分析**正交**；若在其它模块使用「亚盘周期盈亏 HTML（霍华德·马克斯周期视角）」类工具，二者视角不同（单场定价 vs 历史序列/模拟），可并存。

**符号约定（主队视角）**

- **Market（市场让球）**：初盘与临场亚盘，与 `l75.js` / `bs75.js`、赛前报告「盘口」一致。
- **Fair（合理让球）**：在当前信息下，主队相对客队「应开」的让球，可写单值或闭区间（如 -0.75～-1.0）。
- **记法**：主队**让球**为**负**（如让半球 **-0.5**），主队**受让**为**正**（如 **+0.5**）。
- **偏差**：**Δ = Fair − Market**（两者均为同一场、同一主队视角）。例：Fair **-1.0**、临场 Market **-0.5**，则 **Δ = -0.5**（你认为市场让得偏浅）。具体选边仍要结合水位与叙事；本节规定的是**记录方式与决策分档**。

**定位 → Fair（可审计的最小推导链）**

1. **实际定位**：**冠军赔率档次**（无盘路榜时的广实锚）+ **小组积分与出线形势** + `teamProfile/` + `description/` 中的背景与战术；广实档位若有成文记录，放在 `.cursor/rules/dh-match-predict-analysis/references/` 便于与联赛档统一查阅。注意挑对手、保留实力、默契球等高方差因素。
2. **广实差**：主客相对强度（档位或文字结论）。
3. **中立场**：世界杯多场在中立场地进行，**勿机械套用联赛主场加成**；按实际场地与球迷分布调整。
4. **伤停与首发可信度**：相对 `squad-final` 与当场预测首发修正。
5. **战意**：除胜负外，还有选对手、留力、打平即出线等特殊目标。
6. 输出 **Fair**（单值或区间）。

**阶段二中的操作（每场）**

在「分析盘口」之后：**列出 Market（初盘+临场）→ 写 Fair 与一行推导链 → 计算 Δ → 标注三档之一**。

**三档结论（rubric）**

- **值得投**：|Δ| 达到**自设阈值**（常见起点 **0.25～0.5 球**，可按赛事阶段校准），且无重大未决信息；小组赛第 3 轮默契球、已出线后轮换等情境**优先观望**。
- **观望**：|Δ| 低于阈值，或信息不全，或高方差情境（默契球、轮换未知、淘汰赛心理球）。
- **反向投**：Fair 与 Market **方向性或幅度严重背离**，且能说明「市场假设错在哪」；默认**小仓或仅记录**。「反向」指价值在让球方向的另一侧，不是鼓励盲目加注。

以上为**纪律框架**，不保证结果。

### 挑对手的核心逻辑

冠军球队会挑32强和16强的对手：
- 小组第1 vs 小组第2 的淘汰赛路径完全不同
- 有些路径通向"死亡半区"，有些通向"幸运半区"
- 强队可能通过第3轮控制比分来选择更有利的路径
- 详见: strategy/opponent-selection.md 和 rule/16th-finals-rule.md
