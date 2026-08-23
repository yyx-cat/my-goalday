<script setup lang="ts">
import { computed } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useDiaryStore } from '@/store/modules/diaryStore'
import { parseDate, getWeekDay, isToday } from '@/utils/date'
import type { Todo } from '@/types/todo'
import type { BookPage } from '@/types/notebook'

/**
 * 单页内容渲染数据
 * @property kind       - 该页的渲染类型（封面/总览/单日）
 * @property date       - 单日时的日期字符串
 * @property monthDayLabel - 单日时的"X月X日"
 * @property weekdayLabel - 单日时的星期
 * @property isToday    - 是否今天
 * @property todos      - 任务列表
 * @property doneCount  - 已完成数
 * @property totalCount - 总数
 * @property progress   - 完成率
 * @property coverSide  - cover 时的左右标识
 * @property weekNumber - 总览页的周数
 * @property overviewProgress - 总览页本周完成率
 * @property overviewDays - 总览页 7 天数据
 * @property hasDiary       - 该日是否有日记内容
 * @property diaryContent   - 日记正文（hasDiary 为 true 时有效）
 * @property diaryMood      - 日记心情表情（可选）
 */
interface PageSideData {
  kind: 'cover' | 'overview' | 'day'
  date: string
  monthDayLabel: string
  weekdayLabel: string
  isToday: boolean
  todos: Todo[]
  doneCount: number
  totalCount: number
  progress: number
  coverSide: 'left' | 'right' | null
  weekNumber: number
  overviewProgress: number
  overviewDays: {
    weekdayLabel: string
    monthDayLabel: string
    doneCount: number
    totalCount: number
    progress: number
    isToday: boolean
  }[]
  hasDiary: boolean
  diaryContent: string
  diaryMood: string
}

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
 * @property page - 当前书本双页对象
 * @property side - 该子组件渲染左页还是右页
 */
interface Props {
  page: BookPage | null
  side: 'left' | 'right'
}
const props = defineProps<Props>()

const todoStore = useTodoStore()
const diaryStore = useDiaryStore()

/**
 * 构建某一天的渲染数据
 * @param date - 日期字符串
 * @returns 单日渲染数据（含日记信息）
 */
function buildDayData(date: string) {
  const todos = todoStore.getTodosByDate(date)
  const totalCount = todos.length
  const doneCount = todos.filter(t => t.done).length
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const d = parseDate(date)

  // 查找该日的日记（diaryStore.diaries 是响应式，会跟随外部更新）
  const diary = diaryStore.diaries.find(item => item.date === date)
  const diaryContent = diary?.content?.trim() ?? ''
  const hasDiary = diaryContent.length > 0
  const diaryMood = diary?.mood ? (MOOD_EMOJI_MAP[diary.mood] ?? '') : ''

  return {
    date,
    monthDayLabel: `${d.getMonth() + 1}月${d.getDate()}日`,
    weekdayLabel: getWeekDay(d),
    isToday: isToday(date),
    todos,
    doneCount,
    totalCount,
    progress,
    hasDiary,
    diaryContent,
    diaryMood,
  }
}

/**
 * 当前页 + 左/右 决定的渲染数据
 */
const sideData = computed<PageSideData | null>(() => {
  const page = props.page
  if (!page) return null

  // 封面页：左/右页都是封面装饰
  if (page.type === 'cover') {
    return {
      kind: 'cover',
      date: '',
      monthDayLabel: '',
      weekdayLabel: '',
      isToday: false,
      todos: [],
      doneCount: 0,
      totalCount: 0,
      progress: 0,
      coverSide: props.side,
      weekNumber: page.weekNumber,
      overviewProgress: 0,
      overviewDays: [],
      hasDiary: false,
      diaryContent: '',
      diaryMood: '',
    }
  }

  // 本周总览页：左=总计划，右=周一
  if (page.type === 'week-overview') {
    if (props.side === 'left') {
      // 左页：本周总计划（7 天概览）
      const overviewDays = page.weekDates.map(d => {
        const day = buildDayData(d)
        return {
          weekdayLabel: day.weekdayLabel,
          monthDayLabel: day.monthDayLabel,
          doneCount: day.doneCount,
          totalCount: day.totalCount,
          progress: day.progress,
          isToday: day.isToday,
        }
      })
      const sum = overviewDays.reduce((acc, d) => acc + d.progress, 0)
      const overviewProgress = overviewDays.length === 0 ? 0 : Math.round(sum / overviewDays.length)
      return {
        kind: 'overview',
        date: '',
        monthDayLabel: '',
        weekdayLabel: '',
        isToday: false,
        todos: [],
        doneCount: 0,
        totalCount: 0,
        progress: 0,
        coverSide: null,
        weekNumber: page.weekNumber,
        overviewProgress,
        overviewDays,
        hasDiary: false,
        diaryContent: '',
        diaryMood: '',
      }
    } else {
      // 右页：周一详情
      const day = buildDayData(page.rightDate ?? page.weekDates[0])
      return {
        kind: 'day',
        ...day,
        coverSide: null,
        weekNumber: page.weekNumber,
        overviewProgress: 0,
        overviewDays: [],
      }
    }
  }

  // 工作日对：左=leftDate，右=rightDate
  const dateStr = props.side === 'left' ? (page.leftDate ?? '') : (page.rightDate ?? '')
  if (!dateStr) return null
  const day = buildDayData(dateStr)
  return {
    kind: 'day',
    ...day,
    coverSide: null,
    weekNumber: page.weekNumber,
    overviewProgress: 0,
    overviewDays: [],
  }
})
</script>

<template>
  <div class="page-side" v-if="sideData">
    <!-- ========== 封面页 ========== -->
    <template v-if="sideData.kind === 'cover'">
      <div class="cover-inner">
        <template v-if="sideData.coverSide === 'left'">
          <div class="cover-title">📒 我的手账</div>
          <div class="cover-sub">{{ props.page?.year }}年 · 第 {{ sideData.weekNumber }} 周</div>
          <div class="cover-date-range">
            {{ props.page?.month }}月 · {{ props.page?.weekStart }} ~ {{ props.page?.weekEnd }}
          </div>
          <div class="cover-hint">点击右侧翻页打开 →</div>
        </template>
        <template v-else>
          <div class="cover-icon">📖</div>
          <div class="cover-title-small">翻开手账</div>
          <div class="cover-sub">从本周总计划开始</div>
          <div class="cover-hint">← 点击左侧返回封面</div>
        </template>
      </div>
    </template>

    <!-- ========== 本周总览（左页） ========== -->
    <template v-else-if="sideData.kind === 'overview'">
      <div class="page-inner">
        <header class="day-header">
          <div class="day-title-line">
            <span class="day-date-label">第{{ sideData.weekNumber }}周</span>
            <span class="day-dot-sep">·</span>
            <span class="day-week-label">本周总计划</span>
          </div>
          <div class="day-progress-text">
            完成 {{ sideData.overviewProgress }}%
          </div>
        </header>

        <div class="day-progress-bar">
          <div class="progress-fill" :style="{ width: sideData.overviewProgress + '%' }"></div>
        </div>

        <ul class="week-overview-list">
          <li
            v-for="d in sideData.overviewDays"
            :key="d.monthDayLabel"
            class="week-overview-item"
            :class="{ today: d.isToday }"
          >
            <span class="wo-weekday">{{ d.weekdayLabel }}</span>
            <span class="wo-daynum">{{ d.monthDayLabel }}</span>
            <span class="wo-progress">{{ d.doneCount }}/{{ d.totalCount }}</span>
            <span class="wo-bar">
              <span class="wo-bar-fill" :style="{ width: d.progress + '%' }"></span>
            </span>
          </li>
        </ul>
      </div>
    </template>

    <!-- ========== 单日详情（工作日对 或 总览右页的周一） ========== -->
    <template v-else>
      <div class="page-inner" :class="{ 'has-diary': sideData.hasDiary }">
        <!-- 顶部头部：日期 + 进度（有日记时也保留，让用户一眼知道是哪天） -->
        <header class="day-header">
          <div class="day-title-line">
            <span class="day-date-label">{{ sideData.monthDayLabel }}</span>
            <span class="day-dot-sep">·</span>
            <span class="day-week-label">{{ sideData.weekdayLabel }}</span>
            <span class="today-tag" v-if="sideData.isToday">今天</span>
            <!-- 有日记时显示心情表情 -->
            <span v-if="sideData.hasDiary && sideData.diaryMood" class="diary-mood">{{ sideData.diaryMood }}</span>
          </div>
          <div class="day-progress-text">
            进度 {{ sideData.doneCount }}/{{ sideData.totalCount }}  {{ sideData.progress }}%
          </div>
        </header>

        <!-- 有日记：左右分栏（左=日记，右=任务） -->
        <div v-if="sideData.hasDiary" class="day-split">
          <!-- 左半：今日记录 -->
          <div class="diary-pane">
            <div class="pane-title">📝 今日记录</div>
            <div class="diary-content">{{ sideData.diaryContent }}</div>
          </div>

          <!-- 中间分隔线 -->
          <div class="pane-divider"></div>

          <!-- 右半：任务列表 -->
          <div class="tasks-pane">
            <div class="day-progress-bar">
              <div class="progress-fill" :style="{ width: sideData.progress + '%' }"></div>
            </div>
            <ul class="day-tasks" v-if="sideData.todos.length > 0">
              <li
                v-for="todo in sideData.todos"
                :key="todo.id"
                class="task-item"
                :class="{ done: todo.done }"
              >
                <span class="task-circle" :class="{ filled: todo.done }"></span>
                <span class="task-text">{{ todo.text }}</span>
              </li>
            </ul>
            <div v-else class="day-empty day-empty-small">
              <div class="day-empty-icon">✨</div>
              <div class="day-empty-text">这一天还没有待办</div>
            </div>
          </div>
        </div>

        <!-- 无日记：原样显示进度条 + 任务列表 -->
        <template v-else>
          <div class="day-progress-bar">
            <div class="progress-fill" :style="{ width: sideData.progress + '%' }"></div>
          </div>

          <ul class="day-tasks" v-if="sideData.todos.length > 0">
            <li
              v-for="todo in sideData.todos"
              :key="todo.id"
              class="task-item"
              :class="{ done: todo.done }"
            >
              <span class="task-circle" :class="{ filled: todo.done }"></span>
              <span class="task-text">{{ todo.text }}</span>
            </li>
          </ul>
          <div v-else class="day-empty">
            <div class="day-empty-icon">✨</div>
            <div class="day-empty-text">这一天还没有待办</div>
            <div class="day-empty-sub">写一件小目标吧~</div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ========== 单页内容容器 ========== */
.page-side {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ========== 封面页 ========== */
.cover-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 18px;
  box-sizing: border-box;
  gap: 10px;
}

.cover-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.cover-title-small {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.cover-icon {
  font-size: 40px;
  margin-bottom: 6px;
}

.cover-sub {
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 1px;
}

.cover-date-range {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.cover-hint {
  margin-top: 18px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  letter-spacing: 0.5px;
}

/* ========== 单日/总览页内容 ========== */
.page-inner {
  width: 100%;
  height: 100%;
  padding: 18px 18px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.day-title-line {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.day-date-label {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: var(--font-family-sans);
}

.day-dot-sep {
  color: var(--color-text-tertiary);
}

.day-week-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.today-tag {
  font-size: 11px;
  background: var(--color-text-primary);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 6px;
}

.day-progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: rgba(234, 223, 217, 0.5);
  padding: 4px 10px;
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

.day-progress-bar {
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

.day-tasks {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
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

.day-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 20px 10px;
}

/* 分栏状态下的紧凑空状态（任务区无任务时用） */
.day-empty-small {
  padding: 10px 4px;
  gap: 4px;
}

.day-empty-small .day-empty-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.day-empty-small .day-empty-text {
  font-size: 12px;
}

/* ========== 有日记时的上下分栏布局 ========== */
/* page-inner 在 has-diary 时仍然是 flex column，下方用 day-split 占满剩余空间 */
.day-split {
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
.tasks-pane .day-tasks {
  flex: 1;
}

.tasks-pane .day-progress-bar {
  margin-bottom: 8px;
}

.day-empty-icon {
  font-size: 22px;
  margin-bottom: 4px;
}

.day-empty-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.day-empty-sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ========== 本周总览 7 天列表 ========== */
.week-overview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  overflow-y: auto;
}

.week-overview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.15s;
}

.week-overview-item.today {
  background: rgba(234, 223, 217, 0.5);
  font-weight: 600;
}

.wo-weekday {
  color: var(--color-text-secondary);
  min-width: 50px;
}

.wo-daynum {
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  min-width: 60px;
}

.wo-progress {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

.wo-bar {
  flex: 1;
  height: 4px;
  background: #F2ECE7;
  border-radius: 2px;
  overflow: hidden;
}

.wo-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #E5C8B6 0%, #C9A58E 100%);
  transition: width 0.3s ease;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .page-inner {
    padding: 14px 12px 12px;
  }

  .day-date-label {
    font-size: 18px;
  }

  .cover-title {
    font-size: 22px;
  }
}
</style>
