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
// App 根组件
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
