# 英超 2025-2026赛季 第13轮 比赛分析报告

## 文件夹说明

本文件夹用于存放英超2025-2026赛季第13轮的比赛分析报告。

## 文件结构

```
round-13/
├── README.md              # 本说明文件
├── matches.md             # 本轮对阵列表及比赛时间
└── [待添加的比赛分析报告]
```

## 使用说明

### 1. 查看对阵列表
查看 `matches.md` 文件,了解本轮所有比赛的对阵和时间安排。

### 2. 比赛分析报告命名规范
为每场比赛创建独立的分析报告文件,建议命名格式:
- `{主队简称}_vs_{客队简称}.md`
- 例如: `chelsea_vs_arsenal.md` (切尔西vs阿森纳)

### 3. 分析报告模板
参考 `league-analyzer/prompts/match_analysis_template.md` 中的分析模板结构。

## 本轮比赛概况

- **比赛日期**: 2025年11月29日 - 12月1日
- **比赛场次**: 10场
- **重点场次**: 切尔西vs阿森纳、西汉姆联vs利物浦、曼城vs利兹联

## 分析要点

根据项目的 `.cursorrules` 文件,进行比赛分析时应关注:

1. **球员信息**: 大名单、伤病情况、预测首发
2. **球队近况**: 近期战绩、积分榜位置、对战历史
3. **盘口分析**: 亚盘、欧赔、大小球
4. **战术分析**: 阵型、打法特点、关键球员
5. **风险评估**: 体能、赛程密度、心理因素
6. **舆情分析**: 球队热度、媒体预测

## 注意事项

⚠️ **重要提醒**:
- 本分析仅供参考,不构成任何投注建议
- 请遵循 `principles/betting_principles.md` 中的投注原则
- 理性分析,控制风险
- 所有决策和风险由使用者自行承担

## 相关资源

- 联赛总结: `league-analyzer/leagues/epl/25-26/summary.md`
- 分析模板: `league-analyzer/prompts/match_analysis_template.md`
- 投注原则: `league-analyzer/principles/betting_principles.md`
- 财务管理: `league-analyzer/finance/finance_principles.md`
- 比赛数据: `backend-server/data/s36.js`

