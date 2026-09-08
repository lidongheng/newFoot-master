const FIXED_GMT_MINUS_FOUR_OFFSET_HOURS = -4;

/**
 * 将固定 GMT-4 的日期转换为 UTC 查询范围。
 * 这里故意不使用 America/New_York，避免冬季自动切换到 GMT-5。
 */
function fixedDateToUtcRange(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -FIXED_GMT_MINUS_FOUR_OFFSET_HOURS, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, -FIXED_GMT_MINUS_FOUR_OFFSET_HOURS, 0, 0, 0));

  return { start, end };
}

/**
 * 获取某一时刻在固定 GMT-4 下所属的日期。
 */
function getFixedDate(date = new Date()) {
  const shiftedDate = new Date(date.getTime() + FIXED_GMT_MINUS_FOUR_OFFSET_HOURS * 60 * 60 * 1000);
  const year = shiftedDate.getUTCFullYear();
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shiftedDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

module.exports = {
  fixedDateToUtcRange,
  getFixedDate,
};
