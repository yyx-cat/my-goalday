import type {
  InspirationData,
  InspirationItem,
  InspirationModule,
} from '@/types/inspiration'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-inspiration'

/**
 * 生成唯一 ID（时间戳 + 随机串）
 * @returns 唯一标识字符串
 */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 内置预设灵感模块与条目（首次使用时初始化）
 * @returns 初始化灵感数据
 */
function buildBuiltInData(): InspirationData {
  const now = Date.now()
  const m1: InspirationModule = { id: 'builtin-self', name: '自我提升', builtIn: true, createdAt: now }
  const m2: InspirationModule = { id: 'builtin-health', name: '健康生活', builtIn: true, createdAt: now }
  const m3: InspirationModule = { id: 'builtin-learn', name: '学习计划', builtIn: true, createdAt: now }
  const items: InspirationItem[] = [
    { id: genId(), moduleId: m1.id, text: '每天阅读 30 分钟', createdAt: now },
    { id: genId(), moduleId: m1.id, text: '每周写一篇复盘', createdAt: now },
    { id: genId(), moduleId: m1.id, text: '学习一项新技能', createdAt: now },
    { id: genId(), moduleId: m2.id, text: '每天喝水 2000ml', createdAt: now },
    { id: genId(), moduleId: m2.id, text: '每周运动 3 次', createdAt: now },
    { id: genId(), moduleId: m2.id, text: '晚上 11 点前睡觉', createdAt: now },
    { id: genId(), moduleId: m3.id, text: '完成一门在线课程', createdAt: now },
    { id: genId(), moduleId: m3.id, text: '每天背 20 个单词', createdAt: now },
    { id: genId(), moduleId: m3.id, text: '整理学习笔记', createdAt: now },
  ]
  return { modules: [m1, m2, m3], items }
}

/**
 * 读取本地灵感数据
 * 首次使用（无数据）时初始化内置预设模块
 * @returns 灵感数据对象
 */
export function getInspirationData(): InspirationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const init = buildBuiltInData()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
      return init
    }
    const parsed = JSON.parse(raw) as Partial<InspirationData>
    return {
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch (e) {
    console.error('读取灵感数据失败:', e)
    return buildBuiltInData()
  }
}

/**
 * 保存灵感数据到 localStorage
 * @param data - 待保存的灵感数据对象
 */
export function saveInspirationData(data: InspirationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('写入灵感数据失败:', e)
  }
}

/**
 * 新增自定义灵感模块
 * @param name - 模块名称
 * @returns 新生成的模块对象
 */
export function addInspirationModule(name: string): InspirationModule {
  const data = getInspirationData()
  const module: InspirationModule = {
    id: genId(),
    name,
    builtIn: false,
    createdAt: Date.now(),
  }
  data.modules.push(module)
  saveInspirationData(data)
  return module
}

/**
 * 删除灵感模块（同时删除其下所有条目）
 * 内置模块不可删除
 * @param id - 模块唯一标识
 */
export function deleteInspirationModule(id: string): void {
  const data = getInspirationData()
  const target = data.modules.find(m => m.id === id)
  if (!target || target.builtIn) return
  data.modules = data.modules.filter(m => m.id !== id)
  data.items = data.items.filter(i => i.moduleId !== id)
  saveInspirationData(data)
}

/**
 * 新增一条灵感条目
 * @param moduleId - 所属模块 ID
 * @param text - 灵感文本
 * @returns 新生成的条目对象
 */
export function addInspirationItem(moduleId: string, text: string): InspirationItem {
  const data = getInspirationData()
  const item: InspirationItem = {
    id: genId(),
    moduleId,
    text,
    createdAt: Date.now(),
  }
  data.items.push(item)
  saveInspirationData(data)
  return item
}

/**
 * 删除一条灵感条目
 * @param id - 条目唯一标识
 */
export function deleteInspirationItem(id: string): void {
  const data = getInspirationData()
  data.items = data.items.filter(i => i.id !== id)
  saveInspirationData(data)
}
