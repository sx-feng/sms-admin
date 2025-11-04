import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// 创建应用实例
const app = createApp(App)

// 挂载插件
app.use(ElementPlus)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})


// 挂载到 DOM
app.mount('#app')
