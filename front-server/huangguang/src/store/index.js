/**
 * Pinia Store 配置
 * 体育博彩应用状态管理
 * 对接后端 API
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api'
import { formatFixedDate } from '@/composables/useFixedGmtMinusFourTime';

// 用户账户Store
export const useUserStore = defineStore('user', () => {
  // 状态
  const balance = ref(0)
  const betSlipCount = ref(0)
  const loading = ref(false)

  // 格式化余额
  const formattedBalance = computed(() => {
    return balance.value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  })

  // 投注记录数量（从betStore获取）
  const betRecordCount = computed(() => {
    const betStore = useBetStore()
    return betStore.recordCount
  })

  // 从API获取余额
  async function fetchBalance() {
    try {
      loading.value = true
      const data = await api.getBalance()
      balance.value = data.balance
      return true;
    } catch (error) {
      console.error('获取余额失败:', error)
      return false;
    } finally {
      loading.value = false
    }
  }

  // 更新余额
  function updateBalance(amount) {
    balance.value = amount
  }

  // 扣减余额（投注时调用）
  function deductBalance(amount) {
    if (balance.value >= amount) {
      balance.value -= amount
      return true
    }
    return false
  }

  // 增加余额
  function addBalance(amount) {
    balance.value += amount
  }

  return {
    balance,
    betSlipCount,
    loading,
    betRecordCount,
    formattedBalance,
    fetchBalance,
    updateBalance,
    deductBalance,
    addBalance
  }
})

// 投注Store
export const useBetStore = defineStore('bet', () => {
  // 投注记录
  const betRecords = ref([])
  
  // 投注单列表
  const betSlips = ref([])
  
  // 当前选中的投注项
  const currentBet = ref(null)
  
  // 是否显示投注弹窗
  const showBetPopup = ref(false)
  
  // 投注金额
  const betAmount = ref('')
  
  // 投注成功状态
  const betSuccess = ref(false)
  
  // 最近一次投注结果
  const lastBetResult = ref(null)
  
  // 加载状态
  const loading = ref(false)

  // 变盘信息
  const quoteChange = ref(null)

  // 计算可赢金额
  const potentialWin = computed(() => {
    if (!currentBet.value || !betAmount.value) return 0
    const amount = parseFloat(betAmount.value) || 0
    if (currentBet.value.marketType === 'moneyline') {
      return (amount * (currentBet.value.odds - 1)).toFixed(2)
    }
    return (amount * currentBet.value.odds).toFixed(2)
  })

  // 投注单数量
  const slipCount = computed(() => betSlips.value.length)

  // 投注记录数量
  const recordCount = computed(() => betRecords.value.length)

  // 获取待结算投注
  const pendingBets = computed(() => {
    return betRecords.value.filter(r => r.status === 'pending')
  })

  // 从API获取待结算投注记录
  async function fetchPendingBets() {
    try {
      loading.value = true
      const data = await api.getPendingBets()
      // 更新本地记录中的待结算部分
      betRecords.value = data
    } catch (error) {
      console.error('获取投注记录失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 从API获取所有投注记录
  async function fetchBetRecords(params = {}) {
    try {
      loading.value = true
      const data = await api.getBetRecords(params)
      betRecords.value = data.list || data
      return data
    } catch (error) {
      console.error('获取投注记录失败:', error)
      return { list: [], total: 0 }
    } finally {
      loading.value = false
    }
  }

  // 选择投注项
  function selectBet(bet) {
    currentBet.value = bet
    showBetPopup.value = true
    betAmount.value = ''
    betSuccess.value = false
    quoteChange.value = null
  }

  // 关闭投注弹窗
  function closeBetPopup() {
    showBetPopup.value = false
    betAmount.value = ''
    betSuccess.value = false
    quoteChange.value = null
  }

  // 设置投注金额
  function setBetAmount(amount) {
    betAmount.value = amount
  }

  // 追加金额
  function addAmount(amount) {
    const current = parseFloat(betAmount.value) || 0
    betAmount.value = (current + amount).toString()
  }

  // 确认投注（调用API）
  async function confirmBet() {
    if (!currentBet.value || !betAmount.value || loading.value || quoteChange.value) {
      return {
        success: false,
        message: '当前投注信息不可提交'
      }
    }
    
    const amount = parseFloat(betAmount.value)
    if (amount <= 0) {
      return {
        success: false,
        message: '投注金额必须大于0'
      }
    }

    try {
      loading.value = true
      
      // 构建投注数据
      const betData = {
        matchId: currentBet.value.matchId,
        betMode: currentBet.value.betMode,
        marketType: currentBet.value.marketType,
        selectionKey: currentBet.value.selectionKey,
        quotedValue: currentBet.value.value,
        quotedOdds: currentBet.value.odds,
        marketVersion: currentBet.value.marketVersion,
        amount
      }
      
      // 调用API提交投注
      const result = await api.placeBet(betData)
      
      // 更新本地投注记录
      betRecords.value.unshift(result)
      
      lastBetResult.value = {
        orderId: result.orderId,
        bet: {
          ...currentBet.value,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          value: result.value,
          odds: result.odds,
          marketVersion: result.marketVersion
        },
        amount: result.amount,
        potentialWin: result.potentialWin,
        timestamp: new Date()
      }

      Object.assign(currentBet.value, lastBetResult.value.bet)
      
      betSuccess.value = true
      return {
        success: true,
        order: result
      }
    } catch (error) {
      console.error('投注失败:', error)
      if (error.data?.reason === 'QUOTE_CHANGED') {
        quoteChange.value = {
          oldValue: currentBet.value.value,
          oldOdds: currentBet.value.odds,
          currentQuote: error.data.currentQuote
        }
      }
      return {
        success: false,
        reason: error.data?.reason,
        message: error.message
      }
    } finally {
      loading.value = false
    }
  }

  // 接受服务端返回的最新盘口，用户仍需再次点击下注
  function acceptLatestQuote() {
    if (!quoteChange.value) return

    const latestQuote = quoteChange.value.currentQuote
    currentBet.value.value = latestQuote.value
    currentBet.value.odds = latestQuote.odds
    currentBet.value.marketVersion = latestQuote.marketVersion
    currentBet.value.homeScore = latestQuote.homeScore
    currentBet.value.awayScore = latestQuote.awayScore
    currentBet.value.betPeriod = latestQuote.period
    currentBet.value.betMinute = latestQuote.minute
    quoteChange.value = null
  }

  // 添加到注单
  function addToSlip() {
    if (!currentBet.value) return false
    
    // 检查是否已存在
    const exists = betSlips.value.some(
      slip => slip.matchId === currentBet.value.matchId && 
              slip.type === currentBet.value.type
    )
    
    if (!exists) {
      betSlips.value.push({ ...currentBet.value })
    }
    
    return true
  }

  // 从注单移除
  function removeFromSlip(index) {
    betSlips.value.splice(index, 1)
  }

  // 清空注单
  function clearSlips() {
    betSlips.value = []
  }

  // 完成投注（关闭所有弹窗，重置状态）
  function completeBet() {
    showBetPopup.value = false
    currentBet.value = null
    betAmount.value = ''
    betSuccess.value = false
    lastBetResult.value = null
    quoteChange.value = null
  }

  // 结算投注（API调用）
  async function settleBetOrder(orderId, result, finalScore) {
    try {
      await api.settleBet(orderId, {
        result,
        finalHomeScore: finalScore?.home,
        finalAwayScore: finalScore?.away
      })
      // 刷新投注记录
      await fetchPendingBets()
    } catch (error) {
      console.error('结算失败:', error)
    }
  }

  return {
    betSlips,
    betRecords,
    currentBet,
    showBetPopup,
    betAmount,
    betSuccess,
    lastBetResult,
    loading,
    quoteChange,
    potentialWin,
    slipCount,
    recordCount,
    pendingBets,
    fetchPendingBets,
    fetchBetRecords,
    selectBet,
    closeBetPopup,
    setBetAmount,
    addAmount,
    confirmBet,
    acceptLatestQuote,
    addToSlip,
    removeFromSlip,
    clearSlips,
    completeBet,
    settleBetOrder
  }
})

// 比赛数据Store
export const useMatchStore = defineStore('match', () => {
  // 当前选中的运动类型
  const currentSport = ref('football')
  
  // 当前选中的标签页
  const currentTab = ref('today')
  
  // 滚球比赛数据
  const liveMatches = ref([])
  
  // 今日比赛数据
  const todayMatches = ref([])
  
  // 早盘联赛数据
  const earlyLeagues = ref([])
  
  // 加载状态
  const loading = ref(false)

  // 兼容旧的 matches 属性（返回滚球或今日比赛）
  const matches = computed(() => {
    return currentTab.value === 'live' ? liveMatches.value : todayMatches.value
  })

  // 获取滚球比赛
  async function fetchLiveMatches(sportId = 'football') {
    try {
      loading.value = true
      const data = await api.getLiveMatches(sportId)
      liveMatches.value = data
    } catch (error) {
      console.error('获取滚球比赛失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取今日比赛
  async function fetchTodayMatches(sportId = 'football') {
    try {
      loading.value = true
      const data = await api.getTodayMatches(sportId)
      todayMatches.value = data
    } catch (error) {
      console.error('获取今日比赛失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 获取早盘联赛
  async function fetchLeagues() {
    try {
      loading.value = true
      const data = await api.getLeagues()
      // 处理联赛数据，添加选中状态
      earlyLeagues.value = data.map(country => ({
        ...country,
        expanded: true,
        leagues: country.leagues.map(league => ({
          ...league,
          selected: false
        }))
      }))
    } catch (error) {
      console.error('获取联赛失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 设置当前运动类型
  function setSport(sport) {
    currentSport.value = sport
  }

  // 设置当前标签页
  function setTab(tab) {
    currentTab.value = tab
  }

  // 切换联赛选中状态
  function toggleLeague(countryId, leagueId) {
    const country = earlyLeagues.value.find(c => c.id === countryId || c.country === countryId)
    if (country) {
      const league = country.leagues.find(l => l.leagueId === leagueId || l.id === leagueId)
      if (league) {
        league.selected = !league.selected
      }
    }
  }

  return {
    currentSport,
    currentTab,
    liveMatches,
    todayMatches,
    earlyLeagues,
    matches,
    loading,
    fetchLiveMatches,
    fetchTodayMatches,
    fetchLeagues,
    setSport,
    setTab,
    toggleLeague
  }
})

// 账户历史Store
export const useAccountStore = defineStore('account', () => {
  // 历史记录
  const history = ref([])
  
  // 汇总数据
  const summary = ref({
    totalBetAmount: 0,
    totalValidAmount: 0,
    totalWinLoss: 0
  })
  
  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date) => {
    return formatFixedDate(date);
  }
  
  // 计算最近7天的日期范围
  const getDefaultDateRange = () => {
    const today = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(today.getDate() - 6) // 包含今天共7天
    return {
      startDate: formatDate(sevenDaysAgo),
      endDate: formatDate(today)
    }
  }
  
  const defaultRange = getDefaultDateRange()
  
  // 筛选条件
  const filters = ref({
    sport: '所有体育',
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate
  })
  
  // 加载状态
  const loading = ref(false)

  // 从API获取账户历史
  async function fetchHistory(startDate, endDate) {
    try {
      loading.value = true
      const data = await api.getAccountHistory(startDate, endDate)
      // 映射字段名：API返回winLoss，前端使用result
      history.value = (data.dailyRecords || []).map(record => ({
        rawDate: record.date,  // 保存原始日期格式用于API查询
        date: record.dateDisplay || record.date,
        weekday: record.weekday,
        betAmount: record.betAmount,
        validAmount: record.validAmount,
        result: record.winLoss  // 将 winLoss 映射为 result
      }))
      summary.value = data.summary || {
        totalBetAmount: 0,
        totalValidAmount: 0,
        totalWinLoss: 0
      }
      return data
    } catch (error) {
      console.error('获取账户历史失败:', error)
      return { dailyRecords: [], summary: {} }
    } finally {
      loading.value = false
    }
  }

  // 更新筛选条件
  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  return {
    history,
    summary,
    filters,
    loading,
    fetchHistory,
    setFilters
  }
})
