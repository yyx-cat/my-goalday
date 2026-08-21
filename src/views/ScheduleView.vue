<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useHabitStore } from '@/store/modules/habitStore'
import {
  getTodayDate,
  addDays,
  parseDate,
  getWeekDay,
  getWeekDates,
  getMondayOfWeek,
  getWeekNumber,
  getWeekRangeText,
} from '@/utils/date'
import type { Todo } from '@/types/todo'

const todoStore = useTodoStore()
const habitStore = useHabitStore()

/**
 * 子标签类型
 */
type SubTab = 'record' | 'list' | 'habit'

/**
 * 单个日期行的数据结构（记录视图用）
 */
interface DayRow {
  /** 日期字符串 YYYY-MM-DD */
  date: string
  /** 日期数字（如 18） */
  dayNumber: number
  /** 星期几（如 星期一） */
  weekday: string
  /** 该天的任务列表 */
  todos: Todo[]
  /** 是否是今天 */
  isToday: boolean
}

/**
 * 清单视图中按日期分组的任务结构
 */
interface TodoGroup {
  /** 日期字符串 */
  date: string
  /** 中文日期展示（如 8月18日 周一） */
  label: string
  /** 该天任务列表 */
  todos: Todo[]
}

// ========== 状态 ==========

/** 当前激活的子标签（记录/清单/习惯） */
const activeSubTab = ref<SubTab>('record')

/** 当前所在周的锚定日期（默认今天） */
const currentAnchor = ref<string>(getTodayDate())

/** 周选择器下拉面板是否展开 */
const weekDropdownOpen = ref<boolean>(false)

/** 记录视图中已展开的日期集合（手风琴） */
const expandedDates = ref<Set<string>>(new Set())

/** 记录视图中每个日期的就地输入文本 */
const recordInputMap = ref<Record<string, string>>({})

/** 清单视图输入框文本 */
const listInputText = ref<string>('')

/** 清单视图新任务的目标日期（默认今天） */
const listInputDate = ref<string>(getTodayDate())

/** 习惯视图新习惯名称输入 */
const newHabitName = ref<string>('')

/** 习惯视图新习惯图标（emoji） */
const newHabitIcon = ref<string>('')

// ========== 计算属性 ==========

/** 当前周的 7 天日期数组（周一到周日正序） */
const currentWeekDates = computed<string[]>(() => getWeekDates(currentAnchor.value))

/** 当前周是今年的第几周 */
const currentWeekNumber = computed<number>(() => getWeekNumber(currentAnchor.value))

/** 当前周的年份 */
const currentYear = computed<number>(() => parseDate(getMondayOfWeek(currentAnchor.value)).getFullYear())

/** 当前周的日期范围文本（如 8月17日 - 8月23日） */
const weekRangeText = computed<string>(() => getWeekRangeText(currentAnchor.value))

/** 是否是本周 */
const isCurrentWeek = computed<boolean>(() => getMondayOfWeek(currentAnchor.value) === getMondayOfWeek(getTodayDate()))

/** 记录视图：当前周的日期行数据 */
const dayRows = computed<DayRow[]>(() => {
  const dates = currentWeekDates.value
  const allTodos = todoStore.todos
  const today = getTodayDate()
  return dates.map(date => {
    const dateObj = parseDate(date)
    return {
      date,
      dayNumber: dateObj.getDate(),
      weekday: getWeekDay(dateObj),
      todos: allTodos.filter(t => t.date === date),
      isToday: date === today,
    }
  })
})

/** 清单视图：所有任务按日期倒序分组 */
const todoGroups = computed<TodoGroup[]>(() => {
  const allTodos = todoStore.todos
  // 收集所有出现过的日期
  const dateSet = new Set<string>()
  allTodos.forEach(t => dateSet.add(t.date))
  // 倒序排列（最新在前）
  const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a))
  return sortedDates.map(date => {
    const dateObj = parseDate(date)
    const label = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${getWeekDay(dateObj)}`
    return {
      date,
      label,
      todos: allTodos.filter(t => t.date === date),
    }
  })
})

/** 清单视图：总任务数与已完成数 */
const listStats = computed(() => {
  const all = todoStore.todos
  const done = all.filter(t => t.done).length
  return { total: all.length, done }
})

/** 习惯视图：习惯列表 */
const habits = computed(() => habitStore.habits)

/** 习惯视图：今日打卡统计 */
const habitStats = computed(() => ({
  done: habitStore.todayCheckInCount,
  total: habitStore.habitsCount,
}))

// ========== 方法：周导航 ==========

/**
 * 切换到上一周
 */
function goPrevWeek(): void {
  currentAnchor.value = addDays(currentAnchor.value, -7)
  weekDropdownOpen.value = false
}

/**
 * 切换到下一周
 */
function goNextWeek(): void {
  currentAnchor.value = addDays(currentAnchor.value, 7)
  weekDropdownOpen.value = false
}

/**
 * 回到本周
 */
function goThisWeek(): void {
  currentAnchor.value = getTodayDate()
  weekDropdownOpen.value = false
}

/**
 * 切换周选择器下拉面板
 */
function toggleWeekDropdown(): void {
  weekDropdownOpen.value = !weekDropdownOpen.value
}

// ========== 方法：子标签切换 ==========

/**
 * 切换子标签
 * @param tab - 目标子标签
 */
function switchSubTab(tab: SubTab): void {
  activeSubTab.value = tab
}

// ========== 方法：记录视图任务 ==========

/**
 * 切换某日期行的展开/收起状态
 * @param date - 日期字符串
 */
function toggleExpand(date: string): void {
  const set = new Set(expandedDates.value)
  if (set.has(date)) {
    set.delete(date)
  } else {
    set.add(date)
  }
  expandedDates.value = set
}

/**
 * 记录视图：在某天添加任务
 * @param date - 日期字符串
 */
function handleRecordAdd(date: string): void {
  const text = (recordInputMap.value[date] || '').trim()
  if (!text) return
  todoStore.addTodo(text, date)
  recordInputMap.value[date] = ''
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

// ========== 方法：清单视图 ==========

/**
 * 清单视图：添加任务（关联 listInputDate）
 */
function handleListAdd(): void {
  const text = listInputText.value.trim()
  if (!text) return
  todoStore.addTodo(text, listInputDate.value)
  listInputText.value = ''
}

// ========== 方法：习惯视图 ==========

/**
 * 创建新习惯
 */
function handleCreateHabit(): void {
  const name = newHabitName.value.trim()
  if (!name) return
  habitStore.createHabit(name, newHabitIcon.value || undefined)
  newHabitName.value = ''
  newHabitIcon.value = ''
}

/**
 * 切换习惯今日打卡状态
 * @param habitId - 习惯 id
 */
function handleToggleHabit(habitId: string): void {
  habitStore.toggleCheckIn(habitId, getTodayDate())
}

/**
 * 删除习惯
 * @param habitId - 习惯 id
 */
function handleDeleteHabit(habitId: string): void {
  habitStore.deleteHabit(habitId)
}

/**
 * 判断习惯今日是否已打卡
 * @param habitId - 习惯 id
 * @returns 是否已打卡
 */
function isHabitCheckedToday(habitId: string): boolean {
  return habitStore.isCheckedIn(habitId, getTodayDate())
}

// 组件挂载时加载数据
onMounted(() => {
  todoStore.loadTodos()
  habitStore.loadHabits()
})
</script>

<template>
  <div class="schedule-view">
    <!-- 顶部导航栏（藕灰背景） -->
    <header class="top-nav">
      <div class="nav-content">
        <!-- 左侧：周选择器 -->
        <button class="week-selector" @click="toggleWeekDropdown">
          <span class="week-text">第 {{ currentWeekNumber }} 周</span>
          <svg class="dropdown-arrow" :class="{ open: weekDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- 右侧：子标签 记录 | 清单 | 习惯 -->
        <nav class="sub-tabs">
          <button
            class="sub-tab"
            :class="{ active: activeSubTab === 'record' }"
            @click="switchSubTab('record')"
          >记录</button>
          <span class="tab-divider">|</span>
          <button
            class="sub-tab"
            :class="{ active: activeSubTab === 'list' }"
            @click="switchSubTab('list')"
          >清单</button>
          <span class="tab-divider">|</span>
          <button
            class="sub-tab"
            :class="{ active: activeSubTab === 'habit' }"
            @click="switchSubTab('habit')"
          >习惯</button>
        </nav>
      </div>

      <!-- 周选择器下拉面板 -->
      <div v-if="weekDropdownOpen" class="week-dropdown">
        <div class="dropdown-header">
          <span>{{ currentYear }}年 第 {{ currentWeekNumber }} 周</span>
          <span class="dropdown-range">{{ weekRangeText }}</span>
        </div>
        <div class="dropdown-actions">
          <button class="dropdown-btn" @click="goPrevWeek">‹ 上一周</button>
          <button class="dropdown-btn" v-if="!isCurrentWeek" @click="goThisWeek">本周</button>
          <button class="dropdown-btn" @click="goNextWeek">下一周 ›</button>
        </div>
      </div>
    </header>

    <!-- 主内容区（三视图切换） -->
    <div class="main-body">
      <!-- ========== 记录视图：日期列表行 ========== -->
      <div v-show="activeSubTab === 'record'" class="view-record">
        <div
          v-for="row in dayRows"
          :key="row.date"
          class="daily-item"
          :class="{ today: row.isToday, expanded: expandedDates.has(row.date) }"
        >
          <!-- 日期行（点击展开） -->
          <div class="item-row" @click="toggleExpand(row.date)">
            <!-- 日期块：数字 + 短横线 + 周几 -->
            <div class="date-block">
              <span class="day-number">{{ row.dayNumber }}</span>
              <div class="separator-line"></div>
              <span class="day-of-week">{{ row.weekday }}</span>
            </div>

            <!-- 右侧：任务统计 + 展开箭头 -->
            <div class="item-right">
              <span v-if="row.todos.length > 0" class="item-count">
                {{ row.todos.filter(t => t.done).length }}/{{ row.todos.length }}
              </span>
              <!-- 悬浮按钮（展开时显示，左箭头收起） -->
              <button
                v-if="expandedDates.has(row.date)"
                class="floating-btn"
                @click.stop="toggleExpand(row.date)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <svg v-else class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </div>
          </div>

          <!-- 展开内容：当天任务列表 + 输入框 -->
          <div v-if="expandedDates.has(row.date)" class="expanded-content">
            <div
              v-for="todo in row.todos"
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

            <div v-if="row.todos.length === 0" class="empty-tip">✨ 这天还没有待办</div>

            <!-- 就地输入框 -->
            <input
              :value="recordInputMap[row.date] || ''"
              @input="recordInputMap[row.date] = ($event.target as HTMLInputElement).value"
              @keyup.enter="handleRecordAdd(row.date)"
              placeholder="✍️ 写待办..."
              class="inline-input"
            />
          </div>
        </div>
      </div>

      <!-- ========== 清单视图：所有任务汇总 ========== -->
      <div v-show="activeSubTab === 'list'" class="view-list">
        <!-- 顶部统计 + 添加 -->
        <div class="list-header">
          <span class="list-stats">已完成 {{ listStats.done }}/{{ listStats.total }}</span>
        </div>

        <!-- 添加任务输入区 -->
        <div class="list-add-area">
          <input
            v-model="listInputDate"
            type="date"
            class="date-picker"
          />
          <input
            v-model="listInputText"
            @keyup.enter="handleListAdd"
            placeholder="✍️ 写待办..."
            class="inline-input"
          />
        </div>

        <!-- 分组任务列表 -->
        <div v-if="todoGroups.length > 0">
          <div v-for="group in todoGroups" :key="group.date" class="todo-group">
            <div class="group-header">{{ group.label }}</div>
            <div
              v-for="todo in group.todos"
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
          </div>
        </div>

        <div v-else class="empty-state">✨ 还没有待办，写一件小目标吧</div>
      </div>

      <!-- ========== 习惯视图：习惯打卡 ========== -->
      <div v-show="activeSubTab === 'habit'" class="view-habit">
        <!-- 今日打卡统计 -->
        <div class="habit-stats">
          今日已打卡 {{ habitStats.done }}/{{ habitStats.total }}
        </div>

        <!-- 添加新习惯 -->
        <div class="habit-add-area">
          <input
            v-model="newHabitIcon"
            placeholder="🎯"
            class="habit-icon-input"
            maxlength="2"
          />
          <input
            v-model="newHabitName"
            @keyup.enter="handleCreateHabit"
            placeholder="✍️ 新习惯名称..."
            class="inline-input habit-name-input"
          />
        </div>

        <!-- 习惯列表 -->
        <div v-if="habits.length > 0" class="habit-list">
          <div v-for="habit in habits" :key="habit.id" class="habit-item">
            <button
              class="habit-check"
              :class="{ checked: isHabitCheckedToday(habit.id) }"
              @click="handleToggleHabit(habit.id)"
            >
              {{ isHabitCheckedToday(habit.id) ? '✓' : habit.icon || '○' }}
            </button>
            <span class="habit-name">{{ habit.name }}</span>
            <button class="delete-btn" @click="handleDeleteHabit(habit.id)">✕</button>
          </div>
        </div>

        <div v-else class="empty-state">✨ 还没有习惯，添加一个开始打卡吧</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.schedule-view {
  min-height: 0;
  height: 100%;
  width: 100%;
  background: var(--color-bg-main);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-family-sans);
}

/* ========== 顶部导航栏 ========== */
.top-nav {
  flex-shrink: 0;
  background: var(--color-bg-surface);
  position: relative;
  z-index: 5;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
}

/* 周选择器 */
.week-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  padding: 0;
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

/* 子标签 */
.sub-tabs {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sub-tab {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-family-sans);
  font-size: 14px;
  font-weight: var(--font-weight-normal);
  color: var(--color-text-tertiary);
  padding: 0;
  transition: color 0.2s;
}

.sub-tab.active {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.tab-divider {
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* 周下拉面板 */
.week-dropdown {
  position: absolute;
  top: 100%;
  left: 16px;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 12px;
  min-width: 200px;
  z-index: 10;
}

.dropdown-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-border-divider);
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.dropdown-range {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

.dropdown-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 8px 12px;
  text-align: left;
  border-radius: 6px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  transition: background 0.2s;
}

.dropdown-btn:hover {
  background: var(--color-bg-main);
}

/* ========== 主内容区 ========== */
.main-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

/* ========== 记录视图：日期列表行 ========== */
.daily-item {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-main);
}

.daily-item.today {
  background: #fff;
}

.daily-item.expanded {
  border-bottom: none;
}

/* 日期行 */
.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 80px;
  padding: 0 20px;
  cursor: pointer;
}

/* 日期块：数字 + 短横线 + 周几 */
.date-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
}

.day-number {
  font-size: 20px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.separator-line {
  width: 100%;
  height: 1px;
  background: var(--color-text-primary);
  margin: 2px 0;
}

.day-of-week {
  font-size: 12px;
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
}

/* 行右侧 */
.item-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-count {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

.chevron-right {
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
}

/* 悬浮按钮（展开时显示） */
.floating-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-primary);
  padding: 0;
}

.floating-btn svg {
  width: 18px;
  height: 18px;
}

/* 展开内容 */
.expanded-content {
  padding: 8px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff;
  border-bottom: 1px solid var(--color-border-divider);
}

/* ========== 通用任务项 ========== */
.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-divider);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item.completed {
  opacity: 0.5;
}

.check-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.todo-text {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  word-break: break-word;
  line-height: 1.4;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.delete-btn:hover {
  color: #BF7575;
}

/* 就地输入框 */
.inline-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  box-sizing: border-box;
  margin-top: 4px;
  transition: border-color 0.2s;
}

.inline-input:focus {
  border-color: var(--color-text-secondary);
}

.inline-input::placeholder {
  color: var(--color-text-tertiary);
}

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 8px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ========== 清单视图 ========== */
.view-list {
  padding-bottom: 20px;
}

.list-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-divider);
}

.list-stats {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.list-add-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-divider);
}

.date-picker {
  padding: 8px 12px;
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
}

.list-add-area .inline-input {
  margin-top: 0;
}

.todo-group {
  padding: 0 20px;
}

.group-header {
  padding: 12px 0 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

/* ========== 习惯视图 ========== */
.view-habit {
  padding-bottom: 20px;
}

.habit-stats {
  padding: 16px 20px;
  font-size: 14px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-divider);
}

.habit-add-area {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-divider);
}

.habit-icon-input {
  width: 48px;
  padding: 8px;
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  font-size: 18px;
  text-align: center;
  color: var(--color-text-primary);
  outline: none;
}

.habit-name-input {
  flex: 1;
  margin-top: 0;
}

.habit-list {
  padding: 0 20px;
}

.habit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-divider);
}

.habit-item:last-child {
  border-bottom: none;
}

.habit-check {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--color-border-divider);
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-text-tertiary);
  padding: 0;
  flex-shrink: 0;
  transition: all 0.2s;
}

.habit-check.checked {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: #fff;
}

.habit-name {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .nav-content {
    height: 56px;
    padding: 0 14px;
  }

  .week-text {
    font-size: 15px;
  }

  .sub-tabs {
    gap: 12px;
  }

  .sub-tab {
    font-size: 13px;
  }

  .item-row {
    min-height: 72px;
    padding: 0 16px;
  }

  .day-number {
    font-size: 18px;
  }

  .expanded-content {
    padding: 8px 16px 14px;
  }
}
</style>
