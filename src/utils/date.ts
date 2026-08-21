/**
 * 日期工具函数集合
 * 统一处理日期格式化和计算逻辑
 */

/**
 * 获取今天的日期字符串（格式: YYYY-MM-DD）
 * @returns 日期字符串，如 '2026-08-17'
 */
export function getTodayDate(): string {
  return formatDate(new Date())
}

/**
 * 将 Date 对象格式化为 'YYYY-MM-DD' 字符串
 * @param date - 日期对象
 * @returns 日期字符串
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 解析日期字符串为 Date 对象
 * @param dateStr - 日期字符串 'YYYY-MM-DD'
 * @returns Date 对象
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 日期加减天数
 * @param dateStr - 起始日期字符串
 * @param days - 偏移天数（正数往后，负数往前）
 * @returns 新日期字符串
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/**
 * 获取中文星期几
 * @param date - 日期对象
 * @returns 星期中文名，如 '星期一'
 */
export function getWeekDay(date: Date): string {
  const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekNames[date.getDay()]
}

/**
 * 获取中文格式的日期展示（如 '2026年8月17日 · 星期一'）
 * @param dateStr - 日期字符串
 * @returns 格式化后的中文日期
 */
export function formatChineseDate(dateStr: string): string {
  const date = parseDate(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日 · ${getWeekDay(date)}`
}

/**
 * 获取某月的天数
 * @param year - 年
 * @param month - 月（1-12）
 * @returns 该月天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 获取本月所有日期字符串
 * @param dateStr - 任意日期字符串（可选，默认今天）
 * @returns 本月所有日期字符串数组
 */
export function getMonthDates(dateStr: string = getTodayDate()): string[] {
  const date = parseDate(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const days = getDaysInMonth(year, month)
  const result: string[] = []
  for (let i = 1; i <= days; i++) {
    result.push(formatDate(new Date(year, month - 1, i)))
  }
  return result
}

/**
 * 获取本周所有日期字符串（周一到周日）
 * @param dateStr - 任意日期字符串（可选，默认今天）
 * @returns 本周日期字符串数组
 */
export function getWeekDates(dateStr: string = getTodayDate()): string[] {
  const date = parseDate(dateStr)
  const day = date.getDay() // 0 = 周日，1 = 周一
  // 把周日(0) 转换为 7，使得周一是 1
  const offset = day === 0 ? 6 : day - 1
  const monday = addDays(dateStr, -offset)
  const result: string[] = []
  for (let i = 0; i < 7; i++) {
    result.push(addDays(monday, i))
  }
  return result
}

/**
 * 获取某日期所在周的周一日期字符串
 * @param dateStr - 任意日期字符串（可选，默认今天）
 * @returns 本周一的日期字符串
 */
export function getMondayOfWeek(dateStr: string = getTodayDate()): string {
  const date = parseDate(dateStr)
  const day = date.getDay() // 0 = 周日，1 = 周一
  // 周日(0) 回到本周一需要 -6 天，其他天数回到本周一需要 1-day 天
  const offset = day === 0 ? -6 : 1 - day
  return addDays(dateStr, offset)
}

/**
 * 计算某日期是当年的第几周（中国习惯：周一开始，1月1日所在周为第1周）
 * @param dateStr - 日期字符串
 * @returns 周数（1-53）
 */
export function getWeekNumber(dateStr: string): number {
  const date = parseDate(dateStr)
  const year = date.getFullYear()
  // 当年1月1日
  const jan1 = new Date(year, 0, 1)
  // 1月1日是周几（0=周日, 1=周一）
  const jan1Day = jan1.getDay()
  // 第一个周一：如果1月1日是周一，第一个周一就是1月1日；否则是下一个周一
  // 周日(0) → +1，周一(1) → +0，周二(2) → +6 ... 计算到下一个周一的天数
  const daysToFirstMonday = jan1Day === 0 ? 1 : (8 - jan1Day)
  const firstMonday = new Date(year, 0, daysToFirstMonday)
  // 如果当前日期早于第一个周一，说明属于去年的最后一周
  if (date < firstMonday) {
    // 返回去年最后一周的周数（用12月31日计算）
    return getWeekNumber(formatDate(new Date(year - 1, 11, 31)))
  }
  // 计算当前日期与第一个周一的差值天数
  const diffDays = Math.floor(
    (date.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000)
  )
  // 每7天一周，+1 是因为第一周从1开始
  return Math.floor(diffDays / 7) + 1
}

/**
 * 获取某日期所在周的日期范围展示文本（如 "8月17日 - 8月23日"）
 * @param dateStr - 任意日期字符串
 * @returns 日期范围文本
 */
export function getWeekRangeText(dateStr: string): string {
  const dates = getWeekDates(dateStr)
  const start = parseDate(dates[0])
  const end = parseDate(dates[6])
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
}

/**
 * 获取某日期所属月份的键值（如 "2026-08"）
 * 用于按月分组的任务（如月度清单）
 * @param dateStr - 任意日期字符串（可选，默认今天）
 * @returns 月份键 'YYYY-MM'
 */
export function getMonthKey(dateStr: string = getTodayDate()): string {
  const date = parseDate(dateStr)
  const month = date.getMonth() + 1
  // 月份补零，保证格式一致
  return `${date.getFullYear()}-${String(month).padStart(2, '0')}`
}

/**
 * 获取月份键对应的中文展示文本（如 "2026年8月"）
 * @param monthKey - 月份键 'YYYY-MM'
 * @returns 中文月份文本
 */
export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-')
  return `${yearStr}年${parseInt(monthStr, 10)}月`
}

/**
 * 月份键加减月数，返回新的月份键
 * @param monthKey - 月份键 'YYYY-MM'
 * @param delta - 增减月数（正为后移，负为前移）
 * @returns 新的月份键
 */
export function addMonths(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 // 转为 0-based
  const date = new Date(year, month + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
