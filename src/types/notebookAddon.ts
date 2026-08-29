/**
 * 手账附加信息来源标识
 * - monthly-list：月度清单
 * - finance：理财记账
 * - weight：减重体重
 * - habit：习惯打卡
 */
export type AddonSource = 'monthly-list' | 'finance' | 'weight' | 'habit'

/**
 * 手账附加信息（各模块添加到手账的摘要，按日期归属）
 * @property id - 记录唯一标识
 * @property date - 归属日期字符串 'YYYY-MM-DD'
 * @property source - 来源模块标识（同日同源覆盖更新）
 * @property title - 信息标题（如"月度清单"/"今日收支"）
 * @property content - 信息正文（多行文本）
 * @property createdAt - 更新时间戳（毫秒）
 */
export interface NotebookAddon {
  id: string
  date: string
  source: AddonSource
  title: string
  content: string
  createdAt: number
}
