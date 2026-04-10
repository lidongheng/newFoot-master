/**
 * 俱乐部大名单 / 国内联赛出场分析目标（原 backend-server/config/wudaconfig.js）
 *
 * 用法：
 *   node crawlers/playerListCrawler.js
 *   node analyzers/clubMatchAnalyzer.js
 *
 * - leagueSerial：球探「联赛」序号（如英超 36）→ 对应 match_center/s36.js
 * - teamSerial：球探「俱乐部」序号 → 输出 player_center/{teamSerial}.json
 * - roundSerial：当前国内联赛轮次（仅分析该轮之前已完赛场次）
 */
const squadTarget = {
  leagueSerial: '273',
  leagueSlug: 'aLeague',
  season: '25-26',
  teamSerial: '2910',
  roundSerial: '24',
  isNation: false,
  teamChineseName: '中央海岸水手',
  /** 单场分析等场景可选 */
  matchSerial: '2789417',
};

module.exports = squadTarget;
