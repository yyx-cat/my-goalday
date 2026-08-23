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
 * 手账展示模式
 * - 'index' 索引模式：左页=7 天周计划列表（概览），右页=选中日详情，快速浏览整周
 * - 'book'  书本模式：左页=某一天详情，右页=下一天详情，沉浸式翻页回顾
 */
export type NotebookMode = 'index' | 'book'

/**
 * 索引模式的数据结构
 * @property weekDays      - 当前周的 7 天日期（周一→周日）
 * @property selectedDate  - 当前选中的日期
 * @property selectedTodos - 当前选中日的任务列表
 * @property weekProgress  - 本周整体完成率（0-100）
 */
export interface IndexPageData {
  weekDays: string[]
  selectedDate: string
  selectedTodos: Todo[]
  weekProgress: number
}

/**
 * 书本模式的数据结构（左右双页，各承载某一天详情）
 * @property leftDate      - 左页日期（YYYY-MM-DD）
 * @property rightDate     - 右页日期（配对奇数个日期时最后一对可能为 null）
 * @property leftTodos     - 左页任务列表
 * @property rightTodos    - 右页任务列表（rightDate 为 null 时为空数组）
 * @property leftProgress  - 左页完成率（0-100）
 * @property rightProgress - 右页完成率（0-100，rightDate 为 null 时为 0）
 */
export interface BookPageData {
  leftDate: string
  rightDate: string | null
  leftTodos: Todo[]
  rightTodos: Todo[]
  leftProgress: number
  rightProgress: number
}

/**
 * 书本模式单张"双页"的类型（按周组织，每周 5 张双页）
 * - 'cover'          封面页：左/右页都是本周封面装饰（显示月份、第几周）
 * - 'week-overview'  本周总览页：左页=本周总计划（7 天概览），右页=周一详情
 * - 'weekday-pair'   工作日对页：左页=某天 / 右页=下一天（如周二+周三、周四+周五、周六+周日）
 */
export type BookPageType = 'cover' | 'week-overview' | 'weekday-pair'

/**
 * 书本模式单张"双页"完整数据
 * @property type        - 该双页的类型（封面/总览/工作日对）
 * @property weekStart   - 本周周一日期 'YYYY-MM-DD'
 * @property weekEnd     - 本周周日日期 'YYYY-MM-DD'
 * @property weekNumber  - 本周是当年的第几周
 * @property year        - 年份
 * @property month       - 月份（1-12，取本周周一所在月）
 * @property leftDate    - 左页日期（cover 时为 null；week-overview 时为周一；weekday-pair 时为某天）
 * @property rightDate   - 右页日期（cover 时为 null；week-overview 时为 null 由总览占据；weekday-pair 时为下一天，可能为 null）
 * @property weekDates   - 本周 7 天日期列表（周一→周日，便于总览页渲染）
 */
export interface BookPage {
  type: BookPageType
  weekStart: string
  weekEnd: string
  weekNumber: number
  year: number
  month: number
  leftDate: string | null
  rightDate: string | null
  weekDates: string[]
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
