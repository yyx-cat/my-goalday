/**
 * 待办事项数据接口
 * @property id - 唯一标识符
 * @property text - 待办内容文本
 * @property done - 是否完成
 * @property date - 所属日期，格式 '2026-08-17'
 * @property priority - 优先级（可选）
 * @property color - 标签颜色（可选，空字符串/未设表示用默认墨色），如 '#E07A5F'
 * @property createdAt - 创建时间 ISO 字符串
 * @property completedAt - 完成时间 ISO 字符串（可选）
 */
export interface Todo {
  id: string
  text: string
  done: boolean
  date: string          // '2026-08-17'
  priority?: 'high' | 'medium' | 'low'
  color?: string        // 标签颜色，未设时用默认墨色
  createdAt: string
  completedAt?: string
}