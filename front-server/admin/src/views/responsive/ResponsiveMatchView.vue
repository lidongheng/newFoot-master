<template>
  <MobileMatchList v-if="isMobile" />
  <MatchList v-else />
</template>

<script setup>
import MatchList from '@/views/match/MatchList.vue';
import MobileMatchList from '@/views/mobile/MobileMatchList.vue';
import { useViewport } from '@/composables/useViewport';

const { isMobile } = useViewport();
</script>
