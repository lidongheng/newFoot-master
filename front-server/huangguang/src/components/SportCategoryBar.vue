<template>
  <div class="sport-category-bar">
    <div class="category-container hide-scrollbar">
      <div 
        v-for="sport in sports" 
        :key="sport.key"
        class="category-item"
        :class="{ active: activeSport === sport.key }"
        @click="handleSportClick(sport.key)"
      >
        <div class="category-icon">
          <component :is="sport.iconComponent" />
        </div>
        <span class="category-name">{{ sport.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h, markRaw } from 'vue'

defineProps({
  activeSport: {
    type: String,
    default: 'football'
  }
})

const emit = defineEmits(['change'])

// 足球图标
const FootballIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
      h('path', { d: 'M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 2c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z' })
    ])
  }
})

// 篮球图标
const BasketballIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
      h('path', { d: 'M12 2v20M2 12h20', stroke: 'currentColor', 'stroke-width': '2', fill: 'none' })
    ])
  }
})

// 电竞图标
const EsportIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('path', { d: 'M21.58 16.09l-1.09-7.66A3.996 3.996 0 0016.53 5H7.47a3.996 3.996 0 00-3.96 3.43l-1.09 7.66a3 3 0 002.97 3.41h13.22a3 3 0 002.97-3.41zM8 12H6v-2h2v2zm2-4H8V6h2v2zm4 4h-4v-2h4v2zm2-4h-2V6h2v2zm2 4h-2v-2h2v2z' })
    ])
  }
})

// 网球图标
const TennisIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
      h('path', { d: 'M5 5c4 4 4 10 0 14M19 5c-4 4-4 10 0 14', stroke: 'currentColor', 'stroke-width': '2', fill: 'none' })
    ])
  }
})

// 排球图标
const VolleyballIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
      h('path', { d: 'M12 2c3 3 3 7 0 10s-3 7 0 10M12 2c-3 3-3 7 0 10s3 7 0 10', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none' })
    ])
  }
})

// 其他图标
const OtherIcon = markRaw({
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'currentColor',
      class: 'sport-icon'
    }, [
      h('path', { d: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z' })
    ])
  }
})

// 运动类型配置 - 不需要ref，数据不会变化
const sports = [
  { key: 'football', name: '足球', iconComponent: FootballIcon },
  { key: 'basketball', name: '篮球 & 美...', iconComponent: BasketballIcon },
  { key: 'esport', name: '电子竞技', iconComponent: EsportIcon },
  { key: 'tennis', name: '网球', iconComponent: TennisIcon },
  { key: 'volleyball', name: '排球', iconComponent: VolleyballIcon },
  { key: 'other', name: '其他', iconComponent: OtherIcon }
]

// 处理运动类型点击
const handleSportClick = (key) => {
  emit('change', key)
}
</script>

<style lang="less" scoped>
.sport-category-bar {
  background: linear-gradient(180deg, #4A4339 0%, #5D5346 100%);
  padding: 12px 0;
}

.category-container {
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow-x: auto;
  white-space: nowrap;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  padding: 0 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    opacity: 0.8;
    transform: scale(0.95);
  }
  
  &.active {
    .category-icon {
      color: var(--accent-gold);
    }
    .category-name {
      color: var(--accent-gold);
    }
  }
}

.category-icon {
  width: 22px;
  height: 22px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(.sport-icon) {
    width: 100%;
    height: 100%;
  }
}

.category-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  text-align: center;
}
</style>
