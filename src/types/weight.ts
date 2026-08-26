/**
 * 体重记录模式
 * - daily: 每日模式，每天记录1个体重
 * - morning-evening: 早晚模式，记录晨重/晚重，计算当天变化与昨夜对比
 * - three-meals: 三餐模式，记录早/午/晚3个体重，计算日均与昨日均值对比
 */
export type WeightMode = 'daily' | 'morning-evening' | 'three-meals'

/**
 * 单日体重记录
 * @property date - 日期字符串 'YYYY-MM-DD'
 * @property weight - 当日体重（kg，保留一位小数，每日模式使用）
 * @property morningWeight - 晨重（kg，早晚/三餐模式使用，可选）
 * @property noonWeight - 午重（kg，三餐模式使用，可选）
 * @property eveningWeight - 晚重（kg，早晚/三餐模式使用，可选）
 * @property createdAt - 记录创建时间戳（毫秒）
 */
export interface WeightRecord {
  date: string
  weight?: number
  morningWeight?: number
  noonWeight?: number
  eveningWeight?: number
  createdAt: number
}

/**
 * 体重数据整体结构
 * @property initialWeight - 初始体重（首次使用时输入，kg）
 * @property initialDate - 初始体重对应的日期字符串 'YYYY-MM-DD'
 * @property records - 每日体重记录数组（按日期升序）
 * @property mode - 记录模式（默认 'daily'）
 */
export interface WeightData {
  initialWeight: number
  initialDate: string
  records: WeightRecord[]
  mode: WeightMode
}
