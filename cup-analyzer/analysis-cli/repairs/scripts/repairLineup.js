const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isDeepStrictEqual } = require('node:util');
const { loadContext, hash } = require('../../src/sources');

const FIELDS = new Set(['homeFormation', 'guestFormation', 'homeStarting', 'guestStarting', 'homeSubs', 'guestSubs']);
const PERSON_FIELDS = new Set(['id', 'number', 'name', 'captainType', 'injuryReason']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function knownPlayers(directory, season) {
  const root = path.join(directory, 'basicData', season);
  const players = [];
  if (!fs.existsSync(root)) return players;
  const teamId = require(path.join(directory, 'config.js')).teamSerial;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name, 'playerStats.json');
    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const side of ['home', 'away']) {
      if (String(data[side]?.teamId) !== teamId || !Array.isArray(data[side].players)) continue;
      players.push(...data[side].players);
    }
  }
  return players;
}

function resolvePeople(people, known, decisions) {
  if (!Array.isArray(people)) throw new Error('名单必须是数组。');
  return people.map((person) => {
    if (!person || typeof person.name !== 'string' || !person.name.trim() || Object.keys(person).some((key) => !PERSON_FIELDS.has(key))) throw new Error('名单需提供姓名，且只能使用 id、number、name、captainType、injuryReason 字段。');
    if (person.id !== undefined && (!Number.isInteger(person.id) || person.id <= 0)) throw new Error(`球员 ${person.name} 的 ID 无效。`);
    if (person.number !== undefined && typeof person.number !== 'string') throw new Error('球衣号码使用字符串，未知时不填写。');
    if (person.id !== undefined) return { ...person };
    const candidates = known.filter((item) => item.playerName === person.name && (person.number === undefined || String(item.playerNum) === person.number));
    const ids = [...new Set(candidates.filter((item) => Number.isInteger(item.playerId) && item.playerId > 0).map((item) => item.playerId))];
    if (ids.length > 1) throw new Error(`球员 ${person.name} 的本地 ID 有歧义，需用户确认：${ids.join(', ')}。`);
    if (ids.length === 1) {
      decisions.push({ name: person.name, resolvedId: ids[0], reason: '同赛季本队资料唯一匹配' });
      return { ...person, id: ids[0] };
    }
    decisions.push({ name: person.name, status: 'idNotProvidedOrFound' });
    return { ...person };
  });
}

function personKey(person) {
  if (person.id !== undefined) return `id:${person.id}`;
  if (person.number !== undefined) return `number:${person.number}:name:${person.name}`;
  return `name:${person.name}`;
}

function validateLineup(value, match) {
  if (String(value.matchId) !== match.id) throw new Error('阵容比赛 ID 不一致。');
  for (const side of ['home', 'guest']) {
    const identities = new Set();
    const numbers = new Set();
    for (const field of [`${side}Starting`, `${side}Subs`]) {
      if (value[field] === undefined) continue;
      if (!Array.isArray(value[field])) throw new Error(`${field} 不是名单数组。`);
      if (field.endsWith('Starting') && value[field].length > 11) throw new Error('首发不得超过 11 人。');
      for (const person of value[field]) {
        const key = personKey(person);
        if (identities.has(key)) throw new Error(`同队首发/替补出现重复人员：${person.name}`);
        identities.add(key);
        if (person.number !== undefined && person.number !== '') {
          if (numbers.has(person.number)) throw new Error(`同队号码重复：${person.number}`);
          numbers.add(person.number);
        }
      }
    }
  }
}

function previewRepair(patchFile, registry) {
  const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
  if (patch.kind !== 'lineup' || typeof patch.league !== 'string' || !patch.league.trim() || typeof patch.source !== 'string' || !patch.source.trim() || !/^[1-9]\d*$/.test(String(patch.matchId)) || !Array.isArray(patch.changes) || !patch.changes.length) throw new Error('补丁需包含 kind: lineup、已登记的 league、season、matchId、用户资料 source 和 changes。');
  const context = loadContext({ league: patch.league, season: patch.season }, registry);
  const match = context.matches.get(String(patch.matchId));
  if (!match || match.status !== -1) throw new Error('目标比赛不是本赛季已完赛比赛。');
  const directories = [match.homeId, match.awayId].map((id) => {
    const directory = context.directories.get(id);
    if (!directory) throw new Error(`缺少球队 ${id} 的 config.js。`);
    return directory;
  });
  const decisions = [];
  const fields = new Set();
  const changes = patch.changes.map((change) => {
    if (!FIELDS.has(change.field) || fields.has(change.field) || typeof change.beforeExists !== 'boolean' || (change.beforeExists && !own(change, 'before')) || !own(change, 'after')) throw new Error('修改字段非法、重复或缺少预期旧值信息。');
    fields.add(change.field);
    if (change.field.endsWith('Formation')) {
      if (change.mode !== 'replace' || typeof change.after !== 'string' || !/^\d(?:-\d){1,4}$/.test(change.after)) throw new Error('阵型使用明确的连字符格式，如 4-3-3，mode 为 replace。');
      return change;
    }
    if (!['replace', 'append'].includes(change.mode)) throw new Error('名单 mode 只能是 replace 或 append。');
    if (change.mode === 'replace' && change.complete !== true) throw new Error('替换整个名单必须明确 complete: true；部分补充使用 append。');
    let index = 0;
    if (change.field.startsWith('guest')) index = 1;
    const after = resolvePeople(change.after, knownPlayers(directories[index], context.shortSeason), decisions);
    if (change.mode === 'replace' && change.field.endsWith('Starting') && after.length !== 11) throw new Error('完整首发名单应为 11 人；部分资料请使用 append。');
    return { ...change, after };
  });
  const targets = directories.map((directory) => {
    const file = path.join(directory, 'basicData', context.shortSeason, match.id, 'lineup.json');
    let original = null;
    let before;
    if (fs.existsSync(file)) {
      original = fs.readFileSync(file);
      before = JSON.parse(original.toString('utf8'));
      if (String(before.matchId) !== match.id) throw new Error(`文件身份不一致：${file}`);
      const homeName = context.teams.find((team) => team.id === match.homeId).name;
      const awayName = context.teams.find((team) => team.id === match.awayId).name;
      if ((before.homeName !== undefined && before.homeName !== homeName) || (before.awayName !== undefined && before.awayName !== awayName)) throw new Error(`阵容主客队与赛程不符：${file}`);
    } else {
      before = { matchId: Number(match.id), homeName: context.teams.find((team) => team.id === match.homeId).name, awayName: context.teams.find((team) => team.id === match.awayId).name };
    }
    const after = JSON.parse(JSON.stringify(before));
    const diff = [];
    for (const change of changes) {
      let expectedAfter = change.after;
      if (change.mode === 'append') {
        let base = [];
        if (change.beforeExists) {
          if (!Array.isArray(change.before)) throw new Error('追加名单的 before 必须是数组。');
          base = change.before;
        }
        expectedAfter = [...base, ...change.after];
      }
      if (own(before, change.field) && isDeepStrictEqual(before[change.field], expectedAfter)) continue;
      if (own(before, change.field) !== change.beforeExists || (change.beforeExists && !isDeepStrictEqual(before[change.field], change.before))) throw new Error(`旧值冲突：${file} / ${change.field}`);
      after[change.field] = expectedAfter;
      diff.push({ field: change.field, beforeExists: own(before, change.field), before: before[change.field], after: expectedAfter });
    }
    validateLineup(after, match);
    let content = Buffer.from(`${JSON.stringify(after, null, 2)}\n`);
    if (diff.length === 0 && original !== null) content = original;
    return { file, original, beforeHash: original === null ? null : hash(original), afterHash: hash(content), content, diff };
  });
  return { patch, patchFile: path.resolve(patchFile), context, match, decisions, targets };
}

function publicPreview(plan) {
  return { league: plan.patch.league, season: plan.patch.season, matchId: plan.match.id, source: plan.patch.source, decisions: plan.decisions, changes: plan.targets.map(({ file, beforeHash, afterHash, diff }) => ({ file, beforeHash, afterHash, diff })) };
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function applyRepair(plan, historyRoot, writer = atomicWrite) {
  const targets = plan.targets.filter((target) => target.diff.length > 0);
  if (!targets.length) return { status: 'unchanged', ...publicPreview(plan) };
  // 两边都先核验、备份，再写入；预览之后文件变更时拒绝覆盖。
  for (const target of plan.targets) {
    let current = null;
    if (fs.existsSync(target.file)) current = hash(fs.readFileSync(target.file));
    if (current !== target.beforeHash) throw new Error(`预览后文件已变化：${target.file}`);
  }
  const at = new Date().toISOString();
  const history = path.join(historyRoot, `${at.replace(/[:.]/g, '-')}-${plan.match.id}-${crypto.randomUUID()}`);
  fs.mkdirSync(history, { recursive: true });
  fs.writeFileSync(path.join(history, 'patch.json'), `${JSON.stringify(plan.patch, null, 2)}\n`);
  for (let index = 0; index < plan.targets.length; index++) {
    if (plan.targets[index].original !== null) fs.writeFileSync(path.join(history, `before-${index}.json`), plan.targets[index].original);
  }
  const record = { ...publicPreview(plan), at, status: 'prepared' };
  const saveRecord = () => fs.writeFileSync(path.join(history, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
  saveRecord();
  const written = [];
  try {
    for (const target of targets) {
      written.push(target);
      writer(target.file, target.content);
    }
    for (const target of targets) {
      if (hash(fs.readFileSync(target.file)) !== target.afterHash) throw new Error('写入后哈希不一致。');
    }
    record.status = 'applied';
    saveRecord();
    return { ...record, history };
  } catch (error) {
    const rollbackErrors = [];
    for (const target of written.reverse()) {
      try {
        if (target.original !== null) atomicWrite(target.file, target.original);
        else if (fs.existsSync(target.file)) fs.unlinkSync(target.file);
      } catch (rollbackError) {
        rollbackErrors.push({ file: target.file, message: rollbackError.message });
      }
    }
    record.status = 'rolledBack';
    if (rollbackErrors.length) record.status = 'rollbackFailed';
    record.error = error.message;
    record.rollbackErrors = rollbackErrors;
    saveRecord();
    throw new Error(`修正失败：${error.message}；恢复状态 ${record.status}；记录 ${history}`);
  }
}

module.exports = { previewRepair, publicPreview, applyRepair, atomicWrite, validateLineup };
