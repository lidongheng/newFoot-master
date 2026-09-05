<template>
  <div class="play-type-filter hide-scrollbar">
    <div 
      v-for="type in playTypes" 
      :key="type.key"
      class="filter-item"
      :class="{ active: activeType === type.key }"
      @click="handleClick(type.key)"
    >
      {{ type.label }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeType: {
    type: String,
    default: 'main'
  }
})

const emit = defineEmits(['change'])

const playTypes = ref([
  { key: 'main', label: '主要玩法' },
  { key: 'handicap', label: '让球&大小' },
  { key: 'corner', label: '角球' },
  { key: 'cards', label: '罚牌数' },
  { key: 'correct', label: '波胆' }
])

const handleClick = (key) => {
  emit('change', key)
}
</script>

<style lang="less" scoped>
.play-type-filter {
  display: flex;
  align-items: center;
  padding: 12px;
  overflow-x: auto;
  white-space: nowrap;
  background-color: var(--bg-white);
  gap: 8px;
}

.filter-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  background-color: #F5F5F5;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.active {
    background-color: var(--accent-gold);
    color: var(--text-white);
  }
}
</style>
