# 欧会杯：basicData赛后复盘与teamAgent工作流

赛事键：`uefaConferenceLeague`；球探ID：`2187`；已核对本地赛季：`2026-2027`，输出短赛季：`26-27`；当前正赛球队36支。

## 一、范围与目录

从联赛阶段或分组正赛开始，包括后续淘汰赛；不采集、导入或统计资格赛及资格赛附加赛。阶段来自arrCupKind与jh的实际G键，不把杯赛阶段伪装成联赛轮次，也不把S积分榜数组当比赛。每个比赛ID只统计一次，两回合按两场分别处理。

- 原始赛程：`data/c2187.js`；保留源站原始数据，由mainStageOnly在处理时排除资格赛。
- 单队配置：`teamAgent/{球队目录}/config.js`，球队ID、中英文名、完整赛季必须与正赛名单一致。
- 俱乐部比赛数据：`teamAgent/{球队目录}/basicData/26-27/{matchId}/`。
- 复盘输出：`postMatchSummary/26-27/{阶段键}/{matchId}/复盘资料.md`。
- 榜单输出：`leagueRanking/26-27/teams|players/{指标}/`。

## 二、初始化与采集（crawler-server目录）

从仓库根目录进入；若终端在analysis-cli则先执行 `cd ../crawler-server`。初始化仅读取本地赛程，不联网。

```bash
cd cup-analyzer/crawler-server
node processors/teamAgentInitializer.js --league uefaConferenceLeague
```

需要刷新赛程时使用下列命令。写入前校验JS、赛事ID和赛季；HTML错误页、错误赛季不会覆盖已有赛程。刷新后重新执行初始化，配置冲突先核对，不覆盖成其他赛季。

```bash
npx cross-env CUP_ANALYZER_CUP=uefaConferenceLeague node crawlers/scheduleCrawler.js
```

### 已有旧赛事级basicData时，先本地导入

仅当 `basicData/26-27/` 已有本赛季数据时执行；不联网，不改源文件。核对比赛身份、正赛范围、完赛状态、终场比分与技术统计后，导入主队teamAgent目录。分析器可读取任意一方的完整副本，无需双方重复导入。目标已存在任意比赛文件则整场跳过，不混拼、不覆盖；缺项或冲突保留原始错误。

```bash
node processors/teamAgentDataImporter.js --league uefaConferenceLeague
```

### 逐队准备basicData

以下命令仍在crawler-server执行，按需要选择球队。采集器跳过完整且含摘要的数据；核心已完整但摘要缺失时只尝试补摘要。摘要接口失败不等于本场核心数据缺失，按成功、跳过、失败统计与实际文件逐项核验。

```bash
# 奥胡斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Aarhus_AGF/config.js'
# 阿贾克斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/AFC_Ajax/config.js'
# 亚特兰大
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Atalanta/config.js'
# 亚布洛内茨
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Baumit_Jablonec/config.js'
# 巴尼亚卢卡战士
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Borac_Banja_Luka/config.js'
# 布兰
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Brann/config.js'
# 布莱顿
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Brighton_Hove_Albion/config.js'
# 贝尔格莱德红星
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Crvena_Zvezda/config.js'
# 索非亚中央陆军
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/CSKA_Sofia/config.js'
# 克拉约瓦大学
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/CS_Universitatea_Craiova/config.js'
# 埃格纳蒂亚
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Egnatia/config.js'
# 哥本哈根
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/FC_Copenhagen/config.js'
# 伊比利亚1999
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/FC_Iberia_1999_Tbilisi/config.js'
# 阿拉木图凯拉特
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/FC_Kairat_Almaty/config.js'
# 特温特
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/FC_Twente_Enschede/config.js'
# 赫塔菲
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Getafe/config.js'
# 斯普利特海杜克
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Hajduk_Split/config.js'
# 哈茨
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Heart_of_Midlothian/config.js'
# 伊斯卡尔德斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Inter_Club_Escaldes/config.js'
# 根特
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/KAA_Gent/config.js'
# 考诺萨基列斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Kauno_Zalgiris/config.js'
# 古比斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/KuPs/config.js'
# 林肯红魔
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Lincoln_Red_Imps_FC/config.js'
# 卢加诺
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Lugano/config.js'
# 中日德兰
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Midtjylland/config.js'
# 米亚尔比
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Mjallby_AIF/config.js'
# 摩纳哥
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Monaco/config.js'
# 北西兰
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Nordsjaelland/config.js'
# 帕福斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Pafos_FC/config.js'
# 帕纳辛纳科斯
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Panathinaikos/config.js'
# 里加FC
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Riga_FC/config.js'
# 弗赖堡
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/SC_Freiburg/config.js'
# 圣图尔登
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Sint-Truidense/config.js'
# 布拉加
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Sporting_Braga/config.js'
# 图恩
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Thun/config.js'
# 特拉布宗体育
node processors/teamPostMatchDataProcessor.js --config '../uefaConferenceLeague/teamAgent/Trabzonspor/config.js'
```

核心文件：matchInfo.json、matchEvents.json、techStats.json；实际首发与阵型读取lineup.json；球员统计读取playerStats.json；goalProbability.json为可选数据。文件存在和进程退出成功都不代表内容完整。首发缺失时补采本场，不能用预测阵容替代。

## 三、先build，再生成teamAgent分析（analysis-cli目录）

从上面的crawler-server切回analysis-cli：

```bash
cd ../analysis-cli
node bin/cli.js catalog --league uefaConferenceLeague --season 2026-2027
node bin/cli.js build --league uefaConferenceLeague --season 2026-2027
```

默认统计本赛季正赛范围内全部已完赛比赛。按实际阶段筛选示例：`--stage G29095A`；以本地G键为准，杯赛不使用--round/--rounds。不把资格赛附加赛当作正赛淘汰赛附加赛。

```bash
node bin/cli.js build --league uefaConferenceLeague --season 2026-2027 --stage G29095A
node bin/cli.js build --league uefaConferenceLeague --season 2026-2027 --last 6
```

各命令互相独立，默认覆盖相同指标路径。若先做阶段或近N场统计，需要全范围报告时应重新执行不带范围的build。缺失不补零，球队和球员均只按可核验的实际样本统计；全局缺项见teams/README.md，控制台会列出可用/预期比赛数。

### 生成报告

```bash
node bin/xgStory.js --league uefaConferenceLeague --season 2026-2027
node bin/teamStrength.js --league uefaConferenceLeague --season 2026-2027
node bin/keyPlayerStarts.js --league uefaConferenceLeague --season 2026-2027
node bin/sameOpeningHandicap.js --league uefaConferenceLeague --season 2026-2027
```

xG故事和球队战力写入teamAgent根目录；关键球员首发对比及同初赔报告写入各球队目录，均为MD/HTML。关键球员表以球衣号、球员开头，号码缺失或冲突显示 `-`。同初赔仅指相同盘口，不能当作实力分档；杯赛加时、点球及两回合结算需另外核验90分钟口径。

杯赛standings为所选正赛比赛按胜3平1负0计算的比较榜，不是官方分组积分、纪律扣分或晋级排名。不合并两回合总比分；跨组、不同场数及不同对手结构均限制直接比较。需要本阶段比较时，在build及报告命令同时传入相同--stage。

球队画像赛程不是本杯赛赛程表。已有当前赛季teamProfile结构化JSON时，可运行 `node bin/monthlySchedule.js --league uefaConferenceLeague --season 2026-2027`；缺少画像时先按各队实际资料生成画像，不复制其他队或赛季。赛程难度涉及跨联赛对手排名，必须分别核对其国内联赛与赛季，不能把杯赛计算榜当成统一实力排名。

## 四、基于basicData进行本场赛后复盘

先确认双方至少一方已有本场完整资料；缺少时只执行目标球队的单队采集。选取本地正赛的真实比赛ID，以下示例只代表赛程中存在该比赛，不保证已采集：

```bash
node bin/matchReview.js --league uefaConferenceLeague --season 2026-2027 --match 3073841
```

命令校验双方身份、赛程与终场事件比分、实际11人首发及阵型，输出中文复盘资料，含数据源摘要、全场技术统计、实际首发/替补、原始事件时间线、来源与缺口。不自动编造战术因果或伤停；不能校验核心资料时在写入前报错。已有摘要为空会如实说明，百分比超出0–100的技术字段不用于比较。

随后可在Codex中使用以下请求，按仓库dh-post-match-analysis技能完成有证据的战术复盘：

> 根据 uefaConferenceLeague/teamAgent 中比赛 3073841 的basicData和复盘资料，核对实际首发及阵型、关键球员角色、事件转折、换人和机会质量，生成中文赛后复盘。事实、计算和推断分开；注明缺项，不用预测首发替代实际阵容。

复盘覆盖：实际阵型与11人名单、关键球员作用、进球/罚牌/换人时间线、比分与机会质量、已证实的盘口及90分钟结算背景、后续跟踪点和单场样本限制。原始事件可能缺类型；不擅自把未标注事件归为进球或换人。加时与点球大战分开写，两回合累计不等于本场比分。

人工战术分析报告保存于同一postMatchSummary阶段/比赛目录的分析报告.md。需要外部材料时注明来源和时间；没有同口径赔率不能计算收益率。

## 五、已有阵容、画像与数据维护入口

赛前阵容链路仍使用crawler-server现有的playerListCrawler、clubMatchAnalyzer、leagueSquadProcessor、teamScheduleProcessor、squadFinalInitializer、teamProfileGenerator；运行前核对squadTarget的映射模块、国内联赛序号、赛季、球队及matchTime，并用CUP_ANALYZER_CUP选择本杯赛输出目录。俱乐部杯赛的isNation、matchByName按本模块实际配置核对，不能把杯赛格式与国家队身份混为一谈。懂球帝与球探ID只从已核验映射读取，缺映射不能猜。

基础数据缺口先补采或按用户提供证据修复；首发补丁可用analysis-cli的 `node bin/cli.js repair preview --patch {实际补丁路径}` 和 `repair apply`，先预览再应用。修复后按原范围重建榜单与报告。

生成的leagueRanking、球队目录MD/HTML及postMatchSummary保留在本地；工作流、配置和功能脚本正常进入Git。共享HTML资源位于仓库根shared-assets，缺少时从仓库根运行 `node scripts/syncTableAssets.js`。

## 六、从大名单到球队画像的完整命令链（可选）

本节生成赛前阵容和画像，与teamAgent单队config独立。先核对crawler-server/config/squadTarget.js：teamSerial为本队球探ID；leagueSlug用于读取对应模块data/config.json的映射；clubMatchAnalyzer的leagueSerial应为该队国内联赛序号，不能直接照抄本杯赛ID。CUP_ANALYZER_CUP负责把输出写到本杯赛模块。matchTime使用目标比赛北京时间，完整赛季保持一致。国内联赛ID与懂球帝ID必须从现有映射核实，缺少映射时停止此链路，不影响已有basicData复盘。

在crawler-server目录按顺序执行；下方球队ID取本地正赛arrTeam，运行前把squadTarget同步为该球队：

```bash
# 本地正赛示例：布莱顿，球探球队ID 60
npm run crawl:player-list
npm run analyze:club-domestic
npx cross-env CUP_ANALYZER_CUP=uefaConferenceLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=uefaConferenceLeague node processors/teamScheduleProcessor.js
npx cross-env CUP_ANALYZER_CUP=uefaConferenceLeague node processors/squadFinalInitializer.js --team 60
# 人工核对squad-final中的阵容，并维护伤停、伤疑；再生成画像
npx cross-env CUP_ANALYZER_CUP=uefaConferenceLeague node processors/teamProfileGenerator.js --team 60
```

不要自动覆盖用户维护的伤停备注，也不要用国内联赛统计代替本杯赛basicData。画像中的未来赛程以生成时matchTime为基准；更新后再运行球队赛程报告。
