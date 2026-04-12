# 韩国K联赛（K League 1）分析工作流程

## 赛事概览

- **赛事**：K League 1（韩K联）
- **联赛序号（球探）**：**15**，子联赛 **313** → `s15_313.js`（同目录可维护 `l15.js`、`bs15.js`、`td15.js` 等，与 `scheduleCrawler` 约定一致）
- **当前架构赛季**：按 `crawler-server/config` 中 `koreanKLeague.season` 与目录 `report/{赛季}/` 等对齐

### 赛程数据

- **主文件**：`koreanKLeague/data/s15_313.js`
- **更新**：优先 **`npm run crawl:schedule:kleague`**（在 **`cup-analyzer/crawler-server`** 下，各系统相同）。也可 `npx cross-env CUP_ANALYZER_CUP=koreanKLeague node crawlers/scheduleCrawler.js`。详见 [crawler-server/README.md](../crawler-server/README.md)
- **分析器路径**：`config.resolveScheduleData('15', false)` 指向 **`koreanKLeague/data/s15_313.js`**

### 从大名单到球队画像（联赛流水线）

与世界杯不同：用 **`playerListCrawler` + `clubMatchAnalyzer` + `leagueSquadProcessor`** 生成 `squad/{队名}.md`；后半段 **`squadFinalInitializer`** → 人工审核 **`squad-final/`** → **`teamProfileGenerator`** → **`teamProfile/{队名}.md`**（单队、逐队改 `squadTarget.js`）。

**前置**：在 `cup-analyzer/crawler-server` 中编辑 `config/squadTarget.js`（`leagueSerial=15`、`teamSerial`、`roundSerial`）；序号见 `koreanKLeague/data/球队与序号对照表.md`。以下 processors 需 `CUP_ANALYZER_CUP=koreanKLeague`（推荐上文 `npx cross-env`）。

**输出路径**：`koreanKLeague/squad/` → `koreanKLeague/squad-final/` → `koreanKLeague/teamProfile/`。

工作目录：`cup-analyzer/crawler-server`。

以下两条任意系统相同：

```bash
npm run crawl:player-list
npm run analyze:club-domestic
```

下面三条需设置 `CUP_ANALYZER_CUP=koreanKLeague`。**任意系统推荐**：

```bash
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/leagueSquadProcessor.js
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/squadFinalInitializer.js --team <序号>
# 人工审核 koreanKLeague/squad-final/{队名}.md
npx cross-env CUP_ANALYZER_CUP=koreanKLeague node processors/teamProfileGenerator.js --team <序号>
```

若在 macOS / Linux 终端习惯 Bash，也可将上述三条写成 `CUP_ANALYZER_CUP=koreanKLeague node processors/...`。手写 PowerShell/cmd 见 [crawler-server/README.md](../crawler-server/README.md)「Windows 与手动设置环境变量」。

## 赛中与策略

赛前报告、新闻素材、赛后复盘等目录约定与 `epl/`、`aLeague/` 同级模块一致时，可在此模块下增加 `report/`、`news/`、`postMatchSummary/` 等；详见 [README.md](./README.md)。
