import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 引入Vant组件
import { 
  Button, 
  Icon, 
  Popup, 
  Tab, 
  Tabs, 
  NumberKeyboard,
  Toast,
  Loading,
  Checkbox,
  DatetimePicker,
  Picker,
  Cell,
  CellGroup,
  Field,
  ActionSheet
} from 'vant'
import 'vant/lib/index.css'

// 引入全局样式
import './assets/styles/global.less'

const app = createApp(App)
const pinia = createPinia()

// 使用Vant组件
app.use(Button)
app.use(Icon)
app.use(Popup)
app.use(Tab)
app.use(Tabs)
app.use(NumberKeyboard)
app.use(Toast)
app.use(Loading)
app.use(Checkbox)
app.use(DatetimePicker)
app.use(Picker)
app.use(Cell)
app.use(CellGroup)
app.use(Field)
app.use(ActionSheet)

app.use(pinia)
app.use(router)
app.mount('#app')
