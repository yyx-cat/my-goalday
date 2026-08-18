import type { ModuleConfig, ModuleId } from '@/types/module'
import TodoModule from '@/components/modules/TodoModule.vue'
import HabitModule from '@/components/modules/HabitModule.vue'
import DiaryModule from '@/components/modules/DiaryModule.vue'

/**
 * 模块组件注册表
 * 统一维护所有可用模块的元信息和组件映射
 */
export const moduleRegistry: Record<ModuleId, ModuleConfig> = {
  todo: {
    id: 'todo',
    name: '待办清单',
    icon: '📋',
    component: TodoModule,
    defaultTitle: '📋 待办清单',
    description: '记录今日要做的事，完成后勾选',
  },
  habit: {
    id: 'habit',
    name: '习惯打卡',
    icon: '🎯',
    component: HabitModule,
    defaultTitle: '🎯 习惯打卡',
    description: '创建每日习惯，坚持打卡',
  },
  diary: {
    id: 'diary',
    name: '日记',
    icon: '📖',
    component: DiaryModule,
    defaultTitle: '📖 今日日记',
    description: '记录每天的故事和心情',
  },
}

/**
 * 获取所有模块配置列表（用于模版选择器等场景）
 * @returns 模块配置数组
 */
export function getModuleList(): ModuleConfig[] {
  return Object.values(moduleRegistry)
}

/**
 * 根据 ID 获取模块配置
 * @param id - 模块 ID
 * @returns 模块配置，不存在则返回 undefined
 */
export function getModuleById(id: ModuleId): ModuleConfig | undefined {
  return moduleRegistry[id]
}
