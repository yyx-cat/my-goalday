import type { BudgetCategory, BudgetData, BudgetExpense } from '@/types/financeBudget'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-finance-budget'

/** 默认空数据 */
const EMPTY_DATA: BudgetData = {
  categories: [],
  expenses: [],
}

/**
 * 生成唯一 ID（时间戳 + 随机串）
 * @returns 唯一标识字符串
 */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 读取本地预算管理数据
 * @returns 预算数据对象，若不存在则返回空数据
 */
export function getBudgetData(): BudgetData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as Partial<BudgetData>
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    }
  } catch (e) {
    console.error('读取预算数据失败:', e)
    return { ...EMPTY_DATA }
  }
}

/**
 * 保存预算管理数据到 localStorage
 * @param data - 待保存的预算数据对象
 */
export function saveBudgetData(data: BudgetData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('写入预算数据失败:', e)
  }
}

/**
 * 新增一个预算类型
 * @param name - 类型名称
 * @param budget - 每月预算金额
 * @returns 新生成的类型对象
 */
export function addBudgetCategory(name: string, budget: number): BudgetCategory {
  const data = getBudgetData()
  const category: BudgetCategory = {
    id: genId(),
    name,
    budget,
    createdAt: Date.now(),
  }
  data.categories.push(category)
  saveBudgetData(data)
  return category
}

/**
 * 修改预算类型（名称/预算，仅传需要改的字段）
 * @param id - 类型唯一标识
 * @param fields - 待修改字段
 */
export function updateBudgetCategory(
  id: string,
  fields: Partial<Pick<BudgetCategory, 'name' | 'budget'>>,
): void {
  const data = getBudgetData()
  const idx = data.categories.findIndex(c => c.id === id)
  if (idx < 0) return
  if (fields.name !== undefined) data.categories[idx].name = fields.name
  if (fields.budget !== undefined) data.categories[idx].budget = fields.budget
  saveBudgetData(data)
}

/**
 * 删除预算类型（同时删除其下所有消费记录）
 * @param id - 类型唯一标识
 */
export function deleteBudgetCategory(id: string): void {
  const data = getBudgetData()
  data.categories = data.categories.filter(c => c.id !== id)
  data.expenses = data.expenses.filter(e => e.categoryId !== id)
  saveBudgetData(data)
}

/**
 * 新增一条类型消费记录
 * @param categoryId - 所属类型 ID
 * @param amount - 消费金额
 * @param date - 消费日期字符串
 * @param month - 月份键 'YYYY-MM'
 * @param note - 详细记录（可选）
 * @returns 新生成的记录对象
 */
export function addBudgetExpense(
  categoryId: string,
  amount: number,
  date: string,
  month: string,
  note?: string,
): BudgetExpense {
  const data = getBudgetData()
  const expense: BudgetExpense = {
    id: genId(),
    categoryId,
    amount,
    date,
    month,
    createdAt: Date.now(),
  }
  if (note && note.trim()) {
    expense.note = note.trim()
  }
  data.expenses.push(expense)
  saveBudgetData(data)
  return expense
}

/**
 * 删除一条消费记录
 * @param id - 记录唯一标识
 */
export function deleteBudgetExpense(id: string): void {
  const data = getBudgetData()
  data.expenses = data.expenses.filter(e => e.id !== id)
  saveBudgetData(data)
}
