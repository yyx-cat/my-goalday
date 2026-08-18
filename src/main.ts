import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 引入 Pinia 状态管理实例
import { pinia } from '@/store'

/**
 * 创建 Vue 应用实例并挂载
 * 顺序：创建 App → 挂载 Pinia → 挂载到 DOM
 */
const app = createApp(App)

// 注册 Pinia 状态管理
app.use(pinia)

app.mount('#app')
