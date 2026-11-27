'use strict';

function useRankingTable(data) {
  const query = Vue.ref('');
  const filteredRows = Vue.computed(() => {
    const value = query.value.trim().toLowerCase();
    return data.rows.filter((row) => data.columns.some((column) => {
      return row[column] !== null && String(row[column]).toLowerCase().includes(value);
    }));
  });
  function formatCell(value, column) {
    if (value === null) return '缺失';
    if (['平均年龄（岁）', '平均身高（cm）', '总身价（万）', '平均控球率'].includes(column) && typeof value === 'number') return value.toFixed(2);
    return value;
  }
  return { title: data.title, columns: data.columns, query, filteredRows, total: data.rows.length, formatCell };
}
