import { onMounted, onUnmounted, ref } from 'vue';

const FIXED_OFFSET_MILLISECONDS = -4 * 60 * 60 * 1000;

function getShiftedDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + FIXED_OFFSET_MILLISECONDS);
}

export function formatFixedTime(value = new Date()) {
  const date = getShiftedDate(value);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

export function formatFixedHourMinute(value) {
  return formatFixedTime(value).slice(0, 5);
}

export function formatFixedDate(value = new Date()) {
  const date = getShiftedDate(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getRecentFixedDates(days) {
  const dates = [];
  const today = getShiftedDate();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - index);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

export function useFixedGmtMinusFourClock() {
  const currentTime = ref(formatFixedTime());
  let timer = null;

  const updateTime = () => {
    currentTime.value = formatFixedTime();
  };

  onMounted(() => {
    updateTime();
    timer = window.setInterval(updateTime, 1000);
  });

  onUnmounted(() => {
    if (timer) {
      window.clearInterval(timer);
    }
  });

  return { currentTime };
}
