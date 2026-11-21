const path = require('path');
const { spawn } = require('child_process');
const { targets } = require('./batchSquadFinalUpdater');

/** 运行：在 crawler-server 下执行 node config/batchTeamProfileUpdater.js。 */
async function updateBatch(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('请配置非空的球队配置数组');
  }
  for (const { leagueSlug, teamSerial } of items) {
    // 配置会进入 shell 命令，只允许赛事标识符和数字球队序号。
    if (typeof leagueSlug !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(leagueSlug) ||
        typeof teamSerial !== 'string' || !/^[1-9]\d*$/.test(teamSerial)) {
      throw new Error('leagueSlug 必须为字母开头的字母数字标识符，teamSerial 必须为正整数字符串');
    }
  }

  const results = [];
  for (const [index, { leagueSlug, teamSerial }] of items.entries()) {
    const command = `npx cross-env CUP_ANALYZER_CUP=${leagueSlug} node processors/teamProfileGenerator.js --team ${teamSerial}`;
    console.log(`\n[${index + 1}/${items.length}] 更新 ${leagueSlug} 球队 ${teamSerial} 画像`);
    console.log(`[执行] ${command}`);
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(command, {
          cwd: path.resolve(__dirname, '..'),
          shell: true,
          stdio: 'inherit',
          windowsHide: true,
          env: { ...process.env, CUP_ANALYZER_CUP: leagueSlug },
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
      results.push({ leagueSlug, teamSerial, success: true });
    } catch (error) {
      console.error(`[批量更新画像] 球队 ${teamSerial} 失败：${error.message}`);
      results.push({ leagueSlug, teamSerial, success: false, command, error: error.message });
    }
  }

  console.log('\n批量更新画像结果：');
  console.table(results);
  return results;
}

if (require.main === module) {
  updateBatch(targets).then((results) => {
    if (results.some((result) => !result.success)) {
      process.exitCode = 1;
    }
  }).catch((error) => {
    console.error('[批量更新画像]', error.message);
    process.exitCode = 1;
  });
}

module.exports = { updateBatch };
