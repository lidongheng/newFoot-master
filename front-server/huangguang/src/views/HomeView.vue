<template>
  <div class="home-view">
    <!-- 顶部导航 -->
    <TopNavBar />
    
    <!-- 运动分类 -->
    <div class="fixed-header">
      <SportCategoryBar 
        :active-sport="currentSport" 
        @change="handleSportChange" 
      />
      
      <!-- 子导航 -->
      <SubFilterTabs
        title="今日赛事"
        breadcrumb="足球/联盟"
        :tabs="filterTabs"
        :active-tab="activeFilter"
        @change="handleFilterChange"
      />
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 空状态 -->
      <div class="empty-state" v-if="showEmpty">
        <div class="empty-image">
          <div class="empty-dog-placeholder">
            <svg viewBox="0 0 200 150" fill="none">
              <!-- 小狗身体 -->
              <ellipse cx="100" cy="100" rx="50" ry="35" fill="#9E9E9E"/>
              <!-- 小狗头 -->
              <circle cx="70" cy="70" r="35" fill="#BDBDBD"/>
              <!-- 耳朵 -->
              <ellipse cx="45" cy="50" rx="15" ry="20" fill="#9E9E9E"/>
              <ellipse cx="95" cy="50" rx="15" ry="20" fill="#9E9E9E"/>
              <!-- 眼睛 -->
              <circle cx="60" cy="65" r="4" fill="#424242"/>
              <circle cx="80" cy="65" r="4" fill="#424242"/>
              <!-- 鼻子 -->
              <ellipse cx="70" cy="80" rx="8" ry="5" fill="#616161"/>
              <!-- 足球 -->
              <circle cx="130" cy="110" r="20" fill="#FFFFFF" stroke="#424242" stroke-width="2"/>
              <path d="M130 90 L125 100 L135 100 Z" fill="#424242"/>
              <path d="M115 105 L125 100 L120 115 Z" fill="#424242"/>
              <path d="M145 105 L135 100 L140 115 Z" fill="#424242"/>
              <path d="M125 125 L120 115 L130 110 L140 115 L135 125 Z" fill="#424242"/>
            </svg>
          </div>
        </div>
        <p class="empty-text">目前没有任何赛事。</p>
      </div>
      
      <!-- 时区信息 -->
      <div class="timezone-info">
        <div class="timezone-box">
          <p class="timezone-text">今日赛事显示时区为GMT-4。</p>
          <p class="timezone-time">{{ currentTime }}</p>
        </div>
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar @switchChange="handleSwitchChange" />
    
    <!-- 投注弹窗 -->
    <BetPopup />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore, useUserStore } from '@/store'
import TopNavBar from '@/components/TopNavBar.vue'
import SportCategoryBar from '@/components/SportCategoryBar.vue'
import SubFilterTabs from '@/components/SubFilterTabs.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import BetPopup from '@/components/BetPopup.vue'

const router = useRouter()
const matchStore = useMatchStore()
const userStore = useUserStore()

// 当前运动类型
const currentSport = ref('football')

// 当前筛选
const activeFilter = ref('pre')

// 是否显示空状态
const showEmpty = ref(true)

// 当前时间
const currentTime = ref('23:08:06')
let timeInterval = null

// 筛选标签
const filterTabs = ref([
  { key: 'pre', label: '赛前' },
  { key: 'live', label: '滚球' },
  { key: 'all', label: '全部' },
  { key: 'hour1', label: '下一个小时' },
  { key: 'hour6', label: '下六个小时' },
  { key: 'fantasy', label: '梦幻赛' }
])

// 更新时间
const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
}

// 处理运动类型切换
const handleSportChange = async (sport) => {
  currentSport.value = sport
  await matchStore.fetchTodayMatches(sport)
}

// 处理筛选切换
const handleFilterChange = (filter) => {
  activeFilter.value = filter
  // 如果选择滚球，跳转到滚球页面
  if (filter === 'live') {
    router.push('/live')
  }
}

// 处理底部切换
const handleSwitchChange = (type) => {
  if (type === 'live') {
    router.push('/live')
  }
}

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  
  // 获取余额和今日比赛数据
  await Promise.all([
    userStore.fetchBalance(),
    matchStore.fetchTodayMatches(currentSport.value)
  ])
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style lang="less" scoped>
.home-view {
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
}

.content-wrapper {
  padding-top: 180px;
  padding-bottom: 100px;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background-color: var(--bg-white);
}

.empty-image {
  width: 160px;
  height: 120px;
  margin-bottom: 20px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.empty-dog-placeholder {
  width: 100%;
  height: 100%;
  
  svg {
    width: 100%;
    height: 100%;
  }
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.timezone-info {
  padding: 20px 16px;
  background-color: var(--bg-white);
  margin-top: 8px;
}

.timezone-box {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.timezone-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.timezone-time {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
</style>
