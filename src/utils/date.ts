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
