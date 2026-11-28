const { parseArgs } = require('node:util');
const { catalog } = require('../metrics');
const { cups } = require('../../../crawler-server/config');
const { isClubCompetition } = require('../../../crawler-server/utils/teamAgent');

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00+08:00`);
  return Number.isFinite(date.getTime()) && new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10) === value;
}

function parseOptions(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    league: { type: 'string' }, season: { type: 'string' }, team: { type: 'string' }, rounds: { type: 'string' },
    from: { type: 'string' }, to: { type: 'string' }, last: { type: 'string' }, metrics: { type: 'string' }, stage: { type: 'string' },
  } });
  if (!values.league || !values.season) throw new Error('--league、--season 必填。');
  if (!cups[values.league] || !isClubCompetition(values.league)) throw new Error('--league 必须是已登记的俱乐部联赛或杯赛键。');
  if (values.stage !== undefined && (cups[values.league].type !== 'cup' || !/^G\d+[A-Z]*$/.test(values.stage))) throw new Error('--stage 必须是杯赛实际G阶段键。');
  if (cups[values.league].type === 'cup' && values.rounds !== undefined) throw new Error('杯赛不使用--rounds，请用--stage指定阶段。');
  if (!/^\d{4}(?:-\d{4})?$/.test(values.season)) throw new Error('--season 使用完整赛季，如 2026-2027。');
  if (values.team !== undefined && !/^[1-9]\d*$/.test(values.team)) throw new Error('--team 必须为球探球队 ID。');
  const count = Number(values.rounds !== undefined) + Number(values.last !== undefined) + Number(values.from !== undefined || values.to !== undefined);
  if (count > 1) throw new Error('轮次、日期和近 N 场范围互斥。');
  const result = { ...values, scope: 'all-matches' };
  if (values.stage !== undefined) result.scope = `stage-${values.stage}`;
  if (values.rounds !== undefined) {
    if (!/^[1-9]\d*(?:-[1-9]\d*)?$/.test(values.rounds)) throw new Error('--rounds 格式：1-13 或 13。');
    const numbers = values.rounds.split('-').map(Number);
    let end = numbers[0];
    if (numbers.length === 2) end = numbers[1];
    if (numbers.some((number) => !Number.isSafeInteger(number)) || end < numbers[0]) throw new Error('轮次范围无效。');
    result.roundRange = { start: numbers[0], end };
    result.scope = `rounds-${numbers[0]}-${end}`;
  }
  if (values.last !== undefined) {
    if (!/^[1-9]\d*$/.test(values.last) || !Number.isSafeInteger(Number(values.last))) throw new Error('--last 必须是正整数。');
    result.last = Number(values.last);
    result.scope = `last-${result.last}`;
  }
  if (values.from !== undefined || values.to !== undefined) {
    if (!values.from || !values.to || !validDate(values.from) || !validDate(values.to) || values.from > values.to) throw new Error('日期范围必须同时提供有效的 --from 和 --to，起始不晚于结束。');
    result.scope = `dates-${values.from}_to_${values.to}`;
  }
  if (values.metrics !== undefined) {
    const ids = values.metrics.split(',');
    if (ids.some((id) => !catalog.some((metric) => metric.id === id))) throw new Error('--metrics 包含未知指标；请先运行 catalog。');
    result.metrics = [...new Set(ids)];
  }
  return result;
}

module.exports = { parseOptions, validDate };
