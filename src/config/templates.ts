import type { NotebookTemplate } from '@/types/notebook'

/**
 * 手账本预设模版
 * 用于首次使用时让用户选择模版快速创建手账本
 */
export const templates: NotebookTemplate[] = [
  {
    id: 'daily',
    name: '📒 日计划手账',
    description: '待办清单 + 日记',
    coverColor: '#A8824F',
    pages: [
      { moduleId: 'todo', title: '📋 今日待办' },
      { moduleId: 'diary', title: '📖 今日日记' },
    ],
  },
  {
    id: 'weekly',
    name: '📅 周计划手账',
    description: '待办清单 + 习惯打卡',
    coverColor: '#4E7348',
    pages: [
      { moduleId: 'todo', title: '📋 待办清单' },
      { moduleId: 'habit', title: '🎯 习惯打卡' },
    ],
  },
  {
    id: 'full',
    name: '🌟 完整手账',
    description: '待办 + 打卡 + 日记',
    coverColor: '#8B6539',
    pages: [
      { moduleId: 'todo', title: '📋 待办清单' },
      { moduleId: 'habit', title: '🎯 习惯打卡' },
      { moduleId: 'diary', title: '📖 日记' },
    ],
  },
]
