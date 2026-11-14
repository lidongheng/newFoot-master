# 国际友谊赛规则核验

## 赛事格式

球探序号 `1366` 使用 `c1366.js`，2026 年赛程按月份组织 `G*` 阶段，例如十一月为 `G28379`。这里的杯赛格式是数据读取方式，不代表有小组出线、淘汰赛或冠军争夺。

## FIFA 排名

符合 FIFA 认定并纳入计算的成年国家队 A 级友谊赛使用 SUM 公式：

`P_after = P_before + I × (W − We)`

- 国际比赛日窗口内友谊赛：`I = 10`。
- 窗口外友谊赛：`I = 5`。
- `We` 根据双方赛前排名积分之差计算，不能用排名名次之差替代。
- 比赛是否计入排名须核对 FIFA 的认定，不能由球探赛事分类直接推定。

依据：[FIFA 官方计算规则](https://digitalhub.fifa.com/m/f99da4f73212220/original/edbm045h0udbwkqew35a-pdf.pdf)。本模块不保存未经核实的即时排名和积分。

## 战意口径

普通独立友谊赛不套用争冠、升级、保级、分组出线和淘汰赛选对手规则。FIFA 排名积分是这里记录的竞赛结果影响；备战、试阵、考察球员和控制负荷仍可能影响实际投入，必须用具体证据说明。

FIFA 的[世界杯前热身赛记录](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/pre-tournament-warm-up-results-fixtures-scorers)包含轮换与考察阵容的案例。若某场友谊赛属于另有章程的邀请赛，单独核验该赛事章程，不据此给本模块虚构通用晋级规则。
