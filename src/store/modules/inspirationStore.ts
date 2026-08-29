import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InspirationData, InspirationItem, InspirationModule } from '@/types/inspiration'
import {
  getInspirationData,
  addInspirationModule as storageAddModule,
  deleteInspirationModule as storageDeleteModule,
  addInspirationItem as storageAddItem,
  deleteInspirationItem as storageDeleteItem,
} from '@/utils/inspirationStorage'

/**
 * 灵感模块状态管理 Store
 * 管理灵感模块（含内置预设 + 用户自建）与条目，支持加入月清单
 */
export const useInspirationStore = defineStore('inspiration', () => {
  /** 灵感数据 */
  const data = ref<InspirationData>({
    modules: [],
    items: [],
  })

  /**
   * 从 localStorage 加载灵感数据到内存
   */
  function loadInspiration(): void {
    data.value = getInspirationData()
  }

  /**
   * 新增自定义灵感模块
   * @param name - 模块名称
   */
  function addModule(name: string): void {
    storageAddModule(name)
    loadInspiration()
  }

  /**
   * 删除灵感模块（内置不可删，连带删除条目）
   * @param id - 模块唯一标识
   */
  function removeModule(id: string): void {
    storageDeleteModule(id)
    loadInspiration()
  }

  /**
   * 新增灵感条目
   * @param moduleId - 所属模块 ID
   * @param text - 灵感文本
   */
  function addItem(moduleId: string, text: string): void {
    storageAddItem(moduleId, text)
    loadInspiration()
  }

  /**
   * 删除灵感条目
   * @param id - 条目唯一标识
   */
  function removeItem(id: string): void {
    storageDeleteItem(id)
    loadInspiration()
  }

  /**
   * 获取某模块下所有灵感条目（按创建时间正序）
   * @param moduleId - 模块唯一标识
   * @returns 灵感条目数组
   */
  function getItemsByModule(moduleId: string): InspirationItem[] {
    return data.value.items
      .filter(i => i.moduleId === moduleId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  /**
   * 获取模块对象
   * @param moduleId - 模块唯一标识
   * @returns 模块对象，不存在返回 null
   */
  function getModuleById(moduleId: string): InspirationModule | null {
    return data.value.modules.find(m => m.id === moduleId) ?? null
  }

  return {
    // 状态
    data,
    // 方法
    loadInspiration,
    addModule,
    removeModule,
    addItem,
    removeItem,
    getItemsByModule,
    getModuleById,
  }
})
