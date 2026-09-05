<template>
  <MobileBetOrderList v-if="isMobile" />
  <BetOrderList v-else />
</template>

<script setup>
import BetOrderList from '@/views/betOrder/BetOrderList.vue';
import MobileBetOrderList from '@/views/mobile/MobileBetOrderList.vue';
import { useViewport } from '@/composables/useViewport';

const { isMobile } = useViewport();
</script>
