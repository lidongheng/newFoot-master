<template>
  <div class="top-nav-bar">
    <div class="nav-container hide-scrollbar">
      <!-- 首页图标 -->
      <div 
        class="nav-item home-item"
        :class="{ active: activeTab === 'home' }"
        @click="handleNavClick('home', '/')"
      >
        <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
          <path d="M2 11 12 1l10 10M5 8v14h5v-7h4v7h5V8M18 3v4"/>
        </svg>
      </div>
      
      <!-- 导航项 -->
      <template v-for="item in navItems" :key="item.key">
      <span v-if="item.key === 'hot'" class="nav-item world-cup-label">2026世界杯</span>
      <div 
        class="nav-item"
        :class="{ active: activeTab === item.key }"
        @click="handleNavClick(item.key, item.path)"
      >
        <svg v-if="item.icon" class="nav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 1c2 6-3 7-1 11 2-1 3-3 3-5 5 5 7 10 3 14-1 1-2 2-4 2 2-3 0-5-2-7 0 3-3 4-2 7-8-2-8-9-4-14 0 3 1 4 2 4C7 8 13 7 13 1Z"/></svg>
        <span class="nav-text">{{ item.label }}</span>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 导航项配置
const navItems = [
  { key: 'live', label: '滚球', path: '/live' },
  { key: 'hot', label: '热门', icon: '🔥', path: '/live' },
  { key: 'today', label: '今日', path: '/' },
  { key: 'upcoming', label: '即将开赛', path: '/' },
  { key: 'early', label: '早盘', path: '/early' },
  { key: 'champion', label: '冠军', path: '/early' }
]

// 根据当前路由计算活动标签
const activeTab = computed(() => {
  const path = route.path
  if (path === '/') return 'today'
  if (path === '/live') return 'live'
  if (path === '/early') return 'early'
  return 'today'
})

// 处理导航点击
const handleNavClick = (key, path) => {
  router.push(path)
}
</script>

<style lang="less" scoped>
.top-nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--primary-bg);
  max-width: 750px;
  margin: 0 auto;
}

.nav-container {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  overflow-x: auto;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  height: 44px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
  
  &:active {
    opacity: 0.8;
  }
  
  &.active {
    color: var(--accent-gold);
  }
  
  &.home-item {
    padding: 0 8px;
  }
}

.home-icon {
  width: 18px;
  height: 18px;
}

.nav-icon {
  margin-right: 2px;
  font-size: 12px;
}

.nav-text {
  font-weight: 600;
}

.nav-container { padding: 0 10px; }
.nav-item { padding: 0 13px; color: #c5beb2; font-size: 14px; }
.home-icon { width: 20px; height: 20px; }
.nav-icon { width: 14px; height: 18px; color: #d7755b; margin-right: 4px; }

.world-cup-label { font-weight: 600; cursor: default; }
</style>
