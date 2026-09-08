<template>
  <div class="bet-records-view">
    <!-- 顶部导航 -->
    <TopNavBar />
    
    <!-- 主标签页 -->
    <div class="main-tabs">
      <div 
        class="main-tab"
        :class="{ active: mainTab === 'transaction' }"
        @click="mainTab = 'transaction'"
      >
        交易状况
      </div>
      <div 
        class="main-tab"
        :class="{ active: mainTab === 'history' }"
        @click="mainTab = 'history'"
      >
        帐户历史
      </div>
    </div>
    
    <!-- 交易状况页面 -->
    <div v-if="mainTab === 'transaction'" class="transaction-page">
      <!-- 页面标题 -->
      <div class="page-header">
        <span class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </span>
        <h2 class="title">交易状况</h2>
        <div class="placeholder"></div>
      </div>
      
      <!-- 筛选 -->
      <div class="filter-section">
        <div class="sport-select">
          <span class="select-text">所有体育</span>
          <div class="select-icons">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 14l5-5 5 5z"/></svg>
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="dropdown-icon"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      
      <!-- 交易注单列表 -->
      <div class="bet-list">
        <div v-for="(bet, index) in pendingBets" :key="index" class="bet-card">
          <!-- 联赛信息 -->
          <div class="bet-header">
            <div class="header-left">
              <div class="league-name">{{ bet.league }}</div>
              <div class="match-info">{{ bet.homeTeam }}  v  {{ bet.awayTeam }}</div>
            </div>
            <span class="cash-icon">$</span>
          </div>
          
          <!-- 投注详情 -->
          <div class="bet-detail">
            <div class="bet-type">{{ bet.betType }} <span class="score">({{ bet.score }})</span></div>
            <div class="bet-selection">
              <span class="team">{{ bet.selection }}</span>
              <span class="handicap">{{ bet.handicap }}</span>
              <span class="at">@</span>
              <span class="odds">{{ bet.odds }}</span>
            </div>
            <div class="bet-amounts">
              <span class="amount-item">投注金额: <b>{{ bet.amount }}</b></span>
              <span class="amount-item win">可赢金额: <b>{{ bet.potentialWin }}</b></span>
            </div>
            <div class="bet-meta">
              <span class="order-id">{{ bet.orderId }}</span>
              <span class="time">{{ bet.time }} ({{ bet.market }})</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 总计 -->
      <div class="total-bar">
        <span class="total-label">总共:</span>
        <span class="total-value">{{ totalAmount }}</span>
      </div>
      
      <!-- 时区提示 -->
      <div class="timezone-notice">
        <div class="notice-box">
          <p>交易时间显示时区为GMT-4。</p>
          <p class="time-display">{{ currentTime }}</p>
        </div>
      </div>
    </div>
    
    <!-- 帐户历史页面 -->
    <div v-else class="history-page">
      <!-- 总览视图 -->
      <template v-if="historyView === 'overview'">
        <!-- 页面标题 -->
        <div class="page-header">
          <span class="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </span>
          <h2 class="title">帐户历史总览</h2>
          <div class="placeholder"></div>
        </div>
        
        <!-- 筛选区域 -->
        <div class="filter-section">
          <div class="sport-select">
            <span class="select-text">所有体育</span>
            <div class="select-icons">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 14l5-5 5 5z"/></svg>
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="dropdown-icon"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          
          <!-- 日期选择 -->
          <div class="date-row">
            <div class="date-picker" @click="showFromDatePicker = !showFromDatePicker">
              <span class="date-label">从</span>
              <span class="date-value">{{ fromDate }}</span>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              
              <!-- 日期下拉 -->
              <div v-if="showFromDatePicker" class="date-dropdown">
                <div 
                  v-for="date in dateOptions" 
                  :key="date"
                  class="date-option"
                  :class="{ selected: fromDate === date }"
                  @click.stop="selectFromDate(date)"
                >
                  <span v-if="fromDate === date" class="check-icon">✓</span>
                  {{ date }}
                </div>
              </div>
            </div>
            <div class="date-picker" @click="showToDatePicker = !showToDatePicker">
              <span class="date-label">到</span>
              <span class="date-value">{{ toDate }}</span>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              
              <!-- 日期下拉 -->
              <div v-if="showToDatePicker" class="date-dropdown">
                <div 
                  v-for="date in dateOptions" 
                  :key="date"
                  class="date-option"
                  :class="{ selected: toDate === date }"
                  @click.stop="selectToDate(date)"
                >
                  <span v-if="toDate === date" class="check-icon">✓</span>
                  {{ date }}
                </div>
              </div>
            </div>
            <button class="search-btn" @click="searchHistory">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 数据表格 -->
        <div class="data-table">
          <div class="table-header">
            <div class="col col-date">日期</div>
            <div class="col col-amount">投注金额</div>
            <div class="col col-valid">有效金额</div>
            <div class="col col-result">赢 / 输</div>
          </div>
          
          <div class="table-body">
            <div 
              class="table-row clickable" 
              v-for="(record, index) in filteredRecords" 
              :key="index"
              :class="{ 'has-data': record.betAmount }"
              @click="viewDayDetail(record)"
            >
              <div class="col col-date">
                <div class="date-main" :class="{ bold: record.betAmount }">{{ record.date }}</div>
                <div class="date-sub">{{ record.weekday }}</div>
              </div>
              <div class="col col-amount">{{ formatNumber(record.betAmount) }}</div>
              <div class="col col-valid">{{ formatNumber(record.validAmount) }}</div>
              <div class="col col-result" :class="getResultClass(record.result)">
                {{ formatResult(record.result) }}
              </div>
            </div>
          </div>
          
          <!-- 总共行 -->
          <div class="table-total">
            <div class="col col-date">总共:</div>
            <div class="col col-amount"><b>{{ historyTotals.betAmount }}</b></div>
            <div class="col col-valid"><b>{{ historyTotals.validAmount }}</b></div>
            <div class="col col-result positive"><b>{{ historyTotals.result }}</b></div>
          </div>
        </div>
        
        <!-- 回到顶部按钮 -->
        <div class="back-to-top-wrapper">
          <button class="back-to-top-btn" @click="scrollToTop">回到顶部</button>
        </div>
        
        <!-- 时区提示 -->
        <div class="timezone-notice">
          <div class="notice-box">
            <p>交易时间显示时区为GMT-4。</p>
          </div>
        </div>
      </template>
      
      <!-- 详细视图 -->
      <template v-else>
        <!-- 页面标题 -->
        <div class="page-header">
          <span class="back-btn" @click="backToOverview">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </span>
          <h2 class="title">注单号 / 投注日期</h2>
          <div class="placeholder"></div>
        </div>
        
        <!-- 筛选区域 -->
        <div class="filter-section">
          <div class="filter-row">
            <div class="detail-select">
              <span class="select-text">{{ selectedDateDisplay }}</span>
              <div class="select-icons">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 14l5-5 5 5z"/></svg>
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="dropdown-icon"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="detail-select">
              <span class="select-text">所有体育</span>
              <div class="select-icons">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 14l5-5 5 5z"/></svg>
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="dropdown-icon"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
        </div>
        
        <!-- 当天注单列表 -->
        <div class="detail-bet-list">
          <div v-for="(bet, index) in dayBets" :key="index" class="detail-bet-card">
            <!-- 联赛信息 -->
            <div class="bet-header">
              <div class="header-left">
                <div class="league-name">{{ bet.league }}</div>
                <div class="match-info">{{ bet.homeTeam }}  v  {{ bet.awayTeam }}</div>
              </div>
            </div>
            
            <!-- 投注详情 -->
            <div class="bet-detail">
              <div class="bet-type-row">
                <span class="bet-type-text">{{ bet.betType }}</span>
                <span class="final-score">{{ bet.finalScore }}</span>
              </div>
              <div class="bet-selection">
                <span class="team">{{ bet.selection }}</span>
                <span class="handicap">{{ bet.handicap }}</span>
                <span class="at">@</span>
                <span class="odds">{{ bet.odds }}</span>
              </div>
              <div class="bet-amounts">
                <span class="amount-item">投注金额: <b>{{ bet.amount }}</b></span>
                <span class="amount-item" :class="getWinLossClass(bet.winLoss, bet.resultText === '注单平局')">
                  赢 / 输: <b>{{ formatWinLoss(bet.winLoss, bet.resultText) }}</b>
                </span>
              </div>
              <div class="bet-meta">
                <span class="order-id">{{ bet.orderId }}</span>
                <span class="time">{{ bet.time }} ({{ bet.market }})</span>
              </div>
              <div v-if="bet.needConfirm" class="confirm-link">
                <span class="confirm-text">确认</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 总计栏 -->
        <div class="detail-total-bar">
          <span class="total-label">总共:</span>
          <span class="total-amount">{{ dayTotals.amount }}</span>
          <span class="total-winloss" :class="getWinLossClass(dayTotals.winLossValue)">{{ dayTotals.winLoss }}</span>
        </div>
        
        <!-- 回到顶部按钮 -->
        <div class="back-to-top-wrapper">
          <button class="back-to-top-btn" @click="scrollToTop">回到顶部</button>
        </div>
        
        <!-- 时区提示 -->
        <div class="timezone-notice">
          <div class="notice-box">
            <p>交易时间显示时区为GMT-4。</p>
            <p class="time-display">{{ currentTime }}</p>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar activeTab="records" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopNavBar from '@/components/TopNavBar.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import { useBetStore, useAccountStore, useUserStore } from '@/store'
import {
  formatFixedTime,
  getRecentFixedDates,
  useFixedGmtMinusFourClock
} from '@/composables/useFixedGmtMinusFourTime';

const router = useRouter()
const betStore = useBetStore()
const accountStore = useAccountStore()
const userStore = useUserStore()
const { currentTime } = useFixedGmtMinusFourClock();

const mainTab = ref('transaction')

// 帐户历史视图模式: 'overview' 总览 | 'detail' 详细
const historyView = ref('overview')

// 选中的日期（用于详细视图）
const selectedDate = ref('')
const selectedDateDisplay = ref('')
const selectedWeekday = ref('')

// 当天的投注记录
const dayBets = ref([])

// 日期选择
const showFromDatePicker = ref(false)
const showToDatePicker = ref(false)

// 动态生成最近7天日期选项（倒序，最新日期在前）
const generateDateOptions = () => {
  return getRecentFixedDates(7);
}

const dateOptions = generateDateOptions()

// 默认日期范围：从7天前到今天
const fromDate = ref(dateOptions[dateOptions.length - 1]) // 7天前
const toDate = ref(dateOptions[0]) // 今天

const selectFromDate = (date) => {
  fromDate.value = date
  showFromDatePicker.value = false
}

const selectToDate = (date) => {
  toDate.value = date
  showToDatePicker.value = false
}

// 筛选后的记录 - 从store获取
const filteredRecords = computed(() => accountStore.history)

// 搜索历史记录 - 调用API
const searchHistory = async () => {
  await accountStore.fetchHistory(fromDate.value, toDate.value)
}

// 点击日期行查看当天详细
const viewDayDetail = async (record) => {
  if (!record.betAmount) return // 没有数据的日期不可点击
  
  selectedDate.value = record.rawDate || record.date
  selectedDateDisplay.value = record.date + ' ' + record.weekday
  selectedWeekday.value = record.weekday
  
  // 获取当天的投注记录
  await fetchDayBets(selectedDate.value)
  
  historyView.value = 'detail'
  scrollToTop()
}

// 获取当天投注记录
const fetchDayBets = async (date) => {
  try {
    const data = await betStore.fetchBetRecords({
      startDate: date,
      endDate: date,
      status: 'all'
    })
    
    // 格式化投注记录
    const records = data.list || data || []
    dayBets.value = records.map(record => {
      const time = formatFixedTime(record.createdAt || record.timestamp);
      
      // 根据 result 计算赢/输金额
      let winLoss = null
      const amount = record.amount || 0
      const odds = record.odds || 0
      
      // 优先根据 result 字段计算赢/输
      if (record.result) {
        switch (record.result) {
          case 'win':
            // 赢: 使用 actualWin 或计算 amount * odds
            winLoss = record.actualWin ?? (amount * odds)
            break
          case 'lose':
            // 输: 输掉本金
            winLoss = -amount
            break
          case 'push':
            // 走水: 退还本金，不赢不输
            winLoss = 0
            break
          case 'half_win':
            // 赢半
            winLoss = record.actualWin ?? ((amount * odds) / 2)
            break
          case 'half_lose':
            // 输半
            winLoss = -amount / 2
            break
          default:
            // pending 或其他状态
            winLoss = null
            break
        }
      } else if (record.winLoss !== undefined && record.winLoss !== null) {
        winLoss = record.winLoss
      }
      
      return {
        league: record.league || '未知联赛',
        homeTeam: record.homeTeam || '主队',
        awayTeam: record.awayTeam || '客队',
        betType: record.betType || '足球 让球',
        finalScore: `${record.finalHomeScore ?? record.homeScore ?? 0} - ${record.finalAwayScore ?? record.awayScore ?? 0}`,
        selection: record.selection || '-',
        handicap: record.value || '-',
        odds: record.odds?.toFixed(2) || '-',
        amount: record.amount?.toFixed(0) || '0',
        winLoss: winLoss,
        resultText: record.result === 'push' ? '注单平局' : null,
        orderId: record.orderId,
        time,
        market: '香港盘',
        needConfirm: record.result === 'push'
      }
    })
  } catch (error) {
    console.error('获取当天投注记录失败:', error)
    dayBets.value = []
  }
}

// 返回总览
const backToOverview = () => {
  historyView.value = 'overview'
  scrollToTop()
}

// 当天总计
const dayTotals = computed(() => {
  const totalAmount = dayBets.value.reduce((sum, bet) => sum + parseFloat(bet.amount || 0), 0)
  const totalWinLoss = dayBets.value.reduce((sum, bet) => {
    if (bet.winLoss !== null && bet.winLoss !== undefined) {
      return sum + bet.winLoss
    }
    return sum
  }, 0)
  
  return {
    amount: totalAmount.toLocaleString() + '.00',
    winLoss: formatResult(totalWinLoss),
    winLossValue: totalWinLoss
  }
})

// 获取赢/输样式类
const getWinLossClass = (value, isPush = false) => {
  if (isPush) return 'push'
  if (value === null || value === undefined) return ''
  if (value > 0) return 'win'
  if (value < 0) return 'lose'
  return ''
}

// 格式化赢/输
const formatWinLoss = (value, resultText) => {
  if (resultText) return resultText
  if (value === null || value === undefined) return '-'
  return formatResult(value)
}

// 格式化数字（千分位）
const formatNumber = (num) => {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString()
}

// 页面加载时获取数据
onMounted(async () => {
  // 获取数据
  await Promise.all([
    betStore.fetchPendingBets(),
    accountStore.fetchHistory(fromDate.value, toDate.value),
    userStore.fetchBalance()
  ])
  
})

// 计算总共 - 从store获取汇总数据
const historyTotals = computed(() => {
  const summary = accountStore.summary
  return {
    betAmount: summary.totalBetAmount > 0 ? summary.totalBetAmount.toLocaleString() : '-',
    validAmount: summary.totalValidAmount > 0 ? summary.totalValidAmount.toLocaleString() : '-',
    result: summary.totalWinLoss > 0 ? summary.totalWinLoss.toFixed(2) : (summary.totalWinLoss < 0 ? summary.totalWinLoss.toFixed(2) : '-')
  }
})

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 从store获取待结算投注记录，并格式化显示
const pendingBets = computed(() => {
  const records = betStore.pendingBets
  return records.map(record => {
    const time = formatFixedTime(record.createdAt || record.timestamp);
    
    return {
      league: record.league || '未知联赛',
      homeTeam: record.homeTeam || '主队',
      awayTeam: record.awayTeam || '客队',
      betType: record.betType || '足球 (滚球) 让球',
      score: `${record.homeScore || 0} - ${record.awayScore || 0}`,
      selection: record.selection || '-',
      handicap: record.value || '-',
      odds: record.odds?.toFixed(2) || '-',
      amount: record.amount?.toFixed(2) || '0.00',
      potentialWin: record.potentialWin?.toFixed(2) || '0.00',
      orderId: record.orderId,
      time,
      market: '香港盘'
    }
  })
})

const totalAmount = computed(() => {
  return pendingBets.value.reduce((sum, bet) => sum + parseFloat(bet.amount), 0).toFixed(2)
})


// 获取结果样式类
const getResultClass = (result) => {
  if (result === null || result === undefined) return ''
  if (result > 0) return 'positive'
  if (result < 0) return 'negative'
  return 'zero'
}

// 格式化结果（每3位加逗号）
const formatResult = (result) => {
  if (result === null || result === undefined) return '-'
  const num = result.toFixed(2)
  const parts = num.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

const goBack = () => {
  router.back()
}
</script>

<style lang="less" scoped>
.bet-records-view {
  min-height: 100vh;
  background-color: var(--bg-white);
  padding-top: 44px;
  padding-bottom: 70px;
}

.main-tabs {
  display: flex;
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
}

.main-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  
  &.active {
    color: #D4A574;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #D4A574;
    }
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #5D5346 0%, #4A4339 100%);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--text-white);
  cursor: pointer;
  
  &:active {
    opacity: 0.7;
  }
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-white);
  margin: 0;
}

.placeholder {
  width: 28px;
}

.filter-section {
  padding: 16px;
  background-color: var(--bg-white);
}

.sport-select {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
  
  .select-text {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
  }
  
  .select-icons {
    display: flex;
    flex-direction: column;
    margin-right: 8px;
    color: var(--text-light);
  }
  
  .dropdown-icon {
    color: var(--text-light);
  }
}

.date-row {
  display: flex;
  gap: 12px;
}

.date-picker {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  
  .date-label {
    font-size: 12px;
    color: var(--text-light);
    margin-right: 8px;
  }
  
  .date-value {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
  }
  
  svg {
    color: var(--text-light);
  }
}

.date-dropdown {
  position: absolute;
  top: 100%;
  left: -1px;
  right: -1px;
  background-color: #4A4339;
  border-radius: 8px;
  z-index: 100;
  margin-top: 4px;
  padding: 8px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.date-option {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-white);
  cursor: pointer;
  
  &:active {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &.selected {
    color: var(--text-white);
  }
  
  .check-icon {
    margin-right: 12px;
    font-size: 16px;
  }
}

.search-btn {
  width: 48px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #888;
  border: none;
  border-radius: 4px;
  color: var(--text-white);
  cursor: pointer;
  flex-shrink: 0;
  
  &:active {
    opacity: 0.8;
  }
}

// 交易状况页面
.bet-list {
  padding: 0;
}

.bet-card {
  background-color: var(--bg-white);
}

.bet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #5D5346;
  
  .header-left {
    flex: 1;
  }
  
  .league-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-white);
    margin-bottom: 4px;
  }
  
  .match-info {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .cash-icon {
    width: 22px;
    height: 22px;
    background-color: #D4A574;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    margin-left: 12px;
  }
}

.bet-detail {
  padding: 12px 16px 16px;
  
  .bet-type {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 4px;
    
    .score {
      color: #D4A574;
    }
  }
  
  .bet-selection {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    
    .team {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .handicap {
      font-size: 14px;
      font-weight: 600;
      color: #D4A574;
    }
    
    .at {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .odds {
      font-size: 14px;
      font-weight: 600;
      color: #C9302C;
    }
  }
  
  .bet-amounts {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    
    .amount-item {
      font-size: 13px;
      color: var(--text-primary);
      
      b {
        font-weight: 600;
      }
      
      &.win {
        b {
          color: #4CAF50;
        }
      }
    }
  }
  
  .bet-meta {
    display: flex;
    justify-content: space-between;
    
    .order-id, .time {
      font-size: 13px;
      color: var(--text-primary);
    }
  }
}

.total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #5D5346;
  
  .total-label {
    font-size: 14px;
    color: var(--text-white);
  }
  
  .total-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-white);
  }
}

.timezone-notice {
  padding: 24px 16px;
  
  .notice-box {
    border: 1px dashed var(--border-color);
    border-radius: 4px;
    padding: 20px;
    text-align: center;
    
    p {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary);
      
      &.time-display {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        margin-top: 8px;
      }
    }
  }
}

// 帐户历史页面
.data-table {
  background-color: var(--bg-white);
}

.table-header {
  display: flex;
  background-color: #5D5346;
  padding: 12px 0;
}

.table-header .col {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-white);
  text-align: center;
}

.table-body {
  background-color: var(--bg-white);
}

.table-row {
  display: flex;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color-light);
  
  &.has-data {
    .date-main {
      font-weight: 600;
    }
  }
}

.table-total {
  display: flex;
  padding: 12px 0;
  background-color: #5D5346;
  
  .col {
    color: var(--text-white);
    
    b {
      font-weight: 600;
    }
    
    &.positive {
      color: #D4A574;
    }
  }
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-primary);
  
  &.col-date {
    flex: 1.2;
  }
  
  &.col-amount, &.col-valid {
    flex: 1;
  }
  
  &.col-result {
    flex: 1;
    
    &.positive {
      color: #4CAF50;
    }
    
    &.negative {
      color: #E74C3C;
    }
    
    &.zero {
      color: var(--text-primary);
    }
  }
}

.date-main {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  
  &.bold {
    font-weight: 600;
  }
}

.date-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.back-to-top-wrapper {
  padding: 20px 16px;
}

.back-to-top-btn {
  width: 100%;
  height: 48px;
  background-color: #888;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  color: var(--text-white);
  cursor: pointer;
  
  &:active {
    opacity: 0.8;
  }
}

// 可点击的行
.table-row.clickable {
  cursor: pointer;
  
  &:active {
    background-color: #f5f5f5;
  }
}

// 详细视图样式
.filter-row {
  display: flex;
  gap: 12px;
}

.detail-select {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  
  .select-text {
    flex: 1;
    font-size: 14px;
    color: var(--text-primary);
  }
  
  .select-icons {
    display: flex;
    flex-direction: column;
    margin-right: 8px;
    color: var(--text-light);
  }
  
  .dropdown-icon {
    color: var(--text-light);
  }
}

.detail-bet-list {
  padding: 0;
}

.detail-bet-card {
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color-light);
  
  .bet-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #5D5346;
    
    .header-left {
      flex: 1;
    }
    
    .league-name {
      font-size: 14px;
      font-weight: 500;
      color: #D4A574;
      margin-bottom: 4px;
    }
    
    .match-info {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .bet-detail {
    padding: 12px 16px 16px;
    
    .bet-type-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      
      .bet-type-text {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .final-score {
        font-size: 14px;
        color: var(--text-primary);
      }
    }
    
    .bet-selection {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      
      .team {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .handicap {
        font-size: 14px;
        font-weight: 600;
        color: #D4A574;
      }
      
      .at {
        font-size: 14px;
        color: var(--text-secondary);
      }
      
      .odds {
        font-size: 14px;
        font-weight: 600;
        color: #C9302C;
      }
    }
    
    .bet-amounts {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      
      .amount-item {
        font-size: 13px;
        color: var(--text-primary);
        
        b {
          font-weight: 600;
        }
        
        &.win {
          b {
            color: #4CAF50;
          }
        }
        
        &.lose {
          b {
            color: #E74C3C;
          }
        }
        
        &.push {
          b {
            color: var(--text-primary);
            font-weight: 600;
          }
        }
      }
    }
    
    .bet-meta {
      display: flex;
      justify-content: space-between;
      
      .order-id, .time {
        font-size: 13px;
        color: var(--text-primary);
      }
    }
    
    .confirm-link {
      margin-top: 8px;
      
      .confirm-text {
        font-size: 13px;
        color: #D4A574;
        cursor: pointer;
      }
    }
  }
}

.detail-total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #5D5346;
  
  .total-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-white);
  }
  
  .total-amount {
    flex: 1;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-white);
  }
  
  .total-winloss {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-white);
    
    &.win {
      color: #4CAF50;
    }
    
    &.lose {
      color: #E74C3C;
    }
  }
}

// 按参考图统一交易记录的色彩和信息密度。
.main-tab { height: 48px; }
.main-tab.active { color: var(--accent-gold); &::after { background: var(--accent-gold); } }
.page-header { height: 48px; padding: 0 16px; background: #e8e5e1; }
.back-btn { color: #595954; }
.title { color: #111; font-size: 18px; font-weight: 600; }
.sport-select { min-height: 48px; padding: 10px 8px; border-color: #aaa; margin-bottom: 16px; }
.sport-select .select-text { font-size: 16px; color: #555; }
.select-icons { display: none !important; }
.sport-select .dropdown-icon { margin-right: 8px; color: #666; }
.transaction-page .sport-select { margin-bottom: 0; }
.date-row { gap: 8px; }
.date-picker { min-width: 0; height: 40px; padding: 3px 7px; flex-direction: column; align-items: flex-start; border-color: #aaa; }
.date-picker .date-label { font-size: 13px; line-height: 16px; color: #555; }
.date-picker .date-value { font-size: 12px; line-height: 16px; font-weight: 700; }
.date-picker > svg { position: absolute; right: 10px; top: 12px; color: #666; }
.search-btn { width: 40px; height: 40px; background: #80817e; }
.bet-header { min-height: 62px; padding: 8px 16px; align-items: center; background: var(--primary-bg-dark); }
.bet-header .league-name { font-size: 16px; font-weight: 400; margin: 0; }
.bet-header .match-info { font-size: 16px; color: #bbb5ac; }
.bet-header .cash-icon { width: 17px; height: 17px; background: #00a4d3; color: #194655; font-size: 14px; }
.bet-detail { padding: 8px 16px; }
.bet-detail .bet-type { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.bet-detail .bet-selection { margin-bottom: 4px; }
.bet-detail .bet-selection .team { font-weight: 400; }
.bet-detail .bet-selection .handicap { color: var(--accent-gold); }
.bet-detail .bet-selection .odds { color: var(--text-red); }
.bet-detail .bet-amounts .amount-item { font-size: 14px; color: #555; }
.bet-detail .bet-amounts .amount-item b { color: #111; }
.bet-detail .bet-amounts .amount-item.win b { color: var(--text-green); }
.bet-detail .bet-meta .order-id, .bet-detail .bet-meta .time { font-size: 14px; }
.table-header { background: var(--primary-bg-dark); min-height: 56px; }
.table-header .col { font-size: 15px; }
.table-row { min-height: 56px; padding: 8px 0; border: 0; }
.table-row:nth-child(even) { background: #e6e6e6; }
.col.col-date { flex: 1.5; }
.col.col-result.positive { color: var(--text-green); }
.col.col-result.negative { color: #b94756; }
.date-main, .date-sub { font-size: 15px; font-weight: 600; color: #111; margin: 0; }

</style>
