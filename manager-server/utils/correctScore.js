const excludedExactScores = [
  [5, 3],
  [5, 4],
  [5, 5],
  [3, 5],
  [4, 5]
];

function getCorrectScoreDetails(scoreSelection) {
  if (!scoreSelection || typeof scoreSelection !== 'object') {
    throw new Error('比分选项无效');
  }

  if (scoreSelection.type === 'exact') {
    const { homeScore, awayScore } = scoreSelection;
    const isValidScore = Number.isInteger(homeScore) && Number.isInteger(awayScore) &&
      homeScore >= 0 && homeScore <= 5 && awayScore >= 0 && awayScore <= 5;
    if (!isValidScore) {
      throw new Error('比分必须是0至5之间的整数');
    }

    const isExcluded = excludedExactScores.some(([home, away]) => home === homeScore && away === awayScore);
    if (isExcluded) {
      throw new Error('该比分应选择对应的其他选项');
    }

    return {
      scoreSelection: { type: 'exact', homeScore, awayScore },
      selection: '比分',
      value: `${homeScore}:${awayScore}`
    };
  }

  if (scoreSelection.type === 'other' && ['home', 'draw', 'away'].includes(scoreSelection.outcome)) {
    const labels = { home: '胜其他', draw: '平其他', away: '负其他' };
    return {
      scoreSelection: { type: 'other', outcome: scoreSelection.outcome },
      selection: '其他',
      value: labels[scoreSelection.outcome]
    };
  }

  throw new Error('比分选项类型无效');
}

module.exports = { getCorrectScoreDetails };
