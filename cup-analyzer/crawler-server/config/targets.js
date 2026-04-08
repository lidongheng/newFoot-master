/**
 * @param {string} cupSerial 如 '75' | '103'
 */
function cupMatchReferer(cupSerial) {
  return `http://zq.titan007.com/cn/CupMatch/${cupSerial}.html`;
}

const targets = {
  titan007: {
    baseUrl: 'http://zq.titan007.com',
    mobileUrl: 'https://m.titan007.com',
    detailUrl: 'http://bf.titan007.com',

    teamDetailUrl: (serial) =>
      `http://zq.titan007.com/jsData/teamInfo/teamDetail/tdl${serial}.js?version=${Date.now()}`,

    /** 球队阵容页 HTML，用于解析球员详情链接 playerSerial */
    teamLineupUrl: (teamSerial) =>
      `http://zq.titan007.com/cn/team/lineup/${teamSerial}.html`,

    /** 球员资料 JS：sandbox 含 nowTeamInfo、transferInfo 等 */
    playerDataUrl: (playerSerial) =>
      `http://zq.titan007.com/jsData/playerInfo/player${playerSerial}.js?version=${Date.now()}`,

    matchAnalysisUrl: (matchSerial) =>
      `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,

    matchStatisticsUrl: (matchSerial) =>
      `https://zq.titan007.com/analysis/${matchSerial}cn.htm`,

    postMatchSummaryApi: (matchSerial) =>
      `https://m.titan007.com/Common/CommonInterface.ashx?type=18&scheid=${matchSerial}&lang=`,

    cupScheduleUrl: (cupSerial, season) =>
      `http://zq.titan007.com/jsData/matchResult/${season}/c${cupSerial}.js?version=${Date.now()}`,

    cupMatchReferer,

    headers: {
      /** desktop / detail 的 Referer 需与当前杯赛序号一致，由 getCupHeaders 生成 */
      desktop: { Referer: cupMatchReferer('75'), Host: 'zq.titan007.com' },
      mobile: (matchSerial) => ({
        Referer: `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,
        Host: 'm.titan007.com',
      }),
      detail: { Referer: cupMatchReferer('75'), Host: 'bf.titan007.com' },
    },
  },
};

module.exports = targets;
