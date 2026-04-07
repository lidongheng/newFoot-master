/**
 * Kelly投注金额计算器（默认使用0.2倍Kelly）用于：
 * 1) 1X2单一结果（例如，"D"平局）使用概率p和十进制赔率
 * 2) 亚洲让球盘口，包括四分之一盘口（-0.25, -0.75, +0.25, +0.75等）
 *
 * 假设条件：
 * - 赔率为十进制（例如，1.92）。如果您有香港赔率（例如，0.92），请转换：decimal = 1 + hk。
 * - 对于亚洲让球（AH）：
 *   - 您可以传递以下任一方式：
 *     A) resultProbs: { winFull, winHalf, push, loseHalf, loseFull }（它们应总和为1）
 *        其中含义是此投注的结算结果。
 *     或者
 *     B) basicProbs: { homeWin, draw, awayWin }，我们将为给定的盘口进行转换，
 *        但仅适用于从1X2映射明确无误的盘口（下面支持常见盘口）。
 *
 * 输出：
 * - stake: 推荐的投注金额（bankroll * 0.2 * fullKellyFraction），受可选maxStake限制。
 * - fractionFullKelly: 完整Kelly比例 f*
 * - fractionUsed: 应用的比例（alpha * f*）
 * - detail: 使用的结算表（概率 + 回报倍数）
 */

/**
 * kellyStake(params)
 *
 * =========================
 * 入参（params）格式说明
 * =========================
 *
 * @param {Object} params
 * @param {number} params.bankroll
 *   - 资金池（bankroll），用于计算下注额：stake = bankroll * fractionUsed
 *   - 必须 > 0
 *
 * @param {Object} params.market
 *   - 盘口/市场信息。根据 market.type 不同，必填字段不同。
 *
 * @param {'1x2'|'ah'} params.market.type
 *   - '1x2'：胜平负单项下注（只算某一个结果的 Kelly）
 *   - 'ah' ：亚盘（含走水/半赢半输等多结算情形）
 *
 * -------- market.type === '1x2' 时 --------
 * @param {'H'|'D'|'A'} params.market.outcome
 *   - 下注结果：
 *     - 'H' 主胜
 *     - 'D' 平局
 *     - 'A' 客胜
 *
 * @param {number} params.market.p
 *   - 该 outcome 发生的概率（你自己评估/模型输出）
 *   - 取值范围 [0, 1]
 *
 * @param {number} params.market.oddsDecimal
 *   - 十进制赔率（欧赔），例如 2.90
 *   - 必须 > 1
 *   - 若你手上是香港盘水位 hk（例如 0.80），请先换算：oddsDecimal = 1 + hk
 *
 * -------- market.type === 'ah' 时 --------
 * @param {number} params.market.line
 *   - 亚盘让球线（以“你下注的那一方”为基准的让球）
 *   - 示例：
 *     - -0.75 表示你下注的一方让 0.75 球（让半一/一球）
 *     - +0.25 表示你下注的一方受让 0.25 球（受平半）
 *
 * @param {'home'|'away'} [params.market.side='home']
 *   - 你下注的是主队还是客队这一方（用于 basicProbs 转换；若用 resultProbs 可不依赖它）
 *
 * @param {number} params.market.oddsDecimal
 *   - 该下注方向对应的十进制赔率（欧赔），必须 > 1
 *   - 若你手上是香港盘水位 hk（例如 1.08 / 0.80），请先换算：oddsDecimal = 1 + hk
 *
 * @param {Object} [params.market.resultProbs]
 *   - 【推荐】直接提供“这条盘的结算概率”（在你下注的这一边、按盘口结算后的结果）
 *   - 这组概率应当加和为 1
 *   - 字段含义：
 *     - winFull  : 全赢（赢盘/赢注）
 *     - winHalf  : 赢一半（半赢）
 *     - push     : 走水（退本金）
 *     - loseHalf : 输一半（半输）
 *     - loseFull : 全输（输盘/输注）
 *
 * @param {Object} [params.market.basicProbs]
 *   - 【可选】提供 1X2 的胜/平/负概率，让函数去转换部分“简单亚盘线”的结算概率
 *   - 这组概率应当加和为 1
 *   - 字段含义：
 *     - homeWin : 主胜概率
 *     - draw    : 平局概率
 *     - awayWin : 客胜概率
 *   - 注意：很多亚盘（如 ±0.75、±1 等）仅靠 1X2 概率无法拆分“赢一球/赢两球+”，因此会报错，
 *     这时必须改用 resultProbs 直接给结算概率。
 *
 * @param {number} [params.alpha=0.2]
 *   - 使用的“凯利倍数”，fractionUsed = alpha * fractionFullKelly
 *   - 例如：
 *     - 1.0  表示 Full Kelly
 *     - 0.5  表示 Half Kelly
 *     - 0.25 表示 Quarter Kelly
 *     - 0.2  表示 0.2 Kelly（你当前偏好）
 *
 * @param {number} [params.maxStake=Infinity]
 *   - 可选：单场下注额封顶（风控用）
 *   - 最终 stake = min(bankroll * fractionUsed, maxStake)
 *
 *
 * =========================
 * 出参（return）格式说明
 * =========================
 *
 * @returns {Object} result
 *
 * @returns {number} result.stake
 *   - 建议下注额（已经应用 alpha，并应用 maxStake 封顶）
 *
 * @returns {number} result.fractionFullKelly
 *   - Full Kelly 的下注比例 f*（占 bankroll 的比例）
 *   - 若无正优势，会返回 0
 *
 * @returns {number} result.fractionUsed
 *   - 实际使用的下注比例 = alpha * fractionFullKelly
 *
 * @returns {Object} result.detail
 *   - 计算细节（方便你做日志/复盘）
 *
 * @returns {'1x2'|'ah'} result.detail.market
 *   - 市场类型
 *
 * -------- 当 market === '1x2' --------
 * @returns {'H'|'D'|'A'} result.detail.outcome
 * @returns {number} result.detail.p
 * @returns {number} result.detail.oddsDecimal
 * @returns {Array<{name:string, prob:number, returnPer1:number}>} result.detail.settlement
 *   - 结算表（每下注 1 单位的返还 returnPer1，含本金）
 *   - 例：[{name:'win', prob:p, returnPer1:O}, {name:'lose', prob:1-p, returnPer1:0}]
 *
 * -------- 当 market === 'ah' --------
 * @returns {number} result.detail.line
 * @returns {'home'|'away'} result.detail.side
 * @returns {number} result.detail.oddsDecimal
 * @returns {Array<{name:string, prob:number, returnPer1:number}>} result.detail.settlement
 *   - 结算表（每下注 1 单位的返还 returnPer1，含本金）
 *   - 常见 returnPer1：
 *     - 全赢: O
 *     - 半赢: (O + 1) / 2
 *     - 走水: 1
 *     - 半输: 0.5
 *     - 全输: 0
 */
function kellyStake({ bankroll, market, alpha = 0.2, maxStake = Infinity }) {
  if (!Number.isFinite(bankroll) || bankroll <= 0) throw new Error("bankroll must be > 0");
  if (!Number.isFinite(alpha) || alpha <= 0) throw new Error("alpha must be > 0");

  const type = market?.type;
  if (type !== "1x2" && type !== "ah") throw new Error("market.type must be '1x2' or 'ah'");

  if (type === "1x2") {
    // --- 1X2: 单一结果（主胜H/平局D/客胜A） ---
    const { outcome, p, oddsDecimal: O } = market;
    if (!["H", "D", "A"].includes(outcome)) throw new Error("1x2 outcome must be 'H' | 'D' | 'A'");
    if (!(p >= 0 && p <= 1)) throw new Error("p must be between 0 and 1");
    if (!Number.isFinite(O) || O <= 1) throw new Error("oddsDecimal must be > 1");

    // 单一投注的完整Kelly比例：f* = (pO - 1)/(O - 1)，限制在0以上。
    const fStar = Math.max(0, (p * O - 1) / (O - 1));
    const fUsed = alpha * fStar;
    const stake = Math.min(bankroll * fUsed, maxStake);

    return {
      stake,
      fractionFullKelly: fStar,
      fractionUsed: fUsed,
      detail: {
        market: "1x2",
        outcome,
        p,
        oddsDecimal: O,
        settlement: [
          { name: "win", prob: p, returnPer1: O }, // 回报包含本金
          { name: "lose", prob: 1 - p, returnPer1: 0 },
        ],
      },
    };
  }

  // --- 亚洲让球（AH） ---
  const {
    line,          // 例如：-0.75, +0.25 ...
    oddsDecimal: O,
    // 优先直接提供结算概率：
    // { winFull, winHalf, push, loseHalf, loseFull }  (总和=1)
    resultProbs,
    // 或者提供 { homeWin, draw, awayWin }（总和=1）用于常见转换
    basicProbs,
    // side: "home" 或 "away" 表示您在此盘口上投注的球队
    side = "home",
  } = market;

  if (!Number.isFinite(line)) throw new Error("ah line must be a number, e.g. -0.75");
  if (!Number.isFinite(O) || O <= 1) throw new Error("oddsDecimal must be > 1");
  if (!["home", "away"].includes(side)) throw new Error("side must be 'home' or 'away'");

  // 构建结算状态：每个状态包含 {prob, returnPer1}
  // returnPer1 是每1单位投注金额的回报（包含本金）。
  let states = null;

  if (resultProbs) {
    // 使用明确的结算概率（最佳，最通用）。
    const {
      winFull = 0,
      winHalf = 0,
      push = 0,
      loseHalf = 0,
      loseFull = 0,
    } = resultProbs;

    const sum =
      winFull + winHalf + push + loseHalf + loseFull;

    if (Math.abs(sum - 1) > 1e-9) {
      throw new Error(`resultProbs must sum to 1, got ${sum}`);
    }

    // 结算回报：
    // winFull: 回报 = O
    // winHalf: 一半赢 + 一半走盘 => (O + 1)/2
    // push: 回报 = 1
    // loseHalf: 一半输 + 一半走盘 => 0.5
    // loseFull: 回报 = 0
    states = [
      { name: "winFull", prob: winFull, R: O },
      { name: "winHalf", prob: winHalf, R: (O + 1) / 2 },
      { name: "push", prob: push, R: 1 },
      { name: "loseHalf", prob: loseHalf, R: 0.5 },
      { name: "loseFull", prob: loseFull, R: 0 },
    ].filter(s => s.prob > 0);
  } else if (basicProbs) {
    // 从1X2到亚洲让球结算的有限转换（常见盘口）。
    // 注意：对于许多盘口，您确实需要净胜球分布；仅1X2是不够的。
    const { homeWin, draw, awayWin } = basicProbs;
    const sum = homeWin + draw + awayWin;
    if (Math.abs(sum - 1) > 1e-9) throw new Error(`basicProbs must sum to 1, got ${sum}`);

    // 根据投注方转换胜/平/负
    const pWin = side === "home" ? homeWin : awayWin;
    const pDraw = draw;
    const pLose = side === "home" ? awayWin : homeWin;

    // 处理一些结果映射清晰的常见盘口：
    // 0（无让球风格）：胜则全赢，平则走盘，负则全输
    // +0.25 / -0.25: 胜则全赢，平则如果让球方(-0.25)则输半，如果受让方(+0.25)则赢半，负则全输
    // +0.75 / -0.75: 需要知道净胜1球 vs 净胜2球以上；仅1X2无法分割 => 拒绝。
    // ±0.5: 胜则全赢，平或负则全输（对于-0.5）；对于+0.5，胜或平则全赢，负则全输（除非将平局视为+0.5的胜利，否则从1X2来看仍不清晰）
    // 我们将支持：0, ±0.25, ±0.5, ±1（精确1球走盘无法从1X2推导 => 拒绝），±0.75 => 拒绝。

    const abs = Math.abs(line);
    const isQuarter = Math.abs(abs - 0.25) < 1e-9;
    const isHalf = Math.abs(abs - 0.5) < 1e-9;
    const isZero = Math.abs(line) < 1e-9;

    if (isZero) {
      states = [
        { name: "winFull", prob: pWin, R: O },
        { name: "push", prob: pDraw, R: 1 },
        { name: "loseFull", prob: pLose, R: 0 },
      ];
    } else if (isQuarter) {
      if (line > 0) {
        // +0.25: 胜则全赢，平则赢半，负则全输
        states = [
          { name: "winFull", prob: pWin, R: O },
          { name: "winHalf", prob: pDraw, R: (O + 1) / 2 },
          { name: "loseFull", prob: pLose, R: 0 },
        ];
      } else {
        // -0.25: 胜则全赢，平则输半，负则全输
        states = [
          { name: "winFull", prob: pWin, R: O },
          { name: "loseHalf", prob: pDraw, R: 0.5 },
          { name: "loseFull", prob: pLose, R: 0 },
        ];
      }
    } else if (isHalf) {
      if (line > 0) {
        // +0.5: 胜或平则全赢，负则全输
        states = [
          { name: "winFull", prob: pWin + pDraw, R: O },
          { name: "loseFull", prob: pLose, R: 0 },
        ];
      } else {
        // -0.5: 胜则全赢，平或负则全输
        states = [
          { name: "winFull", prob: pWin, R: O },
          { name: "loseFull", prob: pDraw + pLose, R: 0 },
        ];
      }
    } else {
      // 像±0.75、±1这样的盘口需要净胜球分割；仅1X2是不够的。
      throw new Error(
        "For this AH line, basicProbs (W/D/L) is insufficient. Please provide resultProbs with winHalf/winFull/etc."
      );
    }
  } else {
    throw new Error("Provide either resultProbs (recommended) or basicProbs");
  }

  // 现在计算多结果结算的完整Kelly比例：
  // 求解 g'(f)=0，其中 g(f)=Σ p ln(1 - f + fR)
  // 导数：Σ p * (R-1) / (1 + f*(R-1)) = 0
  const ps = states.map(s => s.prob);
  const Rs = states.map(s => s.R);

  const fStar = fullKellyFractionMulti(ps, Rs);
  const fUsed = alpha * fStar;
  const stake = Math.min(bankroll * fUsed, maxStake);

  return {
    stake,
    fractionFullKelly: fStar,
    fractionUsed: fUsed,
    detail: {
      market: "ah",
      line,
      side,
      oddsDecimal: O,
      settlement: states.map(s => ({ name: s.name, prob: s.prob, returnPer1: s.R })),
    },
  };

  // ---- 辅助函数 ----
  function fullKellyFractionMulti(ps, Rs) {
    // 导数函数
    const deriv = (f) => {
      let sum = 0;
      for (let i = 0; i < ps.length; i++) {
        const a = Rs[i] - 1;
        const denom = 1 + f * a;
        if (denom <= 0) return -Infinity; // 无效区域
        sum += ps[i] * a / denom;
      }
      return sum;
    };

    // 如果在0处没有正导数 => 最优值为0
    if (deriv(0) <= 0) return 0;

    // 找到导数 <= 0 的上界
    let lo = 0;
    let hi = 1;
    while (hi < 50 && deriv(hi) > 0) hi *= 2;

    // 如果仍然 >0，意味着极其强的优势；保持hi但解会很大。
    // 我们仍将在 [lo, hi] 上进行二分搜索。
    for (let k = 0; k < 100; k++) {
      const mid = (lo + hi) / 2;
      if (deriv(mid) > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
}

/* -----------------------
使用示例（您的两个案例）
------------------------ */

// 案例1: 1X2平局，p=0.5, O=2.90
console.log(
  kellyStake({
    bankroll: 100000,
    market: { type: "1x2", outcome: "D", p: 0.5, oddsDecimal: 2.90 },
    alpha: 0.2,
  })
);

// 案例2: 亚洲让球客队-0.75，O=1.80，带结算概率
console.log(
  kellyStake({
    bankroll: 100000,
    market: {
      type: "ah",
      line: -0.75,
      side: "away",
      oddsDecimal: 1.80,
      resultProbs: {
        // 客队-0.75结算
        winHalf: 0.50,
        winFull: 0.30,
        loseFull: 0.20,
        push: 0,
        loseHalf: 0,
      },
    },
    alpha: 0.2,
    maxStake: 9000, // 可选上限
  })
);
