import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import { getTodos, saveTodos, addTodo as storageAddTodo } from '@/utils/storage'
import { getTodayDate } from '@/utils/date'

/**
 * 待办事项状态管理 Store
 * 负责管理待办清单的数据加载、增删改查及计算属性
 */
export const useTodoStore = defineStore('todo', () => {
  // 所有待办事项
  const todos = ref<Todo[]>([])

  /**
   * 从 localStorage 加载待办数据到内存
   */
  function loadTodos(): void {
    todos.value = getTodos()
  }

  /**
   * 添加新待办
   * @param text - 待办内容文本
   * @param date - 所属日期（可选，默认今天）
   */
  function addTodo(text: string, date?: string): void {
    if (!text.trim()) return
    const newTodo = storageAddTodo(text, date)
    todos.value.unshift(newTodo)
  }

  /**
   * 切换待办的完成状态
   * @param id - 待办事项 id
   */
  function toggleTodo(id: string): void {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return
    todo.done = !todo.done
    if (todo.done) {
      todo.completedAt = new Date().toISOString()
    } else {
      todo.completedAt = undefined
    }
    saveTodos(todos.value)
  }

  /**
   * 删除待办事项
   * @param id - 待办事项 id
   */
  function deleteTodo(id: string): void {
    const index = todos.value.findIndex(t => t.id === id)
    if (index === -1) return
    todos.value.splice(index, 1)
    saveTodos(todos.value)
  }

  // ========== 计算属性 ==========

  /**
   * 今日日期
   */
  const today = computed<string>(() => getTodayDate())

  /**
   * 今日待办列表
   */
  const todayTodos = computed<Todo[]>(() => {
    return getTodosByDate(today.value)
  })

  /**
   * 今日已完成数量
   */
  const todayDoneCount = computed<number>(() => {
    return todayTodos.value.filter(t => t.done).length
  })

  /**
   * 今日待办总数
   */
  const todayTotalCount = computed<number>(() => todayTodos.value.length)

  /**
   * 今日完成进度百分比 (0-100)
   */
  const todayProgress = computed<number>(() => {
    return getDateProgress(today.value)
  })

  // ========== 方法：支持任意日期 ==========

  /**
   * 获取指定日期的待办列表
   * @param date - 日期字符串 'YYYY-MM-DD'
   * @returns 待办数组
   */
  function getTodosByDate(date: string): Todo[] {
    return todos.value.filter(todo => todo.date === date)
  }

  /**
   * 获取指定日期的已完成数量
   * @param date - 日期字符串
   * @returns 已完成数量
   */
  function getDateDoneCount(date: string): number {
    return getTodosByDate(date).filter(t => t.done).length
  }

  /**
   * 获取指定日期的待办总数
   * @param date - 日期字符串
   * @returns 待办总数
   */
  function getDateTotalCount(date: string): number {
    return getTodosByDate(date).length
  }

  /**
   * 获取指定日期的完成进度百分比 (0-100)
   * @param date - 日期字符串
   * @returns 进度百分比
   */
  function getDateProgress(date: string): number {
    const total = getDateTotalCount(date)
    if (total === 0) return 0
    const done = getDateDoneCount(date)
    return Math.round((done / total) * 100)
  }

  /**
   * 获取所有有任务的日期列表（倒序排列，最新的在前）
   * @returns 日期字符串数组
   */
  const datesWithTodos = computed<string[]>(() => {
    const dateSet = new Set<string>()
    todos.value.forEach(todo => {
      dateSet.add(todo.date)
    })
    // 倒序排列：最新日期在前
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a))
  })

  /**
   * 获取所有有任务的日期数量
   */
  const datesWithTodosCount = computed<number>(() => datesWithTodos.value.length)

  return {
    // 状态
    todos,
    // 计算属性（今日快捷访问）
    today,
    todayTodos,
    todayDoneCount,
    todayTotalCount,
    todayProgress,
    // 计算属性（手账用）
    datesWithTodos,
    datesWithTodosCount,
    // 方法
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    // 方法（支持任意日期）
    getTodosByDate,
    getDateDoneCount,
    getDateTotalCount,
    getDateProgress,
  }
})
