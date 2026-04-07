// 示例 1：1X2（只下注“平局”），概率 0.50，十进制赔率 2.90，使用 0.2 Kelly
const example1Input = {
  bankroll: 100000,
  alpha: 0.2,
  market: {
    type: "1x2",
    outcome: "D",
    p: 0.50,
    oddsDecimal: 2.90,
  },
};

const example1Output = {
  // Full Kelly: f* = (pO - 1)/(O - 1) = (0.5*2.9 - 1)/(1.9) = 0.2368421053
  fractionFullKelly: 0.23684210526315788,
  // 0.2 Kelly
  fractionUsed: 0.04736842105263158,
  // stake = bankroll * fractionUsed
  stake: 4736.842105263158,
  detail: {
    market: "1x2",
    outcome: "D",
    p: 0.5,
    oddsDecimal: 2.9,
    settlement: [
      { name: "win", prob: 0.5, returnPer1: 2.9 },
      { name: "lose", prob: 0.5, returnPer1: 0 },
    ],
  },
};

// 示例 2：亚盘（客队 -0.75），十进制赔率 1.80（由香港盘 0.80 转换：1+0.80）
// 结算概率：主队赢盘(=客队输) 20%，客队赢一半 50%，客队全赢 30%，使用 0.2 Kelly
const example2Input = {
  bankroll: 100000,
  alpha: 0.2,
  market: {
    type: "ah",
    side: "away",
    line: -0.75,
    oddsDecimal: 1.80,
    // 直接给“这条盘的结算概率”（推荐方式）
    resultProbs: {
      winHalf: 0.50,
      winFull: 0.30,
      loseFull: 0.20,
      push: 0,
      loseHalf: 0,
    },
  },
};

const example2Output = {
  // Full Kelly（多结果求解）≈ 0.4278697767
  fractionFullKelly: 0.4278697766739994,
  // 0.2 Kelly
  fractionUsed: 0.08557395533479988,
  // stake = bankroll * fractionUsed
  stake: 8557.395533479989,
  detail: {
    market: "ah",
    line: -0.75,
    side: "away",
    oddsDecimal: 1.8,
    settlement: [
      // 全赢：返还=O
      { name: "winFull", prob: 0.30, returnPer1: 1.8 },
      // 半赢：返还=(O+1)/2 = 1.4
      { name: "winHalf", prob: 0.50, returnPer1: 1.4 },
      // 全输：返还=0
      { name: "loseFull", prob: 0.20, returnPer1: 0 },
    ],
  },
};