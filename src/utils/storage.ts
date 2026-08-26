import type { Todo } from '@/types/todo'

// localStorage 存储的 key
const STORAGE_KEY = 'my-goalday-todos'

/**
 * 从 localStorage 获取所有待办事项
 * @returns 待办事项数组，若没有数据则返回空数组
 */
export function getTodos(): Todo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as Todo[] : []
  } catch (e) {
    console.error('读取 localStorage 失败:', e)
    return []
  }
}

/**
 * 将待办事项数组保存到 localStorage
 * @param todos - 待办事项数组
 */
export function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch (e) {
    console.error('写入 localStorage 失败:', e)
  }
}

/**
 * 生成唯一 ID（基于时间戳 + 随机数）
 * @returns 唯一标识符字符串
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 获取今天的日期字符串（格式: YYYY-MM-DD）
 * @returns 日期字符串，如 '2026-08-17'
 */
function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 添加一条新的待办事项
 * @param text - 待办内容文本
 * @param date - 所属日期（可选，默认为今天），格式 'YYYY-MM-DD'
 * @param color - 标签颜色（可选，空/未设表示用默认墨色），如 '#E07A5F'
 * @returns 新创建的待办事项对象
 */
export function addTodo(text: string, date?: string, color?: string): Todo {
  const newTodo: Todo = {
    id: generateId(),
    text: text.trim(),
    done: false,
    date: date || getTodayDate(),
    color: color || undefined,
    createdAt: new Date().toISOString(),
  }
  const todos = getTodos()
  todos.unshift(newTodo)
  saveTodos(todos)
  return newTodo
}
