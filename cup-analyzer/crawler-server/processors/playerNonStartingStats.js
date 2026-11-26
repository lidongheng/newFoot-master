/**
 * 统计有首发记录的球员未首发时，球队的胜、平、负场数及输盘率；结果输出到终端。
 *
 * config/squadTarget.js 必填字段：
 * - teamSerial：球探球队序号，读取 output/player_center/{teamSerial}-new.json。
 * - leagueSerial：生成该 JSON 时使用的赛事序号，用于读取赛程、确认比赛主客场。
 * - isNation：生成该 JSON 时使用的赛程格式，false 为联赛，true 为杯赛。
 * 前置：先运行 playerListCrawler、clubMatchAnalyzer，确保 JSON 与本地赛程属于同一赛事、赛季。
 * 本脚本不重新按轮次筛选，统计范围沿用 JSON 中已有出场记录的比赛。
 * 工作目录：cup-analyzer/crawler-server。
 * 命令：node processors/playerNonStartingStats.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('../config');
const squadTarget = require('../config/squadTarget');

function analyzePlayerNonStartingStats() {
  const { teamSerial, leagueSerial, isNation } = squadTarget;
  if (teamSerial == null || leagueSerial == null || typeof isNation !== 'boolean') {
    throw new Error('请在 squadTarget.js 中设置 teamSerial、leagueSerial 和 isNation。');
  }
  const filePath = path.join(config.paths.playerCenter, `${teamSerial}-new.json`);
  const teamData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (String(teamData.teamId) !== String(teamSerial)) {
    throw new Error('球员统计文件的 teamId 与 squadTarget.teamSerial 不一致。');
  }
  const schedulePath = config.resolveScheduleData(String(leagueSerial).replace(/^[sc]/, ''), isNation);
  // 球探赛程直接向 jh / arrTeam 写入数据，执行前需初始化这两个容器。
  const context = vm.createContext({ jh: {}, arrTeam: [] });
  vm.runInContext(fs.readFileSync(schedulePath, 'utf8'), context, { timeout: 5000 });
  const scheduleMatches = new Map();
  for (const matches of Object.values(context.jh)) {
    for (const match of matches) {
      scheduleMatches.set(String(match[0]), match);
    }
  }

  // 同一轮可能包含多场比赛，按比赛 ID 去重，避免杯赛或补赛互相覆盖。
  const allMatches = new Map();
  for (const player of teamData.recommendedLineup) {
    for (const match of player.matches) {
      allMatches.set(String(match.id), match);
    }
  }
  const players = teamData.recommendedLineup.filter((player) => player.lineups > 0);
  players.sort((a, b) => b.lineups - a.lineups || b.caps - a.caps);
  console.log(`\n===== ${teamData.teamChineseName} (ID: ${teamData.teamId}) =====`);
  console.log(`找到 ${allMatches.size} 场比赛记录，${players.length} 名有首发记录的球员`);

  for (const player of players) {
    const startingMatches = new Set(player.matches.filter((match) => match.lineups === 1).map((match) => String(match.id)));
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let validHandicapMatches = 0;
    let handicapLosses = 0;
    for (const [id, match] of allMatches) {
      if (startingMatches.has(id)) {
        continue;
      }
      const scheduleMatch = scheduleMatches.get(id);
      if (!scheduleMatch || (String(scheduleMatch[4]) !== String(teamSerial) && String(scheduleMatch[5]) !== String(teamSerial))) {
        throw new Error(`赛程中缺少球队 ${teamSerial} 的比赛 ${id}，请检查赛事配置和赛程。`);
      }
      // 比分是主队在前；客场必须反转净胜球，才能得到当前球队的胜平负。
      if (typeof match.score === 'string' && /^\d+-\d+$/.test(match.score)) {
        const [homeGoals, awayGoals] = match.score.split('-').map(Number);
        let goalDifference = homeGoals - awayGoals;
        if (String(scheduleMatch[5]) === String(teamSerial)) {
          goalDifference = -goalDifference;
        }
        if (goalDifference > 0) {
          wins++;
        } else if (goalDifference === 0) {
          draws++;
        } else {
          losses++;
        }
      }
      // 输盘率仅以有明确赢、走、输盘结果的比赛为分母。
      if (['win', 'draw', 'lose'].includes(match.handicapResult)) {
        validHandicapMatches++;
        if (match.handicapResult === 'lose') {
          handicapLosses++;
        }
      }
    }
    let handicapRateText = '无有效盘口';
    if (validHandicapMatches > 0) {
      handicapRateText = `${Math.round(handicapLosses / validHandicapMatches * 100)}%`;
    }
    console.log(`${player.number}-${player.name}，${player.caps}场${player.lineups}首发，没有首发时球队${wins}胜${draws}平${losses}负，输盘率${handicapRateText}`);
  }
}

if (require.main === module) {
  try {
    analyzePlayerNonStartingStats();
  } catch (error) {
    console.error(`球员未首发统计失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { analyzePlayerNonStartingStats };
