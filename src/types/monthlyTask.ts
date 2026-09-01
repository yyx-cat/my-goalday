/**
 * 月度任务数据接口
 * @property id - 任务唯一标识
 * @property text - 任务文本
 * @property done - 是否已完成
 * @property month - 所属月份键 'YYYY-MM'
 * @property createdAt - 创建时间戳
 * @property source - 来源标识（灵感模块名，用户自建任务为空）
 */
export interface MonthlyTask {
  id: string
  text: string
  done: boolean
  month: string
  createdAt: number
  source?: string
}
