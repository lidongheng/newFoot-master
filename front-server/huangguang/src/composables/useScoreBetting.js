import { computed, ref, watch } from 'vue';
import { useBetStore, useUserStore } from '@/store';
import * as api from '@/api';

const modalVisible = ref(false);
const selectedMatch = ref(null);
const selectedBetMode = ref('early');
const homeGoals = ref(0);
const awayGoals = ref(0);
const selectedOther = ref('');
const odds = ref('');
const amount = ref('');
const quoteChange = ref(null);
const successOrder = ref(null);
const errorMessage = ref('');
const submitting = ref(false);

const excludedExactScores = [[5, 3], [5, 4], [5, 5], [3, 5], [4, 5]];
const scoreValues = [0, 1, 2, 3, 4, 5];
const scoreSelection = computed(() => {
  if (selectedOther.value) {
    return { type: 'other', outcome: selectedOther.value };
  }

  const isExcluded = excludedExactScores.some(([home, away]) => home === homeGoals.value && away === awayGoals.value);
  if (isExcluded) {
    if (homeGoals.value > awayGoals.value) {
      return { type: 'other', outcome: 'home' };
    }
    if (homeGoals.value < awayGoals.value) {
      return { type: 'other', outcome: 'away' };
    }
    return { type: 'other', outcome: 'draw' };
  }

  return { type: 'exact', homeScore: homeGoals.value, awayScore: awayGoals.value };
});

const selectionLabel = computed(() => {
  if (scoreSelection.value.type === 'exact') {
    return `${scoreSelection.value.homeScore}:${scoreSelection.value.awayScore}`;
  }

  const labels = { home: '胜其他', draw: '平其他', away: '负其他' };
  return labels[scoreSelection.value.outcome];
});

const potentialWin = computed(() => {
  const stake = Number(amount.value);
  const decimalOdds = Number(odds.value);
  if (!Number.isFinite(stake) || !Number.isFinite(decimalOdds) || stake <= 0 || decimalOdds <= 1) {
    return '0.00';
  }
  return (stake * (decimalOdds - 1)).toFixed(2);
});

const selectionIdentity = computed(() => JSON.stringify(scoreSelection.value));
watch(selectionIdentity, (next, previous) => {
  if (previous && next !== previous) {
    odds.value = '';
  }
});

function openScoreBet(match, betMode) {
  selectedMatch.value = match;
  selectedBetMode.value = betMode;
  homeGoals.value = 0;
  awayGoals.value = 0;
  selectedOther.value = '';
  odds.value = '';
  amount.value = '';
  quoteChange.value = null;
  successOrder.value = null;
  errorMessage.value = '';
  modalVisible.value = true;
}

function closeScoreBet() {
  modalVisible.value = false;
  quoteChange.value = null;
  errorMessage.value = '';
}

function updateScore() {
  selectedOther.value = '';
}

function selectHomeGoals(score) {
  homeGoals.value = score;
  updateScore();
}

function selectAwayGoals(score) {
  awayGoals.value = score;
  updateScore();
}

function selectOther(outcome) {
  const examples = { home: [5, 3], draw: [5, 5], away: [3, 5] };
  homeGoals.value = examples[outcome][0];
  awayGoals.value = examples[outcome][1];
  selectedOther.value = outcome;
}

function acceptLatestMatch() {
  if (!quoteChange.value) {
    return;
  }

  selectedMatch.value = {
    ...selectedMatch.value,
    marketVersion: quoteChange.value.marketVersion,
    homeScore: quoteChange.value.homeScore,
    awayScore: quoteChange.value.awayScore,
    period: quoteChange.value.period,
    minute: quoteChange.value.minute
  };
  quoteChange.value = null;
}

async function submitScoreBet() {
  const userStore = useUserStore();
  const betStore = useBetStore();
  const stake = Number(amount.value);
  const decimalOdds = Number(odds.value);

  errorMessage.value = '';
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    errorMessage.value = '请输入大于1的有效比分赔率';
    return;
  }
  if (!Number.isFinite(stake) || stake <= 0) {
    errorMessage.value = '请输入有效的投注金额';
    return;
  }
  if (stake > userStore.balance) {
    errorMessage.value = '投注金额不能超过当前余额';
    return;
  }
  if (quoteChange.value) {
    errorMessage.value = '请先确认最新比赛信息';
    return;
  }

  submitting.value = true;
  try {
    const order = await api.placeBet({
      matchId: selectedMatch.value.matchId,
      betMode: selectedBetMode.value,
      marketType: 'correctScore',
      scoreSelection: scoreSelection.value,
      quotedOdds: decimalOdds,
      marketVersion: selectedMatch.value.marketVersion,
      amount: stake
    });
    successOrder.value = order;
    await Promise.all([userStore.fetchBalance(), betStore.fetchBetRecords({ status: 'all' })]);
  } catch (error) {
    if (error.data?.reason === 'QUOTE_CHANGED') {
      quoteChange.value = error.data.currentQuote;
      errorMessage.value = '比赛信息已更新，请确认后重新下注';
    } else {
      errorMessage.value = error.message;
    }
  } finally {
    submitting.value = false;
  }
}

function finishScoreBet() {
  closeScoreBet();
  successOrder.value = null;
}

export function useScoreBetting() {
  const userStore = useUserStore();
  return {
    modalVisible,
    selectedMatch,
    selectedBetMode,
    homeGoals,
    awayGoals,
    selectedOther,
    scoreValues,
    odds,
    amount,
    quoteChange,
    successOrder,
    errorMessage,
    submitting,
    selectionLabel,
    potentialWin,
    userBalance: computed(() => userStore.balance),
    openScoreBet,
    closeScoreBet,
    updateScore,
    selectHomeGoals,
    selectAwayGoals,
    selectOther,
    acceptLatestMatch,
    submitScoreBet,
    finishScoreBet
  };
}
