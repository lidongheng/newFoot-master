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
  leagueSerial: '15',
  leagueSlug: 'koreanKLeague',
  season: '2026',
  teamSerial: '21249',
  roundSerial: '7',
  isNation: false,
  teamChineseName: 'FC安养',
  /** 单场分析 / 周期报告等场景可选 */
  matchSerial: '2929596',
  /**
   * 周期报告「同赛事」筛选：与球探战绩表「联赛」列文案一致（如 英超、欧冠杯）。
   * 不填则回退为当前 CUP_ANALYZER_CUP 对应 chineseName。
   */
  matchLeagueName: '韩K联',
};

module.exports = squadTarget;
