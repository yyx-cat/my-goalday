import type { NotebookConfig, PageConfig } from '@/types/notebook'
import type { ModuleId } from '@/types/module'

// localStorage 存储的 key
const STORAGE_KEY = 'my-goalday-notebooks'

/**
 * 从 localStorage 获取所有手账本
 * @returns 手账本数组，若没有数据则返回空数组
 */
export function getNotebooks(): NotebookConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as NotebookConfig[] : []
  } catch (e) {
    console.error('读取手账本数据失败:', e)
    return []
  }
}

/**
 * 将手账本数组保存到 localStorage
 * @param notebooks - 手账本数组
 */
export function saveNotebooks(notebooks: NotebookConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
  } catch (e) {
    console.error('写入手账本数据失败:', e)
  }
}

/**
 * 生成唯一 ID
 * @returns 唯一标识符字符串
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 判断是否首次启动（是否已有手账本）
 * @returns 是否首次启动
 */
export function isFirstLaunch(): boolean {
  return localStorage.getItem(STORAGE_KEY) === null
}

/**
 * 创建新手账本
 * @param name - 手账本名称
 * @param coverColor - 封面颜色（可选）
 * @param pages - 页面配置（可选）
 * @returns 新创建的手账本对象
 */
export function createNotebook(
  name: string,
  coverColor: string = '#A8824F',
  pages: Pick<PageConfig, 'moduleId' | 'title'>[] = [],
): NotebookConfig {
  const now = new Date().toISOString()
  const notebook: NotebookConfig = {
    id: generateId(),
    name: name.trim(),
    coverColor,
    pages: pages.map((p, index) => ({
      ...p,
      order: index,
      config: {},
    })),
    createdAt: now,
    updatedAt: now,
  }
  const notebooks = getNotebooks()
  notebooks.push(notebook)
  saveNotebooks(notebooks)
  return notebook
}

/**
 * 删除手账本
 * @param id - 手账本 id
 */
export function deleteNotebook(id: string): void {
  const notebooks = getNotebooks()
  const filtered = notebooks.filter(n => n.id !== id)
  saveNotebooks(filtered)
}

/**
 * 更新手账本配置
 * @param id - 手账本 id
 * @param config - 要更新的部分配置
 */
export function updateNotebook(
  id: string,
  config: Partial<Omit<NotebookConfig, 'id' | 'createdAt'>>,
): void {
  const notebooks = getNotebooks()
  const index = notebooks.findIndex(n => n.id === id)
  if (index === -1) return
  notebooks[index] = {
    ...notebooks[index],
    ...config,
    updatedAt: new Date().toISOString(),
  }
  saveNotebooks(notebooks)
}

/**
 * 获取单个手账本
 * @param id - 手账本 id
 * @returns 手账本对象，不存在则返回 null
 */
export function getNotebook(id: string): NotebookConfig | null {
  const notebooks = getNotebooks()
  return notebooks.find(n => n.id === id) || null
}

/**
 * 添加页面到手账本
 * @param notebookId - 手账本 id
 * @param moduleId - 模块 ID
 * @param title - 页面标题
 */
export function addPageToNotebook(
  notebookId: string,
  moduleId: ModuleId,
  title: string,
): void {
  const notebook = getNotebook(notebookId)
  if (!notebook) return
  const newPage: PageConfig = {
    moduleId,
    title,
    order: notebook.pages.length,
    config: {},
  }
  notebook.pages.push(newPage)
  notebook.updatedAt = new Date().toISOString()
  updateNotebook(notebookId, { pages: notebook.pages })
}

/**
 * 从手账本移除页面
 * @param notebookId - 手账本 id
 * @param pageIndex - 页面索引
 */
export function removePageFromNotebook(
  notebookId: string,
  pageIndex: number,
): void {
  const notebook = getNotebook(notebookId)
  if (!notebook) return
  notebook.pages.splice(pageIndex, 1)
  // 重新排序
  notebook.pages.forEach((p, i) => (p.order = i))
  notebook.updatedAt = new Date().toISOString()
  updateNotebook(notebookId, { pages: notebook.pages })
}

/**
 * 重新排序页面
 * @param notebookId - 手账本 id
 * @param fromIndex - 起始索引
 * @param toIndex - 目标索引
 */
export function reorderPage(
  notebookId: string,
  fromIndex: number,
  toIndex: number,
): void {
  const notebook = getNotebook(notebookId)
  if (!notebook) return
  const [moved] = notebook.pages.splice(fromIndex, 1)
  if (!moved) return
  notebook.pages.splice(toIndex, 0, moved)
  // 重新排序
  notebook.pages.forEach((p, i) => (p.order = i))
  notebook.updatedAt = new Date().toISOString()
  updateNotebook(notebookId, { pages: notebook.pages })
}

/**
 * 更新页面标题
 * @param notebookId - 手账本 id
 * @param pageIndex - 页面索引
 * @param newTitle - 新标题
 */
export function updatePageTitle(
  notebookId: string,
  pageIndex: number,
  newTitle: string,
): void {
  const notebook = getNotebook(notebookId)
  if (!notebook) return
  if (!notebook.pages[pageIndex]) return
  notebook.pages[pageIndex].title = newTitle
  notebook.updatedAt = new Date().toISOString()
  updateNotebook(notebookId, { pages: notebook.pages })
}
