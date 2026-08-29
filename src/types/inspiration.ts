/**
 * 灵感模块（一个主题集合，包含多条灵感条目）
 * @property id - 模块唯一标识
 * @property name - 模块名称（如"自我提升"/"健康生活"）
 * @property builtIn - 是否内置预设模块（true 表示只读不可删除）
 * @property createdAt - 创建时间戳（毫秒）
 */
export interface InspirationModule {
  id: string
  name: string
  builtIn: boolean
  createdAt: number
}

/**
 * 灵感条目（属于某个模块的单条灵感）
 * @property id - 条目唯一标识
 * @property moduleId - 所属模块 ID
 * @property text - 灵感文本（可作为任务加入月清单）
 * @property createdAt - 创建时间戳（毫秒）
 */
export interface InspirationItem {
  id: string
  moduleId: string
  text: string
  createdAt: number
}

/**
 * 灵感数据整体结构
 * @property modules - 灵感模块数组（含内置 + 自建）
 * @property items - 所有灵感条目数组
 */
export interface InspirationData {
  modules: InspirationModule[]
  items: InspirationItem[]
}
