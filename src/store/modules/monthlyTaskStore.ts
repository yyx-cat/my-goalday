import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MonthlyTask } from '@/types/monthlyTask'
import {
  getMonthlyTasks,
  createMonthlyTask as storageCreate,
  toggleMonthlyTask as storageToggle,
  deleteMonthlyTask as storageDelete,
} from '@/utils/monthlyTaskStorage'
import { getMonthKey, addMonths } from '@/utils/date'

/**
 * 月度任务状态管理 Store
 * 管理按月分组的月度任务清单
 */
export const useMonthlyTaskStore = defineStore('monthlyTask', () => {
  // 所有月度任务
  const tasks = ref<MonthlyTask[]>([])

  // 当前选中的月份键（默认本月）
  const currentMonth = ref<string>(getMonthKey())

  /**
   * 从 localStorage 加载所有月度任务
   */
  function loadTasks(): void {
    tasks.value = getMonthlyTasks()
  }

  /**
   * 添加月度任务（关联到当前月份）
   * @param text - 任务文本
   * @param month - 月份键（可选，默认当前月）
   * @param source - 来源标识（灵感模块名，用户自建任务不传）
   */
  function addTask(text: string, month?: string, source?: string): void {
    const targetMonth = month || currentMonth.value
    storageCreate(text, targetMonth, source)
    loadTasks()
  }

  /**
   * 切换月度任务完成状态
   * @param id - 任务 id
   */
  function toggleTask(id: string): void {
    storageToggle(id)
    loadTasks()
  }

  /**
   * 删除月度任务
   * @param id - 任务 id
   */
  function deleteTask(id: string): void {
    storageDelete(id)
    loadTasks()
  }

  /**
   * 切换到上一个月份
   */
  function goPrevMonth(): void {
    currentMonth.value = addMonths(currentMonth.value, -1)
  }

  /**
   * 切换到下一个月份
   */
  function goNextMonth(): void {
    currentMonth.value = addMonths(currentMonth.value, 1)
  }

  /**
   * 回到本月
   */
  function goThisMonth(): void {
    currentMonth.value = getMonthKey()
  }

  // ========== 计算属性 ==========

  /** 当前月的任务列表（按创建时间排序） */
  const monthTasks = computed<MonthlyTask[]>(() =>
    tasks.value
      .filter(t => t.month === currentMonth.value)
      .sort((a, b) => a.createdAt - b.createdAt),
  )

  /** 当前月已完成数 */
  const monthDoneCount = computed<number>(() =>
    monthTasks.value.filter(t => t.done).length,
  )

  /** 当前月任务总数 */
  const monthTotalCount = computed<number>(() => monthTasks.value.length)

  /** 是否是本月 */
  const isCurrentMonth = computed<boolean>(() => currentMonth.value === getMonthKey())

  return {
    // 状态
    tasks,
    currentMonth,
    // 计算属性
    monthTasks,
    monthDoneCount,
    monthTotalCount,
    isCurrentMonth,
    // 方法
    loadTasks,
    addTask,
    toggleTask,
    deleteTask,
    goPrevMonth,
    goNextMonth,
    goThisMonth,
  }
})
