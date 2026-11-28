const squadTarget = require('./squadTarget');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 相邻脚本之间的缓冲时间（毫秒），跨球队执行时同样生效。
const commandDelayMs = 500;

// 按数组顺序逐队更新，未填写的其他属性沿用 squadTarget.js。
// 中国时区 2026-11-28 至 2026-11-29 日职联第17轮比赛球队。
const targets = [
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
