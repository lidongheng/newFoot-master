---
name: dh-analysis
description: |
  英超（EPL）比赛与赛季分析规则。用于英超赛前分析、赛后复盘、球队画像、争冠/争四/欧战/保级形势、盘口数据、赛程间隔与多线作战分析。
  用户提到“英超”“EPL”“Premier League”“英超赛前”“英超复盘”“争冠”“争四”“保级”“盘路”“Big 6”时使用。
---

# 英超比赛与赛季分析

## 1. 范围与原则

- 分析目录为 `cup-analyzer/epl/`，球探联赛序号为 `36`；赛制为 20 队双循环、38 轮。
- 先确认比赛、赛季、轮次和开球时间，再选取同赛季资料。赛季以 `epl/data/s36.js` 和实际目录中的比赛记录为准，不固定使用某一赛季。
- 事实、计算结果和判断分开写。关键结论注明所依据的本地文件或外部来源及发布时间。
- 资料缺失、冲突或无法核实时，写明具体路径、缺少字段及受影响的结论；不猜测，不补默认值，不把“未找到”写成“没有”。
- 用户要求生成或修改文件时，使用本规则规定的输出路径。已有文件先读取并按用户请求处理，不要静默覆盖。

## 2. 比赛与资料定位

### 2.1 确认比赛

从用户输入和 `cup-analyzer/epl/data/s36.js` 确认主客队、轮次、开球时间和赛季。用户给出的信息与赛程文件不一致时，指出差异；若不能唯一确定目标比赛，先询问用户。

🔴 **CHECKPOINT**：比赛、赛季、轮次或开球时间无法唯一确认，或资料版本冲突会改变关键结论时，暂停受影响的分析并向用户确认；确认前不猜测、不落该项结论。

英超已在 `cup-analyzer/crawler-server/config/index.js` 登记：`config.resolveScheduleData('36', false)` 指向 `epl/data/s36.js`。赛程抓取会同步主文件到 `crawler-server/match_center/s36.js`；分析时以 EPL 配置指向的文件为准。

### 2.2 赛前必读资料

| 内容 | 路径 |
|---|---|
| 赛程、积分与比赛信息 | `cup-analyzer/epl/data/s36.js` |
| 亚盘盘路 | `cup-analyzer/epl/data/l36.js` |
| 大小球盘路 | `cup-analyzer/epl/data/bs36.js` |
| 进球时间 | `cup-analyzer/epl/data/td36.js` |
| 冠军与保级赔率 | `cup-analyzer/epl/data/冠军赔率.md`、`降级赔率.md` |
| 球队序号 | `cup-analyzer/epl/data/球队与序号对照表.md` |
| 阵容、伤停、预测首发 | `cup-analyzer/epl/squad-final/{队名}.md` |
| 球队画像 | `cup-analyzer/epl/teamProfile/{队名}.md` |
| 赛前报告模板 | `cup-analyzer/epl/prompts/match_analysis_template.md` |
| 比赛新闻与名单 | `cup-analyzer/epl/news/{赛季}/round-{N}/{主队}_vs_{客队}/` |
| 赛前报告 | `cup-analyzer/epl/report/{赛季}/round-{N}/{主队}_vs_{客队}.md` |
| 赛后复盘 | `cup-analyzer/epl/postMatchSummary/{赛季}/round-{N}/` |

读取实际存在的路径和内容；以上表格不代表每场比赛的资料一定齐全。

## 3. 赛前分析流程

按顺序执行，并遵循用户对分析范围的限制。

### Step 1：确定比赛资料版本

1. 依据比赛时间确认赛季和轮次，并核对 `s36.js`、报告目录、新闻目录的赛季标记。
2. 读取赛前模板、双方 `squad-final` 和 `teamProfile`，确认阵容、伤停、伤疑、预测首发和球队定位。
3. 读取 `s36.js`、`l36.js`、`bs36.js`、`td36.js` 中与本场有关的数据，以及冠军赔率、降级赔率。
4. 不用赛后数据、其他赛季的名单或旧新闻替代本场赛前资料。若文件的赛季标签冲突，明确列出冲突并暂停受影响的判断。

### Step 2：核验阵容、新闻和近况

- 阵容和伤停以本场适用的 `squad-final/{队名}.md` 为准；需要生成单场阵容文案时，可使用 `matchSquadGenerator.js`，并核对输出赛季和比赛双方。
- 生成单场阵容文案时，在 `cup-analyzer/crawler-server` 执行 `npx cross-env CUP_ANALYZER_CUP=epl node processors/matchSquadGenerator.js --home <主队序号> --away <客队序号>`。球队序号读取 `epl/data/球队与序号对照表.md`。
- 需要球探提供的交锋、近况、未来赛事和伤病摘要时，在 `config/squadTarget.js` 设置本场 `matchSerial`，然后执行 `npm run crawl:match-statistics`；也可用 `npm run crawl:match-statistics -- --match <序号>` 指定场次。球探伤病摘要是补充信息，已确认伤停仍以 `squad-final` 和本场名单为准。
- 搜集双方最新的官方发布会、主帅采访和伤停消息。记录来源、发布时间与确认状态；区分俱乐部已确认信息和媒体传闻。
- 交锋、近况、积分榜与未来赛事以本地数据和可核验来源为依据。引用新闻或外部数据时，保留可追溯来源。
- Big 6 及相关欧战球队，结合画像中的转会窗、伤病、状态和多线作战信息；按比赛需要阅读争冠、欧战、保级、德比或赛程拥堵策略文档。

### Step 3：查询双方未来赛程

赛前分析必须使用 `.cursor/rules/dh-team-schedule/SKILL.md` 查询双方从本场计划开球时间起未来 14 天内的全部赛事。遵守该规则中的配置匹配、跨赛事筛选、比分处理、时区和间隔计算要求。

- 输出双方赛程、赛事、对手、开球时间，以及与上一场开球的间隔。
- 对本场前后相邻比赛按休息间隔标注：**低于 67 小时为红色；67–92 小时（含边界）为黄色；超过 92 小时为绿色**。
- 赛程配置或 JSON 缺失时，说明缺失的配置键、序号或文件路径，不推测赛事、比分或间隔。
- `strategy/fixture-congestion.md` 中“欧冠与英超间隔小于 70 小时”是欧冠/英超专项的高密度提示。它与上面的通用红黄绿分档用途不同，分别标注，不互相替代。

### Step 4：整理盘口数据块

数据必须来自对应文件；保留报告模板的章节层级和字段。

1. **亚盘盘路**：在盘口分析中加入“盘路数据”，按“总盘、主场、客场”连续三行列出主客队净胜盘和联赛排名，来源为 `l36.js`。
2. **大小球盘路**：在“### 3、大小”下加入“大小球盘路数据”，按“总盘、主场、客场”连续三行列出双方大球率和排名，来源为 `bs36.js`。
3. **75 分钟后进球**：使用 `td36.js`，加入小标题“本场比赛球队数据”。每队列出 75 分钟后总进球数、排名及 76–80、81–85、86–90 分钟（含补时）分段数据。这里的分钟是比赛时间，不是文档行号。
4. 初盘、临场盘口及其他盘口数据须标明来源和时点，不混用不同场次或不同时间截面的数据。

### Step 5：分析合理盘口与安全边际

按 `.cursor/rules/dh-match-predict-analysis/references/epl-team-strength.md` 中的英超档位与理论盘口，结合积分、赔率、画像、主场、伤停与首发可信度、战意、德比和赛程密度推导 Fair。保留一行可审计的推导链。

- 统一使用主队视角：主队让球为负数（如 `-0.5`），主队受让为正数（如 `+0.5`）。
- 分别列出初盘和临场 `Market`、`Fair`，再计算 `Δ = Fair − Market`。二者必须是同一场、同一主队视角。
- 只有用户或项目规则明确给出判定阈值时，才按阈值分类。未给阈值时，报告 `Δ`，并写明“阈值未指定，暂不分类”；不自行采用默认数值。
- 阈值已给出时，结论使用“值得投 / 观望 / 反向投”之一并说明依据。信息不完整或存在重大未决因素时，不判“值得投”。“反向投”必须说明市场假设为何错误；不得只因盘口有差异就建议反向。
- 结论是分析框架，不代表结果保证；遵循报告模板中的纪律要求。

### Step 6：生成报告与周期图

- 按 `prompts/match_analysis_template.md` 组织报告，至少覆盖比赛信息、双方阵容与伤停、新闻和战意、盘口、近况与积分、未来赛程、结论及风险点。
- 报告路径为 `cup-analyzer/epl/report/{赛季}/round-{N}/{主队}_vs_{客队}.md`。大名单与预测部分以 `matchSquadGenerator.js` 针对本场输出为正文来源；其余章节结合模板和已核验资料填写。
- 赛前报告同时生成亚盘周期盈亏 HTML；用户明确只要文字报告，或本地没有本场球探 `matchSerial` 时，可以不生成，并在交付说明中写明原因。
  1. 在 `cup-analyzer/crawler-server/config/squadTarget.js` 设置准确的 `matchSerial`、`roundSerial`、`season` 和球探战绩表中的 `matchLeagueName`。
  2. 在 `cup-analyzer/crawler-server` 执行 `npx cross-env CUP_ANALYZER_CUP=epl npm run generate:cycle-report`。
  3. 输出路径为 `cup-analyzer/epl/report/{赛季}/round-{N}/{主队}_vs_{客队}_cycle.html`。命令失败时，报告实际错误；不要声称文件已生成。

## 4. 数据更新与赛季维护

用户要求更新数据或球队画像时，再执行对应流程；仅分析比赛时不要擅自抓取或改写资料。

### 更新赛程

工作目录为 `cup-analyzer/crawler-server`。优先运行 `npm run crawl:schedule:epl`；也可运行 `npx cross-env CUP_ANALYZER_CUP=epl node crawlers/scheduleCrawler.js`。抓取后核对 `epl/data/s36.js` 及同步的 `match_center/s36.js`。

### 更新俱乐部阵容与画像

1. 在 `config/squadTarget.js` 设置 `teamSerial`、`leagueSerial=36`、`roundSerial`、`teamChineseName`。
2. 明确选择名单来源：`npm run crawl:player-list:club -- -w qiutan` 或 `npm run crawl:player-list:club -- -w dqd`；不替用户选择来源。
3. 执行 `npm run analyze:club-domestic`。
4. 在 `cup-analyzer/crawler-server` 执行 `npx cross-env CUP_ANALYZER_CUP=epl node processors/leagueSquadProcessor.js`，再运行 `squadFinalInitializer.js --team <序号>`。
5. 人工审核 `epl/squad-final/{队名}.md` 中的伤停与伤疑后，再运行 `teamProfileGenerator.js --team <序号>`。
6. 检查生成文件中的赛季、球队和阵容。球队序号以 `epl/data/球队与序号对照表.md` 为准。

## 5. 赛后与赛季策略

- 赛后复盘写入 `cup-analyzer/epl/postMatchSummary/{赛季}/round-{N}/`，区分赛前判断与赛后事实，并核对实际首发、事件和比赛数据。
- 贯穿赛季维护 `strategy/title-race.md`、`ucl-qualification.md`、`european-qualification.md`、`relegation-battle.md`、`fixture-congestion.md` 和 `derby-dynamics.md`。
- 联赛定位结合积分榜、冠军赔率、降级赔率及球队画像。单场结论不替代赛季策略判断。

## 6. 缺失资料处理

| 触发情况 | 处理 |
|---|---|
| 赛季、轮次、主客队或比赛时间互相冲突 | 列出冲突文件和字段；不能唯一确认时询问用户，不选一个猜测值继续写结论。 |
| 阵容、画像、伤停或新闻缺失 | 在对应章节标明文件路径和缺失项；只完成其他有依据的部分，不推测球员状态或“无人伤停”。 |
| `l36.js`、`bs36.js` 或 `td36.js` 缺失/无本场数据 | 指出缺失文件或数据字段；不补联赛平均值，不用其他轮次或赛季代替。 |
| 赛程配置、`qiutanSerial` 或赛程 JSON 缺失 | 按 `dh-team-schedule` 规则报告实际缺项；不推测赛程、比分或间隔。 |
| 外部新闻未查到或来源时间无法核验 | 写明未能核实；不把传闻标为官方确认，不虚构来源或发布时间。 |
| 周期图命令失败 | 保留错误信息并说明 HTML 未生成；检查配置后再由用户决定是否重试。 |

## 7. 禁止事项

- 禁止固定使用旧赛季路径；禁止把不同赛季的赛程、名单、新闻或盘口拼成本场资料。
- 禁止在缺资料时填默认值、平均值、推测值，或把空缺写成“无”。
- 禁止编造伤停、首发、比分、来源、发布时间、盘口排名或赛程间隔。
- 禁止将主队让球的符号、`Fair − Market` 的顺序或开盘/临场时点混淆。
- 禁止在未给定阈值时自行分类安全边际；禁止只凭盘口差异给出“反向投”。
- 禁止混用通用 67/92 小时休息预警与欧冠/英超专项 70 小时提示。
- 禁止跳过模板要求的 `l36`、`bs36`、`td36` 数据块而声称报告完整。
- 禁止在命令失败后声称赛程、阵容或周期图已更新/生成。
