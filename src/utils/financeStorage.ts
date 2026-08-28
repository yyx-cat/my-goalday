import type { FinanceData, FinanceRecord, FinanceRecordType } from '@/types/finance'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-finance'

/** 默认空数据 */
const EMPTY_DATA: FinanceData = {
  records: [],
}

/**
 * 生成记录唯一 ID（时间戳 + 随机串）
 * @returns 唯一标识字符串
 */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 读取本地理财数据
 * @returns 理财数据对象，若不存在则返回空数据
 */
export function getFinanceData(): FinanceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as Partial<FinanceData>
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
    }
  } catch (e) {
    console.error('读取理财数据失败:', e)
    return { ...EMPTY_DATA }
  }
}

/**
 * 保存理财数据到 localStorage
 * @param data - 待保存的理财数据对象
 */
export function saveFinanceData(data: FinanceData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('写入理财数据失败:', e)
  }
}

/**
 * 新增一条理财记录
 * @param type - 记录类型（支出/收入）
 * @param amount - 金额
 * @param date - 日期字符串
 * @param note - 详细记录（可选）
 * @returns 新生成的记录对象
 */
export function addFinanceRecord(
  type: FinanceRecordType,
  amount: number,
  date: string,
  note?: string,
): FinanceRecord {
  const data = getFinanceData()
  const record: FinanceRecord = {
    id: genId(),
    type,
    amount,
    date,
    createdAt: Date.now(),
  }
  if (note && note.trim()) {
    record.note = note.trim()
  }
  data.records.push(record)
  saveFinanceData(data)
  return record
}

/**
 * 删除指定 ID 的理财记录
 * @param id - 记录唯一标识
 */
export function deleteFinanceRecord(id: string): void {
  const data = getFinanceData()
  data.records = data.records.filter(r => r.id !== id)
  saveFinanceData(data)
}
