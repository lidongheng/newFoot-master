<template>
  <div class="match-card">
    <!-- 联赛标题 -->
    <div class="league-header">
      <span class="league-icon">{{ match.leagueIcon }}</span>
      <span class="league-name">{{ match.league }}</span>
      <span v-if="!match.bettingOpen" class="closed-tag">封盘</span>
    </div>
    
    <!-- 比赛信息 -->
    <div class="match-content">
      <!-- 左侧：收藏+时间+球队 -->
      <div class="match-left">
        <div class="match-info-row">
          <span class="favorite-btn" @click.stop="toggleFavorite">
            <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
          <span class="match-time">{{ matchTime }}</span>
        </div>
        
        <div class="teams-wrapper">
          <div class="team-row">
            <span class="team-score">{{ match.homeScore }}</span>
            <span class="team-name">{{ match.homeTeam }}</span>
          </div>
          <div class="team-row">
            <span class="team-score">{{ match.awayScore }}</span>
            <span class="team-name">{{ match.awayTeam }}</span>
          </div>
        </div>
        
        <div class="match-meta">
          <span class="match-minute">{{ match.minute }}'</span>
          <span v-if="match.hasVideo" class="meta-icon video-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9.5 7.5v9l7-4.5z"/>
            </svg>
          </span>
          <span v-if="match.hasCash" class="meta-icon cash-icon">$</span>
        </div>
      </div>
      
      <!-- 右侧：赔率 -->
      <div class="odds-section">
        <div class="odds-header">
          <span>让球</span>
          <span>大/小</span>
          <span>独赢</span>
        </div>
        
        <!-- 让球和大小赔率 -->
        <div class="odds-row">
          <div 
            class="odds-cell"
            :class="{ selected: selectedOdds === 'handicap-home', disabled: !match.bettingOpen }"
            @click="selectOdds('handicap-home', match.odds.handicap.home)"
          >
            <span class="odds-value">{{ match.odds.handicap.home.value }}</span>
            <span class="odds-number">{{ formatOdds(match.odds.handicap.home.odds) }}</span>
          </div>
          <div 
            class="odds-cell"
            :class="{ selected: selectedOdds === 'over', disabled: !match.bettingOpen }"
            @click="selectOdds('over', match.odds.overUnder.over)"
          >
            <span class="odds-value">{{ match.odds.overUnder.over.value }}</span>
            <span class="odds-number">{{ formatOdds(match.odds.overUnder.over.odds) }}</span>
          </div>
          <div 
            class="odds-cell moneyline"
            :class="{ selected: selectedOdds === 'moneyline-home', disabled: !match.bettingOpen }"
            @click="selectOdds('moneyline-home', match.odds.moneyline.home)"
          >
            <span class="odds-label">{{ match.odds.moneyline.home.label }}</span>
            <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.home.odds) }}</span>
          </div>
        </div>
        
        <div class="odds-row">
          <div 
            class="odds-cell"
            :class="{ selected: selectedOdds === 'handicap-away', disabled: !match.bettingOpen }"
            @click="selectOdds('handicap-away', match.odds.handicap.away)"
          >
            <span class="odds-value">{{ match.odds.handicap.away.value }}</span>
            <span class="odds-number">{{ formatOdds(match.odds.handicap.away.odds) }}</span>
          </div>
          <div 
            class="odds-cell"
            :class="{ selected: selectedOdds === 'under', disabled: !match.bettingOpen }"
            @click="selectOdds('under', match.odds.overUnder.under)"
          >
            <span class="odds-value">{{ match.odds.overUnder.under.value }}</span>
            <span class="odds-number">{{ formatOdds(match.odds.overUnder.under.odds) }}</span>
          </div>
          <div 
            class="odds-cell moneyline"
            :class="{ selected: selectedOdds === 'moneyline-away', disabled: !match.bettingOpen }"
            @click="selectOdds('moneyline-away', match.odds.moneyline.away)"
          >
            <span class="odds-label">{{ match.odds.moneyline.away.label }}</span>
            <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.away.odds) }}</span>
          </div>
        </div>
        
        <div class="odds-row">
          <div class="odds-cell empty"></div>
          <div class="odds-cell empty"></div>
          <div 
            class="odds-cell moneyline"
            :class="{ selected: selectedOdds === 'moneyline-draw', disabled: !match.bettingOpen }"
            @click="selectOdds('moneyline-draw', match.odds.moneyline.draw)"
          >
            <span class="odds-label">{{ match.odds.moneyline.draw.label }}</span>
            <span class="odds-number highlight">{{ formatOdds(match.odds.moneyline.draw.odds) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 更多玩法 -->
    <div class="more-options">
      <span class="option-tag">让球&大/小 <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M7 10l5 5 5-5z"/></svg></span>
      <span class="option-tag">角球 <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M7 10l5 5 5-5z"/></svg></span>
      <span class="option-tag">波胆 <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M7 10l5 5 5-5z"/></svg></span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useBetStore } from '@/store'
import { formatFixedHourMinute } from '@/composables/useFixedGmtMinusFourTime';

const props = defineProps({
  match: {
    type: Object,
    required: true
  }
})

const betStore = useBetStore()
const isFavorite = ref(false)
const selectedOdds = ref('')
const matchTime = computed(() => formatFixedHourMinute(props.match.startTime));

// 格式化赔率，保留两位小数
const formatOdds = (odds) => {
  if (odds === null || odds === undefined) return '-'
  return Number(odds).toFixed(2)
}

// 切换收藏
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
}

// 选择赔率进行投注
const selectOdds = (type, oddsData) => {
  if (!props.match.bettingOpen) return

  selectedOdds.value = type
  
  // 确定选择的球队
  let selection = ''
  let betType = '足球 (滚球) 让球'
  let marketType = ''
  let selectionKey = ''
  
  if (type.includes('handicap')) {
    // 让球: home是主队让球行, away是客队让球行
    selection = type.includes('home') ? props.match.homeTeam : props.match.awayTeam
    betType = '足球 (滚球) 让球'
    marketType = 'handicap'
    selectionKey = type.includes('home') ? 'home' : 'away'
  } else if (type.includes('over') || type.includes('under')) {
    // 大小球
    selection = type === 'over' ? '大' : '小'
    betType = '足球 (滚球) 大/小'
    marketType = 'overUnder'
    selectionKey = type
  } else if (type.includes('moneyline')) {
    // 独赢
    if (type.includes('home')) {
      selection = props.match.homeTeam
      selectionKey = 'home'
    } else if (type.includes('away')) {
      selection = props.match.awayTeam
      selectionKey = 'away'
    } else {
      selection = '和'
      selectionKey = 'draw'
    }
    betType = '足球 (滚球) 独赢'
    marketType = 'moneyline'
  }
  
  // 构造投注数据
  const betData = {
    matchId: props.match.matchId,
    league: props.match.league,
    homeTeam: props.match.homeTeam,
    awayTeam: props.match.awayTeam,
    homeScore: props.match.homeScore,
    awayScore: props.match.awayScore,
    betMode: 'live',
    marketType,
    selectionKey,
    marketVersion: props.match.marketVersion,
    type,
    selection,
    value: marketType === 'moneyline' ? oddsData.label : oddsData.value,
    odds: oddsData.odds,
    betType
  }
  
  betStore.selectBet(betData)
}
</script>

<style lang="less" scoped>
.match-card {
  background-color: var(--bg-white);
  margin-bottom: 8px;
}

.league-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background-color: #F8F8F8;
  border-bottom: 1px solid var(--border-color-light);
}

.league-icon {
  font-size: 18px;
  margin-right: 8px;
}

.league-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.closed-tag {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #E5E5E5;
  color: var(--text-secondary);
  font-size: 11px;
}

.match-content {
  display: flex;
  padding: 12px;
}

.match-left {
  flex: 1;
  min-width: 0;
}

.match-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #CCCCCC;
  cursor: pointer;
  
  &:active {
    transform: scale(1.1);
  }
}

.match-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.teams-wrapper {
  margin-bottom: 8px;
}

.team-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.team-score {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent-gold);
  color: var(--text-white);
  font-size: 12px;
  font-weight: 600;
  border-radius: 2px;
  margin-right: 8px;
}

.team-name {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-minute {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  
  &.cash-icon {
    width: 14px;
    height: 14px;
    background-color: #666;
    color: white;
    border-radius: 50%;
    font-size: 9px;
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
    transform: scale(0.98);
  }
  
  &.selected {
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

.odds-cell.disabled {
  cursor: not-allowed;
  opacity: 0.45;
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
