import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FinanceData, FinanceRecord, FinanceRecordType } from '@/types/finance'
import {
  getFinanceData,
  addFinanceRecord,
  deleteFinanceRecord,
} from '@/utils/financeStorage'
import { getTodayDate } from '@/utils/date'

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
 */
export const useFinanceStore = defineStore('finance', () => {
  /** 理财数据 */
  const data = ref<FinanceData>({
    records: [],
  })

  /**
   * 从 localStorage 加载理财数据到内存
   */
  function loadFinance(): void {
    data.value = getFinanceData()
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

  // ========== 计算属性 ==========

  /** 全部记录（按创建时间倒序） */
  const records = computed<FinanceRecord[]>(() =>
    [...data.value.records].sort((a, b) => b.createdAt - a.createdAt),
  )

  /** 支出记录（按创建时间倒序） */
  const expenseRecords = computed<FinanceRecord[]>(() =>
    records.value.filter(r => r.type === 'expense'),
  )

  /** 收入记录（按创建时间倒序） */
  const incomeRecords = computed<FinanceRecord[]>(() =>
    records.value.filter(r => r.type === 'income'),
  )

  /** 支出总额 */
  const totalExpense = computed<number>(() =>
    round2(expenseRecords.value.reduce((sum, r) => sum + r.amount, 0)),
  )

  /** 收入总额 */
  const totalIncome = computed<number>(() =>
    round2(incomeRecords.value.reduce((sum, r) => sum + r.amount, 0)),
  )

  /** 结余（收入 - 支出） */
  const balance = computed<number>(() => round2(totalIncome.value - totalExpense.value))

  return {
    // 状态
    data,
    // 计算属性
    records,
    expenseRecords,
    incomeRecords,
    totalExpense,
    totalIncome,
    balance,
    // 方法
    loadFinance,
    addRecord,
    removeRecord,
  }
})
