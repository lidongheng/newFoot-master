# 阿森纳 2026-2027 赛季对象

基本面标准工作流依次生成：

1. `fundamentals/squad/draft.md`；
2. 人工核对 `fundamentals/squad-final/confirmed.md`，并把文件首行状态从 `pending` 改为 `confirmed`；
3. `fundamentals/team-profile.md`；
4. `fundamentals/history-match-profile.md`。

赛事只作为参赛关系记录在 `competitions/memberships.json`，不会复制球队对象。
