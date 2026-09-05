<template>
  <div class="mobile-admin-layout">
    <van-nav-bar class="mobile-header" :title="currentTitle" fixed placeholder />

    <main class="mobile-main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <van-tabbar route fixed placeholder safe-area-inset-bottom>
      <van-tabbar-item replace to="/match" icon="flag-o">比赛</van-tabbar-item>
      <van-tabbar-item replace to="/league" icon="award-o">联赛</van-tabbar-item>
      <van-tabbar-item replace to="/bet-order" icon="orders-o">订单</van-tabbar-item>
      <van-tabbar-item replace to="/account" icon="balance-o">账户</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const currentTitle = computed(() => route.meta.title);
</script>

<style lang="less" scoped>
.mobile-admin-layout {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f6f8;

  :deep(.mobile-header) {
    --van-nav-bar-height: 48px;
    --van-nav-bar-title-font-size: 17px;
    --van-nav-bar-title-text-color: #1f2329;
  }
}

.mobile-main {
  min-height: calc(100vh - 98px - env(safe-area-inset-bottom));
  min-height: calc(100dvh - 98px - env(safe-area-inset-bottom));
}
</style>
