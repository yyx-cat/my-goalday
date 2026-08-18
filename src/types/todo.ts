/**
 * 待办事项数据接口
 * @property id - 唯一标识符
 * @property text - 待办内容文本
 * @property done - 是否完成
 * @property date - 所属日期，格式 '2026-08-17'
 * @property priority - 优先级（可选）
 * @property createdAt - 创建时间 ISO 字符串
 * @property completedAt - 完成时间 ISO 字符串（可选）
 */
export interface Todo {
  id: string
  text: string
  done: boolean
  date: string          // '2026-08-17'
  priority?: 'high' | 'medium' | 'low'
  createdAt: string
  completedAt?: string
}