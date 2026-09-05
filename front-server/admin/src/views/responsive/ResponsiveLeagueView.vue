<template>
  <MobileLeagueList v-if="isMobile" />
  <LeagueList v-else />
</template>

<script setup>
import LeagueList from '@/views/league/LeagueList.vue';
import MobileLeagueList from '@/views/mobile/MobileLeagueList.vue';
import { useViewport } from '@/composables/useViewport';

const { isMobile } = useViewport();
</script>
