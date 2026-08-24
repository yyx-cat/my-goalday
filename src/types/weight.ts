/**
 * 单日体重记录
 * @property date - 日期字符串 'YYYY-MM-DD'
 * @property weight - 当日体重（kg，保留一位小数）
 * @property createdAt - 记录创建时间戳（毫秒）
 */
export interface WeightRecord {
  date: string
  weight: number
  createdAt: number
}

/**
 * 体重数据整体结构
 * @property initialWeight - 初始体重（首次使用时输入，kg）
 * @property initialDate - 初始体重对应的日期字符串 'YYYY-MM-DD'
 * @property records - 每日体重记录数组（按日期升序）
 */
export interface WeightData {
  initialWeight: number
  initialDate: string
  records: WeightRecord[]
}
