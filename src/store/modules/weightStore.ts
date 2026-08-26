import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WeightData, WeightMode, WeightRecord } from '@/types/weight'
import {
  getWeightData,
  setInitialWeight as storageSetInitial,
  setWeightMode,
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
 * 单日展示体重项（含标签与值）
 * @property label - 体重项标签（如"晨"/"晚"/"早"/"午"/"体重"）
 * @property value - 体重值，无则 null
 */
export interface DisplayWeight {
  label: string
  value: number | null
}

/**
 * 单日变化信息（按记录模式计算）
 * @property date - 当前日期
 * @property weight - 当日体重（代表值：daily=weight, 早晚=晨重, 三餐=均值；无则 null）
 * @property displayWeights - 当日需展示的多个体重项（含标签与值）
 * @property dayDelta - 当天内变化（仅早晚模式=晚-早，其他为 null）
 * @property prevDate - 用于对比的上一记录日期（可能不是前一天）
 * @property prevWeight - 用于对比的上一记录体重
 * @property delta - 变化值（当日 - 上日，正为增重，负为减重；无对比基准为 null）
 * @property deltaLabel - 变化对比标签（如"相较上次"/"相较昨夜"/"相较昨日均值"）
 */
export interface DayChange {
  date: string
  weight: number | null
  displayWeights: DisplayWeight[]
  dayDelta: number | null
  prevDate: string
  prevWeight: number | null
  delta: number | null
  deltaLabel: string
}

/**
 * 月度统计信息
 * @property firstWeight - 本月第一条记录代表体重（无记录则 null）
 * @property lastWeight - 本月最后一条记录代表体重（无记录则 null）
 * @property monthDelta - 月变化（最后 - 第一；无对比则 null）
 * @property maxWeight - 本月最大代表体重
 * @property minWeight - 本月最小代表体重
 * @property avgWeight - 本月平均代表体重
 * @property recordCount - 本月记录数
 * @property morningAvg - 早晚模式平均晨重（仅早晚模式有值，其他为 null）
 * @property eveningAvg - 早晚模式平均晚重（仅早晚模式有值，其他为 null）
 */
export interface MonthStats {
  firstWeight: number | null
  lastWeight: number | null
  monthDelta: number | null
  maxWeight: number | null
  minWeight: number | null
  avgWeight: number | null
  recordCount: number
  morningAvg: number | null
  eveningAvg: number | null
}

/**
 * 计算某条记录的代表体重
 * - daily: weight
 * - 早晚: morningWeight
 * - 三餐: 三餐均值
 * @param record - 体重记录
 * @param mode - 记录模式
 * @returns 代表体重，缺失则为 null
 */
function getRepresentWeight(record: WeightRecord, mode: WeightMode): number | null {
  if (mode === 'daily') {
    return typeof record.weight === 'number' ? record.weight : null
  }
  if (mode === 'morning-evening') {
    return typeof record.morningWeight === 'number' ? record.morningWeight : null
  }
  // 三餐模式：三餐均值
  const { morningWeight, noonWeight, eveningWeight } = record
  if (
    typeof morningWeight === 'number' &&
    typeof noonWeight === 'number' &&
    typeof eveningWeight === 'number'
  ) {
    return +((morningWeight + noonWeight + eveningWeight) / 3).toFixed(1)
  }
  return null
}

/**
 * 体重记录状态管理 Store
 * 管理初始体重、每日体重记录与月度统计，支持每日/早晚/三餐三种记录模式
 */
export const useWeightStore = defineStore('weight', () => {
  /** 体重数据 */
  const data = ref<WeightData>({
    initialWeight: 0,
    initialDate: '',
    records: [],
    mode: 'daily',
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
   * 切换记录模式
   * @param mode - 记录模式（daily/早晚/三餐）
   */
  function setMode(mode: WeightMode): void {
    setWeightMode(mode)
    loadWeight()
  }

  /**
   * 新增或更新某日体重（多字段）
   * @param fields - 记录字段（按模式传入对应体重）
   * @param date - 日期字符串（可选，默认今天）
   */
  function upsertRecord(
    fields: Pick<WeightRecord, 'weight' | 'morningWeight' | 'noonWeight' | 'eveningWeight'>,
    date: string = getTodayDate(),
  ): void {
    upsertWeightRecord(date, fields)
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

  /** 当前记录模式 */
  const mode = computed<WeightMode>(() => data.value.mode)

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
   * 找到指定日期之前最近一条满足条件的记录
   * @param date - 当前日期
   * @param predicate - 字段过滤条件
   * @returns 上一记录，无则 null
   */
  function findPrevRecord(
    date: string,
    predicate: (r: WeightRecord) => boolean,
  ): WeightRecord | null {
    const prev = data.value.records
      .filter(r => r.date < date && predicate(r))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
    return prev ?? null
  }

  /**
   * 本月每日变化信息列表
   * 按当前模式计算当日代表体重、当天内变化、跨日变化
   */
  const monthDayChanges = computed<DayChange[]>(() => {
    const currentMode = data.value.mode
    const deltaLabel =
      currentMode === 'daily'
        ? '相较上次'
        : currentMode === 'morning-evening'
          ? '相较昨夜'
          : '相较昨日均值'
    const result: DayChange[] = []
    const sorted = monthRecords.value
    for (const record of sorted) {
      const repWeight = getRepresentWeight(record, currentMode)
      // 组装展示体重项
      let displayWeights: DisplayWeight[] = []
      let dayDelta: number | null = null
      if (currentMode === 'daily') {
        displayWeights = [{ label: '体重', value: typeof record.weight === 'number' ? record.weight : null }]
      } else if (currentMode === 'morning-evening') {
        const m = typeof record.morningWeight === 'number' ? record.morningWeight : null
        const e = typeof record.eveningWeight === 'number' ? record.eveningWeight : null
        displayWeights = [
          { label: '晨', value: m },
          { label: '晚', value: e },
        ]
        // 当天变化=晚-早
        if (m !== null && e !== null) {
          dayDelta = +(e - m).toFixed(1)
        }
      } else {
        // 三餐模式
        const m = typeof record.morningWeight === 'number' ? record.morningWeight : null
        const n = typeof record.noonWeight === 'number' ? record.noonWeight : null
        const e = typeof record.eveningWeight === 'number' ? record.eveningWeight : null
        displayWeights = [
          { label: '早', value: m },
          { label: '午', value: n },
          { label: '晚', value: e },
        ]
      }

      // 跨日变化 delta
      let delta: number | null = null
      let prevDate = ''
      let prevWeight: number | null = null
      if (currentMode === 'daily') {
        const prev = findPrevRecord(record.date, r => typeof r.weight === 'number')
        if (prev && typeof prev.weight === 'number' && repWeight !== null) {
          delta = +(repWeight - prev.weight).toFixed(1)
          prevDate = prev.date
          prevWeight = prev.weight
        } else if (repWeight !== null) {
          // 无上一记录，与初始体重对比
          delta = +(repWeight - data.value.initialWeight).toFixed(1)
          prevDate = data.value.initialDate || ''
          prevWeight = data.value.initialWeight
        }
      } else if (currentMode === 'morning-evening') {
        // 今早 vs 昨夜（上一条有 eveningWeight 的记录）
        const prev = findPrevRecord(record.date, r => typeof r.eveningWeight === 'number')
        if (
          prev &&
          typeof prev.eveningWeight === 'number' &&
          typeof record.morningWeight === 'number'
        ) {
          delta = +(record.morningWeight - prev.eveningWeight).toFixed(1)
          prevDate = prev.date
          prevWeight = prev.eveningWeight
        }
      } else {
        // 三餐：今日均值 vs 上一条三餐记录均值
        const prev = findPrevRecord(
          record.date,
          r =>
            typeof r.morningWeight === 'number' &&
            typeof r.noonWeight === 'number' &&
            typeof r.eveningWeight === 'number',
        )
        if (prev && repWeight !== null) {
          const prevAvg = getRepresentWeight(prev, currentMode)
          if (prevAvg !== null) {
            delta = +(repWeight - prevAvg).toFixed(1)
            prevDate = prev.date
            prevWeight = prevAvg
          }
        }
      }

      result.push({
        date: record.date,
        weight: repWeight,
        displayWeights,
        dayDelta,
        prevDate,
        prevWeight,
        delta,
        deltaLabel,
      })
    }
    return result
  })

  /** 本月统计信息 */
  const monthStats = computed<MonthStats>(() => {
    const currentMode = data.value.mode
    const records = monthRecords.value
    if (records.length === 0) {
      return {
        firstWeight: null,
        lastWeight: null,
        monthDelta: null,
        maxWeight: null,
        minWeight: null,
        avgWeight: null,
        recordCount: 0,
        morningAvg: null,
        eveningAvg: null,
      }
    }
    // 各记录代表体重
    const repWeights = records
      .map(r => getRepresentWeight(r, currentMode))
      .filter((w): w is number => w !== null)
    const first = getRepresentWeight(records[0], currentMode)
    const last = getRepresentWeight(records[records.length - 1], currentMode)
    const base: MonthStats = {
      firstWeight: first,
      lastWeight: last,
      monthDelta:
        first !== null && last !== null ? +(last - first).toFixed(1) : null,
      maxWeight: repWeights.length ? Math.max(...repWeights) : null,
      minWeight: repWeights.length ? Math.min(...repWeights) : null,
      avgWeight:
        repWeights.length
          ? +(repWeights.reduce((acc, w) => acc + w, 0) / repWeights.length).toFixed(1)
          : null,
      recordCount: records.length,
      morningAvg: null,
      eveningAvg: null,
    }
    // 早晚模式额外统计平均晨重/晚重
    if (currentMode === 'morning-evening') {
      const mornings = records
        .map(r => r.morningWeight)
        .filter((w): w is number => typeof w === 'number')
      const evenings = records
        .map(r => r.eveningWeight)
        .filter((w): w is number => typeof w === 'number')
      base.morningAvg = mornings.length
        ? +(mornings.reduce((a, b) => a + b, 0) / mornings.length).toFixed(1)
        : null
      base.eveningAvg = evenings.length
        ? +(evenings.reduce((a, b) => a + b, 0) / evenings.length).toFixed(1)
        : null
    }
    return base
  })

  /**
   * 获取某日代表体重
   * @param date - 日期字符串
   * @returns 代表体重，未记录返回 null
   */
  function getWeightByDate(date: string): number | null {
    const record = data.value.records.find(r => r.date === date)
    if (!record) return null
    return getRepresentWeight(record, data.value.mode)
  }

  /**
   * 获取某日完整记录（含所有字段）
   * @param date - 日期字符串
   * @returns 记录，无则 null
   */
  function getRecordByDate(date: string): WeightRecord | null {
    return data.value.records.find(r => r.date === date) ?? null
  }

  /**
   * 获取某日相比上一记录的变化
   * @param date - 日期字符串
   * @returns 变化信息，无记录返回 null
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
    mode,
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
    setMode,
    upsertRecord,
    removeRecord,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
    getWeightByDate,
    getRecordByDate,
    getDayChangeByDate,
    getDayOfMonth,
  }
})
