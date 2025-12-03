import { createApp } from 'vue'
import App from './App.vue'

const debounce = (fn, delay) => {
  let timer = null
  return function () {
    let context = this
    let args = arguments
    clearTimeout(timer)
    timer = setTimeout(function () {
      fn.apply(context, args)
    }, delay)
  }
}

const _ResizeObserver = window.ResizeObserver
window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
  constructor(callback) {
    callback = debounce(callback, 16)
    super(callback)
  }
}

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
