<template>
  <van-popup
    v-model:show="showPopup"
    position="bottom"
    :style="{ maxHeight: '80vh' }"
    :round="!betStore.betSuccess"
    @close="handleClose"
  >
    <div class="bet-popup">
      <!-- 投注成功状态 -->
      <div v-if="betStore.betSuccess" class="bet-success">
        <!-- 关闭按钮 -->
        <div class="popup-header">
          <span class="close-btn" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </span>
        </div>
        
        <!-- 投注信息 -->
        <div class="bet-info">
          <div class="bet-type">{{ currentBet?.betType }} <span class="score">({{ currentBet?.homeScore }} - {{ currentBet?.awayScore }})</span></div>
          <div class="league-name">{{ currentBet?.league }}</div>
          <div class="match-name">{{ currentBet?.homeTeam }} v {{ currentBet?.awayTeam }}</div>
          <div class="selection">
            <span class="team-name">{{ currentBet?.selection }}</span>
            <span class="handicap">{{ currentBet?.value }}</span>
            <span class="at">@</span>
            <span class="odds">{{ currentBet?.odds }}</span>
          </div>
        </div>
        
        <!-- 确认状态 -->
        <div class="confirm-status">
          <span class="status-text confirmed">已确认</span>
          <span class="order-id">{{ betStore.lastBetResult?.orderId }}</span>
        </div>
        
        <!-- 金额信息 -->
        <div class="amount-info">
          <div class="amount-row">
            <span class="label">下注金额</span>
            <span class="value">{{ betStore.lastBetResult?.amount?.toFixed(2) }}</span>
          </div>
          <div class="amount-row">
            <span class="label">可赢额</span>
            <span class="value highlight">{{ betStore.lastBetResult?.potentialWin?.toFixed(2) }}</span>
          </div>
        </div>
        
        <!-- 成功提示 -->
        <div class="success-banner">
          您已成功投注。
        </div>
        
        <!-- 底部按钮 -->
        <div class="success-actions">
          <button class="btn-secondary" @click="handleKeepOptions">保留选项</button>
          <button class="btn-primary" @click="handleComplete">完成</button>
        </div>
      </div>
      
      <!-- 投注输入状态 -->
      <div v-else class="bet-input">
        <!-- 投注信息区域 -->
        <div class="bet-info-section">
          <div class="info-content">
            <div class="bet-type">{{ currentBet?.betType }} <span class="score">({{ currentBet?.homeScore }} - {{ currentBet?.awayScore }})</span></div>
            <div class="league-name">{{ currentBet?.league }}</div>
            <div class="match-name">{{ currentBet?.homeTeam }} v {{ currentBet?.awayTeam }}</div>
            <div class="selection">
              <span class="team-name">{{ currentBet?.selection }}</span>
              <span class="handicap">{{ currentBet?.value }}</span>
              <span class="at">@</span>
              <span class="odds">{{ currentBet?.odds }}</span>
            </div>
          </div>
          <span class="close-btn" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </span>
        </div>
        
        <!-- 金额输入区域 -->
        <div class="amount-input-section">
          <div class="input-row">
            <input 
              type="text" 
              class="amount-input" 
              :value="betStore.betAmount"
              placeholder="输入下注金额"
              readonly
              @click="showKeyboard = true"
            />
            <span class="max-bet" @click="handleMaxBet">最大投注金额</span>
          </div>
        </div>

        <!-- 变盘后必须由用户确认最新盘口 -->
        <div v-if="betStore.quoteChange" class="quote-change">
          <div class="quote-change-title">盘口或赔率已变化</div>
          <div class="quote-change-row">
            <span>原盘口</span>
            <span>{{ betStore.quoteChange.oldValue }} @ {{ betStore.quoteChange.oldOdds }}</span>
          </div>
          <div class="quote-change-row latest">
            <span>最新盘口</span>
            <span>{{ betStore.quoteChange.currentQuote.value }} @ {{ betStore.quoteChange.currentQuote.odds }}</span>
          </div>
          <button class="accept-quote-btn" @click="handleAcceptLatestQuote">接受新赔率</button>
        </div>
        
        <!-- 自定义数字键盘 -->
        <div class="custom-keyboard" v-if="showKeyboard">
          <div class="keyboard-row">
            <button class="key num" @click="handleKeyPress('1')">1</button>
            <button class="key num" @click="handleKeyPress('2')">2</button>
            <button class="key num" @click="handleKeyPress('3')">3</button>
            <button class="key num" @click="handleKeyPress('4')">4</button>
            <button class="key num" @click="handleKeyPress('5')">5</button>
          </div>
          <div class="keyboard-row">
            <button class="key num" @click="handleKeyPress('6')">6</button>
            <button class="key num" @click="handleKeyPress('7')">7</button>
            <button class="key num" @click="handleKeyPress('8')">8</button>
            <button class="key num" @click="handleKeyPress('9')">9</button>
            <button class="key num" @click="handleKeyPress('0')">0</button>
          </div>
          <div class="keyboard-row func-row">
            <button class="key func" @click="handleDelete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M9 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9l-7-9 7-9z"/>
                <line x1="14" y1="9" x2="14" y2="15"/>
              </svg>
            </button>
            <button class="key func" @click="handleAddAmount(100)">+100</button>
            <button class="key func" @click="handleAddAmount(500)">+500</button>
            <button class="key func" @click="handleAddAmount(1000)">+1,000</button>
            <button class="key func" @click="showKeyboard = false">完成</button>
          </div>
        </div>
        
        <!-- 底部操作区 -->
        <div class="bet-actions">
          <div class="remember-row">
            <label class="remember-checkbox">
              <input type="checkbox" v-model="rememberAmount" />
              <span class="checkmark"></span>
              <span class="label-text">记住此次下注金额</span>
            </label>
          </div>
          <button 
            class="btn-bet" 
            :class="{ disabled: !canBet }"
            :disabled="!canBet"
            @click="handleBet"
          >
            <span class="bet-text">{{ betStore.loading ? '提交中...' : '下注' }}</span>
            <span class="bet-amount">{{ betStore.betAmount || '0.00' }} RMB</span>
          </button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useBetStore, useUserStore } from '@/store'
import { Toast } from 'vant'

// 封装 showToast
const showToast = (message) => {
  Toast(message)
}

const betStore = useBetStore()
const userStore = useUserStore()

const showKeyboard = ref(false)
const rememberAmount = ref(false)

// 当前投注数据
const currentBet = computed(() => betStore.currentBet)

// 弹窗显示状态
const showPopup = computed({
  get: () => betStore.showBetPopup,
  set: (val) => {
    if (!val) {
      betStore.closeBetPopup()
    }
  }
})

// 是否可以投注
const canBet = computed(() => {
  const amount = parseFloat(betStore.betAmount) || 0
  return (
    amount > 0 &&
    amount <= userStore.balance &&
    !betStore.loading &&
    !betStore.quoteChange
  )
})

// 监听弹窗打开，自动显示键盘
watch(showPopup, (val) => {
  if (val && !betStore.betSuccess) {
    showKeyboard.value = true
  }
})

// 处理关闭
const handleClose = () => {
  betStore.closeBetPopup()
  showKeyboard.value = false
}

// 处理按键输入
const handleKeyPress = (key) => {
  const current = betStore.betAmount || ''
  if (current.length < 10) {
    betStore.setBetAmount(current + key)
  }
}

// 处理删除
const handleDelete = () => {
  const current = betStore.betAmount || ''
  if (current.length > 0) {
    betStore.setBetAmount(current.slice(0, -1))
  }
}

// 处理快捷金额
const handleAddAmount = (amount) => {
  betStore.addAmount(amount)
}

// 处理最大投注
const handleMaxBet = () => {
  betStore.setBetAmount(userStore.balance.toString())
}

// 添加到注单
const handleAddToSlip = () => {
  if (betStore.addToSlip()) {
    showToast('已添加到注单')
  }
}

// 确认投注
const handleBet = async () => {
  if (!canBet.value) {
    showToast('请输入有效的投注金额')
    return
  }
  
  const amount = parseFloat(betStore.betAmount)
  
  // 调用API投注
  const result = await betStore.confirmBet()
  
  if (result.success) {
    // 投注成功，更新本地余额
    userStore.deductBalance(amount)
    showKeyboard.value = false
  } else {
    showToast(result.message)
  }
}

// 接受最新盘口后仍需由用户再次点击下注
const handleAcceptLatestQuote = () => {
  betStore.acceptLatestQuote()
  showToast('已更新为最新赔率，请重新确认下注')
}

// 保留选项
const handleKeepOptions = () => {
  betStore.betSuccess = false
  betStore.betAmount = ''
  showKeyboard.value = true
}

// 完成
const handleComplete = () => {
  betStore.completeBet()
}
</script>

<style lang="less" scoped>
.bet-popup {
  background-color: var(--bg-white);
}

.quote-change {
  margin: 12px 16px;
  padding: 12px;
  border: 1px solid #E6A23C;
  border-radius: 6px;
  background-color: #FDF6EC;

  .quote-change-title {
    margin-bottom: 8px;
    color: #B26A00;
    font-size: 14px;
    font-weight: 600;
  }

  .quote-change-row {
    display: flex;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 24px;

    &.latest {
      color: #C5483D;
      font-weight: 600;
    }
  }

  .accept-quote-btn {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 0;
    border-radius: 4px;
    background-color: #C5A35A;
    color: #FFF;
  }
}

// 投注输入状态
.bet-input {
  .bet-info-section {
    display: flex;
    padding: 16px;
    border-bottom: 1px solid var(--border-color-light);
  }
  
  .info-content {
    flex: 1;
  }
  
  .close-btn {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 28px;
    color: var(--text-light);
    cursor: pointer;
    
    &:active {
      opacity: 0.7;
    }
  }
  
  .bet-type {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 4px;
    
    .score {
      color: #D4A574;
    }
  }
  
  .league-name {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }
  
  .match-name {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  
  .selection {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .team-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .handicap {
      font-size: 15px;
      font-weight: 600;
      color: #D4A574;
    }
    
    .at {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .odds {
      font-size: 15px;
      font-weight: 600;
      color: #C9302C;
    }
  }
}

// 金额输入区域
.amount-input-section {
  padding: 16px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.amount-input {
  flex: 1;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-white);
  
  &::placeholder {
    color: var(--text-light);
  }
}

.max-bet {
  font-size: 13px;
  color: #C9302C;
  white-space: nowrap;
  cursor: pointer;
  text-decoration: underline;
  
  &:active {
    opacity: 0.7;
  }
}

// 自定义键盘
.custom-keyboard {
  background-color: #4A4A4A;
  padding: 6px 4px;
}

.keyboard-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.func-row {
    margin-top: 2px;
  }
}

.key {
  flex: 1;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  
  &.num {
    background-color: #F5F5F5;
    font-size: 18px;
    font-weight: 400;
    color: var(--text-primary);
    
    &:active {
      background-color: #E0E0E0;
    }
  }
  
  &.func {
    background-color: #7A7A7A;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-white);
    
    &:active {
      background-color: #666;
    }
  }
}

// 底部操作区
.bet-actions {
  display: flex;
  align-items: stretch;
  height: 50px;
  background-color: #E5E5E5;
}

.remember-row {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 16px;
}

.remember-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  
  input {
    display: none;
  }
  
  .checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid #999;
    border-radius: 50%;
    margin-right: 8px;
    position: relative;
    
    &::after {
      content: '';
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      background-color: #D4A574;
      border-radius: 50%;
    }
  }
  
  input:checked + .checkmark {
    border-color: #D4A574;
    
    &::after {
      display: block;
    }
  }
  
  .label-text {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.btn-bet {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--btn-green);
  border: none;
  color: var(--text-white);
  cursor: pointer;
  
  &:active {
    background-color: var(--btn-green-dark);
  }
  
  &.disabled {
    background-color: #9CA3AF;
    pointer-events: none;
  }
  
  .bet-text {
    font-size: 14px;
  }
  
  .bet-amount {
    font-size: 12px;
    opacity: 0.9;
  }
}

// 投注成功状态
.bet-success {
  .popup-header {
    display: flex;
    justify-content: flex-end;
    padding: 12px 12px 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--text-light);
    cursor: pointer;
    
    &:active {
      opacity: 0.7;
    }
  }
  
  .bet-info {
    padding: 0 16px 16px;
  }

  .bet-type {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 4px;
    
    .score {
      color: #D4A574;
    }
  }

  .league-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .match-name {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .selection {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .team-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .handicap {
      font-size: 15px;
      font-weight: 600;
      color: #D4A574;
    }
    
    .at {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .odds {
      font-size: 15px;
      font-weight: 600;
      color: #C9302C;
    }
  }
  
  .confirm-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color-light);
    border-bottom: 1px solid var(--border-color-light);
  }
  
  .status-text {
    font-size: 14px;
    
    &.confirmed {
      color: var(--text-red);
    }
  }
  
  .order-id {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  .amount-info {
    padding: 16px;
  }
  
  .amount-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .value {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      
      &.highlight {
        color: var(--text-red);
      }
    }
  }
  
  .success-banner {
    background-color: var(--btn-green);
    color: var(--text-white);
    text-align: center;
    padding: 12px;
    font-size: 14px;
  }
  
  .success-actions {
    display: flex;
    height: 50px;
    
    .btn-secondary {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-gray);
      border: none;
      font-size: 14px;
      color: var(--text-primary);
      cursor: pointer;
      
      &:active {
        background-color: #E5E5E5;
      }
    }
    
    .btn-primary {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #666;
      border: none;
      font-size: 14px;
      color: var(--text-white);
      cursor: pointer;
      
      &:active {
        opacity: 0.9;
      }
    }
  }
}

// 成功回执的金额按左右两列展示，保留原有确认与完成行为。
.bet-success {
  .popup-header { padding: 0; height: 10px; .close-btn { display: none; } }
  .bet-info { padding: 4px 16px 12px; }
  .bet-type, .league-name, .match-name { font-size: 14px; margin-bottom: 2px; }
  .selection { gap: 6px; .team-name, .handicap, .odds { font-size: 17px; } .handicap { color: var(--accent-gold); } }
  .confirm-status { padding: 4px 16px 14px; border: 0; }
  .status-text.confirmed { color: var(--text-green); }
  .order-id { font-size: 14px; }
  .amount-info { display: flex; justify-content: space-between; padding: 0 16px 16px; }
  .amount-row { flex-direction: column; align-items: flex-start; margin: 0; &:last-child { align-items: flex-end; } .value { font-size: 18px; line-height: 1.2; } .value.highlight { color: var(--text-green); } }
  .success-banner { padding: 3px 12px; background: #187e60; font-size: 13px; }
  .success-actions { height: 56px; .btn-secondary { background: #ededeb; color: #666; } .btn-primary { background: #535451; font-weight: 600; } }
}

</style>
