import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BudgetCategory, BudgetData, BudgetExpense } from '@/types/financeBudget'
import {
  getBudgetData,
  addBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  addBudgetExpense,
  deleteBudgetExpense,
} from '@/utils/financeBudgetStorage'
import { getTodayDate, getMonthKey } from '@/utils/date'

/**
 * 将数值四舍五入到两位小数
 * @param n - 原始数值
 * @returns 两位小数数值
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * 预算管理状态管理 Store
 * 管理用户自定义预算类型与每月消费记录，提供剩余额度计算
 */
export const useFinanceBudgetStore = defineStore('financeBudget', () => {
  /** 预算管理数据 */
  const data = ref<BudgetData>({
    categories: [],
    expenses: [],
  })

  /**
   * 从 localStorage 加载预算数据到内存
   */
  function loadBudget(): void {
    data.value = getBudgetData()
  }

  /**
   * 新增预算类型
   * @param name - 类型名称
   * @param budget - 每月预算金额
   */
  function addCategory(name: string, budget: number): void {
    addBudgetCategory(name, round2(budget))
    loadBudget()
  }

  /**
   * 修改预算类型（名称/预算）
   * 注：view 层应在调用前做二次确认
   * @param id - 类型唯一标识
   * @param fields - 待修改字段
   */
  function updateCategory(
    id: string,
    fields: Partial<Pick<BudgetCategory, 'name' | 'budget'>>,
  ): void {
    const patch: Partial<Pick<BudgetCategory, 'name' | 'budget'>> = {}
    if (fields.name !== undefined) patch.name = fields.name
    if (fields.budget !== undefined) patch.budget = round2(fields.budget)
    updateBudgetCategory(id, patch)
    loadBudget()
  }

  /**
   * 删除预算类型（同时删除其下消费记录）
   * 注：view 层应在调用前做二次确认
   * @param id - 类型唯一标识
   */
  function removeCategory(id: string): void {
    deleteBudgetCategory(id)
    loadBudget()
  }

  /**
   * 新增一条类型消费记录
   * @param categoryId - 所属类型 ID
   * @param amount - 消费金额
   * @param note - 详细记录（可选）
   * @param date - 消费日期（可选，默认今天）
   */
  function addExpense(
    categoryId: string,
    amount: number,
    note?: string,
    date: string = getTodayDate(),
  ): void {
    const month = getMonthKey(date)
    addBudgetExpense(categoryId, round2(amount), date, month, note)
    loadBudget()
  }

  /**
   * 删除一条消费记录
   * @param id - 记录唯一标识
   */
  function removeExpense(id: string): void {
    deleteBudgetExpense(id)
    loadBudget()
  }

  /**
   * 获取某类型本月消费记录（按创建时间倒序）
   * @param categoryId - 类型唯一标识
   * @returns 本月消费记录数组
   */
  function getCategoryExpenses(categoryId: string): BudgetExpense[] {
    const month = getMonthKey()
    return data.value.expenses
      .filter(e => e.categoryId === categoryId && e.month === month)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 获取某类型本月已消费总额
   * @param categoryId - 类型唯一标识
   * @returns 本月已消费金额
   */
  function getCategorySpent(categoryId: string): number {
    return round2(
      getCategoryExpenses(categoryId).reduce((sum, e) => sum + e.amount, 0),
    )
  }

  /**
   * 获取某类型本月剩余额度（预算 - 已花；可为负）
   * @param categoryId - 类型唯一标识
   * @returns 剩余额度
   */
  function getCategoryRemaining(categoryId: string): number {
    const cat = data.value.categories.find(c => c.id === categoryId)
    if (!cat) return 0
    return round2(cat.budget - getCategorySpent(categoryId))
  }

  return {
    // 状态
    data,
    // 方法
    loadBudget,
    addCategory,
    updateCategory,
    removeCategory,
    addExpense,
    removeExpense,
    getCategoryExpenses,
    getCategorySpent,
    getCategoryRemaining,
  }
})
