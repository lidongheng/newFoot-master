'use strict';

const rankingData = JSON.parse(document.getElementById('ranking-data').textContent);
const rankingApp = Vue.createApp({
  setup() {
    return useRankingTable(rankingData);
  },
});
rankingApp.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
rankingApp.mount('#app');
