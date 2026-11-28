'use strict';

const { isDeepStrictEqual } = require('node:util');

// G* 包含普通比赛和两回合对阵容器；S* 是积分榜，不能当作比赛重复读取。
function scheduleRows(data, type) {
  const matches = new Map();
  function visit(rows, stage) {
    if (!Array.isArray(rows)) throw new Error(`${stage} 不是有效比赛数组。`);
    for (const row of rows) {
      if (!Array.isArray(row)) throw new Error(`${stage} 含无效比赛对象。`);
      if (row.length >= 8 && Number.isInteger(row[0]) && Number.isInteger(row[4]) && Number.isInteger(row[5])) {
        const id = String(row[0]);
        if (matches.has(id)) {
          if (!isDeepStrictEqual(matches.get(id).row, row)) throw new Error(`比赛${id}重复且冲突。`);
          continue;
        }
        matches.set(id, { row, stage });
      } else {
        visit(row.filter(Array.isArray), stage);
      }
    }
  }
  for (const [key, rows] of Object.entries(data.jh)) {
    if ((type === 'league' && /^R_\d+$/.test(key)) || (type === 'cup' && /^G\d+[A-Z]*$/.test(key))) visit(rows, key);
  }
  return matches;
}

module.exports = { scheduleRows };
