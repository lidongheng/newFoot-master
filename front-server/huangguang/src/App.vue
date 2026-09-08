<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { useQuotaDayRefresh } from '@/composables/useQuotaDayRefresh';

// 根组件统一监听固定 GMT-4 跨日，确保任意页面打开时都能刷新额度。
useQuotaDayRefresh();
</script>

<style lang="less">
// 根组件样式
#app {
  width: 100%;
  min-height: 100vh;
  max-width: 750px;
  margin: 0 auto;
  background-color: var(--bg-white);
  position: relative;
  overflow-x: hidden;
}

// 页面切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
