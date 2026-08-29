import type { AddonSource, NotebookAddon } from '@/types/notebookAddon'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-notebook-addons'

/**
 * 生成唯一 ID（时间戳 + 随机串）
 * @returns 唯一标识字符串
 */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 读取本地手账附加信息
 * @returns 附加信息数组
 */
export function getNotebookAddons(): NotebookAddon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as NotebookAddon[]) : []
  } catch (e) {
    console.error('读取手账附加信息失败:', e)
    return []
  }
}

/**
 * 保存手账附加信息到 localStorage
 * @param addons - 待保存的附加信息数组
 */
export function saveNotebookAddons(addons: NotebookAddon[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addons))
  } catch (e) {
    console.error('写入手账附加信息失败:', e)
  }
}

/**
 * 新增或更新某日某模块的手账附加信息
 * 同日同来源覆盖更新（每日每模块只保留最新一份）
 * @param date - 归属日期字符串 'YYYY-MM-DD'
 * @param source - 来源模块标识
 * @param title - 信息标题
 * @param content - 信息正文
 */
export function upsertNotebookAddon(
  date: string,
  source: AddonSource,
  title: string,
  content: string,
): void {
  const addons = getNotebookAddons()
  const idx = addons.findIndex(a => a.date === date && a.source === source)
  if (idx >= 0) {
    // 已存在则覆盖更新
    addons[idx] = { ...addons[idx], title, content, createdAt: Date.now() }
  } else {
    // 不存在则追加
    addons.push({
      id: genId(),
      date,
      source,
      title,
      content,
      createdAt: Date.now(),
    })
  }
  saveNotebookAddons(addons)
}

/**
 * 删除某条手账附加信息
 * @param id - 记录唯一标识
 */
export function deleteNotebookAddon(id: string): void {
  const addons = getNotebookAddons()
  saveNotebookAddons(addons.filter(a => a.id !== id))
}
