const squadTarget = require('./squadTarget');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 在这里配置需要抓取的球探球队序号，按数组顺序串行执行。
const teamSerials = [
  '736', // 芬兰。
  '747', // 捷克。
];

/**
 * 运行：node config/batchPlayerListCrawler.js
 * 赛事信息使用 squadTarget.js；输出 output/player_center/{球队序号}.json。
 * 每队执行 npm run crawl:player-list:club -- -w qiutan。
 */
async function crawlBatch(serials) {
  if (!Array.isArray(serials) || serials.length === 0) {
    throw new Error('请配置非空的球队序号数组');
  }
  if (serials.some((serial) => !/^[1-9]\d*$/.test(String(serial)))) {
    throw new Error('球探球队序号必须为正整数');
  }

  const configPath = path.join(__dirname, 'squadTarget.js');
  const originalConfig = fs.readFileSync(configPath, 'utf8');
  if (!/teamSerial: '[^']*'/.test(originalConfig)) {
    throw new Error('squadTarget.js 中未找到 teamSerial 配置');
  }
  let currentConfig = originalConfig;
  const results = [];
  try {
    for (const [index, value] of serials.entries()) {
      const serial = String(value);
      if (fs.readFileSync(configPath, 'utf8') !== currentConfig) {
        throw new Error('squadTarget.js 已被外部修改，停止批量抓取');
      }
      // npm 子进程会重新读取配置文件，必须写入本队序号后再启动命令。
      currentConfig = originalConfig.replace(/teamSerial: '[^']*'/, `teamSerial: '${serial}'`);
      fs.writeFileSync(configPath, currentConfig);
      console.log(`\n[${index + 1}/${serials.length}] 开始抓取球队 ${serial}`);
      try {
        await new Promise((resolve, reject) => {
          const child = spawn('npm run crawl:player-list:club -- -w qiutan', {
            cwd: path.resolve(__dirname, '..'),
            shell: true,
            stdio: 'inherit',
            windowsHide: true,
            env: { ...process.env, CUP_ANALYZER_CUP: squadTarget.leagueSlug },
          });
          child.on('error', reject);
          child.on('close', (code, signal) => {
            if (code === 0) resolve();
            else reject(new Error(`命令执行失败，退出码：${code}，信号：${signal}`));
          });
        });
        results.push({ serial, success: true });
      } catch (error) {
        console.error(`[批量抓取] 球队 ${serial} 失败：${error.message}`);
        results.push({ serial, success: false, error: error.message });
      }
    }
  } finally {
    // 正常结束或执行异常时恢复原配置，保留运行期间用户主动做的修改。
    if (fs.readFileSync(configPath, 'utf8') === currentConfig) {
      fs.writeFileSync(configPath, originalConfig);
    }
  }

  console.log('\n批量抓取结果：');
  console.table(results);
  return results;
}

if (require.main === module) {
  crawlBatch(teamSerials).then((results) => {
    if (results.some((result) => !result.success)) process.exitCode = 1;
  }).catch((error) => {
    console.error('[批量抓取]', error.message);
    process.exitCode = 1;
  });
}

module.exports = { crawlBatch };
