<template>
  <van-popup
    v-model:show="modalVisible"
    :position="isDesktop ? 'center' : 'bottom'"
    :round="!successOrder"
    :style="{ maxHeight: '90vh' }"
    class="score-bet-popup"
    @close="closeScoreBet"
  >
    <section v-if="selectedMatch" class="score-betting">
      <header class="score-header">
        <div>
          <strong>{{ successOrder ? '比分投注成功' : '比分投注' }}</strong>
          <p>{{ selectedMatch.league }} · {{ selectedMatch.homeTeam }} vs {{ selectedMatch.awayTeam }}</p>
        </div>
        <button type="button" aria-label="关闭" @click="successOrder ? finishScoreBet() : closeScoreBet()">×</button>
      </header>

      <template v-if="successOrder">
        <div class="success-content">
          <div>订单号：{{ successOrder.orderId }}</div>
          <div>投注选项：{{ successOrder.selection }} {{ successOrder.value }}</div>
          <div>赔率：{{ successOrder.odds }}</div>
          <div>投注金额：¥{{ Number(successOrder.amount).toFixed(2) }}</div>
          <div>可赢利润：¥{{ Number(successOrder.potentialWin).toFixed(2) }}</div>
        </div>
        <button class="submit-button" type="button" @click="finishScoreBet">完成</button>
      </template>

      <template v-else>
        <div class="score-row">
          <label for="home-score-range">{{ selectedMatch.homeTeam }}进球</label>
          <button type="button" aria-label="主队进球减一" :disabled="homeGoals === 0" @click="homeGoals -= 1; updateScore()">−</button>
          <input id="home-score-range" v-model.number="homeGoals" type="range" min="0" max="5" step="1" @input="updateScore" />
          <button type="button" aria-label="主队进球加一" :disabled="homeGoals === 5" @click="homeGoals += 1; updateScore()">+</button>
          <output>{{ homeGoals }}</output>
        </div>
        <div class="score-ticks" aria-label="主队进球刻度">
          <button v-for="score in scoreValues" :key="score" type="button" :class="{ active: homeGoals === score }" @click="selectHomeGoals(score)">{{ score }}</button>
        </div>

        <label class="input-label" for="score-odds">比分赔率</label>
        <input id="score-odds" v-model="odds" class="number-input" type="number" min="1.01" step="0.01" inputmode="decimal" placeholder="手动输入赔率" />

        <div class="score-row">
          <label for="away-score-range">{{ selectedMatch.awayTeam }}进球</label>
          <button type="button" aria-label="客队进球减一" :disabled="awayGoals === 0" @click="awayGoals -= 1; updateScore()">−</button>
          <input id="away-score-range" v-model.number="awayGoals" type="range" min="0" max="5" step="1" @input="updateScore" />
          <button type="button" aria-label="客队进球加一" :disabled="awayGoals === 5" @click="awayGoals += 1; updateScore()">+</button>
          <output>{{ awayGoals }}</output>
        </div>
        <div class="score-ticks" aria-label="客队进球刻度">
          <button v-for="score in scoreValues" :key="score" type="button" :class="{ active: awayGoals === score }" @click="selectAwayGoals(score)">{{ score }}</button>
        </div>

        <div class="other-options" aria-label="其他比分选项">
          <button type="button" :class="{ active: selectedOther === 'home' }" @click="selectOther('home')">胜其他</button>
          <button type="button" :class="{ active: selectedOther === 'draw' }" @click="selectOther('draw')">平其他</button>
          <button type="button" :class="{ active: selectedOther === 'away' }" @click="selectOther('away')">负其他</button>
        </div>

        <div class="selection-summary">
          <span>投注选项</span>
          <strong>{{ selectionLabel }}</strong>
        </div>

        <div v-if="quoteChange" class="quote-change">
          比赛信息已更新。当前比分 {{ quoteChange.homeScore }}:{{ quoteChange.awayScore }}
          <button type="button" @click="acceptLatestMatch">确认最新信息</button>
        </div>

        <label class="input-label" for="score-amount">投注金额</label>
        <input id="score-amount" v-model="amount" class="number-input" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="输入投注金额" />
        <div class="amount-summary">
          <span>当前余额 ¥{{ Number(userBalance).toFixed(2) }}</span>
          <span>预计可赢利润 ¥{{ potentialWin }}</span>
        </div>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <button class="submit-button" type="button" :disabled="submitting || Boolean(quoteChange)" @click="submitScoreBet">
          {{ submitting ? '提交中…' : '确认下注' }}
        </button>
      </template>
    </section>
  </van-popup>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useScoreBetting } from '@/composables/useScoreBetting';

const isDesktop = ref(window.matchMedia('(min-width: 768px)').matches);
const {
  modalVisible,
  selectedMatch,
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
  userBalance,
  closeScoreBet,
  updateScore,
  selectHomeGoals,
  selectAwayGoals,
  selectOther,
  acceptLatestMatch,
  submitScoreBet,
  finishScoreBet
} = useScoreBetting();

function updateDesktopState() {
  isDesktop.value = window.matchMedia('(min-width: 768px)').matches;
}

onMounted(() => {
  window.addEventListener('resize', updateDesktopState);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDesktopState);
});
</script>

<style lang="less" scoped>
.score-betting {
  width: min(520px, 100vw);
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

.score-header,
.score-row,
.selection-summary,
.amount-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.score-header {
  margin-bottom: 20px;

  strong {
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: #737b85;
    font-size: 13px;
  }

  button {
    border: 0;
    background: transparent;
    font-size: 26px;
  }
}

.score-row {
  min-height: 54px;
  margin: 12px 0;

  label {
    min-width: 72px;
    font-size: 14px;
  }

  input[type='range'] {
    flex: 1;
    min-width: 80px;
    accent-color: #c5a35a;
    touch-action: pan-y;
  }

  button {
    width: 36px;
    height: 36px;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
    font-size: 20px;
  }

  output {
    min-width: 22px;
    color: #c9302c;
    font-size: 18px;
    font-weight: 700;
    text-align: center;
  }
}

.input-label {
  display: block;
  margin: 12px 0 6px;
  color: #555d66;
  font-size: 13px;
}

.score-ticks {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
  margin: -4px 28px 8px 84px;

  button {
    min-height: 32px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #555d66;
    background: #fff;
  }

  button.active {
    border-color: #c5a35a;
    color: #8d6d2d;
    background: #faf5e9;
  }
}

.number-input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #d9dde3;
  border-radius: 8px;
  font: inherit;
}

.other-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 12px 0;

  button {
    min-height: 40px;
    border: 1px solid #d9dde3;
    border-radius: 8px;
    background: #fff;
  }

  button.active {
    border-color: #c5a35a;
    color: #8d6d2d;
    background: #faf5e9;
  }
}

.selection-summary,
.amount-summary {
  padding: 12px 0;
  font-size: 14px;
}

.selection-summary strong,
.amount-summary span:last-child {
  color: #c9302c;
}

.quote-change {
  margin: 8px 0;
  padding: 10px;
  border-radius: 8px;
  background: #fff7e6;
  color: #805c18;
  font-size: 13px;

  button {
    display: block;
    margin-top: 8px;
    border: 0;
    color: #805c18;
    background: transparent;
    font-weight: 600;
  }
}

.error-message {
  margin: 8px 0;
  color: #c9302c;
  font-size: 13px;
}

.submit-button {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: #198754;
  font-size: 16px;
  font-weight: 600;
}

.submit-button:disabled {
  background: #9ca3af;
}

.success-content {
  display: grid;
  gap: 12px;
  margin: 20px 0;
  color: #444;
  font-size: 14px;
}

@media (min-width: 768px) {
  .score-betting {
    width: min(520px, calc(100vw - 32px));
    border-radius: 12px;
  }
}
</style>
