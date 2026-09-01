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
 * - 共 9 步：欢迎→日程 tab→今日卡片→四个子界面（周/记录/清单/习惯）→手账 tab→我的 tab
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
          description: '在这里记录每天要做的事。点击日期卡片底部的空白处就能创建任务。',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.day-card[data-today]',
        popover: {
          title: '今天的卡片',
          description: '点击今日卡片空白区域，会出现输入框，写完点击其他地方即可保存。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide="sub-week"]',
        popover: {
          title: '子界面 1 · 周',
          description: '日程的主界面：一周 7 天的任务排布，点每天卡片空白处创建待办，完成后点圆点划掉。',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-guide="sub-record"]',
        popover: {
          title: '子界面 2 · 记录',
          description: '今天的日记：记录当天的心情与随想，这些内容也会自动出现在手账里。',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-guide="sub-list"]',
        popover: {
          title: '子界面 3 · 清单',
          description: '月度清单：整月的计划目标，点圆点可划掉，点 ✕ 可删除，可选择性的添加到每日代办中',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-guide="sub-habit"]',
        popover: {
          title: '子界面 4 · 习惯',
          description: '习惯养成：包含打卡、减重、理财三个工具，数据填好后可一键添加到手账。',
          side: 'bottom',
          align: 'end',
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
          description: '还有什么不清楚的地方，可以在这里点「查看新手引导」再次查看。',
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
