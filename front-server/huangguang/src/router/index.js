/**
 * 路由配置
 * 体育博彩移动端应用
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '今日赛事' }
  },
  {
    path: '/live',
    name: 'live',
    component: () => import('../views/LiveBettingView.vue'),
    meta: { title: '滚球赛事' }
  },
  {
    path: '/early',
    name: 'early',
    component: () => import('../views/EarlyBettingView.vue'),
    meta: { title: '早盘' }
  },
  {
    path: '/league-matches',
    name: 'leagueMatches',
    component: () => import('../views/LeagueMatchesView.vue'),
    meta: { title: '联赛赛事' }
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../views/AccountHistoryView.vue'),
    meta: { title: '帐户历史' }
  },
  {
    path: '/my-events',
    name: 'myEvents',
    component: () => import('../views/MyEventsView.vue'),
    meta: { title: '我的赛事' }
  },
  {
    path: '/bet-records',
    name: 'betRecords',
    component: () => import('../views/BetRecordsView.vue'),
    meta: { title: '投注记录' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
