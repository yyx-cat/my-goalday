<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, inject, watch } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import {
  getTodayDate,
  getWeekDay,
  parseDate,
  addDays,
  isToday,
} from '@/utils/date'
import type {
  BookStatus,
  WeekViewData,
  DayViewData,
  DayItem,
} from '@/types/notebook'
import type { Todo } from '@/types/todo'

const todoStore = useTodoStore()

// 父组件 provide 下发的全局方法：切换 Tab、控制全局底部栏显隐
const switchTab = inject<(tab: 'schedule' | 'notebook' | 'profile') => void>('switchTab')
const setTabBarHidden = inject<(hidden: boolean) => void>('setTabBarHidden')

// ========== 状态 ==========

/**
 * 当前书本状态：封面 / 周视图 / 日视图
 * 初始为 'cover'，打开页面先显示封面
 */
const bookStatus = ref<BookStatus>('cover')

/**
 * 当前聚焦的日期（决定周/日视图展示哪一天）
 */
const currentDate = ref<string>(getTodayDate())

/**
 * 当前周的完整数据（封面打开/切周时重新计算）
 */
const weekData = ref<WeekViewData | null>(null)

/**
 * 当前日视图的完整数据（进入日视图时生成）
 */
const dayData = ref<DayViewData | null>(null)

/**
 * 翻页/切换状态时的动画锁，防止重复触发
 */
const isAnimating = ref<boolean>(false)

/**
 * 封面 3D 翻转进行中标记（true 时封面被 rotateY -180deg 翻开，透出底下周视图）
 */
const isCoverFlipping = ref<boolean>(false)

/**
 * 周↔日 翻页动画进行中标记
 */
const isPageFlipping = ref<boolean>(false)

/**
 * 当前翻页动画方向：'forward' 周→日（向右翻）；'backward' 日→周（向左翻回）
 */
const flipDirection = ref<'forward' | 'backward' | null>(null)

/**
 * 动画结束后需要切换到的目标状态（在 handleAnimationEnd 中消费）
 */
const pendingStatus = ref<BookStatus | null>(null)

/**
 * 周视图中当前在右侧被选中展示任务的日期（左列点击会更新）
 */
const selectedWeekDate = ref<string>(getTodayDate())

/**
 * 手账独立底部栏当前显示的年份（默认当前年份）
 */
const currentYear = ref<number>(parseDate(getTodayDate()).getFullYear())

// ========== 计算属性 ==========

/**
 * 判断是否有任何任务数据（决定是否显示空状态）
 */
const hasAnyData = computed<boolean>(() => todoStore.todos.length > 0)

/**
 * 从 dayData 中提取当天的任务列表
 */
const selectedDayTodos = computed<Todo[]>(() => {
  return dayData.value?.todos || []
})

/**
 * 周视图右侧展示的日对象（基于 selectedWeekDate 从 weekData.days 中查找）
 */
const rightWeekDay = computed<DayItem | null>(() => {
  if (!weekData.value) return null
  return weekData.value.days.find(d => d.date === selectedWeekDate.value) || weekData.value.days[0] || null
})

/**
 * 周视图右侧当天的任务列表
 */
const rightWeekTodos = computed<Todo[]>(() => {
  if (!rightWeekDay.value) return []
  return rightWeekDay.value.todos
})

/**
 * 封面显示的月份文字（例如"8月"）
 */
const coverMonthText = computed<string>(() => {
  const today = parseDate(currentDate.value)
  return `${today.getMonth() + 1}月`
})

/**
 * 封面显示的年份文字
 */
const coverYearText = computed<string>(() => {
  return String(parseDate(currentDate.value).getFullYear())
})

/**
 * 日视图右侧边缘显示的「明日」文字内容：如"8月23日"
 */
const nextDayEdgeText = computed<string>(() => {
  const next = parseDate(addDays(currentDate.value, 1))
  return `${next.getMonth() + 1}月${next.getDate()}日`
})

/**
 * 层叠页最前面一张"昨日"的日期文字（边缘露出用）
 */
const prevDayEdgeText = computed<string>(() => {
  const prev = parseDate(addDays(currentDate.value, -1))
  return `${prev.getMonth() + 1}.${prev.getDate()}`
})

// ========== 方法：Tab 切换联动（父组件全局底部栏） ==========

/**
 * 通知父组件：显示/隐藏全局底部 Tab 栏
 * 当手账进入 week/day 状态时隐藏全局 Tab 栏（手账自绘底部栏）
 * @param hidden - true=隐藏全局Tab栏
 */
function notifyTabBarHidden(hidden: boolean): void {
  if (setTabBarHidden) setTabBarHidden(hidden)
}

/**
 * 通知父组件：切换到日程 Tab（空状态引导时触发）
 */
function goToScheduleTab(): void {
  notifyTabBarHidden(false)
  if (switchTab) switchTab('schedule')
}

/**
 * 监听 bookStatus 变化，同步控制全局底部 Tab 栏的显隐
 */
watch(
  bookStatus,
  (status) => {
    if (status === 'cover') {
      // 封面状态：恢复显示全局 Tab 栏
      notifyTabBarHidden(false)
    } else {
      // week / day 状态：手账独立底部栏，隐藏全局 Tab 栏
      notifyTabBarHidden(true)
    }
  },
  { immediate: false },
)

// ========== 方法：状态切换 ==========

/**
 * 从封面打开书 → 封面执行 3D 翻转（rotateY -180deg）露出底部周视图，动画结束后再切换到 week
 */
function openBook(): void {
  if (isAnimating.value || isCoverFlipping.value) return
  isAnimating.value = true
  isCoverFlipping.value = true
  // 先把周视图数据加载好，让它在封面后面准备好
  loadWeek(currentDate.value)
  selectedWeekDate.value = getTodayDate()
  pendingStatus.value = 'week'
  // 由 @animationend 触发 handleCoverFlipEnd 收尾
}

/**
 * 封面翻开动画结束回调 → 真正把 bookStatus 置为 week，清封面翻转状态
 */
function handleCoverFlipEnd(): void {
  if (!isCoverFlipping.value) return
  bookStatus.value = pendingStatus.value || 'week'
  pendingStatus.value = null
  isCoverFlipping.value = false
  setTimeout(() => {
    isAnimating.value = false
  }, 60)
}

/**
 * 从周视图/日视图返回封面（从 week 回封面时，封面反向盖回来）
 */
function closeToCover(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  bookStatus.value = 'cover'
  weekData.value = null
  dayData.value = null
  // 此时封面翻转动画未触发（从封面翻到周用 flip，回封面用淡出）
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 在周视图左侧点击某个日期 → 右侧显示该天任务
 * @param date - 目标日期字符串
 */
function selectDay(date: string): void {
  selectedWeekDate.value = date
}

/**
 * 执行「周 ↔ 日」翻页动画（统一入口）
 * @param direction - 'forward' 周→日；'backward' 日→周
 * @param targetDate - 切换后聚焦的日期（周→日时就是点击的日；日→周时保持）
 */
function flipToDay(direction: 'forward' | 'backward', targetDate: string): void {
  if (isAnimating.value || isPageFlipping.value) return
  isAnimating.value = true
  isPageFlipping.value = true
  flipDirection.value = direction
  currentDate.value = targetDate
  if (direction === 'forward') {
    // 周→日：先准备好 dayData 让右侧页面内容存在，再翻过
    loadDay(targetDate)
    pendingStatus.value = 'day'
  } else {
    // 日→周：先准备好周视图数据
    loadWeek(targetDate)
    selectedWeekDate.value = targetDate
    pendingStatus.value = 'week'
  }
  // CSS 动画时长 0.5s，由 @animationend handleAnimationEnd 收尾
}

/**
 * 周↔日翻页动画结束回调 → 更新状态、清理动画标记
 */
function handleAnimationEnd(): void {
  if (!isPageFlipping.value) return
  if (pendingStatus.value) {
    bookStatus.value = pendingStatus.value
    // 日→周 时，结束后清空 dayData
    if (pendingStatus.value === 'week') {
      dayData.value = null
    }
    pendingStatus.value = null
  }
  isPageFlipping.value = false
  flipDirection.value = null
  setTimeout(() => {
    isAnimating.value = false
  }, 60)
}

/**
 * 在周视图中点击某天（双击或卡片）→ 执行 forward 翻页到日视图
 * @param date - 目标日期字符串
 */
function enterDayView(date: string): void {
  flipToDay('forward', date)
}

/**
 * 从日视图返回周视图 → 执行 backward 翻页回周视图
 */
function backToWeekView(): void {
  flipToDay('backward', currentDate.value)
}

/**
 * 周视图切换到今天（若今天不在当前周范围，重新加载该周）
 */
function goToToday(): void {
  const today = getTodayDate()
  currentDate.value = today
  loadWeek(today)
  selectedWeekDate.value = today
}

// ========== 方法：数据加载 ==========

/**
 * 加载某周数据到 weekData
 * @param date - 任意日期（定位到所在周）
 */
function loadWeek(date: string): void {
  weekData.value = todoStore.getWeekViewData(date)
}

/**
 * 加载某天数据到 dayData
 * @param date - 日期字符串
 */
function loadDay(date: string): void {
  const todos = todoStore.getTodosByDate(date)
  const doneCount = todos.filter(t => t.done).length
  const totalCount = todos.length
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  dayData.value = {
    date,
    weekday: getWeekDay(parseDate(date)),
    todos,
    doneCount,
    totalCount,
    progress,
    isToday: isToday(date),
  }
}

/**
 * 周视图切换到上一周
 */
function goPrevWeek(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, -7)
  loadWeek(currentDate.value)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 周视图切换到下一周
 */
function goNextWeek(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, 7)
  loadWeek(currentDate.value)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 日视图切换到前一天
 */
function goPrevDay(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, -1)
  loadDay(currentDate.value)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 日视图切换到后一天
 */
function goNextDay(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, 1)
  loadDay(currentDate.value)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

// ========== 方法：独立底部导航栏 ==========

/**
 * 预留：导出数据为 JSON
 */
function exportData(): void {
  // TODO 第三阶段实现：导出为 JSON 文件下载
  // eslint-disable-next-line no-console
  console.log('[Notebook] exportData（预留）')
}

/**
 * 切换年份（底部栏年份选择）
 * @param direction - 'prev'=去年 / 'next'=明年
 */
function changeYear(direction: 'prev' | 'next'): void {
  currentYear.value = direction === 'prev' ? currentYear.value - 1 : currentYear.value + 1
  // TODO 第三阶段：配合年份切换周列表
  // eslint-disable-next-line no-console
  console.log('[Notebook] changeYear ->', currentYear.value)
}

/**
 * 返回上一级：日视图→周视图→封面
 */
function goBack(): void {
  if (bookStatus.value === 'day') {
    backToWeekView()
  } else if (bookStatus.value === 'week') {
    closeToCover()
  }
}

/**
 * 日视图：点击右侧 10% 区域 → 切换到下一天
 * @param e - 点击事件
 */
function handleDayPageClick(e: MouseEvent): void {
  const target = e.currentTarget as HTMLElement
  if (!target) return
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const width = rect.width
  // 右侧 10% 区域点击 → 下一天
  if (x >= width * 0.9) {
    goNextDay()
  }
}

/**
 * 日视图：点击左侧层叠旧页区域 → 返回周视图
 */
function handleStackedPagesClick(): void {
  backToWeekView()
}

/**
 * 点击空状态引导 → 跳到日程 Tab
 */
function handleEmptyGuideClick(): void {
  goToScheduleTab()
}

// 组件挂载：加载待办数据，显示封面
onMounted(() => {
  todoStore.loadTodos()
  // bookStatus 初始就是 'cover'，默认不加载周/日数据
  // 首次挂载：确保全局底部栏处于显示状态（封面模式）
  notifyTabBarHidden(false)
})

// 组件卸载：恢复全局底部栏显示，避免切到其它 Tab 不显示
onBeforeUnmount(() => {
  notifyTabBarHidden(false)
})
</script>

<template>
  <div class="notebook-view">
    <!-- ========== 封面状态 / 封面翻开过程（3D flip 容器，perspective 生效） ========== -->
    <!--
      说明：当 bookStatus='cover' 或 封面正在翻转 (isCoverFlipping=true) 时显示这个 3D 舞台。
      舞台里同时放「封面卡片」+「周视图背面预览」：封面被 rotateY(-180deg) 翻开时透出底下周视图。
    -->
    <template v-if="bookStatus === 'cover' || isCoverFlipping">
      <div class="flip-stage" :class="{ flipping: isCoverFlipping }">
        <!-- 空状态引导（完全没任务） -->
        <template v-if="!hasAnyData">
          <div class="empty-state" @click="handleEmptyGuideClick">
            <span class="empty-icon">📒</span>
            <p class="empty-text">还没有记录，先去日程里添加任务吧~</p>
          </div>
        </template>

        <!-- 有任务：3D 翻转舞台 -->
        <template v-else>
          <!-- 背面预览：周视图（封面翻开时先透出这里的内容） -->
          <div class="cover-back-preview">
            <div class="book-wrapper preview-inner">
              <div class="book-pages week-book">
                <section class="paper left-page">
                  <header class="page-header">
                    <div class="header-left">
                      <span class="header-month" v-if="weekData">
                        {{ parseDate(weekData.weekStart).getMonth() + 1 }}月
                      </span>
                      <span class="header-split">|</span>
                      <span class="header-week" v-if="weekData">
                        第{{ weekData.weekNumber }}周
                      </span>
                    </div>
                  </header>
                </section>
                <div class="book-spine"></div>
                <section class="paper right-page"></section>
              </div>
            </div>
          </div>

          <!-- 封面（带 3D flip）：绑定 animationend，动画结束后回调收尾 -->
          <div
            class="cover-page"
            :class="{ 'is-flipping': isCoverFlipping }"
            @click="openBook"
            @animationend="handleCoverFlipEnd"
          >
            <div class="cover-fabric"></div>
            <div class="cover-month">{{ coverMonthText }}</div>
            <div class="cover-year">{{ coverYearText }}</div>
          </div>
        </template>
      </div>

      <!-- 封面态：独立底部导航 opacity=0 隐藏（保持尺寸稳定过渡） -->
      <nav class="notebook-bottom-bar" :class="{ show: false }">
        <span></span><span></span><span></span>
      </nav>
    </template>

    <!-- ========== 周视图状态 / 翻页动画中间态（bookStatus 仍为 week/day 时渲染同一个舞台） ========== -->
    <template v-else-if="bookStatus === 'week' || bookStatus === 'day'">
      <div
        class="page-flip-stage"
        :class="{
          flipping: isPageFlipping,
          forward: isPageFlipping && flipDirection === 'forward',
          backward: isPageFlipping && flipDirection === 'backward',
        }"
        @animationend="handleAnimationEnd"
      >
        <!-- ============ 周视图（双页） ============ -->
        <div v-show="bookStatus === 'week' || (isPageFlipping && flipDirection === 'backward')" class="page-layer week-layer">
          <div class="book-wrapper">
            <div class="book-pages week-book">
              <!-- 左页：7天列表 -->
              <section class="paper left-page">
                <header class="page-header">
                  <div class="header-left">
                    <span class="header-month" v-if="weekData">
                      {{ parseDate(weekData.weekStart).getMonth() + 1 }}月
                    </span>
                    <span class="header-split">|</span>
                    <span class="header-week" v-if="weekData">
                      第{{ weekData.weekNumber }}周
                    </span>
                  </div>
                  <div class="header-right">
                    <button class="icon-btn" @click="goPrevWeek" :disabled="isAnimating" title="上一周">‹</button>
                    <button class="today-btn" @click="goToToday">今天</button>
                    <button class="icon-btn" @click="goNextWeek" :disabled="isAnimating" title="下一周">›</button>
                  </div>
                </header>

                <ul class="day-list" v-if="weekData">
                  <li
                    v-for="day in weekData.days"
                    :key="day.date"
                    class="day-list-item"
                    :class="{
                      today: day.isToday,
                      selected: day.date === selectedWeekDate,
                    }"
                    @click="selectDay(day.date)"
                    @dblclick="enterDayView(day.date)"
                  >
                    <span class="day-num">{{ day.dayNumber }}</span>
                    <span class="day-week">{{ day.weekday }}</span>
                    <span class="day-dot" v-if="day.isToday"></span>
                    <span class="day-count">{{ day.totalCount > 0 ? `${day.doneCount}/${day.totalCount}` : '—' }}</span>
                  </li>
                </ul>
              </section>

              <div class="book-spine"></div>

              <!-- 右页：当前选中日期的任务（动画中被翻转的就是这一页） -->
              <section class="paper right-page flip-right-page">
                <header class="page-header right-header">
                  <template v-if="rightWeekDay">
                    <span class="right-day-num">{{ rightWeekDay.dayNumber }}</span>
                    <span class="right-day-split">|</span>
                    <span class="right-day-week">{{ rightWeekDay.weekday }}</span>
                    <span class="today-tag" v-if="rightWeekDay.isToday">今天</span>
                  </template>
                  <button class="enter-day-btn" v-if="rightWeekDay" @click="enterDayView(rightWeekDay.date)">
                    进入详情 →
                  </button>
                </header>

                <ul class="task-list" v-if="rightWeekTodos.length > 0">
                  <li
                    v-for="todo in rightWeekTodos"
                    :key="todo.id"
                    class="task-item"
                    :class="{ done: todo.done }"
                  >
                    <span class="task-circle" :class="{ filled: todo.done }"></span>
                    <span class="task-text">{{ todo.text }}</span>
                  </li>
                </ul>
                <div v-else class="task-empty">今天还没有任务</div>
              </section>
            </div>
          </div>
        </div>

        <!-- ============ 日视图（左侧层叠 + 右侧当天） ============ -->
        <div v-show="bookStatus === 'day' || (isPageFlipping && flipDirection === 'forward')" class="page-layer day-layer">
          <div class="book-wrapper">
            <div class="day-book">
              <!-- 左侧：层叠旧页（3 张纸，纵深：translateX + scale + 厚度阴影） -->
              <div class="stacked-pages" @click="handleStackedPagesClick">
                <div class="stack sheet-3"></div>
                <div class="stack sheet-2"></div>
                <div
                  class="stack sheet-1"
                  :data-edge="prevDayEdgeText"
                >
                  <div class="stack-title" v-if="dayData">
                    <p class="stack-label">昨日</p>
                    <p class="stack-line stack-line-1">待办事项回顾...</p>
                    <p class="stack-line stack-line-2">完成进度 ___%</p>
                    <p class="stack-line stack-line-3">返回周视图 ↩</p>
                  </div>
                </div>
              </div>

              <!-- 右侧：当前日纸张（边缘露出明日） -->
              <div class="day-current-page-wrapper" @click="handleDayPageClick">
                <section class="paper day-current-page flip-right-page">
                  <header class="day-page-header">
                    <div class="day-page-left">
                      <span class="day-page-num" v-if="dayData">{{ parseDate(dayData.date).getDate() }}</span>
                      <span class="day-page-split">|</span>
                      <span class="day-page-week" v-if="dayData">{{ dayData.weekday }}</span>
                      <span class="today-tag" v-if="dayData?.isToday">今天</span>
                    </div>
                    <div class="day-page-arrows">
                      <button class="icon-btn" @click.stop="goPrevDay" :disabled="isAnimating">‹</button>
                      <button class="icon-btn" @click.stop="goNextDay" :disabled="isAnimating">›</button>
                    </div>
                  </header>

                  <div class="day-page-stats" v-if="dayData">
                    <span>已完成 {{ dayData.doneCount }}/{{ dayData.totalCount }}</span>
                    <span class="stats-progress">（{{ dayData.progress }}%）</span>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: dayData.progress + '%' }"></div>
                    </div>
                  </div>

                  <ul class="task-list" v-if="dayData && dayData.totalCount > 0">
                    <li
                      v-for="todo in selectedDayTodos"
                      :key="todo.id"
                      class="task-item"
                      :class="{ done: todo.done }"
                    >
                      <span class="task-circle" :class="{ filled: todo.done }"></span>
                      <span class="task-text">{{ todo.text }}</span>
                    </li>
                  </ul>
                  <div v-else class="task-empty">这一天还没有任务</div>
                </section>

                <!-- 右侧边缘 10%：明日日期提示（垂直旋转 90°） -->
                <div class="next-hint" @click.stop="goNextDay">
                  <span class="next-hint-label">明日</span>
                  <span class="next-hint-date">{{ nextDayEdgeText }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 手账独立底部导航栏（week/day 显示，opacity 淡入） -->
      <nav class="notebook-bottom-bar" :class="{ show: bookStatus === 'week' || bookStatus === 'day' }">
        <button class="bar-btn bar-left" @click="exportData">
          <span class="bar-ico">📤</span>
          <span class="bar-text">导出</span>
        </button>

        <div class="bar-center">
          <button class="year-btn" @click="changeYear('prev')" title="去年">‹</button>
          <span class="year-text">{{ currentYear }}</span>
          <span class="year-arrow">▼</span>
          <button class="year-btn" @click="changeYear('next')" title="明年">›</button>
        </div>

        <button class="bar-btn bar-right" @click="goBack">返回</button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* ========== 关键帧：封面 3D 翻开 ========== */
@keyframes coverFlip {
  0% {
    transform: rotateY(0deg);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.14), -2px 0 0 rgba(0, 0, 0, 0.05) inset;
  }
  50% {
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.22), -1px 0 0 rgba(0, 0, 0, 0.04) inset;
  }
  100% {
    transform: rotateY(-180deg);
    box-shadow: -8px 0 20px rgba(0, 0, 0, 0.14), 2px 0 0 rgba(0, 0, 0, 0.04) inset;
  }
}

/* ========== 关键帧：周↔日 页面翻页（左右摆动 + 位移） ========== */
@keyframes pageFlipForward {
  /* 周→日：右页从右翻过（放大并从 3D rotate 覆盖左侧） */
  0% {
    transform: perspective(1400px) rotateY(0deg) translateX(0) scale(1);
  }
  100% {
    transform: perspective(1400px) rotateY(-180deg) translateX(-100%) scale(1);
  }
}
@keyframes pageFlipBackward {
  /* 日→周：右页反向翻回 */
  0% {
    transform: perspective(1400px) rotateY(180deg) translateX(100%) scale(1);
  }
  100% {
    transform: perspective(1400px) rotateY(0deg) translateX(0) scale(1);
  }
}

/* ========== 关键帧：左侧层叠页整体过渡（进入时从右滑入） ========== */
@keyframes stackedPagesSlideIn {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ========== 页面整体 ========== */
.notebook-view {
  min-height: 0;
  height: 100%;
  width: 100%;
  background: var(--color-bg-main);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  font-family: var(--font-family-sans);
  position: relative;
}

/* ========== 封面 3D flip 舞台（perspective 只在这个容器内生效） ========== */
.flip-stage {
  position: relative;
  margin: auto 0;
  width: min(86%, 420px);
  aspect-ratio: 3 / 4.2;
  max-height: 70vh;
  perspective: 1800px;
  perspective-origin: 20% 50%;
}

/* 背面预览：在封面翻开过程中透出底下的周视图占位 */
.cover-back-preview {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.35s ease-in, transform 0.4s ease-out;
  pointer-events: none;
}

.flip-stage.flipping .cover-back-preview {
  opacity: 1;
  transform: scale(1);
}

.cover-back-preview .preview-inner {
  padding: 0;
  width: 100%;
  height: 100%;
}

/* ========== 空状态（封面模式下无任务） ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  padding: 40px 16px;
  width: 100%;
  height: 100%;
}

.empty-icon {
  font-size: 56px;
  opacity: 0.55;
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

/* ======================== 封面页 ======================== */
.cover-page {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: #EADFD9; /* 藕粉灰 */
  border-radius: 6px 14px 14px 6px;
  cursor: pointer;
  overflow: hidden;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.14),
    -2px 0 0 rgba(0, 0, 0, 0.05) inset;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  /* 3D 翻转锚点：以左侧边为书脊（rotateY 旋转轴） */
  transform-origin: left center;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  will-change: transform;
  transition: transform 0.25s ease;
}

.cover-page:hover {
  transform: translateY(-2px);
}

/* 正在翻开 → 走 coverFlip 关键帧 0.6s ease-in-out */
.cover-page.is-flipping {
  cursor: default;
  animation: coverFlip 0.6s ease-in-out forwards;
}

/* 动画进行中取消 hover 轻微上移，避免与关键帧冲突 */
.cover-page.is-flipping:hover {
  transform: none;
}

/* 织物纹理（CSS 重复渐变模拟） */
.cover-fabric {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.05) 0px,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 3px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.025) 0px,
      rgba(0, 0, 0, 0.025) 1px,
      transparent 1px,
      transparent 3px
    );
  mix-blend-mode: multiply;
  pointer-events: none;
}

/* 封面中间：月份（大号） */
.cover-month {
  position: relative;
  font-size: 88px;
  font-weight: 600;
  color: #4E3F37;
  letter-spacing: 6px;
  margin: 0;
  z-index: 1;
}

/* 封面右下角：年份（细字） */
.cover-year {
  position: absolute;
  right: 28px;
  bottom: 28px;
  font-size: 22px;
  font-weight: 300;
  color: #6F5E53;
  letter-spacing: 3px;
  z-index: 1;
}

/* ======================== 周↔日 翻页共用舞台 ======================== */
.page-flip-stage {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  overflow: hidden;
  perspective: 1500px;
}

/* 两层页面叠在一起（绝对定位），v-show 通过 display 控制显隐 */
.page-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* forward 时：周→日，周层保留背景，日层右侧页面从右向左 3D 翻入；
   backward 时：日→周，周层出现，日层翻出。
   这里直接对 flip-right-page 触发关键帧（右侧页面） */
.page-flip-stage.forward .flip-right-page {
  transform-origin: left center;
  animation: pageFlipForward 0.5s ease-in-out forwards;
  will-change: transform;
}
.page-flip-stage.backward .flip-right-page {
  transform-origin: left center;
  animation: pageFlipBackward 0.5s ease-in-out forwards;
  will-change: transform;
}

/* ======================== 通用：书本外包装 ======================== */
.book-wrapper {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 10px 80px 10px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 纸张通用 */
.paper {
  background: #FDFBF7;
  border-radius: 4px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  position: relative;
  padding: 18px 16px 16px;
  box-sizing: border-box;
  /* 纸张纹理（非常淡的点状） */
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.035) 1px, transparent 0);
  background-size: 5px 5px;
}

/* ======================== 周视图：双页 ======================== */
.week-book {
  width: min(96%, 780px);
  height: 100%;
  max-height: calc(100vh - 180px);
  display: flex;
  align-items: stretch;
}

.left-page,
.right-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 书脊中线 */
.book-spine {
  width: 14px;
  flex-shrink: 0;
  background:
    linear-gradient(90deg,
      rgba(0,0,0,0.12),
      rgba(0,0,0,0.02) 30%,
      rgba(0,0,0,0.02) 70%,
      rgba(0,0,0,0.12)
    );
  position: relative;
  margin: 0 -2px;
  z-index: 2;
}

/* 页面头 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.header-month {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-split {
  color: var(--color-text-tertiary);
}

.header-week {
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border-divider);
  border-radius: 50%;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.today-btn {
  border: 1px solid var(--color-text-primary);
  background: var(--color-text-primary);
  color: #fff;
  border-radius: 14px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  margin: 0 2px;
}

/* 左页 7 天列表 */
.day-list {
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.day-list-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.day-list-item.selected {
  background: rgba(234, 223, 217, 0.5);
}

.day-list-item.today {
  font-weight: 600;
}

.day-num {
  font-size: 20px;
  width: 28px;
  text-align: center;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.day-week {
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 28px;
}

.day-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-text-primary);
}

.day-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* 右页 */
.right-header {
  align-items: center;
}

.right-day-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.right-day-split {
  color: var(--color-text-tertiary);
  margin: 0 6px;
}

.right-day-week {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.today-tag {
  font-size: 11px;
  background: var(--color-text-primary);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

.enter-day-btn {
  margin-left: auto;
  border: 1px dashed var(--color-text-secondary);
  background: transparent;
  color: var(--color-text-secondary);
  padding: 3px 10px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
}

.enter-day-btn:hover {
  border-color: var(--color-text-primary);
  color: var(--color-text-primary);
}

/* 通用任务列表 */
.task-list {
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px;
}

.task-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid var(--color-text-primary);
  background: transparent;
  flex-shrink: 0;
}

.task-circle.filled {
  background: #EADFD9;
  border-color: #8C7A6F;
}

.task-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.4;
  flex: 1;
}

.task-item.done .task-text {
  color: var(--color-text-tertiary);
  opacity: 0.55;
}

.task-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ======================== 日视图 ======================== */
.day-book {
  width: min(96%, 780px);
  height: 100%;
  max-height: calc(100vh - 180px);
  display: flex;
  align-items: stretch;
  gap: 0;
}

/* 左侧层叠旧页（纵深：3 张纸按 6px 递增 + scale 递减 + 每张左厚度阴影） */
.stacked-pages {
  position: relative;
  width: 180px;
  flex-shrink: 0;
  cursor: pointer;
  padding-top: 14px;
  animation: stackedPagesSlideIn 0.45s ease-out 1;
  transform-style: preserve-3d;
}

.stack {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(100% - 14px);
  background: #FBF6F0;
  border-radius: 4px;
  /* 每张都有 -4px 左侧阴影，模拟纸叠起来边缘厚度 */
  box-shadow:
    -4px 0 8px rgba(0, 0, 0, 0.04),
    0 6px 14px rgba(0, 0, 0, 0.08);
  /* 纸张纹理 */
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.025) 1px, transparent 0);
  background-size: 5px 5px;
  /* 3D 纵深：用户指定的数值 */
  transform-origin: left center;
}

.sheet-3 {
  transform: translateX(0) scale(1);
  opacity: 0.55;
  z-index: 1;
}

.sheet-2 {
  transform: translateX(6px) scale(0.98);
  opacity: 0.75;
  z-index: 2;
}

.sheet-1 {
  transform: translateX(12px) scale(0.96);
  z-index: 3;
  padding: 20px 14px 14px;
  box-sizing: border-box;
  filter: blur(0.6px);
  color: rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

/* 最上一张层叠页右侧边缘 ::after，露出前一天日期文字（如 8.21） */
.sheet-1::after {
  content: attr(data-edge);
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  transform-origin: center;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(0, 0, 0, 0.35);
  background: rgba(255, 255, 255, 0.55);
  padding: 2px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.stack-title {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stack-label {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  opacity: 0.85;
}

.stack-line {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.7;
}

.stack-line-1 {
  width: 90%;
  height: 14px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
}

.stack-line-2 {
  width: 72%;
  height: 14px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.stack-line-3 {
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
}

/* 右侧：当前日纸张 */
.day-current-page-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
}

.day-current-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 4px 4px 4px 4px;
  cursor: default;
}

.day-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
  flex-shrink: 0;
}

.day-page-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-page-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.day-page-split {
  color: var(--color-text-tertiary);
}

.day-page-week {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.day-page-arrows {
  display: flex;
  gap: 4px;
}

.day-page-stats {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.stats-progress {
  color: var(--color-text-tertiary);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #F2ECE7;
  border-radius: 3px;
  margin-top: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E5C8B6 0%, #C9A58E 100%);
  transition: width 0.3s;
}

/* 下一页边缘提示（右侧 10%）：显示「明日 + 日期」，垂直旋转 90° */
.next-hint {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 10%;
  min-width: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(0, 0, 0, 0.25);
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.03) 100%
  );
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s, background 0.2s;
}

.next-hint:hover {
  color: rgba(0, 0, 0, 0.5);
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(234, 223, 217, 0.4) 100%
  );
}

.next-hint-label {
  /* 旋转 90° 垂直显示 */
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 13px;
  letter-spacing: 2px;
  font-weight: 500;
  opacity: 0.9;
}

.next-hint-date {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 12px;
  letter-spacing: 1px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

/* ======================== 手账独立底部导航栏（week/day 显示，opacity 平滑过渡） ======================== */
.notebook-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border-divider);
  padding: 0 10px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
  font-family: var(--font-family-sans);
  /* 状态切换：淡入淡出 0.3s */
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease,
    visibility 0.3s ease;
  visibility: hidden;
}

/* week/day 状态下（:class show）：底部栏淡入 + 轻微上移 */
.notebook-bottom-bar.show {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  visibility: visible;
}

.bar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 36px;
  min-width: 64px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.bar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.bar-ico {
  font-size: 16px;
}

.bar-center {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.year-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border-divider);
  border-radius: 50%;
  background: #fff;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.year-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 2px;
  letter-spacing: 1px;
}

.year-arrow {
  font-size: 9px;
  color: var(--color-text-tertiary);
  margin-left: 1px;
}

/* ======================== 移动端适配 ======================== */
@media (max-width: 640px) {
  .cover-month {
    font-size: 64px;
    letter-spacing: 4px;
  }

  .cover-year {
    right: 20px;
    bottom: 20px;
    font-size: 18px;
  }

  .book-wrapper {
    padding: 10px 6px 80px 6px;
  }

  .week-book,
  .day-book {
    max-height: calc(100vh - 160px);
  }

  .stacked-pages {
    width: 110px;
  }

  .paper {
    padding: 14px 12px 12px;
  }

  .left-page,
  .right-page {
    min-width: 0;
  }

  .header-month {
    font-size: 16px;
  }

  .day-num {
    font-size: 18px;
    width: 24px;
  }

  .right-day-num {
    font-size: 20px;
  }

  .day-page-num {
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .stacked-pages {
    width: 70px;
  }

  .sheet-1 .stack-title .stack-label,
  .sheet-1 .stack-line-3 {
    display: block;
  }

  .sheet-1 .stack-line-1,
  .sheet-1 .stack-line-2 {
    width: 100%;
  }
}
</style>
