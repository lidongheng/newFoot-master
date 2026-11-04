# 德甲分析模块

基于 epl 工作流创建，球队映射采用用户提供的 18 支球队。球探联赛序号为 8。

- [工作流](./workflow.md)
- [球队配置](./data/config.json)
- [赛前报告模板](./prompts/match_analysis_template.md)

脚本复用 ../crawler-server，设置 CUP_ANALYZER_CUP=bundesliga。先运行 npm run crawl:schedule:bundesliga 获取 s8.js、l8.js、bs8.js、td8.js，再执行大名单及画像流水线。赛季沿用当前 EPL 配置 2026-2027。

比赛数据、大名单、球队画像、新闻与报告由后续流程生成。
