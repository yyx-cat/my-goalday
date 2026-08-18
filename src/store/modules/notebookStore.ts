import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NotebookConfig, PageConfig } from '@/types/notebook'
import type { ModuleId } from '@/types/module'
import {
  getNotebooks,
  createNotebook as storageCreateNotebook,
  deleteNotebook as storageDeleteNotebook,
  updateNotebook as storageUpdateNotebook,
  getNotebook as storageGetNotebook,
  addPageToNotebook as storageAddPage,
  removePageFromNotebook as storageRemovePage,
  reorderPage as storageReorderPage,
  updatePageTitle as storageUpdatePageTitle,
  isFirstLaunch,
} from '@/utils/notebookStorage'
import { templates } from '@/config/templates'

/**
 * 手账本状态管理 Store
 * 管理所有手账本配置和当前选中的手账本
 */
export const useNotebookStore = defineStore('notebook', () => {
  // 所有手账本列表
  const notebooks = ref<NotebookConfig[]>([])

  // 当前选中的手账本 ID
  const currentNotebookId = ref<string>('')

  // 应用路由状态：'onboarding' | 'list' | 'editor' | 'viewer'
  const route = ref<'onboarding' | 'list' | 'editor' | 'viewer'>('list')

  // ========== 计算属性 ==========

  /**
   * 当前手账本对象
   */
  const currentNotebook = computed<NotebookConfig | null>(() => {
    if (!currentNotebookId.value) return null
    return notebooks.value.find(n => n.id === currentNotebookId.value) || null
  })

  /**
   * 当前手账本的页面列表
   */
  const currentPages = computed<PageConfig[]>(() => {
    return currentNotebook.value?.pages || []
  })

  /**
   * 是否首次启动（需要展示引导页）
   */
  const isFirstTime = computed<boolean>(() => isFirstLaunch())

  // ========== 方法 ==========

  /**
   * 从 localStorage 加载所有手账本
   */
  function loadNotebooks(): void {
    notebooks.value = getNotebooks()
  }

  /**
   * 创建新手账本
   * @param name - 手账本名称
   * @param coverColor - 封面颜色
   * @param pages - 页面配置
   * @returns 新创建的手账本
   */
  function createNotebook(
    name: string,
    coverColor: string = '#A8824F',
    pages: Pick<PageConfig, 'moduleId' | 'title'>[] = [],
  ): NotebookConfig {
    const notebook = storageCreateNotebook(name, coverColor, pages)
    notebooks.value.push(notebook)
    return notebook
  }

  /**
   * 根据模版创建手账本
   * @param templateId - 模版 ID
   * @param customName - 自定义名称（可选，默认用模版名）
   * @returns 新创建的手账本
   */
  function createNotebookFromTemplate(
    templateId: string,
    customName?: string,
  ): NotebookConfig | null {
    const template = templates.find(t => t.id === templateId)
    if (!template) return null
    return createNotebook(
      customName || template.name,
      template.coverColor,
      template.pages,
    )
  }

  /**
   * 删除手账本
   * @param id - 手账本 id
   */
  function deleteNotebook(id: string): void {
    storageDeleteNotebook(id)
    notebooks.value = notebooks.value.filter(n => n.id !== id)
    // 如果删除的是当前手账本，清空当前 ID
    if (currentNotebookId.value === id) {
      currentNotebookId.value = ''
    }
  }

  /**
   * 切换当前手账本
   * @param id - 手账本 id
   */
  function switchNotebook(id: string): void {
    currentNotebookId.value = id
  }

  /**
   * 添加页面到手账本
   * @param notebookId - 手账本 id
   * @param moduleId - 模块 ID
   * @param title - 页面标题
   */
  function addPage(notebookId: string, moduleId: ModuleId, title: string): void {
    storageAddPage(notebookId, moduleId, title)
    // 重新加载该手账本到内存
    reloadNotebook(notebookId)
  }

  /**
   * 移除手账本中的页面
   * @param notebookId - 手账本 id
   * @param pageIndex - 页面索引
   */
  function removePage(notebookId: string, pageIndex: number): void {
    storageRemovePage(notebookId, pageIndex)
    reloadNotebook(notebookId)
  }

  /**
   * 重新排序页面
   * @param notebookId - 手账本 id
   * @param fromIndex - 起始索引
   * @param toIndex - 目标索引
   */
  function reorderPage(notebookId: string, fromIndex: number, toIndex: number): void {
    storageReorderPage(notebookId, fromIndex, toIndex)
    reloadNotebook(notebookId)
  }

  /**
   * 更新页面标题
   * @param notebookId - 手账本 id
   * @param pageIndex - 页面索引
   * @param newTitle - 新标题
   */
  function updatePageTitle(notebookId: string, pageIndex: number, newTitle: string): void {
    storageUpdatePageTitle(notebookId, pageIndex, newTitle)
    reloadNotebook(notebookId)
  }

  /**
   * 更新手账本配置
   * @param id - 手账本 id
   * @param config - 要更新的部分配置
   */
  function updateNotebook(
    id: string,
    config: Partial<Omit<NotebookConfig, 'id' | 'createdAt'>>,
  ): void {
    storageUpdateNotebook(id, config)
    reloadNotebook(id)
  }

  /**
   * 重新加载单个手账本到内存
   * @param id - 手账本 id
   */
  function reloadNotebook(id: string): void {
    const fresh = storageGetNotebook(id)
    if (!fresh) return
    const index = notebooks.value.findIndex(n => n.id === id)
    if (index >= 0) {
      notebooks.value[index] = fresh
    }
  }

  /**
   * 路由跳转
   * @param target - 目标路由
   */
  function navigate(target: 'onboarding' | 'list' | 'editor' | 'viewer'): void {
    route.value = target
  }

  /**
   * 进入手账本查看模式
   * @param id - 手账本 id
   */
  function openNotebook(id: string): void {
    switchNotebook(id)
    navigate('viewer')
  }

  return {
    // 状态
    notebooks,
    currentNotebookId,
    route,
    // 计算属性
    currentNotebook,
    currentPages,
    isFirstTime,
    // 方法
    loadNotebooks,
    createNotebook,
    createNotebookFromTemplate,
    deleteNotebook,
    switchNotebook,
    addPage,
    removePage,
    reorderPage,
    updatePageTitle,
    updateNotebook,
    navigate,
    openNotebook,
  }
})
