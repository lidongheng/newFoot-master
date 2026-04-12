1、东恒精通足球，本项目名为cup-analyzer是专门为了杯赛而创建的项目，由于每个杯赛的规则不同，理论上需要为每个杯赛创建一个文件夹，专门去分析这个杯赛的比赛。

2、AI助手的目标就是带着更充分的信息帮东恒做更好的判断。

3、项目结构说明：

```
cup-analyzer/
├── README.md                          # 本文件
├── theWorldCup/                       # 2026世界杯分析
│   ├── workflow.md                    # 工作流程说明
│   ├── rule/                          # 赛事规则
│   │   ├── group-stage-rule.md        # 小组赛规则（48队12组）
│   │   └── 16th-finals-rule.md        # 32强对阵规则
│   ├── data/                          # 赛程和基础数据
│   │   ├── c75.js                     # 赛程数据（球探体育格式）
│   │   ├── 冠军赔率.md                # 冠军赔率
│   │   └── 球队与序号对照表.md        # 球队ID对照
│   ├── squad/                         # 48队初选大名单（爬虫全量，自动生成）
│   │   └── group-{A~L}/              # 按小组分类
│   ├── squad-final/                   # 最终26人大名单（人工确认；画像优先读取）
│   │   └── group-{A~L}/
│   ├── teamProfile/                   # 球队画像（自动生成）
│   ├── report/                        # 赛前分析报告
│   │   ├── group-stage/round-{1~3}/   # 小组赛
│   │   ├── round-of-32/              # 32强
│   │   ├── round-of-16/              # 16强
│   │   ├── quarter-finals/            # 8强
│   │   ├── semi-finals/              # 半决赛
│   │   └── final/                     # 决赛
│   ├── postMatchSummary/              # 赛后复盘
│   ├── strategy/                      # 世界杯独特策略分析
│   │   ├── group-path-analysis.md     # 小组出线路径
│   │   ├── opponent-selection.md      # 挑对手策略
│   │   ├── tacit-match-detection.md   # 默契球风险识别
│   │   └── fatigue-schedule.md        # 赛程疲劳度
│   ├── description/                   # 球队简介（AI只读，东恒编辑）
│   └── news/                          # 比赛素材
├── championsLeague/                   # 欧洲冠军联赛（欧冠）
│   ├── PLAN.md                        # 项目计划
│   ├── workflow.md                    # 工作流程
│   ├── prompts/                       # 赛前分析模板（如 match_analysis_template.md）
│   ├── rule/                          # 联赛阶段 / 淘汰赛规则
│   ├── data/                          # c103.js、l103.js、bs103.js、冠军赔率等
│   ├── teamProfile/                   # 球队画像
│   ├── report/{赛季}/                 # 如 25-26/league-phase/round-N/
│   ├── postMatchSummary/{赛季}/       # 赛后复盘
│   ├── strategy/                      # 积分形势、抽签、两回合、跨赛事疲劳
│   ├── description/                   # 球队简介（AI只读）
│   └── news/{赛季}/                   # 比赛素材
├── epl/                               # 英格兰超级联赛（英超）
│   ├── PLAN.md
│   ├── workflow.md
│   ├── prompts/                       # 赛前分析模板（与欧冠同源）
│   ├── rule/                          # 联赛规则（升降级、欧战资格）
│   ├── data/                          # s36.js、l36.js、bs36.js、td36.js 等
│   ├── teamProfile/                   # 球队画像（Big 6 重点）
│   ├── report/{赛季}/                 # 如 25-26/round-N/
│   ├── postMatchSummary/{赛季}/
│   ├── strategy/                      # 争冠、争四、欧战、保级、拥堵、德比
│   ├── description/                   # 球队简介（AI只读）
│   └── news/{赛季}/                   # 按轮次与对阵的素材
├── aLeague/                           # 澳大利亚足球超级联赛（澳超）
│   ├── data/                          # s273_462.js 赛程等
│   └── squad-final/
├── mls/                               # 美国职业大联盟（美职联 / MLS）
│   ├── PLAN.md
│   ├── workflow.md
│   ├── prompts/                       # 赛前分析模板（与英超/澳超同源）
│   ├── data/                          # s21_165.js、l21.js、bs21.js、td21.js 等
│   ├── teamProfile/
│   ├── report/{赛季}/                 # 如 2026/round-N/
│   ├── postMatchSummary/{赛季}/
│   └── news/{赛季}/
├── serieA/                            # 意大利足球甲级联赛（意甲）
│   ├── PLAN.md
│   ├── workflow.md
│   ├── prompts/
│   ├── data/                          # s34_2948.js、l34.js、bs34.js、td34.js 等
│   ├── teamProfile/
│   ├── report/{赛季}/                 # 如 25-26/round-N/
│   ├── postMatchSummary/{赛季}/
│   └── news/{赛季}/
└── crawler-server/                    # Koa2爬虫服务
    ├── app.js                         # 服务入口
    ├── config/                        # index、targets、squadTarget 等
    ├── routes/                        # API路由
    ├── crawlers/                      # 爬虫核心
    │   ├── base.js                    # 爬虫基类
    │   ├── squadCrawler.js            # 大名单爬虫
    │   ├── playerListCrawler.js       # 俱乐部球探大名单（原 backend crawlerPlayer）
    │   ├── matchDataCrawler.js        # 赛后数据爬虫
    │   ├── oddsCrawler.js             # 赔率爬虫
    │   └── scheduleCrawler.js         # 赛程更新爬虫
    ├── analyzers/                     # 出场与阵型分析（原 backend crawlerClub3_new）
    │   └── clubMatchAnalyzer.js
    ├── match_center/                  # 国内联赛 s{序号}.js（见该目录 README）
    ├── processors/                    # 数据处理
    │   ├── squadProcessor.js          # 大名单清洗 → Markdown
    │   ├── teamProfileGenerator.js    # 球队画像生成
    │   └── strategyAnalyzer.js        # 策略分析报告生成
    └── utils/                         # 工具函数
```

4、爬虫服务使用方式：

**Windows 11**：赛程更新请优先使用 `npm run crawl:schedule:*`（已跨平台）；若在 cmd/PowerShell 中手动设置 `CUP_ANALYZER_CUP`，勿直接复制 Bash 的 `VAR=value node ...`，详见 [`crawler-server/README.md`](cup-analyzer/crawler-server/README.md) 中的「Windows 与手动设置环境变量」。各赛事 `workflow.md` 中的同类命令同理。

```bash
cd cup-analyzer/crawler-server

# 启动HTTP服务
npm run dev

# CLI模式（无需启动服务）
node crawlers/squadCrawler.js              # 批量爬取48队大名单
node crawlers/squadCrawler.js --team 772   # 爬取单队大名单（或 npm run crawl:squad:one -- 772）
node processors/squadProcessor.js          # 将全部已有 json 转为 squad/group-*/ 下 Markdown
node processors/squadProcessor.js --team 772  # 只生成一队 Markdown（或 npm run process:squad:one -- 772）
node processors/teamProfileGenerator.js    # 生成球队画像（优先读 squad-final，需 **主教练** / **阵型** 元数据；见 theWorldCup/squad-final/README.md）
node processors/strategyAnalyzer.js        # 生成策略分析报告
node crawlers/matchDataCrawler.js --match 2906701  # 爬取单场赛后数据
node crawlers/oddsCrawler.js 2906701       # 爬取单场赔率
node crawlers/scheduleCrawler.js           # 更新赛程数据（默认世界杯 c75）

# 切换杯赛：设置环境变量 CUP_ANALYZER_CUP（推荐 npm，跨 Windows / macOS / Linux）
# 欧冠 → 写入 championsLeague/data/c103.js（赛季见 crawler-server/config）
npm run crawl:schedule:ucl
# Bash 手动：CUP_ANALYZER_CUP=championsLeague node crawlers/scheduleCrawler.js

# 英超 → 写入 epl/data/s36.js（联赛格式；赛季目录 2025-2026，见 config）
npm run crawl:schedule:epl
# Bash 手动：CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js

# 澳超 → 写入 aLeague/data/s273_462.js（子联赛 462；赛季目录 2025-2026，见 config）
npm run crawl:schedule:aleague
# Bash 手动：CUP_ANALYZER_CUP=aLeague node crawlers/scheduleCrawler.js

# 美职联 → 写入 mls/data/s21_165.js（子联赛 165；赛季目录 2026，见 config）
CUP_ANALYZER_CUP=mls node crawlers/scheduleCrawler.js
# 或：npm run crawl:schedule:mls

# 意甲 → 写入 serieA/data/s34_2948.js（子联赛 2948；赛季目录 2025-2026，见 config）
CUP_ANALYZER_CUP=serieA node crawlers/scheduleCrawler.js
# 或：npm run crawl:schedule:seriea

# 俱乐部赛前大名单 + 国内联赛出场分析（原 backend-server crawlerPlayer + crawlerClub3_new）
# 先配置 config/squadTarget.js，并放入 match_center/s{联赛序号}.js
npm run crawl:player-list
npm run analyze:club-domestic
```

5、三个分析阶段：

**世界杯（theWorldCup）**

- **阶段一（赛前）**：收集48队大名单 → 生成球队画像 → 评估小组实力 → 分析出线路径
- **阶段二（赛中）**：逐场赛前分析 → 赛后复盘总结（复用 league-analyzer 的分析模式）
- **阶段三（策略）**：挑对手分析 → 默契球识别 → 赛程疲劳度 → 保留实力识别

**欧冠（championsLeague）**

- **阶段一（赛前）**：维护 data（c103/l103/bs103）、冠军赔率与球队序号；可选球队画像
- **阶段二（赛中）**：逐场赛前/赛后（模板见 `championsLeague/prompts/match_analysis_template.md`），结合盘路 `l103`/`bs103` 与两回合总比分
- **阶段三（策略）**：联赛阶段积分区间（1–8 / 9–24 / 25–36）→ 淘汰赛抽签 → 两回合策略 → 跨赛事疲劳（联赛+欧冠+杯赛）

**英超（epl）**

- **阶段一（赛前）**：维护 data（s36/l36/bs36/td36）、冠军赔率、球队序号；**Big 6** `teamProfile/`（含转会窗、圣诞新年赛程）
- **阶段二（赛中）**：逐场赛前/赛后（模板见 `epl/prompts/match_analysis_template.md`），结合盘路 `l36`/`bs36` 与积分榜战意
- **阶段三（策略）**：争冠 → 争欧冠（前四）→ 争欧战 → 保级 → 赛程拥堵（欧冠与联赛间隔小于 70 小时、双欧冠夹联赛）→ 德比

**澳超（aLeague）**

- **阶段一（赛前）**：维护 data（`s273_462.js`）、球队序号与积分榜；可按需扩展 `teamProfile/`、`description/`、`news/`
- **阶段二（赛中）**：逐场赛前/赛后分析，结合常规赛排名与季后赛资格区（前六）
- **阶段三（策略）**：常规赛争二（直通季后赛准决赛）→ 第三至第六名淘汰赛路径 → 跨洲/杯赛与夏令时赛程节奏

**美职联（mls）**

- **阶段一（赛前）**：维护 data（`s21_165.js` 等）、球队序号与东西区积分榜；可按需扩展 `teamProfile/`、`news/`
- **阶段二（赛中）**：逐场赛前/赛后分析，结合常规赛排名与季后赛资格（详见 `s21_165.js` 内联赛说明）
- **阶段三（策略）**：东西区排名与外卡赛 → 季后赛阶段节奏 → 跨洲客场与杯赛穿插

**意甲（serieA）**

- **阶段一（赛前）**：维护 data（`s34_2948.js`、`l34`/`bs34`/`td34`）、球队序号与积分榜；可按需扩展 `teamProfile/`、`news/`
- **阶段二（赛中）**：逐场赛前/赛后（模板见 `serieA/prompts/match_analysis_template.md`），结合盘路 `l34`/`bs34` 与争冠/欧战/保级战意
- **阶段三（策略）**：争冠 → 欧冠资格区 → 欧联/欧协路径 → 保级 → 德比与一周双赛（欧冠夹联赛等）

6、AI 分析技能文件：

- 世界杯：`.cursor/rules/dh-worldcup-analysis/SKILL.md`
- 欧冠：`.cursor/rules/dh-championsleague-analysis/SKILL.md`
- 英超：`.cursor/rules/dh-epl-analysis/SKILL.md`

10、介绍一些足球场上的位置缩写：
GK 守门员
RB 右后卫
CB 中后卫
RCB 右中后卫
LCB 左中后卫
LB 左后卫
RWB 右翼卫
LWB 左翼卫
CDM 后腰
LDM 左边后腰
RDM 右边后腰
CAM 前腰
RAM 右前腰
LAM 左前腰
RM 右中场
LM 左中场
CM 中前卫
ST 中锋
LW 左边锋
RW 右边锋
CF 影锋
