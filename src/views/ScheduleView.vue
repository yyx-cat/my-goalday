<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import {
  getTodayDate,
  addDays,
  formatChineseDate,
  parseDate,
  getWeekDay,
  getWeekDates,
  getMondayOfWeek,
  getWeekNumber,
  getWeekRangeText,
} from '@/utils/date'
import type { Todo } from '@/types/todo'

const todoStore = useTodoStore()

/**
 * 单个日期卡片的数据结构
 */
interface DayCard {
  /** 日期字符串 YYYY-MM-DD */
  date: string
  /** 中文展示文本（如 2026年8月20日 · 星期四） */
  dateDisplay: string
  /** 星期几 */
  weekday: string
  /** 短日期展示（如 8月20日） */
  shortDate: string
  /** 该天的任务列表 */
  todos: Todo[]
  /** 卡片内输入框文本 */
  newTodoText: string
  /** 是否是今天 */
  isToday: boolean
}

/**
 * 当前所在周的"锚定日期"（用任意一天即可定位整周）
 * 默认为今天，切换周时更新此值
 */
const currentAnchor = ref<string>(getTodayDate())

/**
 * 每个日期的输入框文本（独立存储，便于就地编辑）
 * key: date, value: 输入文本
 */
const inputTextMap = ref<Record<string, string>>({})

/**
 * 滑动手势相关变量
 */
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
const SWIPE_THRESHOLD = 50 // 滑动触发阈值（像素）
const SWIPE_TIME_LIMIT = 500 // 滑动时间限制（毫秒）

/**
 * 翻页动画方向与状态
 */
const slideDirection = ref<'up' | 'down'>('up')
const isAnimating = ref<boolean>(false)

// ========== 计算属性 ==========

/**
 * 当前周的 7 天日期数组（周一到周日，正序）
 */
const currentWeekDates = computed<string[]>(() => {
  return getWeekDates(currentAnchor.value)
})

/**
 * 当前周的周一日期
 */
const currentMonday = computed<string>(() => {
  return getMondayOfWeek(currentAnchor.value)
})

/**
 * 当前周是今年的第几周
 */
const currentWeekNumber = computed<number>(() => {
  return getWeekNumber(currentAnchor.value)
})

/**
 * 当前周的年份
 */
const currentYear = computed<number>(() => {
  return parseDate(currentMonday.value).getFullYear()
})

/**
 * 当前周的日期范围文本（如 "8月17日 - 8月23日"）
 */
const weekRangeText = computed<string>(() => {
  return getWeekRangeText(currentAnchor.value)
})

/**
 * 是否是本周（今天所在的周）
 */
const isCurrentWeek = computed<boolean>(() => {
  return getMondayOfWeek(currentAnchor.value) === getMondayOfWeek(getTodayDate())
})

/**
 * 当前周的 7 天卡片数据
 */
const dayCards = computed<DayCard[]>(() => {
  const dates = currentWeekDates.value
  const allTodos = todoStore.todos
  const today = getTodayDate()

  return dates.map(date => {
    const dateObj = parseDate(date)
    return {
      date,
      dateDisplay: formatChineseDate(date),
      weekday: getWeekDay(dateObj),
      shortDate: `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`,
      todos: allTodos.filter(t => t.date === date),
      newTodoText: inputTextMap.value[date] || '',
      isToday: date === today,
    }
  })
})

// ========== 方法 ==========

/**
 * 切换到上一周（更早的日期）
 */
function goPrevWeek(): void {
  if (isAnimating.value) return
  slideDirection.value = 'down'
  isAnimating.value = true
  // 往前推 7 天
  currentAnchor.value = addDays(currentAnchor.value, -7)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 切换到下一周（更晚的日期）
 */
function goNextWeek(): void {
  if (isAnimating.value) return
  slideDirection.value = 'up'
  isAnimating.value = true
  // 往后推 7 天
  currentAnchor.value = addDays(currentAnchor.value, 7)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 回到本周（今天所在的周）
 */
function goThisWeek(): void {
  if (isCurrentWeek.value) return
  const thisWeekMonday = getMondayOfWeek(getTodayDate())
  // 根据当前周与本周的相对位置决定动画方向
  slideDirection.value = thisWeekMonday > currentMonday.value ? 'up' : 'down'
  isAnimating.value = true
  currentAnchor.value = getTodayDate()
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 设置某个日期的输入框文本
 * @param date - 日期字符串
 * @param text - 输入文本
 */
function setInputText(date: string, text: string): void {
  inputTextMap.value[date] = text
}

/**
 * 在某个日期卡片内添加任务
 * @param date - 日期字符串
 */
function handleAddTodo(date: string): void {
  const text = (inputTextMap.value[date] || '').trim()
  if (!text) return
  todoStore.addTodo(text, date)
  // 清空输入框
  inputTextMap.value[date] = ''
}

/**
 * 切换任务完成状态
 * @param id - 任务 id
 */
function handleToggleTodo(id: string): void {
  todoStore.toggleTodo(id)
}

/**
 * 删除任务
 * @param id - 任务 id
 */
function handleDeleteTodo(id: string): void {
  todoStore.deleteTodo(id)
}

// ========== 滑动手势处理 ==========

/**
 * 触摸开始
 * @param e - 触摸事件
 */
function handleTouchStart(e: TouchEvent): void {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
}

/**
 * 触摸结束，判断滑动方向
 * 主要检测纵向滑动（上下切换周）
 * @param e - 触摸事件
 */
function handleTouchEnd(e: TouchEvent): void {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const diffX = touchStartX - touchEndX
  const diffY = touchStartY - touchEndY
  const duration = Date.now() - touchStartTime

  // 超过时间限制则不触发
  if (duration > SWIPE_TIME_LIMIT) return

  // 优先判断纵向滑动（上下切换周）
  if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > SWIPE_THRESHOLD) {
    // 手指向上滑（diffY > 0）→ 切换到下一周（更晚的日期）
    if (diffY > 0) {
      goNextWeek()
    }
    // 手指向下滑（diffY < 0）→ 切换到上一周（更早的日期）
    else {
      goPrevWeek()
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  todoStore.loadTodos()
})
</script>

<template>
  <div class="schedule-view">
    <!-- 顶部标题栏 -->
    <header class="top-bar">
      <h1 class="title">📅 日程</h1>
      <button
        v-if="!isCurrentWeek"
        class="today-btn"
        @click="goThisWeek"
      >本周</button>
    </header>

    <!-- 周导航栏 -->
    <div class="week-nav">
      <button
        class="week-nav-btn"
        @click="goPrevWeek"
        :disabled="isAnimating"
      >‹</button>

      <div class="week-center">
        <p class="week-number">{{ currentYear }}年 第 {{ currentWeekNumber }} 周</p>
        <p class="week-range">{{ weekRangeText }}</p>
      </div>

      <button
        class="week-nav-btn"
        @click="goNextWeek"
        :disabled="isAnimating"
      >›</button>
    </div>

    <!-- 一周的日期卡片区域（支持上下滑动切换周） -->
    <div
      class="week-container"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <!-- 翻页动画容器 -->
      <div
        class="week-content"
        :class="[isAnimating ? `slide-${slideDirection}` : '']"
      >
        <div
          v-for="card in dayCards"
          :key="card.date"
          class="day-card"
          :class="{ today: card.isToday }"
        >
          <!-- 日期标题 -->
          <div class="day-header">
            <div class="day-info">
              <span class="day-short">{{ card.shortDate }}</span>
              <span class="day-weekday">{{ card.weekday }}</span>
            </div>
            <span v-if="card.isToday" class="today-tag">今天</span>
            <span v-else-if="card.todos.length > 0" class="count-tag">
              {{ card.todos.filter(t => t.done).length }}/{{ card.todos.length }}
            </span>
          </div>

          <!-- 任务列表 -->
          <div class="todo-list">
            <div
              v-for="todo in card.todos"
              :key="todo.id"
              class="todo-item"
              :class="{ completed: todo.done }"
            >
              <button class="check-btn" @click="handleToggleTodo(todo.id)">
                {{ todo.done ? '☑' : '☐' }}
              </button>
              <span class="todo-text">{{ todo.text }}</span>
              <button class="delete-btn" @click="handleDeleteTodo(todo.id)">✕</button>
            </div>

            <!-- 空状态提示 -->
            <div v-if="card.todos.length === 0" class="empty-tip">
              ✨ 这天还没有待办
            </div>
          </div>

          <!-- 卡片内就地输入框 -->
          <div class="inline-input-area">
            <input
              :value="card.newTodoText"
              @input="setInputText(card.date, ($event.target as HTMLInputElement).value)"
              @keyup.enter="handleAddTodo(card.date)"
              placeholder="✍️ 写待办..."
              class="inline-input"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="bottom-hint">
      <span>↑ 下滑下一周 · ↓ 上滑上一周</span>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.schedule-view {
  min-height: 0;
  height: 100%;
  width: 100%;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========== 顶部标题栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #FDF8F0;
  border-bottom: 1px solid #F0E8D8;
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 1px;
}

.today-btn {
  padding: 5px 14px;
  border: 1px solid #C4A375;
  border-radius: 12px;
  background: transparent;
  color: #8B6539;
  font-size: 12px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: all 0.2s;
}

.today-btn:hover {
  background: #EFE4D4;
  border-color: #A8824F;
}

/* ========== 周导航栏 ========== */
.week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #FDF8F0;
  border-bottom: 1px solid #F0E8D8;
  flex-shrink: 0;
}

.week-nav-btn {
  width: 32px;
  height: 32px;
  border: 1.5px solid #E8DFD3;
  border-radius: 50%;
  background: #FFFEF9;
  color: #8B6539;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.week-nav-btn:hover:not(:disabled) {
  border-color: #C4A375;
  background: #FAF8F5;
  transform: scale(1.05);
}

.week-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.week-center {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.week-number {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 0.5px;
}

.week-range {
  margin: 0;
  font-size: 11px;
  color: #9C876C;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

/* ========== 周内容区域 ========== */
.week-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  /* iOS 动量滚动 */
  -webkit-overflow-scrolling: touch;
  /* 禁止页面滚动反弹干扰手势 */
  overscroll-behavior: contain;
}

.week-content {
  padding: 12px 16px 20px;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

/* 翻页过渡动画 */
.slide-up {
  animation: slideOutUp 0.3s ease-out, slideInFromBottom 0.3s ease-out 0.15s;
}

.slide-down {
  animation: slideOutDown 0.3s ease-out, slideInFromTop 0.3s ease-out 0.15s;
}

@keyframes slideOutUp {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-30px); opacity: 0.3; }
}

@keyframes slideInFromBottom {
  0% { transform: translateY(30px); opacity: 0.3; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes slideOutDown {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(30px); opacity: 0.3; }
}

@keyframes slideInFromTop {
  0% { transform: translateY(-30px); opacity: 0.3; }
  100% { transform: translateY(0); opacity: 1; }
}

/* 滚动条样式 */
.week-container::-webkit-scrollbar {
  width: 4px;
}

.week-container::-webkit-scrollbar-thumb {
  background: #D4C5B0;
  border-radius: 10px;
}

.week-container::-webkit-scrollbar-track {
  background: transparent;
}

/* ========== 单个日期卡片 ========== */
.day-card {
  background: #FDF8F0;
  border-radius: 10px;
  border: 1px solid #F0E8D8;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 2px 6px rgba(0, 0, 0, 0.03);
  margin-bottom: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.day-card:hover {
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.06),
    0 3px 10px rgba(0, 0, 0, 0.04);
}

/* 今天的卡片高亮 */
.day-card.today {
  border-color: #C4A375;
  background: #FFFEF5;
  box-shadow:
    0 2px 8px rgba(196, 163, 117, 0.2),
    0 3px 12px rgba(196, 163, 117, 0.1);
}

/* ========== 日期标题 ========== */
.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #FFFEF9;
  border-bottom: 1px dashed #F0E8D8;
}

.day-card.today .day-header {
  background: #FBF6E8;
}

.day-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.day-short {
  font-size: 14px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.day-weekday {
  font-size: 12px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.today-tag {
  padding: 2px 10px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 11px;
  border-radius: 10px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.count-tag {
  padding: 2px 8px;
  background: #EFE4D4;
  color: #8B6539;
  font-size: 11px;
  border-radius: 10px;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

/* ========== 任务列表 ========== */
.todo-list {
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: #FFFEF9;
  border-radius: 7px;
  border: 1px solid #F5EFE3;
  transition: all 0.2s;
}

.todo-item:hover {
  background: #FDF8F0;
  border-color: #EFE4D4;
}

.todo-item.completed {
  opacity: 0.6;
  background: #FAF8F5;
}

/* 复选框 */
.check-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  font-size: 17px;
  color: #9C876C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
}

.check-btn:hover {
  color: #8B6539;
  transform: scale(1.15);
}

.todo-item.completed .check-btn {
  color: #A8824F;
}

/* 任务文字 */
.todo-text {
  flex: 1;
  font-size: 13px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  word-break: break-word;
  line-height: 1.5;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #B8A68E;
}

/* 删除按钮 */
.delete-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #C8B8A0;
  font-size: 13px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
  opacity: 0;
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #FBF0F0;
  color: #A05555;
}

/* 空状态提示 */
.empty-tip {
  text-align: center;
  padding: 8px 6px;
  color: #C8B8A0;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  font-size: 11px;
}

/* ========== 就地输入框 ========== */
.inline-input-area {
  padding: 6px 10px 10px;
  border-top: 1px dashed #F5EFE3;
}

.inline-input {
  width: 100%;
  padding: 7px 10px;
  border: 1.5px dashed #E8DFD3;
  border-radius: 7px;
  background: #FFFEF9;
  font-size: 13px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #5E4F3D;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.inline-input::placeholder {
  color: #C8B8A0;
  font-style: italic;
}

.inline-input:focus {
  border-color: #C4A375;
  border-style: solid;
  background: #FFF;
  box-shadow: 0 0 0 3px rgba(196, 163, 117, 0.12);
}

/* ========== 底部提示 ========== */
.bottom-hint {
  flex-shrink: 0;
  text-align: center;
  padding: 8px 16px;
  background: #FDF8F0;
  border-top: 1px solid #F0E8D8;
  font-size: 11px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 1px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom, 0));
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .top-bar {
    padding: 12px 16px;
  }

  .title {
    font-size: 17px;
  }

  .week-nav {
    padding: 10px 14px;
  }

  .week-number {
    font-size: 14px;
  }

  .week-range {
    font-size: 10px;
  }

  .week-content {
    padding: 10px 12px 16px;
  }

  .day-short {
    font-size: 13px;
  }

  .todo-text {
    font-size: 12px;
  }

  /* 移动端删除按钮常显 */
  .delete-btn {
    opacity: 0.4;
  }
}
</style>
