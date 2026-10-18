/**
 * 懂球帝俱乐部大名单抓取。
 * 输出：config.paths.playerCenter/{teamSerial}.json
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ensureDir = require('../utils/fileWriter').ensureDir;
const config = require('../config');
const squadTarget = require('../config/squadTarget');

const DQD_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; 2509FPN0BC Build/UQ1A.240205.08311809; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.119 Mobile Safari/537.36 Package/com.dongqiudi.news News/444 Android/14 NewsApp/444 SDK/34 VERSION/8.7.4 dongqiudiClientApp HM/false privacy/64';
const DQD_SPORT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': DQD_USER_AGENT,
};
const DQD_APP_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': DQD_USER_AGENT,
  'sec-ch-ua-platform': '"Android"',
  'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
  Origin: 'https://topic.dongqiudi.com',
  'X-Requested-With': 'com.dongqiudi.news',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
};

function loadEplConfig() {
  const configPath = path.resolve(__dirname, '../../epl/data/config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function requireValue(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`懂球帝响应缺少${label}`);
  }
  return value;
}

function parseNumericValue(value, label) {
  requireValue(value, label);
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`懂球帝${label}不是有效数字: ${value}`);
  }
  return parsed;
}

function parseSeason(season) {
  const match = String(season).match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    throw new Error(`当前赛季格式无效: ${season}`);
  }
  return {
    dqdName: `${match[1]}/${match[2]}`,
    startDate: `${match[1]}-07-01`,
    endDate: `${match[2]}-06-30`,
  };
}

function getTeamMapping(eplConfig) {
  const match = Object.entries(eplConfig.team).find(([, team]) => {
    return String(team.qiutanSerial) === String(squadTarget.teamSerial);
  });
  if (!match) {
    throw new Error(`epl/data/config.json 未找到球探球队序号 ${squadTarget.teamSerial} 的懂球帝映射`);
  }
  return { dqdTeamId: match[0], mapping: match[1] };
}

function getSeasonLeagueStats(response, seasonName, personName) {
  if (!Array.isArray(response.league)) {
    throw new Error(`${personName}的懂球帝联赛统计结构无效`);
  }
  const rows = response.league.filter((row) => {
    return row.season.name === seasonName && String(row.competition.id) === '4';
  });
  if (rows.length === 0) {
    return null;
  }

  const stats = {
    appearances: 0,
    starts: 0,
    goals: 0,
    assists: 0,
  };
  const fields = Object.keys(stats);
  rows.forEach((row) => {
    fields.forEach((field) => {
      stats[field] += parseNumericValue(row.base_info[field], `${personName}本赛季英超${field}`);
    });
  });
  return stats;
}

function getAbilityPosition(abilityResponse, eplConfig, personName) {
  const fields = abilityResponse.data.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error(`${personName}的懂球帝能力值列表为空`);
  }
  const maxField = fields.reduce((current, field) => {
    const currentValue = parseNumericValue(current.val, `${personName}能力值`);
    const fieldValue = parseNumericValue(field.val, `${personName}能力值`);
    return fieldValue > currentValue ? field : current;
  });
  const positionCode = eplConfig.positionMap[maxField.name];
  if (!positionCode) {
    throw new Error(`epl/data/config.json 未配置懂球帝位置「${maxField.name}」`);
  }
  return {
    value: parseNumericValue(maxField.val, `${personName}能力值`),
    name: maxField.name,
    code: positionCode,
  };
}

function mapCurrentClub(teamInfo, eplConfig) {
  if (!teamInfo) {
    return undefined;
  }
  const teamId = String(teamInfo.team_id);
  const mapping = eplConfig.team[teamId];
  if (mapping) {
    return mapping.qiutanName;
  }
  return teamInfo.team_name;
}

function mapTransfers(profile, season, seasonRange) {
  if (!Array.isArray(profile.transfer_info)) {
    return undefined;
  }
  // 懂球帝转会记录没有赛季字段，按英超赛季的 7 月至次年 6 月日期范围筛选。
  return profile.transfer_info
    .filter((transfer) => {
      return transfer.announced_date >= seasonRange.startDate && transfer.announced_date <= seasonRange.endDate;
    })
    .map((transfer) => ({
      season,
      date: transfer.announced_date,
      from: transfer.from_club_name,
      to: transfer.to_club_name,
      fee: transfer.money,
      type: transfer.type,
    }));
}

function setNumberIfPresent(target, key, value, label) {
  if (value === undefined || value === null || value === '') {
    return;
  }
  target[key] = parseNumericValue(value, label);
}

function logCrawledPlayers(players) {
  const headCoach = players.find((player) => player.staff === '主教练');
  if (headCoach) {
    console.log(`主教练: ${headCoach.name}`);
  }

  console.log('\n所有上场球员信息:');
  const appearedPlayers = players
    .filter((player) => player.caps > 0)
    .sort((a, b) => {
      if (b.lineups !== a.lineups) {
        return b.lineups - a.lineups;
      }
      return b.caps - a.caps;
    });

  appearedPlayers.forEach((player) => {
    const positions = player.position.join(',');
    const nationInfo = player.nation || '--';
    const ageInfo = player.age ? `${player.age}` : '--';
    const heightInfo = player.height ? `${player.height}cm` : '--';
    const valueInfo = player.socialStatus ? `${player.socialStatus}万欧元` : '--';

    console.log(`${player.number}-${player.name} ${player.caps}场${player.lineups}首发 ${player.goals}球${player.assists}助 ${positions} ${nationInfo} ${ageInfo} ${heightInfo} ${valueInfo}`);
  });
  console.log('');
}

function buildPlayerRecord(entry, groupType, profile, eplConfig, season, seasonRange, stats, ability) {
  const baseInfo = profile.base_info;
  const isCoach = groupType === 'coach';
  const staff = isCoach ? '主教练' : ({
    goalkeeper: 'GK',
    defender: 'DF',
    midfielder: 'MF',
    attacker: 'FW',
  })[groupType];
  const record = {
    name: entry.person_name,
    nation: baseInfo.nationality,
    staff,
    attr: staff,
    attrDes: staff,
    qiutanPosition: isCoach ? entry.type : ability.name,
    position: isCoach ? [entry.type] : [ability.code],
  };

  if (!isCoach) {
    record.stats = ability.value;
    record.ability = ability.value;
    if (stats !== null) {
      setNumberIfPresent(record, 'caps', stats.appearances, `${entry.person_name}本赛季英超出场`);
      setNumberIfPresent(record, 'lineups', stats.starts, `${entry.person_name}本赛季英超首发`);
      setNumberIfPresent(record, 'goals', stats.goals, `${entry.person_name}本赛季英超进球`);
      setNumberIfPresent(record, 'assists', stats.assists, `${entry.person_name}本赛季英超助攻`);
    }
  }

  if (baseInfo.age !== undefined && baseInfo.age !== null && baseInfo.age !== '') {
    const age = Number.parseInt(baseInfo.age, 10);
    if (Number.isNaN(age)) {
      throw new Error(`${entry.person_name}的年龄不是有效数字: ${baseInfo.age}`);
    }
    record.age = age;
  }
  setNumberIfPresent(record, 'number', entry.shirtnumber, `${entry.person_name}球衣号码`);
  setNumberIfPresent(record, 'height', baseInfo.height, `${entry.person_name}身高`);
  setNumberIfPresent(record, 'weight', baseInfo.weight, `${entry.person_name}体重`);
  if (baseInfo.market_value !== undefined && baseInfo.market_value !== null && baseInfo.market_value !== '') {
    record.socialStatus = baseInfo.market_value;
  }

  const currentClub = mapCurrentClub(baseInfo.team_info, eplConfig);
  if (currentClub !== undefined) {
    record.currentClub = currentClub;
  }
  const recentTransfers = mapTransfers(profile, season, seasonRange);
  if (recentTransfers !== undefined) {
    record.recentTransfers = recentTransfers;
  }
  return record;
}

async function requestJson(url, headers) {
  const response = await axios.get(url, { headers, timeout: 15000 });
  return response.data;
}

async function fetchPlayerData(entry, groupType, eplConfig, seasonRange, season) {
  const personId = requireValue(entry.person_id, `${entry.person_name}的person_id`);
  const profileUrl = `https://api.dongqiudi.com/data/v1/detail/person/${personId}?app=dqd&lang=zh-cn`;
  const profile = await requestJson(profileUrl, {
    ...DQD_APP_HEADERS,
    Referer: 'https://topic.dongqiudi.com/',
  });
  requireValue(profile.base_info, `${entry.person_name}的个人资料`);

  let stats = null;
  let ability = null;
  if (groupType !== 'coach') {
    const abilityUrl = new URL(requireValue(profile.base_info.ability_url, `${entry.person_name}的ability_url`));
    const abilityId = requireValue(abilityUrl.searchParams.get('id'), `${entry.person_name}的能力值ID`);
    const statsUrl = `https://sport-data.dongqiudi.com/soccer/biz/dqd/person/statistic_new/${personId}?lang=zh-cn`;
    const abilityRequestUrl = `https://sport-data.dongqiudi.com/soccer/data/sofifa/v1/player_ability/${abilityId}?player_type=`;
    const [statsResponse, abilityResponse] = await Promise.all([
      requestJson(statsUrl, {
        ...DQD_SPORT_HEADERS,
        Referer: `https://topic.dongqiudi.com/webapp/career-stats/career-stats.html?id=${personId}`,
      }),
      requestJson(abilityRequestUrl, {
        ...DQD_SPORT_HEADERS,
        Referer: abilityUrl.toString(),
      }),
    ]);
    stats = getSeasonLeagueStats(statsResponse, seasonRange.dqdName, entry.person_name);
    if (stats === null) {
      console.log(`[playerListCrawler] ${entry.person_name}没有${seasonRange.dqdName}英超统计记录，保留统计字段为空`);
    }
    ability = getAbilityPosition(abilityResponse, eplConfig, entry.person_name);
  }

  return buildPlayerRecord(entry, groupType, profile, eplConfig, season, seasonRange, stats, ability);
}

async function fetchPlayerList() {
  const eplConfig = loadEplConfig();
  const { dqdTeamId } = getTeamMapping(eplConfig);
  const seasonRange = parseSeason(squadTarget.season);
  const rosterUrl = `https://sport-data.dongqiudi.com/soccer/biz/dqd/v1/team/member_v2/${dqdTeamId}?app=dqd`;
  const rosterResponse = await requestJson(rosterUrl, {
    ...DQD_SPORT_HEADERS,
    Referer: `https://topic.dongqiudi.com/webapp/team_player/team_player.html?id=${dqdTeamId}&from=wxmp`,
  });
  if (rosterResponse.code !== 0 || !Array.isArray(rosterResponse.data.list)) {
    throw new Error(`懂球帝球队名单响应无效: ${rosterResponse.message}`);
  }
  const currentSeason = rosterResponse.seasons.find((season) => season.current === true);
  if (!currentSeason || currentSeason.name !== seasonRange.dqdName) {
    throw new Error(`懂球帝当前球队名单赛季与配置不匹配: ${currentSeason && currentSeason.name}`);
  }

  const groups = [
    ['coach', '主教练'],
    ['goalkeeper', '门将'],
    ['defender', '后卫'],
    ['midfielder', '中场'],
    ['attacker', '前锋'],
  ];
  const entries = [];
  groups.forEach(([type]) => {
    const group = rosterResponse.data.list.find((item) => item.type === type);
    if (!group) {
      throw new Error(`懂球帝当前名单缺少${type}分组`);
    }
    if (type === 'coach') {
      const headCoach = group.data.find((item) => item.type === '主教练');
      if (!headCoach) {
        throw new Error('懂球帝当前名单没有主教练');
      }
      entries.push({ entry: headCoach, type });
      return;
    }
    group.data.forEach((entry) => entries.push({ entry, type }));
  });

  const players = [];
  for (let index = 0; index < entries.length; index += 1) {
    const { entry, type } = entries[index];
    console.log(`[playerListCrawler] 懂球帝 ${index + 1}/${entries.length}: ${entry.person_name}`);
    players.push(await fetchPlayerData(entry, type, eplConfig, seasonRange, squadTarget.season));
  }

  const outDir = config.paths.playerCenter;
  ensureDir(outDir);
  const outPath = path.join(outDir, `${squadTarget.teamSerial}.json`);
  fs.writeFileSync(outPath, JSON.stringify(players, null, 2), 'utf8');
  logCrawledPlayers(players);
  console.log(`[playerListCrawler] 已写入 ${outPath}（共 ${players.length} 人）`);
  return { outPath, count: players.length };
}

function getCrawlerSource(argv) {
  const sourceFlagIndex = argv.indexOf('-w');
  if (sourceFlagIndex === -1) {
    return 'dqd';
  }
  if (argv.lastIndexOf('-w') !== sourceFlagIndex) {
    throw new Error('数据源参数只能指定一次');
  }

  const source = argv[sourceFlagIndex + 1];
  if (source !== 'qiutan' && source !== 'dqd') {
    throw new Error('请使用 -w qiutan 或 -w dqd 指定数据源');
  }
  return source;
}

if (require.main === module) {
  try {
    const source = getCrawlerSource(process.argv.slice(2));
    let fetchPlayerListFromSource = fetchPlayerList;
    if (source === 'qiutan') {
      console.log('[playerListCrawler] 数据源: 球探');
      fetchPlayerListFromSource = require('./playerListCrawlerQiutan').fetchPlayerList;
    } else {
      console.log('[playerListCrawler] 数据源: 懂球帝');
    }
    fetchPlayerListFromSource().catch((err) => {
      console.error('[playerListCrawler]', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('[playerListCrawler]', err.message);
    process.exit(1);
  }
}

module.exports = { fetchPlayerList };
