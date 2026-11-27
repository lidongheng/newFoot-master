'use strict';

function useRankingTable(data) {
  const query = Vue.ref('');
  const filteredRows = Vue.computed(() => {
    const value = query.value.trim().toLowerCase();
    return data.rows.filter((row) => data.columns.some((column) => {
      return row[column] !== null && String(row[column]).toLowerCase().includes(value);
    }));
  });
  return { title: data.title, columns: data.columns, query, filteredRows, total: data.rows.length };
}
