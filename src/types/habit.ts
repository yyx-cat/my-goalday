/**
 * 习惯数据接口
 * @property id - 唯一标识符
 * @property name - 习惯名称
 * @property icon - 习惯图标 emoji（可选）
 * @property createdAt - 创建时间 ISO 字符串
 * @property checkIns - 打卡记录，存储打卡成功的日期数组
 */
export interface Habit {
  id: string
  name: string
  icon?: string
  createdAt: string
  checkIns: string[]
}

/**
 * 心情类型
 */
export type Mood = 'happy' | 'neutral' | 'sad' | 'excited'
