import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AddonSource, NotebookAddon } from '@/types/notebookAddon'
import {
  getNotebookAddons,
  upsertNotebookAddon,
} from '@/utils/notebookAddonStorage'

/**
 * 手账附加信息状态管理 Store
 * 管理各模块（月清单/理财/减重/习惯打卡）添加到手账的摘要信息
 */
export const useNotebookAddonStore = defineStore('notebookAddon', () => {
  /** 附加信息数组 */
  const addons = ref<NotebookAddon[]>([])

  /**
   * 从 localStorage 加载附加信息到内存
   */
  function loadAddons(): void {
    addons.value = getNotebookAddons()
  }

  /**
   * 新增或更新某日某模块的附加信息（同日同源覆盖）
   * @param date - 归属日期字符串 'YYYY-MM-DD'
   * @param source - 来源模块标识
   * @param title - 信息标题
   * @param content - 信息正文
   */
  function addAddon(date: string, source: AddonSource, title: string, content: string): void {
    upsertNotebookAddon(date, source, title, content)
    loadAddons()
  }

  /**
   * 获取某日全部附加信息（按更新时间正序）
   * @param date - 日期字符串 'YYYY-MM-DD'
   * @returns 附加信息数组
   */
  function getAddonsByDate(date: string): NotebookAddon[] {
    return addons.value
      .filter(a => a.date === date)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  return {
    // 状态
    addons,
    // 方法
    loadAddons,
    addAddon,
    getAddonsByDate,
  }
})
