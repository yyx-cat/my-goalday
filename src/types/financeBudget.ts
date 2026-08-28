/**
 * 预算类型（用户自定义的消费分类，每月一个预算额度）
 * @property id - 类型唯一标识
 * @property name - 类型名称（用户自定义，如"餐饮"/"交通"）
 * @property budget - 每月可花费金额（元）
 * @property createdAt - 创建时间戳（毫秒）
 */
export interface BudgetCategory {
  id: string
  name: string
  budget: number
  createdAt: number
}

/**
 * 类型下的单条消费记录
 * @property id - 记录唯一标识
 * @property categoryId - 所属预算类型 ID
 * @property amount - 消费金额（元）
 * @property note - 详细记录（可选）
 * @property date - 消费日期字符串 'YYYY-MM-DD'
 * @property month - 月份键 'YYYY-MM'（便于按月统计）
 * @property createdAt - 创建时间戳（毫秒）
 */
export interface BudgetExpense {
  id: string
  categoryId: string
  amount: number
  note?: string
  date: string
  month: string
  createdAt: number
}

/**
 * 预算管理数据整体结构
 * @property categories - 预算类型数组
 * @property expenses - 所有消费记录数组
 */
export interface BudgetData {
  categories: BudgetCategory[]
  expenses: BudgetExpense[]
}
