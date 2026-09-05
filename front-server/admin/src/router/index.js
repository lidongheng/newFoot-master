import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/layout/ResponsiveAdminLayout.vue'),
    redirect: '/match',
    children: [
  {
        path: 'match',
        name: 'MatchList',
        component: () => import('@/views/responsive/ResponsiveMatchView.vue'),
        meta: { title: '比赛管理', icon: 'Football' }
      },
      {
        path: 'league',
        name: 'LeagueList',
        component: () => import('@/views/responsive/ResponsiveLeagueView.vue'),
        meta: { title: '联赛管理', icon: 'Trophy' }
      },
      {
        path: 'bet-order',
        name: 'BetOrderList',
        component: () => import('@/views/responsive/ResponsiveBetOrderView.vue'),
        meta: { title: '投注订单', icon: 'Tickets' }
      },
      {
        path: 'account',
        name: 'AccountManage',
        component: () => import('@/views/responsive/ResponsiveAccountView.vue'),
        meta: { title: '账户管理', icon: 'Wallet' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
