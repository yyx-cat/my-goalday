import type { Component } from 'vue'

/**
 * 模块 ID 类型
 */
export type ModuleId = 'todo' | 'habit' | 'diary'

/**
 * 模块配置接口（统一规范）
 * @property id - 模块唯一标识
 * @property name - 模块名称
 * @property icon - 模块图标 emoji
 * @property component - 模块组件
 * @property defaultTitle - 默认页面标题
 * @property description - 模块描述（用于配置器）
 */
export interface ModuleConfig {
  id: ModuleId
  name: string
  icon: string
  component: Component
  defaultTitle: string
  description?: string
}

/**
 * 模块 Props 统一规范
 * @property title - 页面标题（可选）
 */
export interface ModuleProps {
  data?: { title?: string }
}
