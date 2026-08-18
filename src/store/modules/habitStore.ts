import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Habit } from '@/types/habit'
import {
  getHabits,
  saveHabits,
  createHabit as storageCreateHabit,
} from '@/utils/habitStorage'
import { getTodayDate, getMonthDates } from '@/utils/date'

/**
 * 习惯打卡状态管理 Store
 */
export const useHabitStore = defineStore('habit', () => {
  // 所有习惯
  const habits = ref<Habit[]>([])

  /**
   * 从 localStorage 加载习惯数据到内存
   */
  function loadHabits(): void {
    habits.value = getHabits()
  }

  /**
   * 创建新习惯
   * @param name - 习惯名称
   * @param icon - 习惯图标 emoji（可选）
   */
  function createHabit(name: string, icon?: string): void {
    if (!name.trim()) return
    const newHabit = storageCreateHabit(name, icon)
    habits.value.push(newHabit)
  }

  /**
   * 删除习惯
   * @param id - 习惯 id
   */
  function deleteHabit(id: string): void {
    const index = habits.value.findIndex(h => h.id === id)
    if (index === -1) return
    habits.value.splice(index, 1)
    saveHabits(habits.value)
  }

  /**
   * 切换某天打卡状态（已打卡则取消，未打卡则打卡）
   * @param habitId - 习惯 id
   * @param date - 日期字符串（可选，默认今天）
   */
  function toggleCheckIn(habitId: string, date: string = getTodayDate()): void {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return
    const index = habit.checkIns.indexOf(date)
    if (index >= 0) {
      // 已打卡，取消
      habit.checkIns.splice(index, 1)
    } else {
      // 未打卡，打卡
      habit.checkIns.push(date)
    }
    saveHabits(habits.value)
  }

  /**
   * 判断某天是否已打卡
   * @param habitId - 习惯 id
   * @param date - 日期字符串（可选，默认今天）
   * @returns 是否已打卡
   */
  function isCheckedIn(habitId: string, date: string = getTodayDate()): boolean {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return false
    return habit.checkIns.includes(date)
  }

  /**
   * 获取某习惯本月打卡率
   * @param habitId - 习惯 id
   * @returns 打卡率百分比 (0-100)
   */
  function getHabitProgress(habitId: string): number {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return 0
    const monthDates = getMonthDates()
    // 已过去的本月天数（包含今天）
    const today = getTodayDate()
    const passedDays = monthDates.filter(d => d <= today).length
    if (passedDays === 0) return 0
    const checkInCount = monthDates.filter(d => habit.checkIns.includes(d)).length
    return Math.round((checkInCount / passedDays) * 100)
  }

  /**
   * 获取某习惯本周打卡日期数组（用于本周日历视图）
   * @param habitId - 习惯 id
   * @returns 本周已打卡的日期字符串数组
   */
  function getWeekCheckIns(habitId: string): string[] {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return []
    return habit.checkIns
  }

  // ========== 计算属性 ==========

  /**
   * 今日已打卡的习惯数
   */
  const todayCheckInCount = computed<number>(() => {
    const today = getTodayDate()
    return habits.value.filter(h => h.checkIns.includes(today)).length
  })

  /**
   * 习惯总数
   */
  const habitsCount = computed<number>(() => habits.value.length)

  /**
   * 今日打卡完成率
   */
  const todayProgress = computed<number>(() => {
    if (habits.value.length === 0) return 0
    return Math.round((todayCheckInCount.value / habits.value.length) * 100)
  })

  return {
    // 状态
    habits,
    // 计算属性
    todayCheckInCount,
    habitsCount,
    todayProgress,
    // 方法
    loadHabits,
    createHabit,
    deleteHabit,
    toggleCheckIn,
    isCheckedIn,
    getHabitProgress,
    getWeekCheckIns,
  }
})
