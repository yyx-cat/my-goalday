import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FinanceData, FinanceRecord, FinanceRecordType } from '@/types/finance'
import {
  getFinanceData,
  addFinanceRecord,
  deleteFinanceRecord,
} from '@/utils/financeStorage'
import {
  getFinanceConfig,
  setMonthStartDay as configSetMonthStartDay,
} from '@/utils/financeConfig'
import {
  getTodayDate,
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
 * 理财记录状态管理 Store
 * 管理日常收支记录与统计（支出/收入/结余）
 * 支持自定义账期起始日（如每月 5 号到次月 4 号为一个账期）
 */
export const useFinanceStore = defineStore('finance', () => {
  /** 理财数据 */
  const data = ref<FinanceData>({
    records: [],
  })

  /** 账期起始日（1-28，默认 1 即自然月） */
  const monthStartDay = ref<number>(1)

  /**
   * 从 localStorage 加载理财数据与账期配置到内存
   */
  function loadFinance(): void {
    data.value = getFinanceData()
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

  /**
   * 新增一条收支记录
   * @param type - 记录类型（支出/收入）
   * @param amount - 金额
   * @param date - 日期字符串（可选，默认今天）
   * @param note - 详细记录（可选）
   */
  function addRecord(
    type: FinanceRecordType,
    amount: number,
    date: string = getTodayDate(),
    note?: string,
  ): void {
    addFinanceRecord(type, round2(amount), date, note)
    loadFinance()
  }

  /**
   * 删除一条收支记录
   * @param id - 记录唯一标识
   */
  function removeRecord(id: string): void {
    deleteFinanceRecord(id)
    loadFinance()
  }

  // ========== 账期与统计 ==========

  /** 当前账期范围（基于今天计算） */
  const currentPeriod = computed<BillingPeriod>(() =>
    getBillingPeriod(getTodayDate(), monthStartDay.value),
  )

  /** 当前账期中文展示文本（如 "8月5日 - 9月4日"） */
  const currentPeriodLabel = computed<string>(() =>
    formatBillingPeriodLabel(currentPeriod.value),
  )

  /** 全部记录（按创建时间倒序） */
  const records = computed<FinanceRecord[]>(() =>
    [...data.value.records].sort((a, b) => b.createdAt - a.createdAt),
  )

  /** 当前账期内的记录（按创建时间倒序） */
  const periodRecords = computed<FinanceRecord[]>(() => {
    const period = currentPeriod.value
    return records.value.filter(r => isDateInBillingPeriod(r.date, period))
  })

  /** 当前账期内的支出记录（按创建时间倒序） */
  const expenseRecords = computed<FinanceRecord[]>(() =>
    periodRecords.value.filter(r => r.type === 'expense'),
  )

  /** 当前账期内的收入记录（按创建时间倒序） */
  const incomeRecords = computed<FinanceRecord[]>(() =>
    periodRecords.value.filter(r => r.type === 'income'),
  )

  /** 当前账期支出总额 */
  const totalExpense = computed<number>(() =>
    round2(expenseRecords.value.reduce((sum, r) => sum + r.amount, 0)),
  )

  /** 当前账期收入总额 */
  const totalIncome = computed<number>(() =>
    round2(incomeRecords.value.reduce((sum, r) => sum + r.amount, 0)),
  )

  /** 当前账期结余（收入 - 支出） */
  const balance = computed<number>(() => round2(totalIncome.value - totalExpense.value))

  return {
    // 状态
    data,
    monthStartDay,
    currentPeriod,
    currentPeriodLabel,
    // 计算属性
    records,
    periodRecords,
    expenseRecords,
    incomeRecords,
    totalExpense,
    totalIncome,
    balance,
    // 方法
    loadFinance,
    setMonthStartDay,
    addRecord,
    removeRecord,
  }
})
