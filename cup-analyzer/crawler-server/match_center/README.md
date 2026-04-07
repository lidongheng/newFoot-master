# match_center（国内联赛赛程 JS）

`clubMatchAnalyzer` 需要读取与 backend-server 相同格式的 **`s{联赛序号}.js`**（如英超 `s36.js`）。

## 获取方式

1. **从现有 backend-server 复制**（推荐迁移期）  
   `cp /path/to/backend-server/match_center/s36.js ./`

2. **自行保存**  
   浏览器打开球探对应联赛页，按原项目习惯保存赛程脚本到本目录，文件名与 `config/squadTarget.js` 中的 `leagueSerial` 一致（英超 `36` → `s36.js`）。

国家队赛事使用 `c{序号}.js` 时，将 `squadTarget.isNation` 设为 `true` 并保证文件名前缀为 `c`。
