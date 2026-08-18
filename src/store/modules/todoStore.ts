import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import { getTodos, saveTodos, addTodo as storageAddTodo } from '@/utils/storage'

/**
 * 获取今天的日期字符串（格式: YYYY-MM-DD）
 * @returns 日期字符串
 */
function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
   * 今日待办列表
   */
  const todayTodos = computed<Todo[]>(() => {
    const t = today()
    return todos.value.filter(todo => todo.date === t)
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
    if (todayTotalCount.value === 0) return 0
    return Math.round((todayDoneCount.value / todayTotalCount.value) * 100)
  })

  return {
    // 状态
    todos,
    // 计算属性
    todayTodos,
    todayDoneCount,
    todayTotalCount,
    todayProgress,
    // 方法
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  }
})
