/**
 * 习惯数据接口
 * @property id - 唯一标识符
 * @property name - 习惯名称
 * @property icon - 习惯图标 emoji（可选）
 * @property color - 打卡圆圈颜色（可选，空则用默认墨色，同一习惯所有打卡日共用此颜色）
 * @property createdAt - 创建时间 ISO 字符串
 * @property checkIns - 打卡记录，存储打卡成功的日期数组
 */
export interface Habit {
  id: string
  name: string
  icon?: string
  color?: string
  createdAt: string
  checkIns: string[]
}

/**
 * 习惯打卡圆圈可选颜色（与日程待办调色板一致的暖色系）
 * value 为空字符串时表示默认墨色
 */
export const HABIT_COLORS: { value: string; label: string }[] = [
  { value: '', label: '墨' },
  { value: '#E07A5F', label: '珊瑚' },
  { value: '#E09553', label: '橙' },
  { value: '#6B9080', label: '青' },
  { value: '#5B8DBE', label: '蓝' },
  { value: '#8B7AB8', label: '紫' },
]

/**
 * 心情类型
 */
export type Mood = 'happy' | 'neutral' | 'sad' | 'excited'
