<template>
  <div class="account-history-view">
    <!-- 顶部导航 -->
    <TopNavBar />
    
    <!-- 固定头部 -->
    <div class="fixed-header">
      <!-- 标签页 -->
      <div class="tab-header">
        <div 
          class="tab-item"
          :class="{ active: activeTab === 'transaction' }"
          @click="activeTab = 'transaction'"
        >
          交易状况
        </div>
        <div 
          class="tab-item"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          帐户历史
        </div>
      </div>
      
      <!-- 标题栏 -->
      <div class="title-bar">
        <span class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </span>
        <h2 class="title">帐户历史总览</h2>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <!-- 体育类型选择 -->
        <div class="filter-row">
          <div class="filter-select" @click="showSportPicker = true">
            <span class="select-value">{{ filters.sport }}</span>
            <span class="select-arrows">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="transform: rotate(180deg)">
                <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
        </div>
        
        <!-- 日期范围选择 -->
        <div class="filter-row date-row">
          <div class="date-select" @click="showStartPicker = true">
            <span class="date-label">从</span>
            <span class="date-value">{{ startDateDisplay }}</span>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="date-select" @click="showEndPicker = true">
            <span class="date-label">到</span>
            <span class="date-value">{{ endDateDisplay }}</span>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <button class="search-btn" @click="handleSearch">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="data-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="th col-date">日期</div>
          <div class="th col-bet">投注金额</div>
          <div class="th col-valid">有效金额</div>
          <div class="th col-result">赢 / 输</div>
        </div>
        
        <!-- 表格内容 -->
        <div class="table-body">
          <div 
            v-for="(item, index) in history" 
            :key="index"
            class="table-row"
            :class="{ 'has-data': item.betAmount !== null }"
          >
            <div class="td col-date">
              <div class="date-main">{{ item.date }}</div>
              <div class="date-sub">{{ item.weekday }}</div>
            </div>
            <div class="td col-bet">
              {{ item.betAmount !== null ? formatNumber(item.betAmount) : '-' }}
            </div>
            <div class="td col-valid">
              {{ item.validAmount !== null ? formatNumber(item.validAmount) : '-' }}
            </div>
            <div class="td col-result" :class="getResultClass(item.winLoss)">
              {{ item.winLoss !== null ? formatResult(item.winLoss) : '-' }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar />
    
    <!-- 体育类型选择器 -->
    <van-action-sheet
      v-model:show="showSportPicker"
      :actions="sportOptions"
      cancel-text="取消"
      @select="onSportSelect"
    />
    
    <!-- 开始日期选择器 -->
    <van-action-sheet
      v-model:show="showStartPicker"
      :actions="dateOptions"
      cancel-text="取消"
      @select="onStartDateSelect"
    />
    
    <!-- 结束日期选择器 -->
    <van-action-sheet
      v-model:show="showEndPicker"
      :actions="dateOptions"
      cancel-text="取消"
      @select="onEndDateSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/store'
import TopNavBar from '@/components/TopNavBar.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import { getRecentFixedDates } from '@/composables/useFixedGmtMinusFourTime';

const router = useRouter()
const accountStore = useAccountStore()

// 当前标签
const activeTab = ref('history')

// 显示选择器
const showSportPicker = ref(false)
const showStartPicker = ref(false)
const showEndPicker = ref(false)

// 筛选条件
const filters = computed(() => accountStore.filters)

// 日期显示格式化（YYYY-MM-DD -> MM月DD日）
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    return `${month}月${day}日`
  }
  return dateStr
}

const startDateDisplay = computed(() => formatDisplayDate(filters.value.startDate))
const endDateDisplay = computed(() => formatDisplayDate(filters.value.endDate))

// 历史数据
const history = computed(() => accountStore.history)

// 生成最近7天的日期选项
const generateDateOptions = () => {
  return getRecentFixedDates(7).map(dateStr => {
    const [, month, day] = dateStr.split('-');
    const displayStr = `${month}月${day}日`;
    return { name: displayStr, value: dateStr };
  });
}

const dateOptions = ref(generateDateOptions())

// 页面加载时获取数据
onMounted(() => {
  handleSearch()
})

// 体育类型选项
const sportOptions = ref([
  { name: '所有体育' },
  { name: '足球' },
  { name: '篮球' },
  { name: '电子竞技' },
  { name: '网球' }
])

// 返回
const goBack = () => {
  router.back()
}

// 选择体育类型
const onSportSelect = (item) => {
  accountStore.setFilters({ sport: item.name })
}

// 选择开始日期
const onStartDateSelect = (item) => {
  accountStore.setFilters({ startDate: item.value })
}

// 选择结束日期
const onEndDateSelect = (item) => {
  accountStore.setFilters({ endDate: item.value })
}

// 搜索
const handleSearch = async () => {
  await accountStore.fetchHistory(filters.value.startDate, filters.value.endDate)
}

// 格式化数字
const formatNumber = (num) => {
  return num.toLocaleString('en-US')
}

// 格式化结果
const formatResult = (num) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 获取结果样式
const getResultClass = (num) => {
  if (num === null) return ''
  return num >= 0 ? 'positive' : 'negative'
}
</script>

<style lang="less" scoped>
.account-history-view {
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
  background-color: var(--bg-white);
}

.tab-header {
  display: flex;
  height: 44px;
  border-bottom: 1px solid var(--border-color);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  
  &.active {
    color: var(--text-red);
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 20%;
      right: 20%;
      height: 2px;
      background-color: var(--text-red);
    }
  }
}

.title-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #5D5346;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-white);
  cursor: pointer;
  margin-right: 8px;
  
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

.content-wrapper {
  padding-top: 132px;
  padding-bottom: 100px;
  min-height: 100vh;
}

.filter-section {
  padding: 16px;
  background-color: var(--bg-white);
}

.filter-row {
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.date-row {
    display: flex;
    gap: 12px;
  }
}

.filter-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  
  &:active {
    background-color: #F5F5F5;
  }
}

.select-value {
  font-size: 14px;
  color: var(--text-primary);
}

.select-arrows {
  display: flex;
  flex-direction: column;
  color: var(--text-light);
}

.date-select {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  
  &:active {
    background-color: #F5F5F5;
  }
}

.date-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.date-value {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.search-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #666;
  border-radius: 4px;
  color: var(--text-white);
  
  &:active {
    background-color: #555;
  }
}

.data-table {
  margin-top: 8px;
  background-color: var(--bg-white);
}

.table-header {
  display: flex;
  background-color: #5D5346;
  color: var(--text-white);
}

.th {
  padding: 12px 8px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}

.col-date {
  flex: 1.2;
}

.col-bet, .col-valid, .col-result {
  flex: 1;
}

.table-body {
  // 表格内容
}

.table-row {
  display: flex;
  border-bottom: 1px solid var(--border-color-light);
  
  &.has-data {
    background-color: var(--bg-white);
  }
  
  &:nth-child(odd) {
    background-color: #FAFAFA;
  }
}

.td {
  padding: 12px 8px;
  font-size: 13px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  
  &.positive {
    color: var(--text-red);
  }
  
  &.negative {
    color: var(--text-green);
  }
}

.date-main {
  font-weight: 500;
}

.date-sub {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.tab-item.active { color: var(--accent-gold); &::after { left: 0; right: 0; background: var(--accent-gold); } }
.title-bar { background: #e8e5e1; }
.title { color: #111; font-weight: 600; }
.back-btn { color: #595954; }
.filter-select, .date-select { border-color: #aaa; }
.select-arrows svg:last-child { display: none; }
.table-header { background: var(--primary-bg-dark); min-height: 56px; align-items: center; }
.table-row { min-height: 56px; border: 0; }
.table-row:nth-child(odd) { background: white; }
.table-row:nth-child(even) { background: #e6e6e6; }
.td.positive { color: var(--text-green); }
.td.negative { color: #b94756; }
.date-main, .date-sub { font-size: 15px; font-weight: 600; color: #111; }

</style>
