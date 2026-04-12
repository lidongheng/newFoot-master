/**
 * 俱乐部球探大名单抓取（原 backend-server/crawlerPlayer.js）
 * 输出：config.paths.player_center/{teamSerial}.json
 *
 * 使用前编辑 config/squadTarget.js（teamSerial、leagueSerial 等）
 */
const path = require('path');
const fs = require('fs');

const { fetchZqBuffer } = require('../utils/http');
const { dateFormat } = require('../utils/dateFormat');
const { ensureDir } = require('../utils/fileWriter');
const config = require('../config');
const squadTarget = require('../config/squadTarget');
const { enrichPlayers } = require('../utils/playerDetailEnricher');

function parsePlayer(rearguard, vanguard, goalkeeper, midfielder, lineupDetail) {
  const players = [];
  const mapObj = {};
  goalkeeper.forEach((item) => {
    const obj = {};
    obj.number = Number(item[1]);
    obj.name = item[2];
    obj.attrDes = 'GK';
    players.push(obj);
  });
  rearguard.forEach((item) => {
    const obj = {};
    obj.number = Number(item[1]);
    obj.name = item[2];
    obj.attrDes = 'DF';
    players.push(obj);
  });
  midfielder.forEach((item) => {
    const obj = {};
    obj.number = Number(item[1]);
    obj.name = item[2];
    obj.attrDes = 'MF';
    players.push(obj);
  });
  vanguard.forEach((item) => {
    const obj = {};
    obj.number = Number(item[1]);
    obj.name = item[2];
    obj.attrDes = 'FW';
    players.push(obj);
  });
  players.forEach((item, index) => {
    mapObj[item.name] = index;
  });
  for (let i = 0; i < lineupDetail.length; i++) {
    if (lineupDetail[i][8] === '主教练') continue;
    const number = Number(lineupDetail[i][1].trim());
    const name = lineupDetail[i][2].trim();
    const age = new Date().getFullYear() - lineupDetail[i][5].trim().split('-')[0];
    const height = Number(lineupDetail[i][6].trim());
    const nation = lineupDetail[i][9].trim();
    const position = lineupDetail[i][8].trim();
    const socialStatus = lineupDetail[i][11].trim();
    if (Object.prototype.hasOwnProperty.call(mapObj, name)) {
      const idx = mapObj[name];
      if (players[idx].number === number) {
        players[idx].age = age;
        players[idx].height = height;
        players[idx].nation = nation;
        players[idx].position = position;
        players[idx].socialStatus = socialStatus;
      }
    }
  }
  const standardPlayers = [];
  players.forEach((item) => {
    const obj = {};
    obj.name = item.name;
    obj.nation = item.nation;
    obj.stats = 0;
    obj.position = [''];
    obj.staff = item.attrDes;
    obj.attr = item.attrDes;
    obj.attrDes = item.attrDes;
    obj.caps = 0;
    obj.lineups = 0;
    obj.age = item.age;
    obj.number = item.number;
    obj.height = item.height;
    obj.qiutanPosition = item.position;
    obj.socialStatus = item.socialStatus;
    standardPlayers.push(obj);
  });
  return standardPlayers;
}

async function fetchPlayerList() {
  const serial = squadTarget.teamSerial;
  const leagueSerial = squadTarget.leagueSerial || '36';
  const version = dateFormat(new Date().getTime(), 'YYYYMMDDHH');
  const url = `http://zq.titan007.com/jsData/teamInfo/teamDetail/tdl${serial}.js?version=${version}`;
  const headers = {
    Referer: `https://zq.titan007.com/cn/League/${leagueSerial}.html`,
    Host: 'zq.titan007.com',
  };

  const res = await fetchZqBuffer(url, {
    headers,
    responseType: 'arraybuffer',
  });
  const iconv = require('iconv-lite');
  const text = iconv.decode(res.data, 'utf-8');
  eval(text);

  const players = parsePlayer(rearguard, vanguard, goalkeeper, midfielder, lineupDetail);

  const argv = process.argv.slice(2);
  const withClub = argv.includes('--with-club');
  const forceClubFetch = argv.includes('--force-club-fetch');
  if (withClub) {
    console.log(
      forceClubFetch
        ? '[playerListCrawler] 补充俱乐部与转会信息（--force-club-fetch，忽略本地缓存）…'
        : '[playerListCrawler] 补充俱乐部与转会信息（本地优先，缺省再抓网）…'
    );
    await enrichPlayers(String(serial), players, {
      nameKey: 'name',
      delayMs: config.crawlDelayMs,
      logger: (msg) => console.log(msg),
      lineupDetail,
      forceClubFetch,
    });
  }

  const outDir = config.paths.playerCenter;
  ensureDir(outDir);
  const outPath = path.join(outDir, `${serial}.json`);
  fs.writeFileSync(outPath, JSON.stringify(players, null, 2), 'utf8');
  console.log(`[playerListCrawler] 已写入 ${outPath}（共 ${players.length} 人）`);
  return { outPath, count: players.length };
}

if (require.main === module) {
  fetchPlayerList().catch((err) => {
    console.error('[playerListCrawler]', err.message);
    process.exit(1);
  });
}

module.exports = { fetchPlayerList, parsePlayer };
