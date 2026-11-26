const squadTarget = require('./squadTarget');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 相邻脚本之间的缓冲时间（毫秒），跨球队执行时同样生效。
const commandDelayMs = 500;

// 按数组顺序逐队更新，未填写的其他属性沿用 squadTarget.js。
// 中国时区 2026-11-27 至 2026-11-30 各联赛本周末比赛球队。
const targets = [
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '49', // 诺丁汉森林（主队）vs 切尔西
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '12',
    teamChineseName: '诺丁汉森林',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '24', // 切尔西（客队）vs 诺丁汉森林
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '12',
    teamChineseName: '切尔西',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '56', // 利兹联（主队）vs 考文垂
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '12',
    teamChineseName: '利兹联',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '57', // 考文垂（客队）vs 利兹联
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '12',
    teamChineseName: '考文垂',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '27', // 曼彻斯特联（主队）vs 布伦特福德
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '12',
    teamChineseName: '曼彻斯特联',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '365', // 布伦特福德（客队）vs 曼彻斯特联
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '12',
    teamChineseName: '布伦特福德',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '68', // 伊普斯维奇（主队）vs 阿斯顿维拉
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '12',
    teamChineseName: '伊普斯维奇',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '20', // 阿斯顿维拉（客队）vs 伊普斯维奇
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '12',
    teamChineseName: '阿斯顿维拉',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '31', // 埃弗顿（主队）vs 利物浦
    matchTime: '2026-11-29 20:00:00',
    roundSerial: '12',
    teamChineseName: '埃弗顿',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '25', // 利物浦（客队）vs 埃弗顿
    matchTime: '2026-11-29 20:00:00',
    roundSerial: '12',
    teamChineseName: '利物浦',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '29', // 富勒姆（主队）vs 伯恩茅斯
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '富勒姆',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '348', // 伯恩茅斯（客队）vs 富勒姆
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '伯恩茅斯',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '60', // 布莱顿（主队）vs 纽卡斯尔联
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '布莱顿',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '28', // 纽卡斯尔联（客队）vs 布莱顿
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '纽卡斯尔联',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '35', // 水晶宫（主队）vs 赫尔城
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '水晶宫',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '384', // 赫尔城（客队）vs 水晶宫
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '赫尔城',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '65', // 桑德兰（主队）vs 托特纳姆热刺
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '桑德兰',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '33', // 托特纳姆热刺（客队）vs 桑德兰
    matchTime: '2026-11-29 22:05:00',
    roundSerial: '12',
    teamChineseName: '托特纳姆热刺',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '19', // 阿森纳（主队）vs 曼彻斯特城
    matchTime: '2026-11-30 00:30:00',
    roundSerial: '12',
    teamChineseName: '阿森纳',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '26', // 曼彻斯特城（客队）vs 阿森纳
    matchTime: '2026-11-30 00:30:00',
    roundSerial: '12',
    teamChineseName: '曼彻斯特城',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '557', // 威尼斯（主队）vs 博洛尼亚
    matchTime: '2026-11-28 03:45:00',
    roundSerial: '13',
    teamChineseName: '威尼斯',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '185', // 博洛尼亚（客队）vs 威尼斯
    matchTime: '2026-11-28 03:45:00',
    roundSerial: '13',
    teamChineseName: '博洛尼亚',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '1359', // 弗洛西诺尼（主队）vs 帕尔马
    matchTime: '2026-11-28 22:00:00',
    roundSerial: '13',
    teamChineseName: '弗洛西诺尼',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '189', // 帕尔马（客队）vs 弗洛西诺尼
    matchTime: '2026-11-28 22:00:00',
    roundSerial: '13',
    teamChineseName: '帕尔马',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '558', // 都灵（主队）vs 拉齐奥
    matchTime: '2026-11-29 01:00:00',
    roundSerial: '13',
    teamChineseName: '都灵',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '182', // 拉齐奥（客队）vs 都灵
    matchTime: '2026-11-29 01:00:00',
    roundSerial: '13',
    teamChineseName: '拉齐奥',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '152', // 国际米兰（主队）vs 热那亚
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '13',
    teamChineseName: '国际米兰',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '552', // 热那亚（客队）vs 国际米兰
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '13',
    teamChineseName: '热那亚',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '187', // 乌迪内斯（主队）vs 佛罗伦萨
    matchTime: '2026-11-29 19:30:00',
    roundSerial: '13',
    teamChineseName: '乌迪内斯',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '176', // 佛罗伦萨（客队）vs 乌迪内斯
    matchTime: '2026-11-29 19:30:00',
    roundSerial: '13',
    teamChineseName: '佛罗伦萨',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '2960', // 萨索洛（主队）vs 那不勒斯
    matchTime: '2026-11-29 22:00:00',
    roundSerial: '13',
    teamChineseName: '萨索洛',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '1419', // 那不勒斯（客队）vs 萨索洛
    matchTime: '2026-11-29 22:00:00',
    roundSerial: '13',
    teamChineseName: '那不勒斯',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '174', // 罗马（主队）vs 蒙扎
    matchTime: '2026-11-30 01:00:00',
    roundSerial: '13',
    teamChineseName: '罗马',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '2667', // 蒙扎（客队）vs 罗马
    matchTime: '2026-11-30 01:00:00',
    roundSerial: '13',
    teamChineseName: '蒙扎',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '1397', // 科莫（主队）vs 尤文图斯
    matchTime: '2026-11-30 03:45:00',
    roundSerial: '13',
    teamChineseName: '科莫',
  },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '166', // 尤文图斯（客队）vs 科莫
    matchTime: '2026-11-30 03:45:00',
    roundSerial: '13',
    teamChineseName: '尤文图斯',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '132', // 云达不莱梅（主队）vs 门兴格拉德巴赫
    matchTime: '2026-11-28 03:30:00',
    roundSerial: '11',
    teamChineseName: '云达不莱梅',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '128', // 门兴格拉德巴赫（客队）vs 云达不莱梅
    matchTime: '2026-11-28 03:30:00',
    roundSerial: '11',
    teamChineseName: '门兴格拉德巴赫',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '160', // 汉堡（主队）vs 拜仁慕尼黑
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '汉堡',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '88', // 拜仁慕尼黑（客队）vs 汉堡
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '拜仁慕尼黑',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '162', // 美因茨（主队）vs 柏林联合
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '美因茨',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '1087', // 柏林联合（客队）vs 美因茨
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '柏林联合',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '1720', // 帕德博恩（主队）vs 沙尔克04
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '帕德博恩',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '151', // 沙尔克04（客队）vs 帕德博恩
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '沙尔克04',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '490', // 科隆（主队）vs 埃尔沃斯贝格
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '科隆',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '1076', // 埃尔沃斯贝格（客队）vs 科隆
    matchTime: '2026-11-28 22:30:00',
    roundSerial: '11',
    teamChineseName: '埃尔沃斯贝格',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '155', // 斯图加特（主队）vs 法兰克福
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '11',
    teamChineseName: '斯图加特',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '423', // 法兰克福（客队）vs 斯图加特
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '11',
    teamChineseName: '法兰克福',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '172', // 弗赖堡（主队）vs RB莱比锡
    matchTime: '2026-11-29 22:30:00',
    roundSerial: '11',
    teamChineseName: '弗赖堡',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '13201', // RB莱比锡（客队）vs 弗赖堡
    matchTime: '2026-11-29 22:30:00',
    roundSerial: '11',
    teamChineseName: 'RB莱比锡',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '1078', // 霍芬海姆（主队）vs 奥格斯堡
    matchTime: '2026-11-30 00:30:00',
    roundSerial: '11',
    teamChineseName: '霍芬海姆',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '1135', // 奥格斯堡（客队）vs 霍芬海姆
    matchTime: '2026-11-30 00:30:00',
    roundSerial: '11',
    teamChineseName: '奥格斯堡',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '99', // 多特蒙德（主队）vs 勒沃库森
    matchTime: '2026-11-30 02:30:00',
    roundSerial: '11',
    teamChineseName: '多特蒙德',
  },
  {
    leagueSerial: '8',
    leagueSlug: 'bundesliga',
    season: '2026-2027',
    teamSerial: '165', // 勒沃库森（客队）vs 多特蒙德
    matchTime: '2026-11-30 02:30:00',
    roundSerial: '11',
    teamChineseName: '勒沃库森',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '103', // 莱万特（主队）vs 桑坦德竞技
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '14',
    teamChineseName: '莱万特',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '104', // 桑坦德竞技（客队）vs 莱万特
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '14',
    teamChineseName: '桑坦德竞技',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '96', // 皇家贝蒂斯（主队）vs 巴列卡诺
    matchTime: '2026-11-28 21:00:00',
    roundSerial: '14',
    teamChineseName: '皇家贝蒂斯',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '994', // 巴列卡诺（客队）vs 皇家贝蒂斯
    matchTime: '2026-11-28 21:00:00',
    roundSerial: '14',
    teamChineseName: '巴列卡诺',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '102', // 马拉加（主队）vs 毕尔巴鄂竞技
    matchTime: '2026-11-28 23:15:00',
    roundSerial: '14',
    teamChineseName: '马拉加',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '92', // 毕尔巴鄂竞技（客队）vs 马拉加
    matchTime: '2026-11-28 23:15:00',
    roundSerial: '14',
    teamChineseName: '毕尔巴鄂竞技',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '126', // 埃尔切（主队）vs 马德里竞技
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '14',
    teamChineseName: '埃尔切',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '109', // 马德里竞技（客队）vs 埃尔切
    matchTime: '2026-11-29 01:30:00',
    roundSerial: '14',
    teamChineseName: '马德里竞技',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '82', // 皇家马德里（主队）vs 阿拉维斯
    matchTime: '2026-11-29 04:00:00',
    roundSerial: '14',
    teamChineseName: '皇家马德里',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '137', // 阿拉维斯（客队）vs 皇家马德里
    matchTime: '2026-11-29 04:00:00',
    roundSerial: '14',
    teamChineseName: '阿拉维斯',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '91', // 巴伦西亚（主队）vs 奥萨苏纳
    matchTime: '2026-11-29 21:00:00',
    roundSerial: '14',
    teamChineseName: '巴伦西亚',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '94', // 奥萨苏纳（客队）vs 巴伦西亚
    matchTime: '2026-11-29 21:00:00',
    roundSerial: '14',
    teamChineseName: '奥萨苏纳',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '93', // 拉科鲁尼亚（主队）vs 巴塞罗那
    matchTime: '2026-11-29 23:15:00',
    roundSerial: '14',
    teamChineseName: '拉科鲁尼亚',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '84', // 巴塞罗那（客队）vs 拉科鲁尼亚
    matchTime: '2026-11-29 23:15:00',
    roundSerial: '14',
    teamChineseName: '巴塞罗那',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '114', // 塞尔塔（主队）vs 比利亚雷亚尔
    matchTime: '2026-11-30 01:30:00',
    roundSerial: '14',
    teamChineseName: '塞尔塔',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '107', // 比利亚雷亚尔（客队）vs 塞尔塔
    matchTime: '2026-11-30 01:30:00',
    roundSerial: '14',
    teamChineseName: '比利亚雷亚尔',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '106', // 皇家社会（主队）vs 塞维利亚
    matchTime: '2026-11-30 04:00:00',
    roundSerial: '14',
    teamChineseName: '皇家社会',
  },
  {
    leagueSerial: '31',
    leagueSlug: 'laLiga',
    season: '2026-2027',
    teamSerial: '86', // 塞维利亚（客队）vs 皇家社会
    matchTime: '2026-11-30 04:00:00',
    roundSerial: '14',
    teamChineseName: '塞维利亚',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '306', // 布雷斯特（主队）vs 巴黎FC
    matchTime: '2026-11-28 03:45:00',
    roundSerial: '12',
    teamChineseName: '布雷斯特',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '1796', // 巴黎FC（客队）vs 布雷斯特
    matchTime: '2026-11-28 03:45:00',
    roundSerial: '12',
    teamChineseName: '巴黎FC',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '304', // 昂热（主队）vs 朗斯
    matchTime: '2026-11-29 00:15:00',
    roundSerial: '12',
    teamChineseName: '昂热',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '202', // 朗斯（客队）vs 昂热
    matchTime: '2026-11-29 00:15:00',
    roundSerial: '12',
    teamChineseName: '朗斯',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '335', // 勒阿弗尔（主队）vs 斯特拉斯堡
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '勒阿弗尔',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '260', // 斯特拉斯堡（客队）vs 勒阿弗尔
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '斯特拉斯堡',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '328', // 勒芒（主队）vs 里尔
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '勒芒',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '266', // 里尔（客队）vs 勒芒
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '里尔',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '259', // 尼斯（主队）vs 特鲁瓦
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '尼斯',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '366', // 特鲁瓦（客队）vs 尼斯
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '特鲁瓦',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '271', // 巴黎圣日耳曼（主队）vs 洛里昂
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '巴黎圣日耳曼',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '333', // 洛里昂（客队）vs 巴黎圣日耳曼
    matchTime: '2026-11-29 03:45:00',
    roundSerial: '12',
    teamChineseName: '洛里昂',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '215', // 欧塞尔（主队）vs 马赛
    matchTime: '2026-11-29 22:00:00',
    roundSerial: '12',
    teamChineseName: '欧塞尔',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '211', // 马赛（客队）vs 欧塞尔
    matchTime: '2026-11-29 22:00:00',
    roundSerial: '12',
    teamChineseName: '马赛',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '216', // 图卢兹（主队）vs 雷恩
    matchTime: '2026-11-30 00:15:00',
    roundSerial: '12',
    teamChineseName: '图卢兹',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '251', // 雷恩（客队）vs 图卢兹
    matchTime: '2026-11-30 00:15:00',
    roundSerial: '12',
    teamChineseName: '雷恩',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '205', // 里昂（主队）vs 摩纳哥
    matchTime: '2026-11-30 03:45:00',
    roundSerial: '12',
    teamChineseName: '里昂',
  },
  {
    leagueSerial: '11',
    leagueSlug: 'ligue1',
    season: '2026-2027',
    teamSerial: '197', // 摩纳哥（客队）vs 里昂
    matchTime: '2026-11-30 03:45:00',
    roundSerial: '12',
    teamChineseName: '摩纳哥',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '236', // 格罗宁根（主队）vs 威廉二世
    matchTime: '2026-11-28 03:00:00',
    roundSerial: '14',
    teamChineseName: '格罗宁根',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '225', // 威廉二世（客队）vs 格罗宁根
    matchTime: '2026-11-28 03:00:00',
    roundSerial: '14',
    teamChineseName: '威廉二世',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '270', // SBV精英（主队）vs 特尔斯达
    matchTime: '2026-11-28 23:30:00',
    roundSerial: '14',
    teamChineseName: 'SBV精英',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '279', // 特尔斯达（客队）vs SBV精英
    matchTime: '2026-11-28 23:30:00',
    roundSerial: '14',
    teamChineseName: '特尔斯达',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '254', // 埃因霍温（主队）vs 前进之鹰
    matchTime: '2026-11-29 01:45:00',
    roundSerial: '14',
    teamChineseName: '埃因霍温',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '280', // 前进之鹰（客队）vs 埃因霍温
    matchTime: '2026-11-29 01:45:00',
    roundSerial: '14',
    teamChineseName: '前进之鹰',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '288', // 坎布尔（主队）vs 鹿特丹斯巴达
    matchTime: '2026-11-29 04:00:00',
    roundSerial: '14',
    teamChineseName: '坎布尔',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '273', // 鹿特丹斯巴达（客队）vs 坎布尔
    matchTime: '2026-11-29 04:00:00',
    roundSerial: '14',
    teamChineseName: '鹿特丹斯巴达',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '256', // 海牙（主队）vs 乌德勒支
    matchTime: '2026-11-29 19:15:00',
    roundSerial: '14',
    teamChineseName: '海牙',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '237', // 乌德勒支（客队）vs 海牙
    matchTime: '2026-11-29 19:15:00',
    roundSerial: '14',
    teamChineseName: '乌德勒支',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '252', // 费耶诺德（主队）vs 阿贾克斯
    matchTime: '2026-11-29 21:30:00',
    roundSerial: '14',
    teamChineseName: '费耶诺德',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '253', // 阿贾克斯（客队）vs 费耶诺德
    matchTime: '2026-11-29 21:30:00',
    roundSerial: '14',
    teamChineseName: '阿贾克斯',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '274', // 福图纳锡塔德（主队）vs 海伦芬
    matchTime: '2026-11-29 21:30:00',
    roundSerial: '14',
    teamChineseName: '福图纳锡塔德',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '235', // 海伦芬（客队）vs 福图纳锡塔德
    matchTime: '2026-11-29 21:30:00',
    roundSerial: '14',
    teamChineseName: '海伦芬',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '414', // 兹沃勒（主队）vs 阿尔克马尔
    matchTime: '2026-11-29 23:45:00',
    roundSerial: '14',
    teamChineseName: '兹沃勒',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '234', // 阿尔克马尔（客队）vs 兹沃勒
    matchTime: '2026-11-29 23:45:00',
    roundSerial: '14',
    teamChineseName: '阿尔克马尔',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '239', // 奈梅亨（主队）vs 特温特
    matchTime: '2026-11-30 03:00:00',
    roundSerial: '14',
    teamChineseName: '奈梅亨',
  },
  {
    leagueSerial: '16',
    leagueSlug: 'eredivisie',
    season: '2026-2027',
    teamSerial: '250', // 特温特（客队）vs 奈梅亨
    matchTime: '2026-11-30 03:00:00',
    roundSerial: '14',
    teamChineseName: '特温特',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '30', // 南安普敦（主队）vs 米德尔斯堡
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '18',
    teamChineseName: '南安普敦',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '17', // 米德尔斯堡（客队）vs 南安普敦
    matchTime: '2026-11-28 04:00:00',
    roundSerial: '18',
    teamChineseName: '米德尔斯堡',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '21', // 布莱克本（主队）vs 查尔顿
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '布莱克本',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '23', // 查尔顿（客队）vs 布莱克本
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '查尔顿',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '1188', // 林肯城（主队）vs 狼队
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '林肯城',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '52', // 狼队（客队）vs 林肯城
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '狼队',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '55', // 普雷斯顿（主队）vs 诺维奇
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '普雷斯顿',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '34', // 诺维奇（客队）vs 普雷斯顿
    matchTime: '2026-11-28 20:30:00',
    roundSerial: '18',
    teamChineseName: '诺维奇',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '50', // 女王公园巡游者（主队）vs 谢菲尔德联队
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '女王公园巡游者',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '51', // 谢菲尔德联队（客队）vs 女王公园巡游者
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '谢菲尔德联队',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '69', // 米尔沃尔（主队）vs 伯恩利
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '米尔沃尔',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '46', // 伯恩利（客队）vs 米尔沃尔
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '伯恩利',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '47', // 德比郡（主队）vs 沃特福德
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '德比郡',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '53', // 沃特福德（客队）vs 德比郡
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '沃特福德',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '32', // 伯明翰（主队）vs 博尔顿
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '伯明翰',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '22', // 博尔顿（客队）vs 伯明翰
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '博尔顿',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '18', // 西布罗姆维奇（主队）vs 布里斯托城
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '西布罗姆维奇',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '379', // 布里斯托城（客队）vs 西布罗姆维奇
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '布里斯托城',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '62', // 西汉姆联（主队）vs 斯托克城
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '西汉姆联',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '58', // 斯托克城（客队）vs 西汉姆联
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '斯托克城',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '358', // 雷克瑟姆（主队）vs 朴茨茅斯
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '雷克瑟姆',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '36', // 朴茨茅斯（客队）vs 雷克瑟姆
    matchTime: '2026-11-28 23:00:00',
    roundSerial: '18',
    teamChineseName: '朴茨茅斯',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '1194', // 斯旺西（主队）vs 卡迪夫城
    matchTime: '2026-11-29 20:00:00',
    roundSerial: '18',
    teamChineseName: '斯旺西',
  },
  {
    leagueSerial: '37',
    leagueSlug: 'eflChampionship',
    season: '2026-2027',
    teamSerial: '64', // 卡迪夫城（客队）vs 斯旺西
    matchTime: '2026-11-29 20:00:00',
    roundSerial: '18',
    teamChineseName: '卡迪夫城',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '3163', // 京都不死鸟（主队）vs 大阪樱花
    matchTime: '2026-11-28 13:00:00',
    roundSerial: '17',
    teamChineseName: '京都不死鸟',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '193', // 大阪樱花（客队）vs 京都不死鸟
    matchTime: '2026-11-28 13:00:00',
    roundSerial: '17',
    teamChineseName: '大阪樱花',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '204', // 清水鼓动（主队）vs 浦和红钻
    matchTime: '2026-11-28 13:00:00',
    roundSerial: '17',
    teamChineseName: '清水鼓动',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '188', // 浦和红钻（客队）vs 清水鼓动
    matchTime: '2026-11-28 13:00:00',
    roundSerial: '17',
    teamChineseName: '浦和红钻',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '203', // 神户胜利船（主队）vs 千叶市原
    matchTime: '2026-11-28 14:00:00',
    roundSerial: '17',
    teamChineseName: '神户胜利船',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '199', // 千叶市原（客队）vs 神户胜利船
    matchTime: '2026-11-28 14:00:00',
    roundSerial: '17',
    teamChineseName: '千叶市原',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '190', // 鹿岛鹿角（主队）vs 冈山绿雉
    matchTime: '2026-11-28 14:00:00',
    roundSerial: '17',
    teamChineseName: '鹿岛鹿角',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '9024', // 冈山绿雉（客队）vs 鹿岛鹿角
    matchTime: '2026-11-28 14:00:00',
    roundSerial: '17',
    teamChineseName: '冈山绿雉',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '209', // 柏太阳神（主队）vs 广岛三箭
    matchTime: '2026-11-28 15:00:00',
    roundSerial: '17',
    teamChineseName: '柏太阳神',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '206', // 广岛三箭（客队）vs 柏太阳神
    matchTime: '2026-11-28 15:00:00',
    roundSerial: '17',
    teamChineseName: '广岛三箭',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '196', // 横滨水手（主队）vs FC东京
    matchTime: '2026-11-29 13:00:00',
    roundSerial: '17',
    teamChineseName: '横滨水手',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '201', // FC东京（客队）vs 横滨水手
    matchTime: '2026-11-29 13:00:00',
    roundSerial: '17',
    teamChineseName: 'FC东京',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '3194', // 水户蜀葵（主队）vs 长崎成功丸
    matchTime: '2026-11-29 13:00:00',
    roundSerial: '17',
    teamChineseName: '水户蜀葵',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '10031', // 长崎成功丸（客队）vs 水户蜀葵
    matchTime: '2026-11-29 13:00:00',
    roundSerial: '17',
    teamChineseName: '长崎成功丸',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '181', // 名古屋鲸八（主队）vs 福冈黄蜂
    matchTime: '2026-11-29 14:00:00',
    roundSerial: '17',
    teamChineseName: '名古屋鲸八',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '1547', // 福冈黄蜂（客队）vs 名古屋鲸八
    matchTime: '2026-11-29 14:00:00',
    roundSerial: '17',
    teamChineseName: '福冈黄蜂',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '1989', // 川崎前锋（主队）vs 大阪钢巴
    matchTime: '2026-11-29 14:00:00',
    roundSerial: '17',
    teamChineseName: '川崎前锋',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '207', // 大阪钢巴（客队）vs 川崎前锋
    matchTime: '2026-11-29 14:00:00',
    roundSerial: '17',
    teamChineseName: '大阪钢巴',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '10035', // 町田泽维亚（主队）vs 东京绿茵
    matchTime: '2026-11-29 15:00:00',
    roundSerial: '17',
    teamChineseName: '町田泽维亚',
  },
  {
    leagueSerial: '25',
    leagueSlug: 'jLeague',
    season: '2026-2027',
    teamSerial: '200', // 东京绿茵（客队）vs 町田泽维亚
    matchTime: '2026-11-29 15:00:00',
    roundSerial: '17',
    teamChineseName: '东京绿茵',
  },
  {
    leagueSerial: '273',
    leagueSlug: 'aLeague',
    season: '2026-2027',
    teamSerial: '51511', // 麦克阿瑟FC（主队）vs 墨尔本城
    matchTime: '2026-11-27 16:40:00',
    roundSerial: '5',
    teamChineseName: '麦克阿瑟FC',
  },
  {
    leagueSerial: '273',
    leagueSlug: 'aLeague',
    season: '2026-2027',
    teamSerial: '14549', // 墨尔本城（客队）vs 麦克阿瑟FC
    matchTime: '2026-11-27 16:40:00',
    roundSerial: '5',
    teamChineseName: '墨尔本城',
  },
  {
    leagueSerial: '273',
    leagueSlug: 'aLeague',
    season: '2026-2027',
    teamSerial: '2910', // 中央海岸水手（主队）vs 奥克兰FC
    matchTime: '2026-11-28 16:40:00',
    roundSerial: '6',
    teamChineseName: '中央海岸水手',
  },
  {
    leagueSerial: '273',
    leagueSlug: 'aLeague',
    season: '2026-2027',
    teamSerial: '70866', // 奥克兰FC（客队）vs 中央海岸水手
    matchTime: '2026-11-28 16:40:00',
    roundSerial: '6',
    teamChineseName: '奥克兰FC',
  }
];

/** 运行：在 crawler-server 下执行 node config/batchSquadFinalUpdater.js。 */
async function updateBatch(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('请配置非空的球队配置数组');
  }
  const mergedTargets = items.map((item) => ({ ...squadTarget, ...item }));
  for (const target of mergedTargets) {
    for (const key of ['leagueSerial', 'leagueSlug', 'season', 'teamSerial', 'matchTime', 'roundSerial']) {
      if (typeof target[key] !== 'string' || target[key].trim() === '') {
        throw new Error(`球队配置 ${key} 必须为非空字符串`);
      }
    }
    // 这两个字段会进入 shell 命令，仅允许赛事标识符和数字球队序号。
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(target.leagueSlug) || !/^[1-9]\d*$/.test(target.teamSerial)) {
      throw new Error('leagueSlug 必须为字母开头的字母数字标识符，teamSerial 必须为正整数');
    }
  }

  const cwd = path.resolve(__dirname, '..');
  const preloadPath = __filename.replace(/\\/g, '/');
  const nodeOptions = [process.env.NODE_OPTIONS, `--require "${preloadPath}"`].filter(Boolean).join(' ');
  const results = [];
  let hasExecutedCommand = false;
  for (const [index, target] of mergedTargets.entries()) {
    const { leagueSlug, teamSerial } = target;
    const env = {
      ...process.env,
      CUP_ANALYZER_CUP: leagueSlug,
      CUP_ANALYZER_BATCH_SQUAD_TARGET: JSON.stringify(target),
      NODE_OPTIONS: nodeOptions,
    };
    const commands = [];
    const playerPath = path.join(cwd, 'output/player_center', `${teamSerial}.json`);
    console.log(`\n[${index + 1}/${mergedTargets.length}] 更新 ${leagueSlug} 球队 ${teamSerial}`);
    if (fs.existsSync(playerPath)) {
      console.log(`[球探] 已存在 ${playerPath}，跳过抓取`);
    } else {
      commands.push('npm run crawl:player-list:club -- -w qiutan');
    }
    commands.push(
      'npm run crawl:player-list:club -- -w dqd',
      'npm run analyze:club-domestic',
      `npx cross-env CUP_ANALYZER_CUP=${leagueSlug} node processors/leagueSquadProcessor.js`,
      `npx cross-env CUP_ANALYZER_CUP=${leagueSlug} node processors/teamScheduleProcessor.js`,
      `npx cross-env CUP_ANALYZER_CUP=${leagueSlug} node processors/squadFinalInitializer.js --team ${teamSerial}`
    );

    let currentCommand;
    try {
      for (const command of commands) {
        currentCommand = command;
        if (hasExecutedCommand) {
          console.log(`[缓冲] 等待 ${commandDelayMs / 1000} 秒后执行下一条命令`);
          await new Promise((resolve) => setTimeout(resolve, commandDelayMs));
        }
        hasExecutedCommand = true;
        console.log(`[执行] ${command}`);
        await new Promise((resolve, reject) => {
          const child = spawn(command, {
            cwd,
            shell: true,
            stdio: 'inherit',
            windowsHide: true,
            env,
          });
          child.on('error', reject);
          child.on('close', (code, signal) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`命令执行失败，退出码：${code}，信号：${signal}`));
            }
          });
        });
      }
      results.push({ leagueSlug, teamSerial, success: true });
    } catch (error) {
      console.error(`[批量更新] 球队 ${teamSerial} 失败：${error.message}`);
      results.push({ leagueSlug, teamSerial, success: false, command: currentCommand, error: error.message });
    }
  }

  console.log('\n批量更新结果：');
  console.table(results);
  return results;
}

if (process.env.CUP_ANALYZER_BATCH_SQUAD_TARGET !== undefined) {
  // npm、npx 及其 Node 子进程均会预加载此文件，只替换内存中的配置导出。
  require.cache[require.resolve('./squadTarget')].exports = JSON.parse(process.env.CUP_ANALYZER_BATCH_SQUAD_TARGET);
} else if (require.main === module) {
  updateBatch(targets).then((results) => {
    if (results.some((result) => !result.success)) {
      process.exitCode = 1;
    }
  }).catch((error) => {
    console.error('[批量更新]', error.message);
    process.exitCode = 1;
  });
}

module.exports = { targets, updateBatch };
