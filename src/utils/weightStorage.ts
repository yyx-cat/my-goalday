import type { WeightData, WeightMode, WeightRecord } from '@/types/weight'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-weight'

/** 默认空数据（尚未输入初始体重时使用） */
const EMPTY_DATA: WeightData = {
  initialWeight: 0,
  initialDate: '',
  records: [],
  mode: 'daily',
}

/**
 * 读取本地体重数据
 * @returns 体重数据对象，若不存在则返回空数据
 */
export function getWeightData(): WeightData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_DATA }
    const parsed = JSON.parse(raw) as Partial<WeightData>
    return {
      initialWeight: parsed.initialWeight ?? 0,
      initialDate: parsed.initialDate ?? '',
      records: Array.isArray(parsed.records) ? parsed.records : [],
      mode: parsed.mode ?? 'daily',
    }
  } catch (e) {
    console.error('读取体重数据失败:', e)
    return { ...EMPTY_DATA }
  }
}

/**
 * 保存体重数据到 localStorage
 * @param data - 待保存的体重数据对象
 */
export function saveWeightData(data: WeightData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('写入体重数据失败:', e)
  }
}

/**
 * 设置初始体重（首次使用时调用）
 * @param initialWeight - 初始体重值（kg）
 * @param initialDate - 初始体重对应日期字符串 'YYYY-MM-DD'
 */
export function setInitialWeight(initialWeight: number, initialDate: string): void {
  const data = getWeightData()
  data.initialWeight = initialWeight
  data.initialDate = initialDate
  saveWeightData(data)
}

/**
 * 设置记录模式
 * @param mode - 记录模式（daily/早晚/三餐）
 */
export function setWeightMode(mode: WeightMode): void {
  const data = getWeightData()
  data.mode = mode
  saveWeightData(data)
}

/**
 * 新增或更新某日体重记录（多字段版）
 * 若同一天已有记录则覆盖；传入字段按模式使用
 * @param date - 日期字符串 'YYYY-MM-DD'
 * @param fields - 记录字段（含 weight/morningWeight/noonWeight/eveningWeight）
 */
export function upsertWeightRecord(
  date: string,
  fields: Pick<WeightRecord, 'weight' | 'morningWeight' | 'noonWeight' | 'eveningWeight'>
): void {
  const data = getWeightData()
  const idx = data.records.findIndex(r => r.date === date)
  const record: WeightRecord = { date, createdAt: Date.now(), ...fields }
  if (idx >= 0) {
    // 已存在则保留 createdAt
    record.createdAt = data.records[idx].createdAt
    data.records[idx] = record
  } else {
    // 不存在则追加
    data.records.push(record)
  }
  // 按日期升序排序，保证后续计算准确
  data.records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  saveWeightData(data)
}

/**
 * 删除某日体重记录
 * @param date - 日期字符串 'YYYY-MM-DD'
 */
export function deleteWeightRecord(date: string): void {
  const data = getWeightData()
  data.records = data.records.filter(r => r.date !== date)
  saveWeightData(data)
}
