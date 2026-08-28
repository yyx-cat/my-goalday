/**
 * 理财记录类型
 * - expense: 支出
 * - income: 收入
 */
export type FinanceRecordType = 'expense' | 'income'

/**
 * 理财板块模式
 * - book: 记账模式（记录日常收支）
 * - manage: 管理模式（理财规划，预留）
 */
export type FinanceMode = 'book' | 'manage'

/**
 * 单条理财记录
 * @property id - 记录唯一标识
 * @property type - 记录类型（支出/收入）
 * @property amount - 金额（元，保留两位小数）
 * @property note - 详细记录（可选备注）
 * @property date - 日期字符串 'YYYY-MM-DD'
 * @property createdAt - 创建时间戳（毫秒）
 */
export interface FinanceRecord {
  id: string
  type: FinanceRecordType
  amount: number
  note?: string
  date: string
  createdAt: number
}

/**
 * 理财数据整体结构
 * @property records - 所有收支记录数组
 */
export interface FinanceData {
  records: FinanceRecord[]
}
