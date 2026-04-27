/**
 * titan007 请求参数 version：YYYYMMDDHH（与站点示例一致，如 2026041011）
 */
function versionTag() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}`;
}

/**
 * @param {string} cupSerial 如 '75' | '103'
 */
function cupMatchReferer(cupSerial) {
  return `http://zq.titan007.com/cn/CupMatch/${cupSerial}.html`;
}

/**
 * 联赛赛程页 Referer（赛季目录 + 联赛序号）
 * @param {string} leagueSerial 如 '36' | '15'
 * @param {string} season 球探路径赛季段：欧冠等常为 '25-26'；亚冠联2 / 部分联赛为全写 '2025-2026'；单年如 '2026'
 */
function leagueMatchReferer(leagueSerial, season) {
  return `http://zq.titan007.com/cn/League/${season}/${leagueSerial}.html`;
}

/**
 * 子联赛资料页 Referer（赛季目录 + 联赛序号），如墨西联
 * @param {string} leagueSerial 如 '140'
 * @param {string} season 如 '2025-2026'
 */
function subLeagueMatchReferer(leagueSerial, season) {
  return `http://zq.titan007.com/cn/SubLeague/${season}/${leagueSerial}.html`;
}

const targets = {
  titan007: {
    baseUrl: 'http://zq.titan007.com',
    mobileUrl: 'https://m.titan007.com',
    detailUrl: 'http://bf.titan007.com',

    /** 与球探站点一致的 version 串 */
    versionTag,

    teamDetailUrl: (serial) =>
      `http://zq.titan007.com/jsData/teamInfo/teamDetail/tdl${serial}.js?version=${versionTag()}`,

    /** 球队阵容页 HTML，用于解析球员详情链接 playerSerial */
    teamLineupUrl: (teamSerial) =>
      `http://zq.titan007.com/cn/team/lineup/${teamSerial}.html`,

    /** 球员资料 JS：sandbox 含 nowTeamInfo、transferInfo 等 */
    playerDataUrl: (playerSerial) =>
      `http://zq.titan007.com/jsData/playerInfo/player${playerSerial}.js?version=${versionTag()}`,

    matchAnalysisUrl: (matchSerial) =>
      `https://m.titan007.com/Analy/ShiJian/${matchSerial}.htm`,

    matchStatisticsUrl: (matchSerial) =>
      `https://zq.titan007.com/analysis/${matchSerial}cn.htm`,

    postMatchSummaryApi: (matchSerial) =>
      `https://m.titan007.com/Common/CommonInterface.ashx?type=18&scheid=${matchSerial}&lang=`,

    /**
     * 杯赛赛程 JS：c{serial}.js
     * @deprecated 新逻辑请用 scheduleUrl(fileId, season)
     */
    cupScheduleUrl: (cupSerial, season) =>
      `http://zq.titan007.com/jsData/matchResult/${season}/c${cupSerial}.js?version=${versionTag()}`,

    /**
     * 通用赛程 JS URL：fileId 含 c 杯赛 或 s 联赛（如 c103、s36、s15_313）
     */
    scheduleUrl: (fileId, season) =>
      `http://zq.titan007.com/jsData/matchResult/${season}/${fileId}.js?version=${versionTag()}`,

    /**
     * 与赛程同赛季目录下的盘路 / 大小球 / 入球时间 JS（不含 .js 后缀的 basename）
     * 如 l36、bs36、td36、l103、bs103；杯赛一般无 td，由调用方决定是否请求。
     */
    matchResultDataUrl: (basename, season) =>
      `http://zq.titan007.com/jsData/matchResult/${season}/${basename}.js?version=${versionTag()}`,

    /**
     * 亚盘盘路 JS（球探实际路径为 jsData/letGoal，非 matchResult 下的 l{n}）
     * 例（亚冠联2 须全写）：https://zq.titan007.com/jsData/letGoal/2025-2026/l350.js
     */
    letGoalLineUrl: (serial, season) =>
      `http://zq.titan007.com/jsData/letGoal/${season}/l${serial}.js?version=${versionTag()}`,

    /**
     * 大小球盘路 JS（球探实际路径为 jsData/bigSmall，非 matchResult 下的 bs{n}）
     * 例（亚冠联2 须全写）：https://zq.titan007.com/jsData/bigSmall/2025-2026/bs350.js
     */
    bigSmallLineUrl: (serial, season) =>
      `http://zq.titan007.com/jsData/bigSmall/${season}/bs${serial}.js?version=${versionTag()}`,

    cupMatchReferer,
    leagueMatchReferer,
    subLeagueMatchReferer,

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
