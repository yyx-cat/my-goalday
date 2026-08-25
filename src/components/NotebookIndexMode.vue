<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useDiaryStore } from '@/store/modules/diaryStore'
import {
  getTodayDate,
  addDays,
  parseDate,
  getWeekDay,
  getWeekDates,
  getWeekNumber,
  isToday,
} from '@/utils/date'
import type { Todo } from '@/types/todo'

/**
 * 心情表情映射：把 Mood 字符串转成可读表情
 * 没有匹配的返回空字符串（不显示心情标识）
 */
const MOOD_EMOJI_MAP: Record<string, string> = {
  happy: '😊',
  smile: '🙂',
  calm: '😌',
  sad: '😢',
  angry: '😠',
  tired: '😴',
}

/**
 * 组件入参
 * @property initialDate - 初始聚焦日期（默认今天）
 * @property focusDate - 受控模式下的外部聚焦日期（父组件会驱动跳转到某天）
 */
interface Props {
  initialDate?: string
  focusDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialDate: () => getTodayDate(),
  focusDate: undefined,
})

/**
 * 组件事件
 * @event changeMode - 请求切换到另一种手账模式（emit 'book' 表示切换到书本模式）
 * @event update:focusDate - 内部日期切换时通知父级，用于跨模式保持日期状态
 */
interface Emits {
  (e: 'changeMode', mode: 'book'): void
  (e: 'update:focusDate', date: string): void
}
const emit = defineEmits<Emits>()

const todoStore = useTodoStore()
const diaryStore = useDiaryStore()

/**
 * 便捷函数：向父级 emit 当前聚焦日期（用于跨模式状态保持）
 * @param date - 要同步的日期字符串
 */
function emitFocusDate(date: string): void {
  emit('update:focusDate', date)
}

// ========== 状态 ==========

/**
 * 当前聚焦日期（决定展示哪一周、默认选中哪一天）
 */
const currentDate = ref<string>(props.initialDate || getTodayDate())

/**
 * 左列当前被选中的日期（右页展示这一天的详情）
 */
const selectedDate = ref<string>(props.initialDate || getTodayDate())

/**
 * 翻页/切换过程中的动画锁（预留）
 */
const isAnimating = ref<boolean>(false)

// ========== 计算属性 ==========

/**
 * 当前周 7 天日期列表（周一 → 周日），来源于 getWeekDates 工具函数
 */
const weekDays = computed<string[]>(() => {
  return getWeekDates(currentDate.value)
})

/**
 * 当前日期是当年的第几周
 */
const weekNumber = computed<number>(() => {
  return getWeekNumber(currentDate.value)
})

/**
 * 当前周的年份/月份（左页标题使用，取周一所在月）
 */
const headerMonthLabel = computed<string>(() => {
  const monday = parseDate(weekDays.value[0] || currentDate.value)
  return `${monday.getMonth() + 1}月`
})

/**
 * 选中日期对应的任务列表，来源于 todoStore.getTodosByDate
 */
const selectedTodos = computed<Todo[]>(() => {
  return todoStore.getTodosByDate(selectedDate.value)
})

/**
 * 选中日期的完成率（0-100），来源于 todoStore.getDateProgress
 */
const selectedProgress = computed<number>(() => {
  return todoStore.getDateProgress(selectedDate.value)
})

/**
 * 选中日期的完成数 / 总数
 */
const selectedStats = computed<{ done: number; total: number }>(() => {
  const total = selectedTodos.value.length
  const done = selectedTodos.value.filter(t => t.done).length
  return { done, total }
})

/**
 * 选中日期的"星期几 / 日号 / 是否今天"信息
 */
const selectedMeta = computed<{ dayNumber: number; weekday: string; isToday: boolean }>(() => {
  const d = parseDate(selectedDate.value)
  return {
    dayNumber: d.getDate(),
    weekday: getWeekDay(d),
    isToday: isToday(selectedDate.value),
  }
})

/**
 * 选中日期对应的日记对象（响应式：diaryStore.diaries 变化会自动重算）
 * 没有则返回 null
 */
const selectedDiary = computed<{ content: string; moodEmoji: string } | null>(() => {
  const d = diaryStore.diaries.find(item => item.date === selectedDate.value)
  const content = d?.content?.trim() ?? ''
  if (content.length === 0) return null
  const moodEmoji = d!.mood ? (MOOD_EMOJI_MAP[d!.mood] ?? '') : ''
  return { content, moodEmoji }
})

/**
 * 本周整体完成率（7 天完成率的算术平均值，取整 0-100）
 */
const weekProgress = computed<number>(() => {
  if (weekDays.value.length === 0) return 0
  const sum = weekDays.value.reduce((acc, d) => acc + todoStore.getDateProgress(d), 0)
  return Math.round(sum / weekDays.value.length)
})

// ========== 方法 ==========

/**
 * 在左页点击某个日期 → 右页切换为该天详情
 * @param date - 目标日期字符串
 */
function selectDay(date: string): void {
  selectedDate.value = date
  emitFocusDate(date)
}

/**
 * 切换到上一周（currentDate 减 7 天，选中日期若跨周则跟随到上一周的同一周内位置）
 */
function goPrevWeek(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, -7)
  // 若当前选中日仍在旧周，则挪到上一周的对应位置（保持周日序位置）
  if (!weekDays.value.includes(selectedDate.value)) {
    selectedDate.value = addDays(selectedDate.value, -7)
  }
  setTimeout(() => {
    isAnimating.value = false
    emitFocusDate(selectedDate.value)
  }, 200)
}

/**
 * 切换到下一周（currentDate 加 7 天）
 */
function goNextWeek(): void {
  if (isAnimating.value) return
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, 7)
  if (!weekDays.value.includes(selectedDate.value)) {
    selectedDate.value = addDays(selectedDate.value, 7)
  }
  setTimeout(() => {
    isAnimating.value = false
    emitFocusDate(selectedDate.value)
  }, 200)
}

/**
 * 请求父组件切换到书本模式（emit changeMode: 'book'）
 */
function switchToBookMode(): void {
  emit('changeMode', 'book')
}

/**
 * 响应父级外部传入的 focusDate：把当前周和选中日对齐到该日期
 * 避免和内部 emit 回来的日期死循环，这里只做"外部驱动→内部"的单向同步
 */
watch(
  () => props.focusDate,
  (newDate) => {
    if (!newDate) return
    if (newDate === selectedDate.value) return
    currentDate.value = newDate
    selectedDate.value = newDate
  },
  { immediate: false },
)

// 组件挂载：确保 store 中的待办已加载
onMounted(() => {
  // 兼容第一次进入手账 Tab 时的情况：如果还没初始化 todos 则加载
  if (todoStore.todos.length === 0) {
    todoStore.loadTodos()
  }
  // 加载所有日记数据（右页详情会按选中日展示日记分栏）
  if (diaryStore.diaries.length === 0) {
    diaryStore.loadDiaries()
  }
  // 初始聚焦日期：优先 props.focusDate → props.initialDate → 今天
  const initialFocus = props.focusDate || props.initialDate || getTodayDate()
  if (initialFocus && initialFocus !== selectedDate.value) {
    currentDate.value = initialFocus
    selectedDate.value = initialFocus
  }
  emitFocusDate(selectedDate.value)
})
</script>

<template>
  <div class="index-mode">
    <!-- 顶部模式切换提示 -->
    <div class="mode-header">
      <span class="mode-title">📒 索引模式</span>
      <button class="mode-switch" @click="switchToBookMode">切换到书本模式 →</button>
    </div>

    <!-- 主体：双页纸（左=7天列表，右=选中日详情） -->
    <div class="book-wrapper">
      <div class="book-pages">
        <!-- 左页：7 天周计划列表 -->
        <section class="paper left-page">
          <header class="page-header">
            <div class="header-left">
              <span class="header-month">{{ headerMonthLabel }}</span>
              <span class="header-split">|</span>
              <span class="header-week">第{{ weekNumber }}周</span>
            </div>
            <div class="header-week-progress">
              <span class="week-progress-label">本周完成率</span>
              <span class="week-progress-value">{{ weekProgress }}%</span>
            </div>
          </header>

          <ul class="day-list">
            <li
              v-for="date in weekDays"
              :key="date"
              class="day-list-item"
              :class="{
                today: isToday(date),
                selected: date === selectedDate,
              }"
              @click="selectDay(date)"
            >
              <span class="day-week">{{ getWeekDay(parseDate(date)) }}</span>
              <span class="day-num">{{ parseDate(date).getDate() }}</span>
              <span class="day-dot" v-if="isToday(date)"></span>
              <span class="day-progress">
                {{ todoStore.getDateProgress(date) }}%
              </span>
            </li>
          </ul>
        </section>

        <!-- 书脊中线 -->
        <div class="book-spine"></div>

        <!-- 右页：选中日详情 -->
        <section class="paper right-page">
          <header class="page-header right-header">
            <span class="right-day-num">{{ selectedMeta.dayNumber }}</span>
            <span class="right-day-split">|</span>
            <span class="right-day-week">{{ selectedMeta.weekday }}</span>
            <span class="today-tag" v-if="selectedMeta.isToday">今天</span>
            <!-- 有日记时显示心情表情 -->
            <span v-if="selectedDiary && selectedDiary.moodEmoji" class="diary-mood">{{ selectedDiary.moodEmoji }}</span>

            <div class="right-progress-pill">
              已完成 {{ selectedStats.done }}/{{ selectedStats.total }}（{{ selectedProgress }}%）
            </div>
          </header>

          <!-- 有日记：左右分栏（左=日记，右=任务） -->
          <div v-if="selectedDiary" class="right-split">
            <!-- 左半：今日记录 -->
            <div class="diary-pane">
              <div class="pane-title">📝 今日记录</div>
              <div class="diary-content">{{ selectedDiary.content }}</div>
            </div>

            <!-- 中间分隔虚线 -->
            <div class="pane-divider"></div>

            <!-- 右半：任务列表 -->
            <div class="tasks-pane">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: selectedProgress + '%' }"></div>
              </div>
              <ul class="task-list" v-if="selectedTodos.length > 0">
                <li
                  v-for="todo in selectedTodos"
                  :key="todo.id"
                  class="task-item"
                  :class="{ done: todo.done }"
                >
                  <span class="task-circle" :class="{ filled: todo.done }"></span>
                  <span class="task-text">{{ todo.text }}</span>
                </li>
              </ul>
              <div v-else class="task-empty task-empty-small">这一天还没有任务</div>
            </div>
          </div>

          <!-- 无日记：原样显示进度条 + 任务列表 -->
          <template v-else>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: selectedProgress + '%' }"></div>
            </div>

            <ul class="task-list" v-if="selectedTodos.length > 0">
              <li
                v-for="todo in selectedTodos"
                :key="todo.id"
                class="task-item"
                :class="{ done: todo.done }"
              >
                <span class="task-circle" :class="{ filled: todo.done }"></span>
                <span class="task-text">{{ todo.text }}</span>
              </li>
            </ul>
            <div v-else class="task-empty">这一天还没有任务</div>
          </template>
        </section>
      </div>
    </div>

    <!-- 底部导航：[◀ 上一周]  第 XX 周  [下一周 ▶] -->
    <nav class="index-bottom-bar">
      <button
        class="week-nav-btn prev"
        @click="goPrevWeek"
        :disabled="isAnimating"
      >
        ◀ 上一周
      </button>

      <div class="week-center">
        <span class="week-label">第 {{ weekNumber }} 周</span>
        <span class="week-progress-mini">完成 {{ weekProgress }}%</span>
      </div>

      <button
        class="week-nav-btn next"
        @click="goNextWeek"
        :disabled="isAnimating"
      >
        下一周 ▶
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* ========== 索引模式整体容器 ========== */
.index-mode {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0;
  box-sizing: border-box;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  overflow: hidden;
  position: relative;
}

/* ========== 顶部模式标签栏 ========== */
.mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 6px;
  flex-shrink: 0;
}

.mode-title {
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.mode-switch {
  border: 1px solid var(--color-text-primary);
  background: transparent;
  color: var(--color-text-primary);
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-switch:hover {
  background: var(--color-text-primary);
  color: #fff;
}

/* ========== 书本外包装（双页） ========== */
.book-wrapper {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 顶部留白 + 为底部导航栏留空间，整体更像一本书（不会占满屏幕） */
  padding: 16px 12px 80px;
  box-sizing: border-box;
}

.book-pages {
  /*
   * 书本比例与 BookMode 一致：宽高比 1:0.78（桌面）
   * - 宽度：最多 780px（大桌面），或 88% 视口宽度
   * - 高度：按宽度比例
   * - 再夹一个上限：剩余可用高度的 100%，避免溢出
   */
  width: min(88vw, 780px);
  aspect-ratio: 1 / 0.78;
  max-height: calc(100vh - 200px);
  max-width: 100%;
  display: flex;
  align-items: stretch;
}

/* 纸张通用（与 NotebookView 保持一致的米白纸张质感） */
.paper {
  background: #FDFBF7;
  border-radius: 4px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  padding: 18px 16px 16px;
  box-sizing: border-box;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 5px 5px;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-page,
.right-page {
  flex: 1;
  min-width: 0;
}

/* 书脊中线 */
.book-spine {
  width: 14px;
  flex-shrink: 0;
  background: linear-gradient(90deg,
    rgba(0, 0, 0, 0.12),
    rgba(0, 0, 0, 0.02) 30%,
    rgba(0, 0, 0, 0.02) 70%,
    rgba(0, 0, 0, 0.12)
  );
  margin: 0 -2px;
  position: relative;
  z-index: 2;
}

/* 通用页头 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
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
}

.header-week-progress {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
}

.week-progress-label {
  color: var(--color-text-secondary);
}

.week-progress-value {
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
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

.day-week {
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 28px;
}

.day-num {
  font-size: 20px;
  width: 28px;
  text-align: center;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.day-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-text-primary);
}

.day-progress {
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

.right-progress-pill {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: rgba(234, 223, 217, 0.5);
  padding: 4px 10px;
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

/* 进度条 */
.progress-bar {
  width: 100%;
  height: 6px;
  background: #F2ECE7;
  border-radius: 3px;
  margin-bottom: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E5C8B6 0%, #C9A58E 100%);
  transition: width 0.3s ease;
}

/* ========== 有日记时的上下分栏布局 ========== */
.right-split {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;  /* 上下排列：上=日记，下=任务 */
  align-items: stretch;
  gap: 0;
  overflow: hidden;
}

/* 上半：今日记录 */
.diary-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 0 10px 0;
  overflow: hidden;
}

/* 下半：任务列表 */
.tasks-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 0 0 0;
  overflow: hidden;
}

/* 中间分隔虚线（水平） */
.pane-divider {
  height: 1px;
  width: 100%;
  flex-shrink: 0;
  background: repeating-linear-gradient(
    to right,
    rgba(0, 0, 0, 0.15) 0 4px,
    transparent 4px 8px
  );
  margin: 0;
}

/* 日记标题 */
.pane-title {
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}

/* 日记正文：保留换行，可滚动 */
.diary-content {
  flex: 1;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  padding-right: 4px;
}

/* 心情表情 */
.diary-mood {
  font-size: 16px;
  margin-left: 6px;
  line-height: 1;
}

/* 任务区在分栏状态下的滚动列表 */
.tasks-pane .task-list {
  flex: 1;
}

.tasks-pane .progress-bar {
  margin-bottom: 8px;
}

/* 分栏状态下的紧凑空状态 */
.task-empty-small {
  padding: 10px 4px;
  font-size: 12px;
}

/* 任务列表 */
.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
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

/* ========== 底部导航栏：[◀ 上一周]  第 XX 周  [下一周 ▶] ========== */
.index-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border-divider);
  padding: 0 12px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
  font-family: var(--font-family-sans);
}

.week-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border-divider);
  background: #fff;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.week-nav-btn:hover:not(:disabled) {
  border-color: var(--color-text-primary);
}

.week-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.week-center {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.week-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 1px;
}

.week-progress-mini {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .mode-header {
    padding: 8px 12px 4px;
  }

  .book-wrapper {
    padding: 10px 6px 80px;
  }

  .book-pages {
    /* 手机端：更紧凑的书本比例，留白明显，像一本书 */
    width: min(92vw, 780px);
    aspect-ratio: 1 / 0.9;
    max-height: calc(100vh - 210px);
    margin: 0 auto;
    box-shadow: 0 12px 28px rgba(78, 63, 55, 0.18);
    border-radius: 4px;
    overflow: hidden;
  }

  .paper {
    padding: 12px 10px 10px;
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
}
</style>
