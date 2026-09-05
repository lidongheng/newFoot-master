import { onBeforeUnmount, onMounted, ref } from 'vue';

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

export function useViewport() {
  const isMobile = ref(window.matchMedia(MOBILE_MEDIA_QUERY).matches);
  let mediaQuery;

  function updateViewport(event) {
    isMobile.value = event.matches;
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    isMobile.value = mediaQuery.matches;
    mediaQuery.addEventListener('change', updateViewport);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', updateViewport);
  });

  return {
    isMobile,
  };
}
