import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'vant/es/dialog/style';
import 'vant/es/toast/style';

import App from './App.vue'
import router from './router'
import store from './store'

import './assets/styles/global.less'
import './assets/styles/mobile.less';

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(store)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})

app.mount('#app')
