<template>
  <div class="sub-filter-tabs">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-left">
        <span class="back-btn" @click="$emit('back')">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </span>
        <span class="breadcrumb">{{ breadcrumb }}</span>
      </div>
      <h2 class="page-title">{{ title }}</h2>
      <div class="header-right">
        <span class="filter-btn" @click="$emit('filter')">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
          </svg>
        </span>
      </div>
    </div>
    
    <!-- 子筛选标签 -->
    <div class="filter-tabs hide-scrollbar">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        class="filter-tab"
        :class="{ active: activeTab === tab.key }"
        @click="handleTabClick(tab.key)"
      >
        {{ tab.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  breadcrumb: {
    type: String,
    default: '足球/联盟'
  },
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['change', 'back', 'filter'])

const handleTabClick = (key) => {
  emit('change', key)
}
</script>

<style lang="less" scoped>
.sub-filter-tabs {
  background: linear-gradient(180deg, #5D5346 0%, #6B6353 100%);
  padding-bottom: 8px;
}

.page-header {
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

.filter-tabs {
  display: flex;
  align-items: center;
  padding: 8px 12px 0;
  overflow-x: auto;
  white-space: nowrap;
}

.filter-tab {
  padding: 6px 12px;
  margin-right: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:active {
    opacity: 0.8;
  }
  
  &.active {
    color: var(--accent-gold);
    font-weight: 500;
  }
}
</style>
