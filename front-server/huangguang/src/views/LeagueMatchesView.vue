<template>
  <div class="league-matches-view">
    <!-- 顶部导航 -->
    <TopNavBar />
    
    <!-- 运动分类 -->
    <div class="fixed-header">
      <SportCategoryBar 
        :active-sport="currentSport" 
        @change="handleSportChange" 
      />
      
      <!-- 子导航 -->
      <div class="sub-header">
        <div class="header-left">
          <span class="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </span>
          <span class="breadcrumb">足球</span>
        </div>
        <h2 class="page-title">{{ leagueName }}</h2>
        <div class="header-right">
          <span class="filter-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </span>
        </div>
      </div>
      
      <!-- 类型选择 -->
      <div class="type-tabs">
        <div 
          v-for="tab in typeTabs" 
          :key="tab.key"
          class="type-tab"
          :class="{ active: activeType === tab.key }"
          @click="activeType = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 玩法筛选 -->
      <PlayTypeFilter 
        :active-type="activePlayType"
        @change="handlePlayTypeChange"
      />
      
      <!-- 联赛标题 -->
      <div class="league-title-bar">
        <span class="league-flag">{{ leagueFlag }}</span>
        <span class="league-name">{{ leagueName }}</span>
      </div>
      
      <!-- 比赛列表 -->
      <div class="match-list">
        <div 
          v-for="(match, index) in matches" 
          :key="index"
          class="match-item"
        >
          <!-- 日期分组 -->
          <div v-if="match.showDate" class="date-divider">
            {{ match.dateText }}
          </div>
          
          <!-- 比赛信息 -->
          <div class="match-content">
            <div class="match-left">
              <div class="match-info-row">
                <span class="favorite-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </span>
                <span class="match-time">{{ match.time }}</span>
                <span class="live-icon" v-if="match.hasLive">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </span>
              </div>
              
              <div class="teams-wrapper">
                <div class="team-name">{{ match.homeTeam }}</div>
                <div class="team-name">{{ match.awayTeam }}</div>
              </div>
              
              <div class="match-meta">
                <span class="match-count">{{ match.marketCount }}</span>
                <span v-if="match.hasVideo" class="meta-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </span>
                <span v-if="match.hasCash" class="meta-icon cash">$</span>
              </div>
            </div>
            
            <!-- 赔率区域 -->
            <div class="odds-section">
              <div class="odds-header">
                <span>让球</span>
                <span>大/小</span>
                <span>独赢</span>
              </div>
              
              <div class="odds-row">
                <div class="odds-cell" @click="selectBet(match, 'handicap', 'home')">
                  <span class="odds-value">{{ match.odds.handicap.home.value }}</span>
                  <span class="odds-number">{{ formatOdds(match.odds.handicap.home.odds) }}</span>
                </div>
                <div class="odds-cell" @click="selectBet(match, 'ou', 'over')">
                  <span class="odds-value">{{ match.odds.overUnder.over.value }}</span>
                  <span class="odds-number">{{ formatOdds(match.odds.overUnder.over.odds) }}</span>
                </div>
                <div class="odds-cell moneyline" @click="selectBet(match, 'ml', 'home')">
                  <span class="odds-label">主</span>
                  <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.home.odds) }}</span>
                </div>
              </div>
              
              <div class="odds-row">
                <div class="odds-cell" @click="selectBet(match, 'handicap', 'away')">
                  <span class="odds-value">{{ match.odds.handicap.away.value }}</span>
                  <span class="odds-number">{{ formatOdds(match.odds.handicap.away.odds) }}</span>
                </div>
                <div class="odds-cell" @click="selectBet(match, 'ou', 'under')">
                  <span class="odds-value">{{ match.odds.overUnder.under.value }}</span>
                  <span class="odds-number">{{ formatOdds(match.odds.overUnder.under.odds) }}</span>
                </div>
                <div class="odds-cell moneyline" @click="selectBet(match, 'ml', 'away')">
                  <span class="odds-label">客</span>
                  <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.away.odds) }}</span>
                </div>
              </div>
              
              <div class="odds-row">
                <div class="odds-cell empty"></div>
                <div class="odds-cell empty"></div>
                <div class="odds-cell moneyline" @click="selectBet(match, 'ml', 'draw')">
                  <span class="odds-label">和</span>
                  <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.draw.odds) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 更多玩法 -->
          <div class="more-options hide-scrollbar">
            <span class="option-tag">让球&大/小 <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg></span>
            <span class="option-tag">角球 <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg></span>
            <span class="option-tag">罚牌数 <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg></span>
            <span class="option-tag">波胆 <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg></span>
            <span class="option-tag">进球球员 <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5z"/></svg></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar />
    
    <!-- 投注弹窗 -->
    <BetPopup />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBetStore, useUserStore } from '@/store'
import { getEarlyMatches } from '@/api'
import TopNavBar from '@/components/TopNavBar.vue'
import SportCategoryBar from '@/components/SportCategoryBar.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import PlayTypeFilter from '@/components/PlayTypeFilter.vue'
import BetPopup from '@/components/BetPopup.vue'

const router = useRouter()
const route = useRoute()
const betStore = useBetStore()
const userStore = useUserStore()

// 联赛ID、名称和国旗
const leagueId = computed(() => route.query.id || '')
const leagueName = computed(() => route.query.name || '')
// 从比赛数据中获取国旗
const leagueFlag = computed(() => {
  if (matches.value.length > 0 && matches.value[0].leagueIcon) {
    return matches.value[0].leagueIcon
  }
  return '🏳️'
})

// 当前运动类型
const currentSport = ref('football')

// 当前类型
const activeType = ref('matches')

// 当前玩法类型
const activePlayType = ref('main')

// 加载状态
const loading = ref(false)

// 类型标签
const typeTabs = ref([
  { key: 'matches', label: '赛事' },
  { key: 'champion', label: '冠军' },
  { key: 'fantasy', label: '梦幻赛' }
])

// 比赛数据
const matches = ref([])

// 获取比赛数据
const fetchMatches = async () => {
  try {
    loading.value = true
    const data = await getEarlyMatches(leagueId.value)
    matches.value = data || []
  } catch (error) {
    console.error('获取比赛数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 页面加载时获取数据
onMounted(async () => {
  await Promise.all([
    fetchMatches(),
    userStore.fetchBalance()
  ])
})

// 格式化赔率，保留两位小数
const formatOdds = (odds) => {
  if (odds === null || odds === undefined) return '-'
  return Number(odds).toFixed(2)
}

// 返回
const goBack = () => {
  router.back()
}

// 处理运动类型切换
const handleSportChange = (sport) => {
  currentSport.value = sport
}

// 处理玩法类型切换
const handlePlayTypeChange = (type) => {
  activePlayType.value = type
}

// 选择投注
const selectBet = (match, type, selection) => {
  let odds, value, selectionName
  let marketType
  let betType
  
  if (type === 'handicap') {
    odds = match.odds.handicap[selection].odds
    value = match.odds.handicap[selection].value
    selectionName = selection === 'home' ? match.homeTeam : match.awayTeam
    marketType = 'handicap'
    betType = '足球 (早盘) 让球'
  } else if (type === 'ou') {
    odds = match.odds.overUnder[selection].odds
    value = match.odds.overUnder[selection].value
    selectionName = selection === 'over' ? '大' : '小'
    marketType = 'overUnder'
    betType = '足球 (早盘) 大小'
  } else {
    // moneyline 结构是 { label, odds }
    odds = match.odds.moneyline[selection].odds
    value = match.odds.moneyline[selection].label
    if (selection === 'home') {
      selectionName = match.homeTeam
    } else if (selection === 'away') {
      selectionName = match.awayTeam
    } else {
      selectionName = '平局'
    }
    marketType = 'moneyline'
    betType = '足球 (早盘) 独赢'
  }
  
  betStore.selectBet({
    matchId: match.matchId,
    league: leagueName.value,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    betMode: 'early',
    marketType,
    selectionKey: selection,
    marketVersion: match.marketVersion,
    type,
    selection: selectionName,
    value,
    odds,
    betType
  })
}
</script>

<style lang="less" scoped>
.league-matches-view {
  min-height: 100vh;
  background-color: var(--bg-gray);
}

.fixed-header {
  position: fixed;
  top: 44px;
  left: 0;
  right: 0;
  z-index: 99;
  max-width: 750px;
  margin: 0 auto;
  background: linear-gradient(180deg, #5D5346 0%, #6B6353 100%);
}

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.header-left {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  
  &:active {
    opacity: 0.7;
  }
}

.breadcrumb {
  font-size: 12px;
  margin-left: 4px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-white);
  margin: 0;
}

.header-right {
  color: rgba(255, 255, 255, 0.8);
}

.filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  
  &:active {
    opacity: 0.7;
  }
}

.type-tabs {
  display: flex;
  padding: 0 12px 8px;
  gap: 16px;
}

.type-tab {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding-bottom: 4px;
  
  &.active {
    color: var(--accent-gold);
    border-bottom: 2px solid var(--accent-gold);
  }
}

.content-wrapper {
  padding-top: 170px;
  padding-bottom: 100px;
  min-height: 100vh;
}

.league-title-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color-light);
}

.league-flag {
  font-size: 20px;
  margin-right: 8px;
}

.league-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.match-list {
  background-color: var(--bg-white);
}

.match-item {
  border-bottom: 8px solid var(--bg-gray);
}

.date-divider {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color-light);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    background-color: var(--text-primary);
  }
}

.match-content {
  display: flex;
  padding: 12px 16px;
}

.match-left {
  flex: 1;
  min-width: 0;
}

.match-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CCCCCC;
  cursor: pointer;
}

.match-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.live-icon {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
}

.teams-wrapper {
  margin-bottom: 8px;
}

.team-name {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-weight: 500;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.match-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  
  &.cash {
    width: 18px;
    height: 18px;
    background-color: #666;
    color: white;
    border-radius: 50%;
    font-size: 10px;
    font-weight: bold;
  }
}

.odds-section {
  flex-shrink: 0;
  margin-left: 8px;
}

.odds-header {
  display: flex;
  margin-bottom: 4px;
  
  span {
    flex: 1;
    min-width: 60px;
    text-align: center;
    font-size: 11px;
    color: var(--text-light);
  }
}

.odds-row {
  display: flex;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.odds-cell {
  flex: 1;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  margin: 0 2px;
  background-color: transparent;
  border: 1px solid #E0E0E0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    background-color: var(--accent-gold);
    border-color: var(--accent-gold);
    
    .odds-value, .odds-number, .odds-label {
      color: var(--text-white);
    }
  }
  
  &.empty {
    background-color: transparent;
    border: none;
    pointer-events: none;
  }
  
  &.moneyline {
    flex-direction: row;
    gap: 4px;
  }
}

.odds-value {
  font-size: 11px;
  color: var(--text-primary);
}

.odds-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-red);
  
  &.highlight {
    color: var(--text-red);
  }
}

.odds-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.more-options {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color-light);
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
}

.option-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background-color: #F5F5F5;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  
  svg {
    margin-left: 2px;
  }
  
  &:active {
    background-color: #EBEBEB;
  }
}

.match-content { padding: 12px 8px; }
.odds-section { width: 55%; margin-left: 6px; }
.odds-header span, .odds-cell { min-width: 0; }
.odds-header span { font-size: 12px; }
.odds-cell { border-color: #e9e9e9; border-radius: 3px; padding: 6px 2px; }
.odds-value, .odds-label { font-size: 13px; color: #111; }
.odds-number { font-size: 14px; font-weight: 700; }
.option-tag { border-radius: 16px; background: linear-gradient(#f6f6f5, #e6e6e4); font-weight: 600; color: #444; }
</style>
