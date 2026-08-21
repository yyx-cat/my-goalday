import type { MonthlyTask } from '@/types/monthlyTask'

/** localStorage 存储键 */
const STORAGE_KEY = 'my-goalday-monthly-tasks'

/**
 * 生成任务唯一 id
 * @returns 带时间戳和随机串的 id
 */
function generateId(): string {
  return `mt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 从 localStorage 读取所有月度任务
 * @returns 月度任务数组
 */
export function getMonthlyTasks(): MonthlyTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MonthlyTask[]
  } catch {
    return []
  }
}

/**
 * 保存所有月度任务到 localStorage
 * @param tasks - 月度任务数组
 */
export function saveMonthlyTasks(tasks: MonthlyTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

/**
 * 创建新月度任务
 * @param text - 任务文本
 * @param month - 所属月份键 'YYYY-MM'
 * @returns 新创建的任务对象
 */
export function createMonthlyTask(text: string, month: string): MonthlyTask {
  const task: MonthlyTask = {
    id: generateId(),
    text,
    done: false,
    month,
    createdAt: Date.now(),
  }
  const tasks = getMonthlyTasks()
  tasks.push(task)
  saveMonthlyTasks(tasks)
  return task
}

/**
 * 切换月度任务完成状态
 * @param id - 任务 id
 */
export function toggleMonthlyTask(id: string): void {
  const tasks = getMonthlyTasks()
  const idx = tasks.findIndex(t => t.id === id)
  if (idx !== -1) {
    tasks[idx].done = !tasks[idx].done
    saveMonthlyTasks(tasks)
  }
}

/**
 * 删除月度任务
 * @param id - 任务 id
 */
export function deleteMonthlyTask(id: string): void {
  const tasks = getMonthlyTasks().filter(t => t.id !== id)
  saveMonthlyTasks(tasks)
}

/**
 * 更新月度任务文本
 * @param id - 任务 id
 * @param text - 新文本
 */
export function updateMonthlyTaskText(id: string, text: string): void {
  const tasks = getMonthlyTasks()
  const idx = tasks.findIndex(t => t.id === id)
  if (idx !== -1) {
    tasks[idx].text = text
    saveMonthlyTasks(tasks)
  }
}

/**
 * 获取某月的所有月度任务
 * @param month - 月份键 'YYYY-MM'
 * @returns 该月任务数组（按创建时间排序）
 */
export function getMonthlyTasksByMonth(month: string): MonthlyTask[] {
  return getMonthlyTasks()
    .filter(t => t.month === month)
    .sort((a, b) => a.createdAt - b.createdAt)
}
