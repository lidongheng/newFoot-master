const targets = {
  titan007: {
    baseUrl: 'http://zq.titan007.com',
    mobileUrl: 'https://m.titan007.com',
    detailUrl: 'http://bf.titan007.com',

    teamDetailUrl: (serial) =>
      `http://zq.titan007.com/jsData/teamInfo/teamDetail/tdl${serial}.js?version=${Date.now()}`,

    matchAnalysisUrl: (matchSerial) =>
      `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,

    matchStatisticsUrl: (matchSerial) =>
      `https://zq.titan007.com/analysis/${matchSerial}cn.htm`,

    postMatchSummaryApi: (matchSerial) =>
      `https://m.titan007.com/Common/CommonInterface.ashx?type=18&scheid=${matchSerial}&lang=`,

    cupScheduleUrl: (cupSerial, season) =>
      `http://zq.titan007.com/jsData/matchResult/${season}/c${cupSerial}.js?version=${Date.now()}`,

    headers: {
      desktop: {
        Referer: 'http://zq.titan007.com/cn/CupMatch/75.html',
        Host: 'zq.titan007.com',
      },
      mobile: (matchSerial) => ({
        Referer: `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,
        Host: 'm.titan007.com',
      }),
      detail: {
        Referer: 'http://zq.titan007.com/cn/CupMatch/75.html',
        Host: 'bf.titan007.com',
      },
    },
  },
};

module.exports = targets;
