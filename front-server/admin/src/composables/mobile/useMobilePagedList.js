import { ref } from 'vue';

export function useMobilePagedList(fetchPage) {
  const list = ref([]);
  const page = ref(1);
  const pageSize = 20;
  const total = ref(0);
  const loading = ref(false);
  const refreshing = ref(false);
  const finished = ref(false);
  let requesting = false;

  async function requestPage(replace) {
    if (requesting) {
      return;
    }

    requesting = true;
    try {
      const data = await fetchPage({
        page: page.value,
        pageSize,
      });
      if (replace) {
        list.value = data.list;
      } else {
        list.value.push(...data.list);
      }
      total.value = data.total;
      page.value += 1;
      finished.value = list.value.length >= total.value;
      return data;
    } catch (error) {
      // 请求失败时终止本轮自动加载，避免列表在不可见区域连续重试。
      finished.value = true;
      return undefined;
    } finally {
      loading.value = false;
      refreshing.value = false;
      requesting = false;
    }
  }

  async function onLoad() {
    await requestPage(false);
  }

  async function refresh() {
    page.value = 1;
    finished.value = false;
    refreshing.value = true;
    await requestPage(true);
  }

  async function reload() {
    page.value = 1;
    finished.value = false;
    loading.value = true;
    await requestPage(true);
  }

  return {
    list,
    total,
    loading,
    refreshing,
    finished,
    onLoad,
    refresh,
    reload,
  };
}
