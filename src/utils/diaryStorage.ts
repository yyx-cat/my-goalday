import type { Diary } from '@/types/diary'

// localStorage 存储的 key
const STORAGE_KEY = 'my-goalday-diaries'

/**
 * 从 localStorage 获取所有日记
 * @returns 日记数组，若没有数据则返回空数组
 */
export function getDiaries(): Diary[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as Diary[] : []
  } catch (e) {
    console.error('读取日记数据失败:', e)
    return []
  }
}

/**
 * 将日记数组保存到 localStorage
 * @param diaries - 日记数组
 */
export function saveDiaries(diaries: Diary[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries))
  } catch (e) {
    console.error('写入日记数据失败:', e)
  }
}

/**
 * 获取某天的日记
 * @param date - 日期字符串 'YYYY-MM-DD'
 * @returns 日记对象，若不存在则返回 null
 */
export function getDiary(date: string): Diary | null {
  const diaries = getDiaries()
  return diaries.find(d => d.date === date) || null
}

/**
 * 保存日记（新增或更新）
 * @param date - 日期字符串
 * @param content - 日记内容
 */
export function saveDiary(date: string, content: string): void {
  const diaries = getDiaries()
  const existingIndex = diaries.findIndex(d => d.date === date)

  if (existingIndex >= 0) {
    // 更新已有日记
    diaries[existingIndex] = {
      ...diaries[existingIndex],
      content,
      updatedAt: new Date().toISOString(),
    }
  } else {
    // 新增日记
    diaries.push({
      date,
      content,
      updatedAt: new Date().toISOString(),
    })
  }
  saveDiaries(diaries)
}

/**
 * 删除某天的日记
 * @param date - 日期字符串
 */
export function deleteDiary(date: string): void {
  const diaries = getDiaries()
  const filtered = diaries.filter(d => d.date !== date)
  saveDiaries(filtered)
}

/**
 * 判断某天是否有日记
 * @param date - 日期字符串
 * @returns 是否有日记
 */
export function hasDiary(date: string): boolean {
  return getDiary(date) !== null
}
