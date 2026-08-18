import type { ModuleId } from './module'

/**
 * 手账本页面配置
 * @property moduleId - 该页对应的模块 ID
 * @property title - 页面标题
 * @property order - 排序序号
 * @property config - 模块特定的配置（可选）
 */
export interface PageConfig {
  moduleId: ModuleId
  title: string
  order: number
  config?: Record<string, unknown>
}

/**
 * 手账本配置
 * @property id - 手账本唯一标识
 * @property name - 手账本名称
 * @property coverColor - 封面颜色（可选）
 * @property pages - 页面配置数组
 * @property createdAt - 创建时间 ISO 字符串
 * @property updatedAt - 最后更新时间 ISO 字符串
 */
export interface NotebookConfig {
  id: string
  name: string
  coverColor?: string
  pages: PageConfig[]
  createdAt: string
  updatedAt: string
}

/**
 * 手账本模版
 * @property id - 模版 ID
 * @property name - 模版名称
 * @property description - 模版描述
 * @property pages - 预设页面配置
 * @property coverColor - 封面颜色（可选）
 */
export interface NotebookTemplate {
  id: string
  name: string
  description: string
  pages: Pick<PageConfig, 'moduleId' | 'title'>[]
  coverColor?: string
}
