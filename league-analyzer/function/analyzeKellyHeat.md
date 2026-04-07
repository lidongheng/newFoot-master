1. 顶层结构
1.1 conclusion

群体层面的冷热结论（来自 books 多家公司凯利指数的“最低项投票”与一致性判断）。
用于回答：市场/公司群体整体更防哪一边（热），其次是哪一边（warm），哪一边相对冷（cold）。

字段：

hot：群体最热端（加权投票最高的赛果），例如 "平"

warm：次热端（加权投票第二）

cold：相对冷端（加权投票最低）

consistency：一致性/分歧程度（根据 gapHotWarm 判断的等级）

"强一致"：热端领先明显

"中"：普通

"分歧较大"：热端领先很小，群体看法分散

voteShareWeighted：加权投票占比（把 details.votes.weighted 归一化后的比例）

主/平/客：分别表示主/平/客在加权投票中的占比（0~1）

gapHotWarm：热端占比 − 次热端占比
用于量化“热端领先幅度”，越小说明越分歧。

1.2 jingcaiTiming

竞彩“时点态度”模块：用你定义的策略

初盘（open）定方向（Anchor）

临盘（live）用于判断信号是否衰减（Decay）或是否出现清晰反转（Flip）

用于回答：竞彩初盘到底防哪一边？临盘有没有被资金抹平？是否出现明确反转？

字段分组：

1.2.1 jingcaiTiming.anchor

初盘锚点（Anchor）：只看竞彩初盘三项凯利，决定“方向”。

open：竞彩初盘三项凯利数组 [主, 平, 客]

minOutcome：初盘三项中凯利最小的赛果（最“防”的方向）

minVal：初盘最低凯利值

margin：初盘“明显程度”
=（次低凯利 − 最低凯利）
越大代表“最低项更突出，方向更明确”

isClear：是否为“强锚点”

true：margin >= anchorMinMargin（默认 0.03）

false：初盘差值太小，锚点偏弱

rule：这条判断规则的文字说明（便于你日志化/复盘）

1.2.2 jingcaiTiming.live

临盘即时状态（Live Snapshot）：竞彩临盘三项凯利的当前形态。

live：竞彩临盘三项凯利 [主, 平, 客]

minOutcome：临盘最低项（可能是一个数组，表示并列最低）

minVal：临盘最低凯利值

margin：临盘明显程度（同 anchor.margin 的定义）

你这份输出里临盘 margin = 0，意味着“最低项并列/三项挤在一起”，信号非常模糊。

1.2.3 jingcaiTiming.decay

衰减/模糊（Signal Decay）：衡量“临盘是否把初盘信号抹平”。

openMargin：初盘差值（anchor.margin）

liveMargin：临盘差值（live.margin）

ratio：liveMargin / openMargin（初盘差值为 0 时为 null）

isDecay：是否触发“衰减”

true：满足任一条件

liveMargin <= openMargin * decayRatio（默认 0.35）

liveMargin <= decayAbs（默认 0.02）

false：临盘差值仍明显，信号未被抹平

rule：衰减判定规则的文字说明

1.2.4 jingcaiTiming.flip

反转（Flip）：判断“临盘方向是否发生清晰改变”。

changed：临盘最低项集合是否与初盘最低项集合不同

true：最低项发生变化（含“并列导致集合变化”）

isFlip：是否属于“有效反转”

true：changed === true 且 liveMargin >= flipMinMargin（默认 0.03）

false：虽然最低项变了，但临盘太模糊，不算反转

openMinOutcome：初盘最低项（锚点方向）

liveMinOutcome：临盘最低项（可能并列）

liveMargin：临盘差值（用于判断是否清晰到足以算反转）

rule：反转判定规则

1.2.5 jingcaiTiming.note

一句话判读：根据 anchor/decay/flip 自动生成的解释，给你“该怎么用”的建议。

1.3 details

调试与复盘用明细：把“为什么得出这个结论”完整暴露出来，便于你校验模型或做复盘。

2. details 字段说明
2.1 details.votes

投票原始数据（来自每家公司“最低项投票”）。

raw：未加权投票（每家公司 1 票；并列最低则平分）

主/平/客：分别表示拿到的票数（可为小数，因为有并列平分）

weighted：加权投票（同 raw，但对“主锚点公司”在信号足够清晰时可加权）

你这份输出里 raw 与 weighted 相同，是因为：

mainBookInfo.isClear 为 false（竞彩临盘并列最低、margin=0），所以竞彩没有被加权（appliedWeight=1）。

conclusion.voteShareWeighted 就是把 weighted 归一化后的比例。

2.2 details.strongSignals

强信号公司列表：列出那些“最低项很突出”的公司（用于快速抓重点）。

每项包含：

name：公司名

minOutcome：该公司最低项（最防方向）

minVal：最低凯利值

margin：次低 − 最低（越大越“明显”）

k：该公司三项凯利 [主, 平, 客]

触发条件：margin >= strongMargin（默认 0.04）。

2.3 details.mainBookInfo

主锚点公司（默认 竞彩）在“群体投票模块”中的识别结果
注意：它用的是 books 里那条“竞彩”的数据（通常是你截图时刻的数据，不一定等于初盘/临盘）。

字段：

name：公司名（这里是 "竞彩"）

k：该公司的三项凯利

minIdxs：最低项下标集合（0=主，1=平，2=客）；并列会有多个

minVal：最低凯利值

margin：次低 − 最低（并列最低时为 0）

isClear：在群体模块里是否“清晰到可加权”（margin >= mainBookClearMargin）

appliedWeight：实际应用的权重（清晰则为 mainBookWeight，否则为 1）

minOutcome：最低项对应的赛果（可能并列）

2.4 details.perBook

每家公司逐条解析结果（你复盘最常用的表）。

每一项包含：

name：公司名

k：三项凯利 [主, 平, 客]

minOutcome：最低项赛果（可能并列）

minVal：最低凯利值

margin：次低 − 最低（并列最低时为 0）

2.5 details.params

本次输出用到的关键参数（确保可复现实验/回测一致）。

mainBookName：群体投票模块的“主锚点公司名”（默认 "竞彩"）

mainBookWeight：主锚点公司在群体投票里“清晰时”的加权倍数

mainBookClearMargin：主锚点公司在群体投票里“清晰”的差值阈值

strongMargin：强信号公司阈值（用于 strongSignals）

anchorMinMargin：初盘锚点清晰阈值（用于 jingcaiTiming.anchor.isClear）

flipMinMargin：临盘反转清晰阈值（用于 jingcaiTiming.flip.isFlip）

decayRatio：衰减相对阈值（用于 jingcaiTiming.decay）

decayAbs：衰减绝对阈值（用于 jingcaiTiming.decay）