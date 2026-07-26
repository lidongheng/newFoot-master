const fs = require('fs');
const path = require('path');
const { getMatchFactPaths } = require('./teamPaths');

const CHECKPOINTS = new Set(['opening', 'analysis', 'lineup', 'closing']);

function validateCheckpoint(checkpoint) {
  if (!CHECKPOINTS.has(checkpoint)) {
    throw new Error(`无效盘口检查点: ${checkpoint}`);
  }
}

function appendMarketSnapshot(snapshot) {
  if (!snapshot || snapshot.matchId == null) {
    throw new Error('盘口快照缺少 matchId');
  }
  validateCheckpoint(snapshot.checkpoint);
  if (!snapshot.capturedAt) {
    throw new Error('盘口快照缺少 capturedAt');
  }

  const targetPath = getMatchFactPaths(snapshot.matchId).marketSnapshots;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.appendFileSync(targetPath, `${JSON.stringify(snapshot)}\n`, 'utf-8');
  return targetPath;
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      throw new Error(`${filePath} 第 ${index + 1} 行不是合法 JSON: ${err.message}`);
    }
  });
}

module.exports = {
  CHECKPOINTS,
  validateCheckpoint,
  appendMarketSnapshot,
  readJsonLines,
};
