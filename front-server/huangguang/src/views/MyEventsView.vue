<template>
  <div class="my-events-view">
    <!-- 顶部导航 -->
    <TopNavBar />
    
    <!-- 运动分类 -->
    <div class="fixed-header">
      <SportCategoryBar 
        :active-sport="currentSport" 
        @change="handleSportChange" 
      />
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 空状态 -->
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <p class="empty-text">暂无收藏的赛事</p>
        <p class="empty-hint">点击比赛旁边的星星图标来收藏赛事</p>
      </div>
    </div>
    
    <!-- 底部标签栏 -->
    <BottomTabBar activeTab="myEvents" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TopNavBar from '@/components/TopNavBar.vue'
import SportCategoryBar from '@/components/SportCategoryBar.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'

const currentSport = ref('football')

const handleSportChange = (sport) => {
  currentSport.value = sport
}
</script>

<style lang="less" scoped>
.my-events-view {
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
  padding-top: 120px;
  padding-bottom: 100px;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background-color: var(--bg-white);
}

.empty-icon {
  color: #E0E0E0;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-light);
  text-align: center;
}
</style>
