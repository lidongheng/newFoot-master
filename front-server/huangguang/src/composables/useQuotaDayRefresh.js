import { onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/store';
import { formatFixedDate } from './useFixedGmtMinusFourTime';

const CHECK_INTERVAL_MILLISECONDS = 30 * 1000;

export function useQuotaDayRefresh() {
  const userStore = useUserStore();
  let currentQuotaDate = formatFixedDate();
  let timer = null;
  let refreshing = false;

  const refreshWhenQuotaDateChanges = async () => {
    const nextQuotaDate = formatFixedDate();
    if (nextQuotaDate === currentQuotaDate || refreshing) {
      return;
    }

    refreshing = true;
    try {
      // 后端在读取额度时执行重置；只有请求成功后才记住新额度日，失败时保留重试机会。
      const succeeded = await userStore.fetchBalance();
      if (succeeded) {
        currentQuotaDate = nextQuotaDate;
      }
    } finally {
      refreshing = false;
    }
  };

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      refreshWhenQuotaDateChanges();
    }
  };

  onMounted(() => {
    timer = window.setInterval(refreshWhenQuotaDateChanges, CHECK_INTERVAL_MILLISECONDS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    if (timer) {
      window.clearInterval(timer);
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
}
