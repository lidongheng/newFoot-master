<template>
  <div class="bottom-tab-bar safe-area-bottom">
    <!-- 底部标签栏 -->
    <div class="tab-bar">
      <!-- 电视直播 -->
      <div class="tab-item" @click="handleTabClick(tabs[0])">
        <div class="tab-icon">
          <TvIcon />
        </div>
        <span class="tab-label">电视直播</span>
      </div>
      
      <!-- 我的赛事 -->
      <div class="tab-item" @click="handleTabClick(tabs[1])">
        <div class="tab-icon">
          <StarIcon />
        </div>
        <span class="tab-label">我的赛事</span>
      </div>
      
      <!-- 注单 -->
      <div class="tab-item" @click="handleTabClick(tabs[2])">
        <span class="tab-number">{{ userStore.betSlipCount || 0 }}</span>
        <span class="tab-label">注单</span>
      </div>
      
      <!-- 投注记录 - 选中时橙色 -->
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'records' }"
        @click="handleTabClick(tabs[3])"
      >
        <span class="tab-number">{{ betStore.recordCount || 0 }}</span>
        <span class="tab-label">投注记录</span>
      </div>
      
      <!-- 余额 - 绿色金额 -->
      <div class="tab-item" @click="handleTabClick(tabs[4])">
        <div class="tab-icon account-icon">
          <UserIcon />
          <span class="tab-badge"></span>
        </div>
        <span class="tab-label balance">{{ userStore.formattedBalance }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useBetStore } from '@/store'

const router = useRouter()
const userStore = useUserStore()
const betStore = useBetStore()

defineProps({
  activeTab: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['change'])

// TV图标
const TvIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'tab-svg-icon'
    }, [
      h('path', { d: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z' })
    ])
  }
}

// 星星图标
const StarIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.4',
      class: 'tab-svg-icon'
    }, [
      h('path', { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' })
    ])
  }
}

// 用户/笑脸图标
const UserIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'tab-svg-icon'
    }, [
      // 圆形外框
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4' }),
      // 头像
      h('circle', { cx: '12', cy: '8', r: '4', fill: 'currentColor' }),
      // 肩部轮廓
      h('path', { d: 'M5 19c0-7 14-7 14 0', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round' })
    ])
  }
}

// 标签配置
const tabs = [
  { key: 'tv', label: '电视直播', path: null },
  { key: 'myEvents', label: '我的赛事', path: '/my-events' },
  { key: 'betSlip', label: '注单', path: null },
  { key: 'records', label: '投注记录', path: '/bet-records' },
  { key: 'account', label: '', path: '/account' }
]

// 处理标签点击
const handleTabClick = (tab) => {
  emit('change', tab.key)
  if (tab.path) {
    router.push(tab.path)
  }
}
</script>

<style lang="less" scoped>
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--primary-bg);
  max-width: 750px;
  margin: 0 auto;
  border-top: 2px solid #403126;
}

.tab-bar {
  display: flex;
  align-items: center;
  height: 58px;
  background-color: var(--primary-bg);
  padding: 6px 0;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
  transition: all 0.2s;
  gap: 2px;
  
  &:active {
    opacity: 0.7;
  }
  
  &.active {
    .tab-number, .tab-label {
      color: #d3bd65;
    }
  }
}

.tab-icon {
  position: relative;
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.85);
  
  :deep(.tab-svg-icon) {
    width: 100%;
    height: 100%;
  }
  
  &.account-icon {
    width: 20px;
    height: 20px;
  }
}

.tab-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 6px;
  height: 6px;
  background-color: #E74C3C;
  border-radius: 50%;
}

.tab-number {
  font-size: 20px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
}

.tab-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
  
  &.balance {
    color: #55c29d;
    font-weight: 600;
    font-size: 13px;
  }
}
.tab-item { gap: 6px; }
.tab-item:nth-child(3) { background: #3d2e23; }
.tab-icon { color: #c8c5b5; }
</style>
