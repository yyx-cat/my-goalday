import type { ModuleId } from './module'
import type { Todo } from './todo'

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
 * 手账本三种展示状态
 * - cover: 封面页
 * - week: 周视图（展示本周 7 天概览）
 * - day: 日视图（展示单日详细任务）
 */
export type BookStatus = 'cover' | 'week' | 'day'

/**
 * 周视图中单日条目
 * @property date - 日期字符串 'YYYY-MM-DD'
 * @property weekday - 星期几（如 '星期一'）
 * @property dayNumber - 日期数字（如 22）
 * @property todos - 当天任务列表
 * @property doneCount - 已完成数
 * @property totalCount - 总数
 * @property progress - 完成率（0-100）
 * @property isToday - 是否是今天
 */
export interface DayItem {
  date: string
  weekday: string
  dayNumber: number
  todos: Todo[]
  doneCount: number
  totalCount: number
  progress: number
  isToday: boolean
}

/**
 * 周视图完整数据
 * @property year - 年份
 * @property month - 月份（1-12）
 * @property weekNumber - 当年第几周
 * @property weekStart - 本周周一日期
 * @property weekEnd - 本周周日日期
 * @property days - 周一至周日 7 天数据
 */
export interface WeekViewData {
  year: number
  month: number
  weekNumber: number
  weekStart: string
  weekEnd: string
  days: DayItem[]
}

/**
 * 日视图完整数据
 * @property date - 日期字符串
 * @property weekday - 星期几
 * @property todos - 当天任务
 * @property doneCount - 已完成数
 * @property totalCount - 总数
 * @property progress - 完成率（0-100）
 * @property isToday - 是否今天
 */
export interface DayViewData {
  date: string
  weekday: string
  todos: Todo[]
  doneCount: number
  totalCount: number
  progress: number
  isToday: boolean
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
