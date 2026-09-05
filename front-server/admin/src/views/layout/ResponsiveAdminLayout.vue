<template>
  <MobileAdminLayout v-if="isMobile" />
  <AdminLayout v-else />
</template>

<script setup>
import AdminLayout from './AdminLayout.vue';
import MobileAdminLayout from './MobileAdminLayout.vue';
import { useViewport } from '@/composables/useViewport';

const { isMobile } = useViewport();
</script>
