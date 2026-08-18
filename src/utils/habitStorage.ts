import type { Habit } from '@/types/habit'

// localStorage 存储的 key
const STORAGE_KEY = 'my-goalday-habits'

/**
 * 从 localStorage 获取所有习惯
 * @returns 习惯数组，若没有数据则返回空数组
 */
export function getHabits(): Habit[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as Habit[] : []
  } catch (e) {
    console.error('读取习惯数据失败:', e)
    return []
  }
}

/**
 * 将习惯数组保存到 localStorage
 * @param habits - 习惯数组
 */
export function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits))
  } catch (e) {
    console.error('写入习惯数据失败:', e)
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
 * 创建新习惯
 * @param name - 习惯名称
 * @param icon - 习惯图标 emoji（可选）
 * @returns 新创建的习惯对象
 */
export function createHabit(name: string, icon?: string): Habit {
  const newHabit: Habit = {
    id: generateId(),
    name: name.trim(),
    icon: icon || '🎯',
    createdAt: new Date().toISOString(),
    checkIns: [],
  }
  const habits = getHabits()
  habits.push(newHabit)
  saveHabits(habits)
  return newHabit
}
