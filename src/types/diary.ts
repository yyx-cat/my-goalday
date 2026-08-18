import type { Mood } from './habit'

// 重导出 Mood 类型，方便统一从 diary.ts 引入
export type { Mood }

/**
 * 日记数据接口
 * @property date - 日记所属日期，格式 'YYYY-MM-DD'
 * @property content - 日记内容文本
 * @property mood - 心情标签（可选）
 * @property updatedAt - 最后更新时间 ISO 字符串
 */
export interface Diary {
  date: string
  content: string
  mood?: Mood
  updatedAt: string
}
