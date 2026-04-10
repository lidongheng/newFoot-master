# 48 队最终 26 人大名单（人工确认）

## 用途

- `squad/` 由 `squadProcessor.js` 从爬虫 JSON **自动生成**，为**初选大名单**（人数通常多于 26）。
- **`squad-final/`** 存放经你**手工裁剪、确认后的正式 26 人**，供 `teamProfileGenerator.js` 生成**球队画像**（优先从此目录读取；若无对应文件则回退到 `output/player_center/*.json`）。

## 数据来源与格式

- 与 `squad/` **相同的目录与文件命名**：`group-{A~L}/{中文队名}.md`。
- 表格列与初选一致：`球衣号 | 姓名 | 俱乐部 | 年龄 | 身高 | 位置 | 身价(万) | 国籍 | 转会记录`。
- 标题建议使用：`# {中文名}（{英文名}）最终26人大名单`，确认无误后可去掉「待确认」字样。

### 球队画像元数据（必填）

在 `> 球队ID: … | 数据来源: …` 行之后、第一个 `## 门将` 之前，增加两行，供 `teamProfileGenerator.js` 写入**主教练**、**阵型**，并生成「按位置大名单」与**预测首发**：

```markdown
- **主教练**: 例如 托马斯·图赫尔
- **阵型**: 例如 4-2-3-1
```

- **位置列**：请使用与阵型一致的英文缩写（如 `GK`、`RB`、`CB`、`LB`、`CDM`、`CM`、`CAM`、`LM`、`RM`、`LW`、`RW`、`ST` 等），与 `getPositionsForFormation`（见 `crawler-server/analyzers/clubMatchAnalyzer.js`）一致；中文位置名（如「中卫」）程序会尽量映射，但建议统一为缩写。
- **行顺序**：同一位置多名球员时，**名单靠前者优先视为该位置的第一人选**（影响预测首发 11 人）。

## 编辑规范

1. 每队**恰好 26 人**（按位置自行分配，如门将 3、后卫 8～9、中场 8～9、前锋 5～6）。
2. 在初选 `squad/` 对应文件中**删除**落选球员行即可；勿改列顺序，便于程序解析。
3. 填写上文 **主教练**、**阵型** 元数据，并规范「位置」列缩写。
4. 修改位置小节标题人数，例如：`## 门将（3人）`。文末 **统计摘要** 可在裁剪后手工改；若使用 `teamProfileGenerator.js` 且数据来源为 squad-final（默认 `--source final`），**跑画像时会自动按当前表格重算并写回**统计摘要。
5. 初始化草稿：在 `crawler-server` 下执行 `node processors/squadFinalInitializer.js`（见下），再在 `squad-final/` 中编辑。

## 生成 / 初始化方式

```bash
cd cup-analyzer/crawler-server
# 先保证已有初选 squad/
node processors/squadFinalInitializer.js           # 全量：从 squad/ 复制到 squad-final/
node processors/squadFinalInitializer.js --team 744 # 仅一队（球队序号，与 player_center 一致）
```

生成球队画像（默认优先读 `squad-final/`，无则读 JSON）：

```bash
node processors/teamProfileGenerator.js
node processors/teamProfileGenerator.js --source raw   # 强制仅用 player_center JSON
node processors/teamProfileGenerator.js --team 744     # 仅一队
```

## 目录结构（与 squad 镜像）

```
squad-final/
├── README.md
├── group-A/
├── group-B/
├── ...
└── group-L/
```
