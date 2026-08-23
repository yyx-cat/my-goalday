import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Todo } from '@/types/todo'
import type { WeekViewData, DayItem, BookPage } from '@/types/notebook'
import { getTodos, saveTodos, addTodo as storageAddTodo } from '@/utils/storage'
import {
  getTodayDate,
  addDays,
  parseDate,
  getWeekDay,
  getWeekNumber,
  getWeekStart,
  getWeekEnd,
  getWeekDateRange,
  getWeekStartsInYear,
} from '@/utils/date'

/**
 * 待办事项状态管理 Store
 * 负责管理待办清单的数据加载、增删改查及计算属性
 */
export const useTodoStore = defineStore('todo', () => {
  // 所有待办事项
  const todos = ref<Todo[]>([])

  /**
   * 从 localStorage 加载待办数据到内存
   */
  function loadTodos(): void {
    todos.value = getTodos()
  }

  /**
   * 添加新待办
   * @param text - 待办内容文本
   * @param date - 所属日期（可选，默认今天）
   */
  function addTodo(text: string, date?: string): void {
    if (!text.trim()) return
    const newTodo = storageAddTodo(text, date)
    todos.value.unshift(newTodo)
  }

  /**
   * 切换待办的完成状态
   * @param id - 待办事项 id
   */
  function toggleTodo(id: string): void {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return
    todo.done = !todo.done
    if (todo.done) {
      todo.completedAt = new Date().toISOString()
    } else {
      todo.completedAt = undefined
    }
    saveTodos(todos.value)
  }

  /**
   * 删除待办事项
   * @param id - 待办事项 id
   */
  function deleteTodo(id: string): void {
    const index = todos.value.findIndex(t => t.id === id)
    if (index === -1) return
    todos.value.splice(index, 1)
    saveTodos(todos.value)
  }

  // ========== 计算属性 ==========

  /**
   * 今日日期
   */
  const today = computed<string>(() => getTodayDate())

  /**
   * 今日待办列表
   */
  const todayTodos = computed<Todo[]>(() => {
    return getTodosByDate(today.value)
  })

  /**
   * 今日已完成数量
   */
  const todayDoneCount = computed<number>(() => {
    return todayTodos.value.filter(t => t.done).length
  })

  /**
   * 今日待办总数
   */
  const todayTotalCount = computed<number>(() => todayTodos.value.length)

  /**
   * 今日完成进度百分比 (0-100)
   */
  const todayProgress = computed<number>(() => {
    return getDateProgress(today.value)
  })

  // ========== 方法：支持任意日期 ==========

  /**
   * 获取指定日期的待办列表
   * @param date - 日期字符串 'YYYY-MM-DD'
   * @returns 待办数组
   */
  function getTodosByDate(date: string): Todo[] {
    return todos.value.filter(todo => todo.date === date)
  }

  /**
   * 获取指定日期的已完成数量
   * @param date - 日期字符串
   * @returns 已完成数量
   */
  function getDateDoneCount(date: string): number {
    return getTodosByDate(date).filter(t => t.done).length
  }

  /**
   * 获取指定日期的待办总数
   * @param date - 日期字符串
   * @returns 待办总数
   */
  function getDateTotalCount(date: string): number {
    return getTodosByDate(date).length
  }

  /**
   * 获取指定日期的完成进度百分比 (0-100)
   * @param date - 日期字符串
   * @returns 进度百分比
   */
  function getDateProgress(date: string): number {
    const total = getDateTotalCount(date)
    if (total === 0) return 0
    const done = getDateDoneCount(date)
    return Math.round((done / total) * 100)
  }

  /**
   * 获取所有有任务的日期列表（倒序排列，最新的在前）
   * @returns 日期字符串数组
   */
  const datesWithTodos = computed<string[]>(() => {
    const dateSet = new Set<string>()
    todos.value.forEach(todo => {
      dateSet.add(todo.date)
    })
    // 倒序排列：最新日期在前
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a))
  })

  /**
   * 获取所有有任务的日期数量
   */
  const datesWithTodosCount = computed<number>(() => datesWithTodos.value.length)

  // ========== 方法：支持日期范围（多日期卡片用） ==========

  /**
   * 生成从 endDate 往前推 days 天的日期数组（倒序，最新在前）
   * @param endDate - 起始日期（默认今天）
   * @param days - 天数
   * @returns 日期字符串数组（倒序）
   */
  function getRecentDates(endDate: string = getTodayDate(), days: number = 7): string[] {
    const result: string[] = []
    for (let i = 0; i < days; i++) {
      // i=0 是 endDate 本身，i=1 是前一天……
      result.push(addDays(endDate, -i))
    }
    return result
  }

  // ========== 方法：手账周/日视图 ==========

  /**
   * 获取某天所在周的 7 天日期（周一到周日）
   * 与 getWeekDateRange 语义一致，提供给调用方更清晰的方法名
   * @param date - 日期字符串
   * @returns 周一到周日的 7 个日期字符串
   */
  function getWeekDatesFromDate(date: string): string[] {
    return getWeekDateRange(date)
  }

  /**
   * 获取指定日期范围内的所有任务，按日期分组
   * 起止日期均为闭区间（包含）
   * @param startDate - 起始日期
   * @param endDate - 结束日期
   * @returns 以日期为 key 的分组任务对象
   */
  function getTodosByDateRange(startDate: string, endDate: string): Record<string, Todo[]> {
    const start = startDate < endDate ? startDate : endDate
    const end = startDate < endDate ? endDate : startDate
    const result: Record<string, Todo[]> = {}
    todos.value.forEach(todo => {
      if (todo.date >= start && todo.date <= end) {
        if (!result[todo.date]) {
          result[todo.date] = []
        }
        result[todo.date].push(todo)
      }
    })
    return result
  }

  /**
   * 获取某周的完整视图数据（周视图用）
   * @param date - 任意日期字符串
   * @returns WeekViewData 对象
   */
  function getWeekViewData(date: string): WeekViewData {
    const weekDates = getWeekDatesFromDate(date)
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    const weekNumber = getWeekNumber(date)
    const startObj = parseDate(weekStart)
    const todosByDate = getTodosByDateRange(weekStart, weekEnd)

    const days: DayItem[] = weekDates.map(d => {
      const dateObj = parseDate(d)
      const dayTodos = todosByDate[d] || []
      const doneCount = dayTodos.filter(t => t.done).length
      const totalCount = dayTodos.length
      const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
      return {
        date: d,
        weekday: getWeekDay(dateObj),
        dayNumber: dateObj.getDate(),
        todos: dayTodos,
        doneCount,
        totalCount,
        progress,
        isToday: d === getTodayDate(),
      }
    })

    return {
      year: startObj.getFullYear(),
      month: startObj.getMonth() + 1,
      weekNumber,
      weekStart,
      weekEnd,
      days,
    }
  }

  /**
   * 获取所有有任务的日期（去重、按时间正序排序：旧→新）
   * 与 datesWithTodos（倒序、computed、便于列表展示）互补，
   * 这里返回正序函数形式，便于书本模式按日期配对。
   * @returns 日期字符串数组，升序排列，例如 ['2026-08-18','2026-08-19',...]
   */
  function getAllDatesWithTodos(): string[] {
    const dateSet = new Set<string>()
    todos.value.forEach(todo => {
      dateSet.add(todo.date)
    })
    // 正序（YYYY-MM-DD 的字典序等于时间升序）
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b))
  }

  /**
   * 将所有有任务的日期两两配对（0↔1 / 2↔3 / …），供书本模式左右页使用
   * 配对规则：第 0 和第 1 一对，第 2 和第 3 一对……
   * 若最后一对只剩一天，右页返回 null 占位。
   * @returns 配对好的二维数组，每一项为 [左页日期, 右页日期 | null]
   */
  function getDatePairs(): [string, string | null][] {
    const dates = getAllDatesWithTodos()
    const pairs: [string, string | null][] = []
    for (let i = 0; i < dates.length; i += 2) {
      const left = dates[i]
      const right: string | null = i + 1 < dates.length ? dates[i + 1] : null
      pairs.push([left, right])
    }
    return pairs
  }

  /**
   * 按年组织书本模式的所有"双页"：
   *   - 默认范围：当前年（一年所有周，约 52-53 周）
   *   - 如果有任务日期超出当前年，则扩展到 [最早任务年, 最晚任务年]
   *   - 每年开头一张封面页（标示年份 + 第几周开始）
   *   - 每年每周 4 张内容页（不管该周是否有任务，确保整年可翻看）：
   *       1) 本周总览页（week-overview）：左页=本周总计划（7 天概览），右页=周一详情
   *       2) 工作日对页（weekday-pair）：左页=周二，右页=周三
   *       3) 工作日对页（weekday-pair）：左页=周四，右页=周五
   *       4) 工作日对页（weekday-pair）：左页=周六，右页=周日
   *   - 跨年的周（如1月1日所在周周一在去年12月底）用 Set 去重避免重复生成
   * @returns BookPage 数组（按时间正序：旧→新）
   */
  function getBookPages(): BookPage[] {
    const allDates = getAllDatesWithTodos()

    // 1) 确定年份范围：默认当前年，若有跨年任务则扩展
    const today = new Date()
    const currentYear = today.getFullYear()
    let startYear = currentYear
    let endYear = currentYear
    if (allDates.length > 0) {
      const earliestYear = parseDate(allDates[0]).getFullYear()
      const latestYear = parseDate(allDates[allDates.length - 1]).getFullYear()
      startYear = Math.min(startYear, earliestYear)
      endYear = Math.max(endYear, latestYear)
    }

    // 2) 跨年周去重集合：避免 2025-12-29 这种周既出现在 2025 又出现在 2026
    const seenWeekStarts = new Set<string>()
    const pages: BookPage[] = []

    // 3) 遍历每一年，生成该年所有周的页面
    for (let year = startYear; year <= endYear; year++) {
      const allWeekStartsOfYear = getWeekStartsInYear(year)

      // 该年未被生成过的周（去重）
      const yearWeekStarts: string[] = []
      for (const ws of allWeekStartsOfYear) {
        if (!seenWeekStarts.has(ws)) {
          seenWeekStarts.add(ws)
          yearWeekStarts.push(ws)
        }
      }

      // 该年没有任何新周（全部已在去年生成过），跳过
      if (yearWeekStarts.length === 0) continue

      // (1) 该年封面页：标示年份 + 该年第一周
      const firstWeekStart = yearWeekStarts[0]
      const firstWeekDates = getWeekDateRange(firstWeekStart)
      const firstStartObj = parseDate(firstWeekStart)
      pages.push({
        type: 'cover',
        weekStart: firstWeekStart,
        weekEnd: firstWeekDates[6],
        weekNumber: getWeekNumber(firstWeekStart),
        year,
        month: firstStartObj.getMonth() + 1,
        leftDate: null,
        rightDate: null,
        weekDates: firstWeekDates,
      })

      // (2) 该年每周 4 张内容页
      for (const weekStart of yearWeekStarts) {
        const weekDates = getWeekDateRange(weekStart) // 周一→周日 7 天
        const weekEnd = weekDates[6]
        const weekNumber = getWeekNumber(weekStart)
        const startObj = parseDate(weekStart)
        const wYear = startObj.getFullYear()
        const wMonth = startObj.getMonth() + 1

        // (a) 本周总览页：左=总计划（占位，由组件用 weekDates 渲染），右=周一
        pages.push({
          type: 'week-overview',
          weekStart,
          weekEnd,
          weekNumber,
          year: wYear,
          month: wMonth,
          leftDate: null,
          rightDate: weekDates[0], // 周一
          weekDates,
        })

        // (b) 工作日对：周二+周三
        pages.push({
          type: 'weekday-pair',
          weekStart,
          weekEnd,
          weekNumber,
          year: wYear,
          month: wMonth,
          leftDate: weekDates[1], // 周二
          rightDate: weekDates[2], // 周三
          weekDates,
        })

        // (c) 工作日对：周四+周五
        pages.push({
          type: 'weekday-pair',
          weekStart,
          weekEnd,
          weekNumber,
          year: wYear,
          month: wMonth,
          leftDate: weekDates[3], // 周四
          rightDate: weekDates[4], // 周五
          weekDates,
        })

        // (d) 工作日对：周六+周日
        pages.push({
          type: 'weekday-pair',
          weekStart,
          weekEnd,
          weekNumber,
          year: wYear,
          month: wMonth,
          leftDate: weekDates[5], // 周六
          rightDate: weekDates[6], // 周日
          weekDates,
        })
      }
    }

    return pages
  }

  return {
    // 状态
    todos,
    // 计算属性（今日快捷访问）
    today,
    todayTodos,
    todayDoneCount,
    todayTotalCount,
    todayProgress,
    // 计算属性（手账用）
    datesWithTodos,
    datesWithTodosCount,
    // 方法
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    // 方法（支持任意日期）
    getTodosByDate,
    getDateDoneCount,
    getDateTotalCount,
    getDateProgress,
    // 方法（支持日期范围）
    getRecentDates,
    // 方法（手账周/日视图）
    getWeekDatesFromDate,
    getTodosByDateRange,
    getWeekViewData,
    // 方法（两种模式共用：日期列表与配对）
    getAllDatesWithTodos,
    getDatePairs,
    // 方法（书本模式按周组织的双页）
    getBookPages,
  }
})
