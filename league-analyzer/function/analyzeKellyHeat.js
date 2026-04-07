/**
 * 基于“欧赔页面凯利指数（0.xx）”的冷热判读模型 +（新增）竞彩初盘锚点 & 临盘衰减/反转
 *
 * 你要的新增规则（只用竞彩初盘定方向，临盘用于判断衰减/反转）：
 * - Anchor（方向）= 竞彩初盘三项里最低项（需足够明显）
 * - Decay（衰减/模糊）= 临盘三项差值明显变小（信号被抹平）
 * - Flip（反转）= 临盘最低项与初盘不同 且 临盘差值达到反转阈值
 *
 * 输入：
 * - books: [{name, k:[主,平,客]}, ...]  —— 用于“群体投票”判读（可选，仍保留原模型）
 * - jingcaiOpen: [主,平,客]            —— 竞彩初盘凯利（必填才能用锚点）
 * - jingcaiLive: [主,平,客]            —— 竞彩临盘凯利（可选，用于衰减/反转）
 *
 * 输出：
 * - conclusion: hot/warm/cold（来自群体投票）
 * - jingcaiTiming: anchor/decay/flip（来自初盘锚点 + 临盘衰减/反转）
 */

function analyzeKellyHeat(
  books,
  {
    outcomeLabels = ["主", "平", "客"],

    // 原模型：你主要看竞彩（群体投票层面）
    mainBookName = "竞彩",
    mainBookWeight = 1.8,
    mainBookClearMargin = 0.03,

    // 强信号公司阈值（用于列清单）
    strongMargin = 0.04,

    // 新增：初盘锚点 + 临盘衰减/反转
    jingcaiOpen = null,           // [主,平,客]
    jingcaiLive = null,           // [主,平,客]
    anchorMinMargin = 0.03,       // 初盘最低项与次低项差值 >= 0.03 才算“强锚点”
    flipMinMargin = 0.03,         // 临盘最低项变更且临盘差值 >= 0.03 才算“反转”
    decayRatio = 0.35,            // 临盘差值 <= 初盘差值 * 0.35 视为“明显衰减”（你可调）
    decayAbs = 0.02,              // 或者临盘差值 <= 0.02 也算衰减（你可调）

    eps = 1e-12,
  } = {}
) {
  if (!Array.isArray(outcomeLabels) || outcomeLabels.length !== 3) {
    throw new Error("outcomeLabels must be an array of length 3");
  }
  const idxToOutcome = (idx) => outcomeLabels[idx] ?? String(idx);

  // ---------- Part A: 群体投票（原模型，books 可以为空，但建议给） ----------
  const perBook = [];
  const vote = [0, 0, 0];
  const voteW = [0, 0, 0];
  const strongSignals = [];
  let mainBookInfo = null;

  function analyzeOneBook(name, k3) {
    if (!Array.isArray(k3) || k3.length !== 3) {
      throw new Error(`Book "${name}" k must be an array of 3 numbers`);
    }
    const vals = k3.map((x) => Number(x));
    if (vals.some((x) => !Number.isFinite(x))) {
      throw new Error(`Book "${name}" k contains non-finite number`);
    }
    const minVal = Math.min(...vals);
    const minIdxs = [];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(vals[i] - minVal) <= eps) minIdxs.push(i);
    }
    const sorted = [...vals].sort((a, b) => a - b);
    const margin = Math.max(0, sorted[1] - sorted[0]);
    return { name, k: vals, minIdxs, minVal, margin };
  }

  if (Array.isArray(books) && books.length > 0) {
    for (const b of books) {
      const info = analyzeOneBook(b.name, b.k);
      perBook.push(info);

      // 未加权投票：并列平分
      const share = 1 / info.minIdxs.length;
      for (const idx of info.minIdxs) vote[idx] += share;

      // 加权投票：只有当竞彩“明显防”才加权
      let w = 1;
      let mainBookIsClear = false;
      if (b.name === mainBookName) {
        mainBookIsClear = info.margin + eps >= mainBookClearMargin;
        w = mainBookIsClear ? mainBookWeight : 1;
        mainBookInfo = {
          ...info,
          isClear: mainBookIsClear,
          appliedWeight: w,
          minOutcome: info.minIdxs.length === 1 ? idxToOutcome(info.minIdxs[0]) : info.minIdxs.map(idxToOutcome),
        };
      }
      const shareW = w / info.minIdxs.length;
      for (const idx of info.minIdxs) voteW[idx] += shareW;

      // 强信号清单
      if (info.margin + eps >= strongMargin) {
        strongSignals.push({
          name: b.name,
          minOutcome: info.minIdxs.length === 1 ? idxToOutcome(info.minIdxs[0]) : info.minIdxs.map(idxToOutcome),
          minVal: round4(info.minVal),
          margin: round4(info.margin),
          k: info.k.map(round4),
        });
      }
    }
  }

  // 群体热端排序（若没给books，就给null）
  let groupConclusion = null;
  if (Array.isArray(books) && books.length > 0) {
    const order = [0, 1, 2].sort((a, b) => {
      const d = voteW[b] - voteW[a];
      if (Math.abs(d) > 1e-9) return d;
      const d2 = vote[b] - vote[a];
      if (Math.abs(d2) > 1e-9) return d2;
      return a - b;
    });

    const totalW = voteW.reduce((s, x) => s + x, 0) || 1;
    const pW = voteW.map((x) => x / totalW);
    const hotIdx = order[0];
    const warmIdx = order[1];
    const coldIdx = order[2];
    const gapHotWarm = pW[hotIdx] - pW[warmIdx];

    let consistency = "中";
    if (gapHotWarm >= 0.20) consistency = "强一致";
    else if (gapHotWarm <= 0.08) consistency = "分歧较大";

    groupConclusion = {
      hot: idxToOutcome(hotIdx),
      warm: idxToOutcome(warmIdx),
      cold: idxToOutcome(coldIdx),
      consistency,
      voteShareWeighted: {
        [idxToOutcome(0)]: round4(pW[0]),
        [idxToOutcome(1)]: round4(pW[1]),
        [idxToOutcome(2)]: round4(pW[2]),
      },
      gapHotWarm: round4(gapHotWarm),
    };
  }

  // ---------- Part B: 新增：竞彩初盘锚点 + 临盘衰减/反转 ----------
  const jingcaiTiming = analyzeJingcaiTiming({
    outcomeLabels,
    jingcaiOpen,
    jingcaiLive,
    anchorMinMargin,
    flipMinMargin,
    decayRatio,
    decayAbs,
    eps,
  });

  return {
    conclusion: groupConclusion,
    jingcaiTiming,
    details: {
      votes: groupConclusion
        ? {
            raw: {
              [idxToOutcome(0)]: round4(vote[0]),
              [idxToOutcome(1)]: round4(vote[1]),
              [idxToOutcome(2)]: round4(vote[2]),
            },
            weighted: {
              [idxToOutcome(0)]: round4(voteW[0]),
              [idxToOutcome(1)]: round4(voteW[1]),
              [idxToOutcome(2)]: round4(voteW[2]),
            },
          }
        : null,
      strongSignals,
      mainBookInfo,
      perBook: perBook.map((x) => ({
        name: x.name,
        k: x.k.map(round4),
        minOutcome: x.minIdxs.length === 1 ? idxToOutcome(x.minIdxs[0]) : x.minIdxs.map(idxToOutcome),
        minVal: round4(x.minVal),
        margin: round4(x.margin),
      })),
      params: {
        mainBookName,
        mainBookWeight,
        mainBookClearMargin,
        strongMargin,
        anchorMinMargin,
        flipMinMargin,
        decayRatio,
        decayAbs,
      },
    },
  };

  // ----- helper: 竞彩时点规则 -----
  function analyzeJingcaiTiming({
    outcomeLabels,
    jingcaiOpen,
    jingcaiLive,
    anchorMinMargin,
    flipMinMargin,
    decayRatio,
    decayAbs,
    eps,
  }) {
    const idxToOutcomeLocal = (i) => outcomeLabels[i] ?? String(i);

    if (!jingcaiOpen) {
      return {
        anchor: null,
        decay: null,
        flip: null,
        note: "未提供竞彩初盘（jingcaiOpen），无法使用‘初盘锚点 + 临盘衰减/反转’规则。",
      };
    }
    if (!Array.isArray(jingcaiOpen) || jingcaiOpen.length !== 3) {
      throw new Error("jingcaiOpen must be [主,平,客] length=3");
    }
    const open = jingcaiOpen.map(Number);
    if (open.some((x) => !Number.isFinite(x))) throw new Error("jingcaiOpen contains non-finite");

    const openInfo = minInfo(open);
    const openAnchorIsClear = openInfo.margin + eps >= anchorMinMargin;

    const anchor = {
      open: open.map(round4),
      minOutcome: openInfo.minIdxs.length === 1 ? idxToOutcomeLocal(openInfo.minIdxs[0]) : openInfo.minIdxs.map(idxToOutcomeLocal),
      minVal: round4(openInfo.minVal),
      margin: round4(openInfo.margin),
      isClear: openAnchorIsClear,
      rule: `初盘差值>=${anchorMinMargin} 才算强锚点`,
    };

    // 没有临盘，就只输出锚点
    if (!jingcaiLive) {
      return {
        anchor,
        decay: null,
        flip: null,
        note: openAnchorIsClear
          ? "仅提供初盘：可用初盘最低项作为方向锚点。"
          : "仅提供初盘：但初盘差值不足，锚点偏弱，建议谨慎。",
      };
    }

    if (!Array.isArray(jingcaiLive) || jingcaiLive.length !== 3) {
      throw new Error("jingcaiLive must be [主,平,客] length=3");
    }
    const live = jingcaiLive.map(Number);
    if (live.some((x) => !Number.isFinite(x))) throw new Error("jingcaiLive contains non-finite");

    const liveInfo = minInfo(live);
    const liveMinOutcome = liveInfo.minIdxs.length === 1 ? idxToOutcomeLocal(liveInfo.minIdxs[0]) : liveInfo.minIdxs.map(idxToOutcomeLocal);

    // Flip: 临盘最低项 != 初盘最低项 且 临盘差值>=flipMinMargin
    const openMinSet = new Set(openInfo.minIdxs.map(idxToOutcomeLocal));
    const liveMinSet = new Set(liveInfo.minIdxs.map(idxToOutcomeLocal));
    const minOutcomeChanged = !setEquals(openMinSet, liveMinSet);
    const liveIsClearForFlip = liveInfo.margin + eps >= flipMinMargin;
    const flip = {
      changed: minOutcomeChanged,
      isFlip: minOutcomeChanged && liveIsClearForFlip,
      openMinOutcome: anchor.minOutcome,
      liveMinOutcome,
      liveMargin: round4(liveInfo.margin),
      rule: `临盘最低项改变且临盘差值>=${flipMinMargin} 才算反转`,
    };

    // Decay: 临盘差值显著缩小（<= openMargin*decayRatio 或 <= decayAbs）
    const openMargin = openInfo.margin;
    const liveMargin = liveInfo.margin;
    const isDecay =
      (openMargin > eps && liveMargin <= openMargin * decayRatio + eps) ||
      liveMargin <= decayAbs + eps;

    const decay = {
      openMargin: round4(openMargin),
      liveMargin: round4(liveMargin),
      ratio: openMargin > eps ? round4(liveMargin / openMargin) : null,
      isDecay,
      rule: `临盘差值<=初盘差值*${decayRatio} 或 <=${decayAbs} 视为衰减/模糊`,
    };

    const note = (() => {
      if (!openAnchorIsClear) return "初盘锚点偏弱：不建议强行用‘初盘定方向’。";
      if (flip.isFlip) return "触发反转：临盘最低项改变且临盘信号清晰，建议复核信息面（阵容/伤停/盘口）。";
      if (minOutcomeChanged && !flip.isFlip) return "最低项发生变化但临盘差值很小：更像资金抹平造成的‘模糊’，不建议据此改方向。";
      if (decay.isDecay) return "临盘明显衰减/模糊：说明临盘凯利不再给出清晰方向，可继续以初盘锚点为主。";
      return "临盘未明显衰减且未反转：初盘锚点方向可继续参考。";
    })();

    return {
      anchor,
      live: { live: live.map(round4), minOutcome: liveMinOutcome, minVal: round4(liveInfo.minVal), margin: round4(liveInfo.margin) },
      decay,
      flip,
      note,
    };
  }

  function minInfo(vals) {
    const minVal = Math.min(...vals);
    const minIdxs = [];
    for (let i = 0; i < 3; i++) if (Math.abs(vals[i] - minVal) <= eps) minIdxs.push(i);
    const sorted = [...vals].sort((a, b) => a - b);
    const margin = Math.max(0, sorted[1] - sorted[0]);
    return { minVal, minIdxs, margin };
  }

  function setEquals(a, b) {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }
}

// ✅ 把“之前的群体输出(conclusion/votes/strongSignals…)” + “现在的竞彩初盘锚点/临盘衰减/反转(jingcaiTiming)”一起输出
// 用法：把你之前那 8 家公司的数据放进 books，同时传入 jingcaiOpen/jingcaiLive

const books = [
  { name: "竞彩", k: [0.83, 0.92, 0.93] },
  { name: "澳彩", k: [0.89, 0.96, 0.87] },
  { name: "365", k: [0.97, 0.93, 0.93] },
  { name: "威廉", k: [0.95, 0.93, 0.93] },
  { name: "立博", k: [0.92, 0.96, 0.93] },
  { name: "韦德", k: [0.95, 0.96, 0.93] },
  { name: "Crown", k: [0.95, 0.96, 0.95] },
  { name: "易胜博", k: [0.97, 0.96, 0.93] },
];

const output = analyzeKellyHeat(books, {
  outcomeLabels: ["主", "平", "客"],
  mainBookName: "竞彩",
  mainBookWeight: 1.8,
  mainBookClearMargin: 0.03,
  strongMargin: 0.04,

  // ✅ 现在的竞彩“初盘锚点 + 临盘衰减/反转”
  jingcaiOpen: [0.81, 0.92, 0.97],
  jingcaiLive: [0.83, 0.92, 0.93],
  anchorMinMargin: 0.03,
  flipMinMargin: 0.03,
  decayRatio: 0.35,
  decayAbs: 0.02,
});

console.log(JSON.stringify(output, null, 2));

/*
输出说明（同一个 output 对象里）：
- output.conclusion           => 之前的“群体投票”冷热结论（热/次热/冷 + 一致性）
- output.details.votes        => 之前的 raw/weighted 票数
- output.details.strongSignals=> 之前识别的“强信号公司”
- output.jingcaiTiming        => 新增的“竞彩初盘锚点 + 临盘衰减/反转”态度
*/
