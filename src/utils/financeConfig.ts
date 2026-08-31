/**
 * 理财账期配置（记账模式 + 管理模式共用）
 * 用户可自定义"理财月"的起始日（如每月 5 号到次月 4 号）
 * 起始日范围 1-28，避免 29/30/31 因 2 月不存在导致边界问题
 */

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-finance-config'

/** 默认起始日（1 号，等价于自然月） */
const DEFAULT_START_DAY = 1

/** 起始日合法范围上限 */
export const MAX_START_DAY = 28

/**
 * 理财账期配置结构
 * @property monthStartDay - 账期起始日（1-28）
 */
export interface FinanceConfig {
  monthStartDay: number
}

/**
 * 读取理财账期配置
 * @returns 配置对象（缺失字段用默认值补全）
 */
export function getFinanceConfig(): FinanceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { monthStartDay: DEFAULT_START_DAY }
    const parsed = JSON.parse(raw) as Partial<FinanceConfig>
    let day = Math.floor(parsed.monthStartDay ?? DEFAULT_START_DAY)
    // 边界保护：限制在 1-28 之间
    if (day < 1 || day > MAX_START_DAY || Number.isNaN(day)) day = DEFAULT_START_DAY
    return { monthStartDay: day }
  } catch (e) {
    console.error('读取理财账期配置失败:', e)
    return { monthStartDay: DEFAULT_START_DAY }
  }
}

/**
 * 保存理财账期配置到 localStorage
 * @param config - 待保存的配置对象
 */
export function saveFinanceConfig(config: FinanceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('写入理财账期配置失败:', e)
  }
}

/**
 * 读取账期起始日（便捷方法）
 * @returns 起始日（1-28）
 */
export function getMonthStartDay(): number {
  return getFinanceConfig().monthStartDay
}

/**
 * 设置账期起始日（会做边界保护）
 * @param day - 起始日（1-28，超出范围会被截断）
 */
export function setMonthStartDay(day: number): void {
  const safeDay = Math.min(Math.max(Math.floor(day) || DEFAULT_START_DAY, 1), MAX_START_DAY)
  saveFinanceConfig({ monthStartDay: safeDay })
}
