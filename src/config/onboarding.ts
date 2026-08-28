import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

/** localStorage 标志键（记录是否已看过新手引导） */
const STORAGE_KEY = 'hasSeenOnboarding'

/** 当前 driver 实例（引导进行中持有，结束置空） */
let driverObj: ReturnType<typeof driver> | null = null

/**
 * 是否已看过新手引导
 * @returns 已看过返回 true
 */
export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

/**
 * 标记已看过新手引导（写入 localStorage）
 */
export function markSeenOnboarding(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
}

/**
 * 启动新手引导
 * - 共 5 步：欢迎→日程 tab→今日卡片→手账 tab→我的 tab
 * - 引导结束（走完或跳过）自动写入"已看过"标志
 */
export function startOnboarding(): void {
  // 若已有进行中的引导，先销毁再重建
  if (driverObj) {
    driverObj.destroy()
    driverObj = null
  }
  driverObj = driver({
    showProgress: true,
    allowClose: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: '完成',
    steps: [
      {
        element: '#tab-schedule',
        popover: {
          title: '欢迎来到 MyGoalDay 🌿',
          description: '底部有三个入口：日程、手账、我的。我们从日程开始逛逛～',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tab-schedule',
        popover: {
          title: '日程 · 每日待办',
          description: '在这里记录每天要做的事。点击日期卡片空白处就能就地创建任务。',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.day-card[data-today]',
        popover: {
          title: '今天的卡片',
          description: '点击今日卡片空白区域，会出现输入框，写完按回车即可保存。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tab-notebook',
        popover: {
          title: '手账 · 自动总结',
          description: '日程里的任务会自动生成手账，左右翻页查看每天记录。',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tab-profile',
        popover: {
          title: '我的 · 随时回看',
          description: '以后想再看一次引导，可以在这里点「查看新手引导」。',
          side: 'top',
          align: 'center',
        },
      },
    ],
    onDestroyed: () => {
      markSeenOnboarding()
      driverObj = null
    },
  })
  driverObj.drive()
}
