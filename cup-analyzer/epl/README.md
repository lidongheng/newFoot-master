# EPL (英超联赛) 分析模块架构方案

> 最后更新: 2026-04-08 -- 已合入用户决策  
> 本文档与 `.cursor/plans/epl_analysis_architecture_95535557.plan.md` 架构计划一致。

## 一、背景与定位

EPL 是**国内联赛**（20 队双循环 38 轮），与欧冠（杯赛、瑞士制+两回合淘汰）和世界杯（国家队、小组赛+淘汰赛）有本质差异。但 cup-analyzer 作为重构后的统一分析项目，EPL 作为平行模块纳入。

球探体育联赛序号：**36**，数据文件已有 `s36.js` 在 `crawler-server/match_center/` 中。

## 二、目录结构（已确定）

```
cup-analyzer/
├── epl/                                    # 新增：英超联赛分析
│   ├── PLAN.md                             # 项目计划（持续迭代）
│   ├── workflow.md                         # 工作流程说明
│   ├── prompts/
│   │   └── match_analysis_template.md      # 复用 championsLeague 版本
│   ├── rule/
│   │   └── league-rule.md                  # 英超联赛规则
│   ├── data/
│   │   ├── s36.js                          # 赛程数据（联赛格式；scheduleCrawler 抓取）
│   │   ├── l36.js                          # 亚盘盘路榜（从 league-analyzer 复制）
│   │   ├── bs36.js                         # 大小球盘路榜（从 league-analyzer 复制）
│   │   ├── td36.js                         # 入球时间（从 league-analyzer 复制）
│   │   ├── 冠军赔率.md                      # 冠军/降级/前四赔率
│   │   └── 球队与序号对照表.md               # 20 队序号
│   ├── teamProfile/                        # Big 6 重点分析 + 其他球队
│   │   ├── README.md
│   │   ├── 阿森纳.md                       # Big 6 详细画像
│   │   ├── 曼彻斯特城.md
│   │   ├── 利物浦.md
│   │   ├── 曼彻斯特联.md
│   │   ├── 托特纳姆热刺.md
│   │   └── 切尔西.md
│   ├── description/                        # AI 只读球队简介
│   │   ├── README.md
│   │   └── 25-26/                          # 从 league-analyzer 迁移 9 个文件
│   ├── strategy/
│   │   ├── README.md                       # 策略总览
│   │   ├── title-race.md                   # 争冠形势
│   │   ├── ucl-qualification.md            # 争欧冠资格（前4）
│   │   ├── european-qualification.md       # 争欧战资格（前6/前7）
│   │   ├── relegation-battle.md            # 保级形势
│   │   ├── fixture-congestion.md           # 赛程拥堵（<70h间隔 / 6天双欧冠夹联赛）
│   │   └── derby-dynamics.md               # 德比赛事特殊分析
│   ├── report/
│   │   └── 25-26/                          # 从 league-analyzer 迁移 91 个报告文件
│   │       ├── round-13/ ~ round-31/
│   │       └── ...
│   ├── postMatchSummary/
│   │   └── 25-26/                          # 从 league-analyzer 迁移 19 个复盘文件
│   │       ├── round-26/ ~ round-31/
│   │       └── ...
│   └── news/
│       └── 25-26/                          # 从 league-analyzer 迁移 265 个素材文件
│           ├── round-13/ ~ round-31/
│           └── ...
```

## 三、EPL vs 欧冠 vs 世界杯 关键差异

- **赛制**: 20 队双循环联赛 38 轮，无淘汰赛阶段
- **盘路**: 轮次多、样本大 -- 盘路榜（l36/bs36）参考价值最高
- **广实定位**: 直接用联赛积分榜 + 冠军赔率
- **大名单**: 与欧冠一致，每场赛前抓取（`playerListCrawler.js` + `clubMatchAnalyzer.js`）
- **策略侧重**: 争冠/争欧冠/争欧战/保级，而非"挑对手"或"两回合"
- **赛程交叉**: 英超球队同时打欧冠/欧联/足总杯/联赛杯 -- 轮换是核心分析维度
- **Big 6 重点**: 阿森纳、曼城、利物浦、曼联、热刺、切尔西关注度高、新闻多，需要详细的画像与持续复盘（含转会窗影响、圣诞/新年密集赛程分析等）

## 四、策略文件详细设计

| 文件 | 用途 | 更新时机 |
|------|------|----------|
| `title-race.md` | 争冠形势：积分差、剩余赛程难度、直接交锋 | 每轮后（约第 20 轮起重点跟踪） |
| `ucl-qualification.md` | 争欧冠资格（前4）：第4~6名混战分析 | 每轮后（约第 25 轮起重点跟踪） |
| `european-qualification.md` | 争欧战资格（前6/7，含欧联/欧会杯名额）：足总杯冠军、联赛杯冠军的名额联动 | 每轮后 + 杯赛结果后 |
| `relegation-battle.md` | 保级形势：后三名、剩余赛程、保级经验 | 每轮后（约第 28 轮起重点跟踪） |
| `fixture-congestion.md` | 赛程拥堵分析：欧冠与英超间隔 <70 小时标记；6 天打两场欧冠中间夹一场联赛 | 每周、赛前（与欧冠赛周同步） |
| `derby-dynamics.md` | 德比赛事特殊分析：北伦敦德比、曼彻斯特德比、默西塞德德比等历史与情绪因素 | 德比赛前 |

**Big 6 的转会窗影响、圣诞/新年密集赛程分析**：不另建独立文件，融入 `teamProfile/{Big6球队}.md` 中持续更新。

## 五、数据迁移计划

### 从 league-analyzer 复制（保留原仓库副本）

| 来源 | 目标 | 文件数 |
|------|------|--------|
| `league-analyzer/data/l36.js` | `epl/data/l36.js` | 1 |
| `league-analyzer/data/bs36.js` | `epl/data/bs36.js` | 1 |
| `league-analyzer/data/td36.js` | `epl/data/td36.js` | 1 |
| `league-analyzer/report/epl/25-26/**` | `epl/report/25-26/**` | 91 |
| `league-analyzer/news/epl/25-26/**` | `epl/news/25-26/**` | 265 |
| `league-analyzer/postMatchSummary/epl/25-26/**` | `epl/postMatchSummary/25-26/**` | 19 |
| `league-analyzer/description/epl/25-26/**` | `epl/description/25-26/**` | 9 |

注意：league-analyzer 中的路径有一层 `epl/` 中间目录（如 `report/epl/25-26/`），迁入 cup-analyzer 后扁平化为 `epl/report/25-26/`（因为 `epl/` 本身已经是英超专属目录）。

### 需爬取生成

- `s36.js`：`CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js`
- `球队与序号对照表.md`：从 `match_center/s36.js` 的 `arrTeam` 提取

## 六、crawler-server 配置扩展

在 [crawler-server/config/index.js](../crawler-server/config/index.js) 的 `cups` 对象中新增 `epl` 配置：

```javascript
epl: {
  cupSerial: '36',
  cupName: 'epl',
  season: '25-26',
  paths: {
    cupAnalyzer: path.resolve(__dirname, '../../epl'),
    playerCenter: path.resolve(__dirname, '../output/player_center'),
    basicData: path.resolve(__dirname, '../output/basicData'),
    cupScheduleData: path.resolve(__dirname, '../../epl/data/s36.js'),
  },
},
```

使用方式：`CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js`

**说明**：实际仓库中英超赛程抓取使用的 `season` 目录可能与球探一致（如 `2025-2026`），以 `config/index.js` 中 `epl.season` 为准。

## 七、SKILL 文件

创建 `.cursor/rules/dh-epl-analysis/SKILL.md`，参照欧冠 SKILL 的结构，适配英超场景：

- 触发关键词："英超"、"EPL"、"Premier League"、"联赛积分"、"降级"、"争四"
- 工作流：赛前大名单 -> 报告 -> 盘路 -> 积分形势 -> 赛后复盘
- 引用数据文件路径 l36/bs36/s36/td36
- Big 6 重点跟踪提示

## 八、Big 6 画像设计

`teamProfile/` 中为 Big 6 各创建详细画像文件，维度包括：

- 阵容深度与身价结构
- 教练战术体系
- 赛季目标（结合冠军赔率）
- 转会窗影响（冬窗/夏窗变动）
- 圣诞/新年密集赛程表现
- 欧冠/欧战双线作战负荷
- 关键球员伤病与状态追踪
- 赛季走势复盘（持续更新）

## 九、实施步骤

1. 创建 `epl/` 目录骨架（所有子目录 + README/占位文件）
2. 编写 `PLAN.md` 和 `workflow.md`
3. 编写 `rule/league-rule.md`
4. 编写 `strategy/` 下 6 个框架文档 + README
5. 从 `league-analyzer/data/` 复制 `l36.js`、`bs36.js`、`td36.js`
6. 运行 `CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js` 生成 `s36.js`
7. 生成 `data/球队与序号对照表.md`
8. 从 `league-analyzer` 迁移 report(91) + news(265) + postMatchSummary(19) + description(9)
9. 复制 `championsLeague/prompts/match_analysis_template.md`
10. 创建 Big 6 画像文件（6 个 teamProfile）
11. 扩展 `crawler-server/config/index.js`
12. 创建 `.cursor/rules/dh-epl-analysis/SKILL.md`
13. 更新 `cup-analyzer/README.md`
