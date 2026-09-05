<template>
  <MobileAccountManage v-if="isMobile" />
  <AccountManage v-else />
</template>

<script setup>
import AccountManage from '@/views/account/AccountManage.vue';
import MobileAccountManage from '@/views/mobile/MobileAccountManage.vue';
import { useViewport } from '@/composables/useViewport';

const { isMobile } = useViewport();
</script>
