import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WeightData, WeightRecord } from '@/types/weight'
import {
  getWeightData,
  setInitialWeight as storageSetInitial,
  upsertWeightRecord,
  deleteWeightRecord,
} from '@/utils/weightStorage'
import {
  getTodayDate,
  getMonthKey,
  addMonths,
  formatMonthLabel,
  getMonthDates,
  parseDate,
} from '@/utils/date'

/**
 * 单日变化信息
 * @property date - 当前日期
 * @property weight - 当日体重
 * @property prevDate - 用于对比的上一记录日期（可能不是前一天）
 * @property prevWeight - 用于对比的上一记录体重
 * @property delta - 变化值（当日 - 上日，正为增重，负为减重）
 */
export interface DayChange {
  date: string
  weight: number
  prevDate: string
  prevWeight: number
  delta: number
}

/**
 * 月度统计信息
 * @property firstWeight - 本月第一条记录体重（无记录则 0）
 * @property lastWeight - 本月最后一条记录体重（无记录则 0）
 * @property monthDelta - 月变化（最后 - 第一）
 * @property maxWeight - 本月最大体重
 * @property minWeight - 本月最小体重
 * @property avgWeight - 本月平均体重
 * @property recordCount - 本月记录数
 */
export interface MonthStats {
  firstWeight: number
  lastWeight: number
  monthDelta: number
  maxWeight: number
  minWeight: number
  avgWeight: number
  recordCount: number
}

/**
 * 体重记录状态管理 Store
 * 管理初始体重、每日体重记录与月度统计
 */
export const useWeightStore = defineStore('weight', () => {
  /** 体重数据 */
  const data = ref<WeightData>({
    initialWeight: 0,
    initialDate: '',
    records: [],
  })

  /** 当前选中的月份键（默认本月） */
  const currentMonth = ref<string>(getMonthKey())

  /**
   * 从 localStorage 加载体重数据到内存
   */
  function loadWeight(): void {
    data.value = getWeightData()
  }

  /**
   * 设置初始体重（首次使用）
   * @param weight - 初始体重值（kg）
   * @param date - 初始日期字符串（可选，默认今天）
   */
  function setInitialWeight(weight: number, date: string = getTodayDate()): void {
    storageSetInitial(weight, date)
    loadWeight()
  }

  /**
   * 新增或更新某日体重
   * @param weight - 当日体重（kg）
   * @param date - 日期字符串（可选，默认今天）
   */
  function upsertRecord(weight: number, date: string = getTodayDate()): void {
    upsertWeightRecord(date, weight)
    loadWeight()
  }

  /**
   * 删除某日体重记录
   * @param date - 日期字符串
   */
  function removeRecord(date: string): void {
    deleteWeightRecord(date)
    loadWeight()
  }

  /** 切换到上一个月 */
  function goPrevMonth(): void {
    currentMonth.value = addMonths(currentMonth.value, -1)
  }

  /** 切换到下一个月 */
  function goNextMonth(): void {
    currentMonth.value = addMonths(currentMonth.value, 1)
  }

  /** 回到本月 */
  function goThisMonth(): void {
    currentMonth.value = getMonthKey()
  }

  // ========== 计算属性 ==========

  /** 是否已设置初始体重 */
  const hasInitialWeight = computed<boolean>(() => data.value.initialWeight > 0)

  /** 全部体重记录（按日期升序） */
  const allRecords = computed<WeightRecord[]>(() => data.value.records)

  /** 本月所有日期字符串数组 */
  const monthDates = computed<string[]>(() => getMonthDates(`${currentMonth.value}-01`))

  /** 本月中文展示文本 */
  const monthLabel = computed<string>(() => formatMonthLabel(currentMonth.value))

  /** 是否本月 */
  const isCurrentMonth = computed<boolean>(() => currentMonth.value === getMonthKey())

  /** 本月体重记录数组（按日期升序） */
  const monthRecords = computed<WeightRecord[]>(() => {
    const dates = new Set(monthDates.value)
    return data.value.records
      .filter(r => dates.has(r.date))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  })

  /**
   * 本月每日变化信息列表
   * 每条记录对应该日与其最近的前一条记录（不限当月）的差值
   */
  const monthDayChanges = computed<DayChange[]>(() => {
    const result: DayChange[] = []
    // 本月记录按日期升序处理
    const sorted = monthRecords.value
    for (const record of sorted) {
      // 找到该日之前最近的体重记录
      const prev = data.value.records
        .filter(r => r.date < record.date)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
      if (prev) {
        result.push({
          date: record.date,
          weight: record.weight,
          prevDate: prev.date,
          prevWeight: prev.weight,
          delta: +(record.weight - prev.weight).toFixed(1),
        })
      } else {
        // 没有上一记录，则与初始体重对比
        result.push({
          date: record.date,
          weight: record.weight,
          prevDate: data.value.initialDate || '',
          prevWeight: data.value.initialWeight,
          delta: +(record.weight - data.value.initialWeight).toFixed(1),
        })
      }
    }
    return result
  })

  /** 本月统计信息 */
  const monthStats = computed<MonthStats>(() => {
    const records = monthRecords.value
    if (records.length === 0) {
      return {
        firstWeight: 0,
        lastWeight: 0,
        monthDelta: 0,
        maxWeight: 0,
        minWeight: 0,
        avgWeight: 0,
        recordCount: 0,
      }
    }
    const weights = records.map(r => r.weight)
    const first = records[0].weight
    const last = records[records.length - 1].weight
    const sum = weights.reduce((acc, w) => acc + w, 0)
    return {
      firstWeight: first,
      lastWeight: last,
      monthDelta: +(last - first).toFixed(1),
      maxWeight: Math.max(...weights),
      minWeight: Math.min(...weights),
      avgWeight: +(sum / weights.length).toFixed(1),
      recordCount: records.length,
    }
  })

  /**
   * 获取某日体重
   * @param date - 日期字符串
   * @returns 体重值，未记录返回 0
   */
  function getWeightByDate(date: string): number {
    const record = data.value.records.find(r => r.date === date)
    return record ? record.weight : 0
  }

  /**
   * 获取某日相比上一记录的变化
   * @param date - 日期字符串
   * @returns 变化信息，无记录或无上一记录返回 null
   */
  function getDayChangeByDate(date: string): DayChange | null {
    return monthDayChanges.value.find(c => c.date === date) ?? null
  }

  /**
   * 计算本月某日是第几天（1-based）
   * @param dateStr - 日期字符串
   * @returns 当月第几天（1-31）
   */
  function getDayOfMonth(dateStr: string): number {
    return parseDate(dateStr).getDate()
  }

  return {
    // 状态
    data,
    currentMonth,
    // 计算属性
    hasInitialWeight,
    allRecords,
    monthDates,
    monthLabel,
    isCurrentMonth,
    monthRecords,
    monthDayChanges,
    monthStats,
    // 方法
    loadWeight,
    setInitialWeight,
    upsertRecord,
    removeRecord,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    getWeightByDate,
    getDayChangeByDate,
    getDayOfMonth,
  }
})
