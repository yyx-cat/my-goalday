import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BudgetCategory, BudgetData, BudgetExpense } from '@/types/financeBudget'
import {
  getBudgetData,
  addBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  addBudgetExpense,
  deleteBudgetExpense,
} from '@/utils/financeBudgetStorage'
import {
  getFinanceConfig,
  setMonthStartDay as configSetMonthStartDay,
} from '@/utils/financeConfig'
import {
  getTodayDate,
  getMonthKey,
  getBillingPeriod,
  isDateInBillingPeriod,
  formatBillingPeriodLabel,
  type BillingPeriod,
} from '@/utils/date'

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
 * 支持自定义账期起始日（如每月 5 号到次月 4 号为一个账期）
 */
export const useFinanceBudgetStore = defineStore('financeBudget', () => {
  /** 预算管理数据 */
  const data = ref<BudgetData>({
    categories: [],
    expenses: [],
  })

  /** 账期起始日（1-28，默认 1 即自然月） */
  const monthStartDay = ref<number>(1)

  /**
   * 从 localStorage 加载预算数据与账期配置到内存
   */
  function loadBudget(): void {
    data.value = getBudgetData()
    monthStartDay.value = getFinanceConfig().monthStartDay
  }

  /**
   * 设置账期起始日（1-28）
   * @param day - 起始日
   */
  function setMonthStartDay(day: number): void {
    configSetMonthStartDay(day)
    monthStartDay.value = getFinanceConfig().monthStartDay
  }

  /** 当前账期范围（基于今天计算） */
  const currentPeriod = computed<BillingPeriod>(() =>
    getBillingPeriod(getTodayDate(), monthStartDay.value),
  )

  /** 当前账期中文展示文本（如 "8月5日 - 9月4日"） */
  const currentPeriodLabel = computed<string>(() =>
    formatBillingPeriodLabel(currentPeriod.value),
  )

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
   * 获取某类型本账期消费记录（按创建时间倒序）
   * 按账期范围过滤（兼容自定义起始日）
   * @param categoryId - 类型唯一标识
   * @returns 本账期消费记录数组
   */
  function getCategoryExpenses(categoryId: string): BudgetExpense[] {
    const period = currentPeriod.value
    return data.value.expenses
      .filter(
        e => e.categoryId === categoryId && isDateInBillingPeriod(e.date, period),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * 获取某类型本账期已消费总额
   * @param categoryId - 类型唯一标识
   * @returns 本账期已消费金额
   */
  function getCategorySpent(categoryId: string): number {
    return round2(
      getCategoryExpenses(categoryId).reduce((sum, e) => sum + e.amount, 0),
    )
  }

  /**
   * 获取某类型本账期剩余额度（预算 - 已花；可为负）
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
    monthStartDay,
    currentPeriod,
    currentPeriodLabel,
    // 方法
    loadBudget,
    setMonthStartDay,
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
