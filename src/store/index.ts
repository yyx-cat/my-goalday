import { createPinia } from 'pinia'

/**
 * Pinia 状态管理实例
 * 统一创建并导出，在 main.ts 中通过 app.use() 挂载
 */
export const pinia = createPinia()

export default pinia
