import { formatDate } from './date'

/** localStorage 数据 key 前缀（所有应用数据均以此开头） */
const DATA_PREFIX = 'my-goalday'

/** 应用标识与版本 */
const APP_NAME = 'my-goalday'
const APP_VERSION = '1.0.0'

/**
 * 导出全部应用数据为 JSON 字符串
 * 遍历 localStorage 中所有以 DATA_PREFIX 开头的 key，打包成备份文件
 * @returns JSON 字符串
 */
export function exportAllData(): string {
  // 收集所有应用数据 key-value
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(DATA_PREFIX)) {
      const value = localStorage.getItem(key)
      if (value !== null) {
        data[key] = value
      }
    }
  }
  // 打包为备份对象
  return JSON.stringify(
    {
      app: APP_NAME,
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  )
}

/**
 * 下载导出的数据为 JSON 文件
 * 文件名格式：my-goalday-backup-YYYY-MM-DD.json
 */
export function downloadExport(): void {
  const json = exportAllData()
  // 创建 Blob 并触发下载
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `my-goalday-backup-${formatDate(new Date())}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * 从 JSON 字符串导入数据，写回 localStorage
 * 仅导入以 DATA_PREFIX 开头的 key，防止覆盖其它应用数据
 * @param jsonText - JSON 字符串
 * @returns 是否导入成功
 */
export function importFromText(jsonText: string): boolean {
  try {
    const parsed = JSON.parse(jsonText)
    // 兼容两种格式：{ data: {...} } 或直接 {...}
    const data = parsed.data || parsed
    if (typeof data !== 'object' || data === null) {
      return false
    }
    // 写回 localStorage（仅限应用前缀的 key）
    Object.keys(data).forEach((key: string) => {
      if (key.startsWith(DATA_PREFIX)) {
        localStorage.setItem(key, String(data[key]))
      }
    })
    return true
  } catch {
    return false
  }
}

/**
 * 从 File 对象读取文本并导入
 * @param file - 用户选择的文件对象
 * @returns 是否导入成功
 */
export async function importFromFile(file: File): Promise<boolean> {
  const text = await file.text()
  return importFromText(text)
}

/**
 * 清空所有应用数据
 * 删除 localStorage 中所有以 DATA_PREFIX 开头的 key
 */
export function clearAllData(): void {
  // 先收集要删除的 key（避免遍历时修改导致索引错乱）
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(DATA_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key: string) => localStorage.removeItem(key))
}

/**
 * 统计当前应用数据占用的大致字节数
 * @returns 字节数
 */
export function getDataSize(): number {
  let size = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(DATA_PREFIX)) {
      const value = localStorage.getItem(key)
      if (value !== null) {
        size += value.length
      }
    }
  }
  return size
}
