const squadTarget = require('./squadTarget');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 相邻脚本之间的缓冲时间（毫秒），跨球队执行时同样生效。
const commandDelayMs = 500;

// 按数组顺序逐队更新，未填写的其他属性沿用 squadTarget.js。
const targets = [
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '250', // 特温特
  //   matchTime: '2026-11-22 19:15:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '225', // 威廉二世
  //   matchTime: '2026-11-22 19:15:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '166', // 尤文图斯
  //   matchTime: '2026-11-22 19:30:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '557', // 威尼斯
  //   matchTime: '2026-11-22 19:30:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '37',
  //   leagueSlug: 'eflChampionship',
  //   season: '2026-2027',
  //   teamSerial: '46', // 伯恩利
  //   matchTime: '2026-11-22 20:00:00',
  //   roundSerial: '16',
  // },
  // {
  //   leagueSerial: '37',
  //   leagueSlug: 'eflChampionship',
  //   season: '2026-2027',
  //   teamSerial: '21', // 布莱克本
  //   matchTime: '2026-11-22 20:00:00',
  //   roundSerial: '16',
  // },
  // {
  //   leagueSerial: '31',
  //   leagueSlug: 'laLiga',
  //   season: '2026-2027',
  //   teamSerial: '84', // 巴塞罗那
  //   matchTime: '2026-11-22 21:00:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '31',
  //   leagueSlug: 'laLiga',
  //   season: '2026-2027',
  //   teamSerial: '107', // 比利亚雷亚尔
  //   matchTime: '2026-11-22 21:00:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '253', // 阿贾克斯
  //   matchTime: '2026-11-22 21:30:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '256', // 海牙
  //   matchTime: '2026-11-22 21:30:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '273', // 鹿特丹斯巴达
  //   matchTime: '2026-11-22 21:30:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '234', // 阿尔克马尔
  //   matchTime: '2026-11-22 21:30:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '185', // 博洛尼亚
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '187', // 乌迪内斯
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '2960', // 萨索洛
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '552', // 热那亚
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '11',
  //   leagueSlug: 'ligue1',
  //   season: '2026-2027',
  //   teamSerial: '1796', // 巴黎FC
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '11',
  // },
  // {
  //   leagueSerial: '11',
  //   leagueSlug: 'ligue1',
  //   season: '2026-2027',
  //   teamSerial: '304', // 昂热
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '11',
  // },
  // {
  //   leagueSerial: '8',
  //   leagueSlug: 'bundesliga',
  //   season: '2026-2027',
  //   teamSerial: '1135', // 奥格斯堡
  //   matchTime: '2026-11-22 22:30:00',
  //   roundSerial: '10',
  // },
  // {
  //   leagueSerial: '8',
  //   leagueSlug: 'bundesliga',
  //   season: '2026-2027',
  //   teamSerial: '162', // 美因茨
  //   matchTime: '2026-11-22 22:30:00',
  //   roundSerial: '10',
  // },
  // {
  //   leagueSerial: '31',
  //   leagueSlug: 'laLiga',
  //   season: '2026-2027',
  //   teamSerial: '104', // 桑坦德竞技
  //   matchTime: '2026-11-22 23:15:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '31',
  //   leagueSlug: 'laLiga',
  //   season: '2026-2027',
  //   teamSerial: '106', // 皇家社会
  //   matchTime: '2026-11-22 23:15:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '280', // 前进之鹰
  //   matchTime: '2026-11-22 23:45:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '16',
  //   leagueSlug: 'eredivisie',
  //   season: '2026-2027',
  //   teamSerial: '274', // 福图纳锡塔德
  //   matchTime: '2026-11-22 23:45:00',
  //   roundSerial: '13',
  // },
  // {
  //   leagueSerial: '11',
  //   leagueSlug: 'ligue1',
  //   season: '2026-2027',
  //   teamSerial: '333', // 洛里昂
  //   matchTime: '2026-11-23 00:15:00',
  //   roundSerial: '11',
  // },
  // {
  //   leagueSerial: '11',
  //   leagueSlug: 'ligue1',
  //   season: '2026-2027',
  //   teamSerial: '251', // 雷恩
  //   matchTime: '2026-11-23 00:15:00',
  //   roundSerial: '11',
  // },
  // {
  //   leagueSerial: '8',
  //   leagueSlug: 'bundesliga',
  //   season: '2026-2027',
  //   teamSerial: '132', // 云达不莱梅
  //   matchTime: '2026-11-23 00:30:00',
  //   roundSerial: '10',
  // },
  // {
  //   leagueSerial: '8',
  //   leagueSlug: 'bundesliga',
  //   season: '2026-2027',
  //   teamSerial: '160', // 汉堡
  //   matchTime: '2026-11-23 00:30:00',
  //   roundSerial: '10',
  // },
  {
    leagueSerial: '34',
    leagueSlug: 'serieA',
    season: '2026-2027',
    teamSerial: '150', // AC米兰
    matchTime: '2026-11-23 01:00:00',
    roundSerial: '12',
  },
  // {
  //   leagueSerial: '34',
  //   leagueSlug: 'serieA',
  //   season: '2026-2027',
  //   teamSerial: '1359', // 弗洛西诺尼
  //   matchTime: '2026-11-23 01:00:00',
  //   roundSerial: '12',
  // },
  // {
  //   leagueSerial: '36',
  //   leagueSlug: 'epl',
  //   season: '2026-2027',
  //   teamSerial: '384', // 赫尔城
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '11',
  // },
  // {
  //   leagueSerial: '36',
  //   leagueSlug: 'epl',
  //   season: '2026-2027',
  //   teamSerial: '60', // 布莱顿
  //   matchTime: '2026-11-22 22:00:00',
  //   roundSerial: '11',
  // },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '25', // 利物浦
    matchTime: '2026-11-23 00:30:00',
    roundSerial: '11',
  },
  {
    leagueSerial: '36',
    leagueSlug: 'epl',
    season: '2026-2027',
    teamSerial: '27', // 曼彻斯特联
    matchTime: '2026-11-23 00:30:00',
    roundSerial: '11',
  },
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
