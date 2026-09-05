<template>
  <div class="live-betting-view">
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
        title="滚球赛事"
        breadcrumb="足球/联盟"
        :tabs="filterTabs"
        :active-tab="activeFilter"
        @change="handleFilterChange"
      />
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 玩法筛选 -->
      <PlayTypeFilter 
        :active-type="activePlayType"
        @change="handlePlayTypeChange"
      />
      
      <!-- 比赛列表 -->
      <div class="match-list">
        <MatchCard 
          v-for="match in matches" 
          :key="match.id" 
          :match="match"
        />
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar @switchChange="handleSwitchChange" />
    
    <!-- 投注弹窗 -->
    <BetPopup />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore, useUserStore } from '@/store'
import TopNavBar from '@/components/TopNavBar.vue'
import SportCategoryBar from '@/components/SportCategoryBar.vue'
import SubFilterTabs from '@/components/SubFilterTabs.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import PlayTypeFilter from '@/components/PlayTypeFilter.vue'
import MatchCard from '@/components/MatchCard.vue'
import BetPopup from '@/components/BetPopup.vue'

const router = useRouter()
const matchStore = useMatchStore()
const userStore = useUserStore()

// 当前运动类型
const currentSport = ref('football')

// 当前筛选
const activeFilter = ref('live')

// 当前玩法类型
const activePlayType = ref('main')

// 比赛数据
const matches = computed(() => matchStore.liveMatches)

// 页面加载时获取数据
onMounted(async () => {
  await Promise.all([
    matchStore.fetchLiveMatches(currentSport.value),
    userStore.fetchBalance()
  ])
})

// 筛选标签
const filterTabs = ref([
  { key: 'pre', label: '赛前' },
  { key: 'live', label: '滚球' },
  { key: 'all', label: '全部' },
  { key: 'hour1', label: '下一个小时' },
  { key: 'hour6', label: '下六个小时' },
  { key: 'fantasy', label: '梦幻赛' }
])

// 处理运动类型切换
const handleSportChange = async (sport) => {
  currentSport.value = sport
  await matchStore.fetchLiveMatches(sport)
}

// 处理筛选切换
const handleFilterChange = (filter) => {
  activeFilter.value = filter
  if (filter === 'pre') {
    router.push('/')
  }
}

// 处理玩法类型切换
const handlePlayTypeChange = (type) => {
  activePlayType.value = type
}

// 处理底部切换
const handleSwitchChange = (type) => {
  if (type === 'today') {
    router.push('/')
  }
}
</script>

<style lang="less" scoped>
.live-betting-view {
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

.match-list {
  margin-top: 8px;
}
</style>
