网络爬取模式：node crawlerPostMatchData.js --output <输出目录>

本地文件模式：node crawlerPostMatchData.js --local <HTML文件> --output <输出目录>

文件与内容

文件	内容
matchInfo.json	比赛基础信息 + 赛后总结
matchEvents.json	16个比赛事件（进球、黄牌、换人等）+ 角球事件时间线
techStats.json	47项全场技术统计 + 上下半场分项统计 + 近3/5/10场平均数据
lineup.json	双方首发/替补/伤病名单 + 阵型
playerStats.json	每位上场球员的详细技术数据（射门、传球、抢断等28项指标）
goalProbability.json	近30/50场进失球概率分布（按时段）
