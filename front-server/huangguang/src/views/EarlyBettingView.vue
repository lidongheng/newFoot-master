<template>
  <div class="early-betting-view">
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
          <span class="breadcrumb">早盘</span>
        </div>
        <h2 class="page-title">足球</h2>
        <div class="header-right"></div>
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
      <!-- 日期选择器 -->
      <div class="date-selector hide-scrollbar">
        <div 
          class="date-item all-dates"
          :class="{ active: selectedDate === 'all' }"
          @click="selectedDate = 'all'"
        >
          <span class="date-label">所有日期</span>
        </div>
        <div 
          v-for="date in dates" 
          :key="date.day"
          class="date-item"
          :class="{ active: selectedDate === date.day }"
          @click="selectedDate = date.day"
        >
          <span class="weekday">{{ date.weekday }}</span>
          <span class="day">{{ date.day }}</span>
          <span class="month">{{ date.month }}</span>
        </div>
      </div>
      
      <!-- 日期信息 -->
      <div class="date-info">
        <span class="info-date">1月18日 星期日</span>
        <span class="info-count">所有赛事 <strong>283</strong></span>
      </div>
      
      <!-- 联赛列表 -->
      <div class="league-list">
        <div 
          v-for="country in earlyLeagues" 
          :key="country.id"
          class="country-section"
        >
          <!-- 国家标题 - 点击收起/展开 -->
          <div class="country-header" @click="toggleCountry(country.id)">
            <span class="country-flag">{{ country.flag }}</span>
            <span class="country-name">{{ country.country }}</span>
            <span class="expand-icon" :class="{ collapsed: !country.expanded }">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </span>
          </div>
          
          <!-- 联赛项 - 带过渡动画 -->
          <transition name="collapse">
            <div v-show="country.expanded" class="leagues-wrapper">
              <div 
                v-for="league in country.leagues" 
                :key="league.id"
                class="league-item"
                @click="goToLeagueMatches(league)"
              >
                <div class="checkbox" :class="{ checked: league.selected }" @click.stop="toggleLeague(country.id, league.leagueId || league.id)">
                  <svg v-if="league.selected" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <span class="league-name">{{ league.name }}</span>
                <span class="arrow-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar @switchChange="handleSwitchChange" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore, useUserStore } from '@/store'
import TopNavBar from '@/components/TopNavBar.vue'
import SportCategoryBar from '@/components/SportCategoryBar.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'

const router = useRouter()
const matchStore = useMatchStore()
const userStore = useUserStore()

// 当前运动类型
const currentSport = ref('football')

// 当前类型
const activeType = ref('matches')

// 选中的日期
const selectedDate = ref('all')

// 类型标签
const typeTabs = ref([
  { key: 'matches', label: '赛事' },
  { key: 'champion', label: '冠军' },
  { key: 'fantasy', label: '梦幻赛' }
])

// 日期数据
const dates = ref([
  { weekday: '星期日', day: '18', month: '一月' },
  { weekday: '星期一', day: '19', month: '一月' },
  { weekday: '星期二', day: '20', month: '一月' },
  { weekday: '星期三', day: '21', month: '一月' },
  { weekday: '星期四', day: '22', month: '一月' },
  { weekday: '星期五', day: '23', month: '一月' },
  { weekday: '星期六', day: '24', month: '一月' }
])

// 联赛数据 - 从store获取
const earlyLeagues = computed(() => matchStore.earlyLeagues)

// 页面加载时获取数据
onMounted(async () => {
  await Promise.all([
    matchStore.fetchLeagues(),
    userStore.fetchBalance()
  ])
})

// 处理运动类型切换
const handleSportChange = async (sport) => {
  currentSport.value = sport
  await matchStore.fetchLeagues()
}

// 切换国家展开/收起状态
const toggleCountry = (countryId) => {
  const country = earlyLeagues.value.find(c => c.id === countryId || c.country === countryId)
  if (country) {
    country.expanded = !country.expanded
  }
}

// 切换联赛选中状态
const toggleLeague = (countryId, leagueId) => {
  matchStore.toggleLeague(countryId, leagueId)
}

// 跳转到联赛比赛列表
const goToLeagueMatches = (league) => {
  router.push({
    path: '/league-matches',
    query: { name: league.name, id: league.leagueId || league.id }
  })
}

// 处理底部切换
const handleSwitchChange = (type) => {
  if (type === 'live') {
    router.push('/live')
  } else if (type === 'today') {
    router.push('/')
  }
}
</script>

<style lang="less" scoped>
.early-betting-view {
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

.breadcrumb {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-white);
  margin: 0;
}

.header-right {
  width: 50px;
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

.date-selector {
  display: flex;
  padding: 12px;
  overflow-x: auto;
  white-space: nowrap;
  background-color: var(--bg-white);
  gap: 8px;
}

.date-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding: 10px 12px;
  background-color: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.active {
    background-color: var(--accent-gold);
    
    .weekday, .day, .month, .date-label {
      color: var(--text-white);
    }
  }
  
  &.all-dates {
    background-color: var(--accent-gold);
    
    .date-label {
      color: var(--text-white);
      font-size: 13px;
      font-weight: 500;
    }
  }
}

.weekday {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.day {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.month {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.date-info {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #5D5346;
  color: var(--text-white);
  gap: 12px;
}

.info-date {
  font-size: 13px;
  opacity: 0.9;
}

.info-count {
  font-size: 13px;
  opacity: 0.9;
  
  strong {
    font-weight: 600;
  }
}

.league-list {
  background-color: var(--bg-white);
}

.country-section {
  border-bottom: 1px solid var(--border-color-light);
}

.country-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #FAFAFA;
  border-bottom: 1px solid var(--border-color-light);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:active {
    background-color: #F0F0F0;
  }
}

.country-flag {
  font-size: 20px;
  margin-right: 8px;
}

.country-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.expand-icon {
  color: var(--text-light);
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  
  &.collapsed {
    transform: rotate(-90deg);
  }
}

// 折叠动画
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

.leagues-wrapper {
  overflow: hidden;
}

.league-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color-light);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:active {
    background-color: #F5F5F5;
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.checked {
    background-color: var(--accent-gold);
    border-color: var(--accent-gold);
    color: var(--text-white);
  }
}

.league-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.arrow-icon {
  color: var(--text-light);
  display: flex;
  align-items: center;
}
</style>
