<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useHabitStore } from '@/store/modules/habitStore'
import { useDiaryStore } from '@/store/modules/diaryStore'
import { useMonthlyTaskStore } from '@/store/modules/monthlyTaskStore'
import { useWeightStore } from '@/store/modules/weightStore'
import { useFinanceStore } from '@/store/modules/financeStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import HabitCheckInView from '@/components/habit/HabitCheckInView.vue'
import HabitFinanceView from '@/components/habit/HabitFinanceView.vue'
import HabitWeightView from '@/components/habit/HabitWeightView.vue'
import InspirationView from '@/views/InspirationView.vue'
import AddToNotebookButton from '@/components/common/AddToNotebookButton.vue'
import {
  getTodayDate,
  addDays,
  parseDate,
  getWeekDay,
  getWeekDates,
  getMondayOfWeek,
  getWeekNumber,
  getWeekRangeText,
  formatMonthLabel,
} from '@/utils/date'
import type { Todo } from '@/types/todo'
import type { MonthlyTask } from '@/types/monthlyTask'

const todoStore = useTodoStore()
const habitStore = useHabitStore()
const diaryStore = useDiaryStore()
const monthlyTaskStore = useMonthlyTaskStore()
const weightStore = useWeightStore()
const financeStore = useFinanceStore()
const confirmStore = useConfirmStore()

/**
 * 子标签类型
 */
type SubTab = 'week' | 'record' | 'list' | 'habit'

/**
 * 习惯子标签类型（打卡/理财/减重）
 */
type HabitSubTab = 'checkin' | 'finance' | 'weight'

/**
 * 单个日期行的数据结构（周视图用）
 * @property date - 日期字符串
 * @property dayNumber - 日期数字
 * @property weekday - 星期几
 * @property todos - 该天任务列表
 * @property isToday - 是否今天
 */
interface DayRow {
  date: string
  dayNumber: number
  weekday: string
  todos: Todo[]
  isToday: boolean
}

/**
 * 正在创建中的新任务状态
 * @property key - 唯一标识（区分来源：date 日期 或 month 月份 或 'diary'）
 * @property text - 输入中文本
 * @property color - 标签颜色（可选，空字符串表示用默认墨色），仅 date 任务用
 */
interface EditingTask {
  key: string
  text: string
  color?: string
}

// ========== 状态 ==========

/**
 * 任务可选颜色调色板（value 为空字符串表示用默认墨色）
 * 创建待办时可选择一个，完成任务后圆点填充该颜色、文字加横线
 */
const TODO_COLORS: { value: string; label: string }[] = [
  { value: '', label: '墨' },
  { value: '#E07A5F', label: '珊瑚' },
  { value: '#E09553', label: '橙' },
  { value: '#6B9080', label: '青' },
  { value: '#5B8DBE', label: '蓝' },
  { value: '#8B7AB8', label: '紫' },
]

/** 当前激活的子标签（周/记录/清单/习惯） */
const activeSubTab = ref<SubTab>('week')

/** 当前激活的习惯子标签（打卡/理财/减重），默认打卡 */
const activeHabitSubTab = ref<HabitSubTab>('checkin')

/** 当前所在周的锚定日期（默认今天） */
const currentAnchor = ref<string>(getTodayDate())

/** 周选择器下拉面板是否展开 */
const weekDropdownOpen = ref<boolean>(false)

/** 当前正在创建/编辑的新任务（null 表示无） */
const editingTask = ref<EditingTask | null>(null)

/** 编辑输入框的 DOM 引用 */
const editInputRef = ref<HTMLInputElement | null>(null)

/** 日记编辑是否手动修改过（用于提示） */
const diaryModified = ref<boolean>(false)

/** 右下角清单抽屉是否展开 */
const drawerOpen = ref<boolean>(false)

/** 灵感模块视图是否打开（全屏覆盖） */
const inspirationOpen = ref<boolean>(false)

/**
 * 收集月度清单摘要（用于添加到手账）
 * 本月清单无任务时返回 null（不添加）
 * @returns 摘要内容或 null
 */
function collectMonthlyList(): { content: string } | null {
  const tasks = monthlyTaskStore.monthTasks
  if (tasks.length === 0) return null
  const doneCount = tasks.filter(t => t.done).length
  const lines = tasks.map(t => `${t.done ? '✓' : '○'} ${t.text}`)
  return {
    content: `本月完成 ${doneCount}/${tasks.length}\n${lines.join('\n')}`,
  }
}

/** 记录视图：日期选择器是否展开 */
const diaryDatePickerShow = ref<boolean>(false)

// ========== 计算属性 ==========

/** 当前周的 7 天日期数组（周一到周日正序） */
const currentWeekDates = computed<string[]>(() => getWeekDates(currentAnchor.value))

/** 当前周是今年的第几周 */
const currentWeekNumber = computed<number>(() => getWeekNumber(currentAnchor.value))

/** 当前周的年份 */
const currentYear = computed<number>(() => parseDate(getMondayOfWeek(currentAnchor.value)).getFullYear())

/** 当前周的日期范围文本 */
const weekRangeText = computed<string>(() => getWeekRangeText(currentAnchor.value))

/** 是否是本周 */
const isCurrentWeek = computed<boolean>(() => getMondayOfWeek(currentAnchor.value) === getMondayOfWeek(getTodayDate()))

/** 周视图：当前周的日期行数据 */
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

/** 清单视图：当前月任务列表 */
const monthTasks = computed(() => monthlyTaskStore.monthTasks)

/** 清单视图：月份统计 */
const monthStats = computed(() => ({
  done: monthlyTaskStore.monthDoneCount,
  total: monthlyTaskStore.monthTotalCount,
}))

/** 清单视图：当前月份中文展示 */
const monthLabel = computed<string>(() => formatMonthLabel(monthlyTaskStore.currentMonth))

/** 清单视图：是否本月 */
const isCurrentMonth = computed<boolean>(() => monthlyTaskStore.isCurrentMonth)

/** 日记：今日字数 */
const diaryWordCount = computed<number>(() => diaryStore.draftContent.length)

// ========== 方法：周导航 ==========

/** 切换到上一周 */
function goPrevWeek(): void {
  currentAnchor.value = addDays(currentAnchor.value, -7)
  weekDropdownOpen.value = false
}

/** 切换到下一周 */
function goNextWeek(): void {
  currentAnchor.value = addDays(currentAnchor.value, 7)
  weekDropdownOpen.value = false
}

/** 回到本周 */
function goThisWeek(): void {
  currentAnchor.value = getTodayDate()
  weekDropdownOpen.value = false
}

/** 切换周下拉面板 */
function toggleWeekDropdown(): void {
  weekDropdownOpen.value = !weekDropdownOpen.value
}

// ========== 方法：月份导航（清单） ==========

/** 清单切换到上个月 */
function goPrevMonth(): void {
  monthlyTaskStore.goPrevMonth()
}

/** 清单切换到下个月 */
function goNextMonth(): void {
  monthlyTaskStore.goNextMonth()
}

/** 清单回到本月 */
function goThisMonth(): void {
  monthlyTaskStore.goThisMonth()
}

// ========== 方法：子标签切换 ==========

/**
 * 切换子标签（切换时清空正在编辑的任务）
 * @param tab - 目标子标签
 */
function switchSubTab(tab: SubTab): void {
  commitEditingTask()
  activeSubTab.value = tab
  // 切换到记录视图时加载今日日记草稿
  if (tab === 'record') {
    diaryStore.goToToday()
    diaryModified.value = false
  }
}

// ========== 方法：任务创建（点击即创建 + 就地输入） ==========

/**
 * 在某天开始创建新待办任务
 * @param date - 日期字符串
 */
async function startEditDate(date: string): Promise<void> {
  if (editingTask.value && editingTask.value.key !== date) {
    commitEditingTask()
  }
  if (editingTask.value && editingTask.value.key === date) {
    editInputRef.value?.focus()
    return
  }
  editingTask.value = { key: date, text: '', color: '' }
  await nextTick()
  editInputRef.value?.focus()
}

/**
 * 在清单开始创建新月度任务
 */
async function startEditMonth(): Promise<void> {
  const key = `month:${monthlyTaskStore.currentMonth}`
  if (editingTask.value && editingTask.value.key !== key) {
    commitEditingTask()
  }
  if (editingTask.value && editingTask.value.key === key) {
    editInputRef.value?.focus()
    return
  }
  editingTask.value = { key, text: '' }
  await nextTick()
  editInputRef.value?.focus()
}

/**
 * 提交正在编辑的任务（回车）：有内容则按来源保存
 */
function commitEditingTask(): void {
  if (!editingTask.value) return
  const text = editingTask.value.text.trim()
  if (text) {
    if (editingTask.value.key.startsWith('month:')) {
      monthlyTaskStore.addTask(text)
    } else {
      // 按日期创建待办，带上用户选定的颜色
      todoStore.addTodo(text, editingTask.value.key, editingTask.value.color)
    }
  }
  editingTask.value = null
}

/**
 * 计算任务圆点的内联样式（用用户选定的颜色）
 * 未设颜色时返回空对象，让 CSS class 走默认墨色
 * @param todo - 待办事项
 * @returns CSS 样式对象
 */
function getTodoDotStyle(todo: Todo): Record<string, string> {
  if (!todo.color) return {}
  return {
    borderColor: todo.color,
    background: todo.done ? todo.color : 'transparent',
  }
}

/** 放弃正在编辑的任务（ESC） */
function cancelEditingTask(): void {
  editingTask.value = null
}

/** 编辑输入框失焦：空则丢弃，有内容则保存 */
/**
 * 失焦时提交正在编辑的任务（复用回车提交逻辑，保证颜色等参数一致不丢失）
 */
function handleEditBlur(): void {
  commitEditingTask()
}

/**
 * 设置正在编辑任务的标签颜色（供颜色选择器调用）
 * @param color - 颜色值，空字符串表示用默认墨色
 */
function setEditColor(color: string): void {
  if (editingTask.value) {
    editingTask.value.color = color
  }
}

/** 判断某日期是否正在创建新待办 */
function isEditingDate(date: string): boolean {
  return editingTask.value?.key === date
}

/** 判断清单是否正在创建新月度任务 */
function isEditingMonth(): boolean {
  return editingTask.value?.key === `month:${monthlyTaskStore.currentMonth}`
}

// ========== 方法：任务操作 ==========

/** 切换待办完成状态 */
function handleToggleTodo(id: string): void {
  todoStore.toggleTodo(id)
}

/**
 * 删除待办（二次确认）
 * @param id - 待办 id
 */
async function handleDeleteTodo(id: string): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除待办',
    message: '确认删除这条待办任务吗？删除后无法恢复。',
  })
  if (!ok) return
  todoStore.deleteTodo(id)
}

/**
 * 切换月度任务完成状态（二次确认后划掉）
 * @param id - 月度任务 id
 */
async function handleToggleMonthTask(id: string): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '划掉月度任务',
    message: '确认划掉这条月度任务吗？',
    danger: false,
  })
  if (!ok) return
  monthlyTaskStore.toggleTask(id)
}

/**
 * 将月度任务加入今日代办（二次确认）
 * @param task - 月度任务
 */
async function handleAddMonthTaskToToday(task: MonthlyTask): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '加入今日代办',
    message: `是否将「${task.text}」加入今天的代办中？`,
    danger: false,
  })
  if (!ok) return
  todoStore.addTodo(task.text, getTodayDate())
}

/**
 * 删除月度任务（二次确认）
 * @param id - 月度任务 id
 */
async function handleDeleteMonthTask(id: string): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除月度任务',
    message: '确认删除这条月度任务吗？删除后无法恢复。',
  })
  if (!ok) return
  monthlyTaskStore.deleteTask(id)
}

// ========== 方法：日记 ==========

/**
 * 日记输入变更（标记已修改）
 */
function onDiaryInput(): void {
  diaryModified.value = true
}

/**
 * 保存当前日记（二次确认：编辑的不是今天的日记时提醒用户）
 */
async function handleSaveDiary(): Promise<void> {
  const isEditingToday = diaryStore.currentDate === getTodayDate()
  // 编辑非今天的日记时，先弹二次确认提醒用户
  if (!isEditingToday) {
    const ok = await confirmStore.confirm({
      title: '保存非今日日记',
      message: `你正在保存 ${diaryStore.currentDate} 的日记，而不是今天（${getTodayDate()}）。\n确认仍保存到 ${diaryStore.currentDate} 吗？`,
      confirmText: '确认保存',
      cancelText: '再想想',
    })
    if (!ok) return
  }
  diaryStore.saveCurrentDiary()
  diaryModified.value = false
}

/**
 * 删除当前日记（二次确认）
 */
async function handleDeleteDiary(): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除日记',
    message: `确认删除 ${diaryStore.currentDate} 的日记吗？删除后无法恢复。`,
  })
  if (!ok) return
  diaryStore.deleteCurrentDiary()
  diaryModified.value = false
}

// ========== 方法：清单抽屉 ==========

/** 切换右下角清单抽屉 */
function toggleDrawer(): void {
  commitEditingTask()
  drawerOpen.value = !drawerOpen.value
}

// 组件挂载时加载数据
onMounted(() => {
  todoStore.loadTodos()
  habitStore.loadHabits()
  diaryStore.loadDiaries()
  monthlyTaskStore.loadTasks()
  weightStore.loadWeight()
  financeStore.loadFinance()
})

/**
 * 监听来自手账双击日期的跳转请求
 * 手账组件写入 diaryStore.pendingOpenRecordDate 后，
 * 这里响应：切到记录子标签 + 跳到目标日期 + 清 pending
 */
watch(
  () => diaryStore.pendingOpenRecordDate,
  (targetDate) => {
    if (!targetDate) return
    // 直接设置子标签为 record，不走 switchSubTab（避免它 goToToday 覆盖目标日期）
    commitEditingTask()
    activeSubTab.value = 'record'
    diaryStore.goToDate(targetDate)
    diaryModified.value = false
    // 消费完毕，清空 pending，避免重复触发
    diaryStore.pendingOpenRecordDate = null
  },
)
</script>

<template>
  <div class="schedule-view">
    <!-- 顶部导航栏（藕灰背景） -->
    <header class="top-nav">
      <div class="nav-content">
        <!-- 左侧：周选择器（仅在周视图显示） -->
        <button v-if="activeSubTab === 'week'" class="week-selector" @click="toggleWeekDropdown">
          <span class="week-text">第 {{ currentWeekNumber }} 周</span>
          <svg class="dropdown-arrow" :class="{ open: weekDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <!-- 其他视图显示对应标题 -->
        <span v-else class="week-text">{{ activeSubTab === 'record' ? '今日记录' : activeSubTab === 'list' ? '月度清单' : '习惯' }}</span>

        <!-- 右侧：四个子标签 -->
        <nav class="sub-tabs">
          <button class="sub-tab" :class="{ active: activeSubTab === 'week' }" @click="switchSubTab('week')">周</button>
          <span class="tab-divider">|</span>
          <button class="sub-tab" :class="{ active: activeSubTab === 'record' }" @click="switchSubTab('record')">记录</button>
          <span class="tab-divider">|</span>
          <button class="sub-tab" :class="{ active: activeSubTab === 'list' }" @click="switchSubTab('list')">清单</button>
          <span class="tab-divider">|</span>
          <button class="sub-tab" :class="{ active: activeSubTab === 'habit' }" @click="switchSubTab('habit')">习惯</button>
        </nav>
      </div>

      <!-- 周选择器下拉面板 -->
      <div v-if="weekDropdownOpen && activeSubTab === 'week'" class="week-dropdown">
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

    <!-- 主内容区（四视图切换） -->
    <div class="main-body">
      <!-- ========== 周视图：日期 + 待办（全部展开不折叠） ========== -->
      <div v-show="activeSubTab === 'week'" class="view-week">
        <div
          v-for="row in dayRows"
          :key="row.date"
          class="day-block day-card"
          :class="{ today: row.isToday }"
          :data-today="row.isToday || undefined"
          data-guide="day-card"
        >
          <!-- 日期标题行 -->
          <div class="day-header">
            <div class="date-block">
              <span class="day-number">{{ row.dayNumber }}</span>
              <div class="separator-line"></div>
              <span class="day-of-week">{{ row.weekday }}</span>
            </div>
            <span v-if="row.todos.length > 0" class="day-count">
              {{ row.todos.filter(t => t.done).length }}/{{ row.todos.length }}
            </span>
            <span v-else-if="row.isToday" class="today-tag">今天</span>
          </div>

          <!-- 任务列表（全部展开，点击空白处创建） -->
          <div class="day-todos" @click="startEditDate(row.date)">
            <div
              v-for="todo in row.todos"
              :key="todo.id"
              class="todo-item"
              :class="{ completed: todo.done }"
              @click.stop
            >
              <button class="todo-dot" :class="{ filled: todo.done }" :style="getTodoDotStyle(todo)" @click="handleToggleTodo(todo.id)"></button>
              <span class="todo-text">{{ todo.text }}</span>
              <button class="delete-btn" @click="handleDeleteTodo(todo.id)">✕</button>
            </div>

            <!-- 正在创建的新任务 -->
            <div v-if="isEditingDate(row.date)" class="todo-item editing" @click.stop>
              <span class="todo-dot" :style="{ borderColor: editingTask!.color || 'var(--color-text-primary)' }"></span>
              <input
                ref="editInputRef"
                v-model="editingTask!.text"
                @keyup.enter="commitEditingTask"
                @keyup.esc="cancelEditingTask"
                @blur="handleEditBlur"
                placeholder="写待办..."
                class="edit-input inline-input"
                data-guide="task-input"
              />
              <!-- 颜色选择器：点击选色，影响圆点与完成态填充色 -->
              <div class="color-picker" @mousedown.prevent @click.stop>
                <button
                  v-for="c in TODO_COLORS"
                  :key="c.value"
                  class="color-dot"
                  :class="{ active: (editingTask!.color || '') === c.value }"
                  :style="c.value ? { background: c.value } : { background: 'var(--color-text-primary)' }"
                  :title="c.label"
                  @click.stop="setEditColor(c.value)"
                ></button>
              </div>
            </div>

            <!-- 空提示：当天无任务时显示创建入口 -->
            <div v-if="row.todos.length === 0 && !isEditingDate(row.date)" class="empty-tip">
              点击此处创建任务
            </div>

            <!-- 已有任务时，下方额外提供一个明确的"继续添加"入口，避免用户找不到点击处 -->
            <div
              v-if="row.todos.length > 0 && !isEditingDate(row.date)"
              class="continue-add-tip"
              @click.stop="startEditDate(row.date)"
            >
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 记录视图：纯日记 ========== -->
      <div v-show="activeSubTab === 'record'" class="view-record">
        <!-- 日期导航：快捷按钮 + 日期显示 + 日期选择器 -->
        <div class="diary-nav">
          <div class="diary-nav-left">
            <button class="diary-quick-btn" @click="diaryStore.navigateDate('prev')">昨天</button>
            <button
              class="diary-quick-btn today"
              :disabled="diaryStore.currentDate === getTodayDate()"
              @click="diaryStore.goToToday()"
            >今天</button>
            <button class="diary-quick-btn" @click="diaryStore.navigateDate('next')">明天</button>
          </div>
          <div class="diary-nav-center">
            <button class="diary-date-btn" @click="diaryDatePickerShow = !diaryDatePickerShow">
              <span class="diary-date">{{ diaryStore.currentDate }}</span>
              <svg class="diary-date-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <!-- 日期选择器下拉 -->
            <div v-if="diaryDatePickerShow" class="diary-date-picker" @click.stop>
              <input
                type="date"
                :value="diaryStore.currentDate"
                @change="(e: Event) => {
                  const el = e.target as HTMLInputElement;
                  if (el.value) diaryStore.goToDate(el.value);
                  diaryDatePickerShow = false;
                }"
                class="diary-native-date"
              />
              <button class="diary-picker-close" @click="diaryDatePickerShow = false">关闭</button>
            </div>
          </div>
          <div class="diary-nav-right">
            <!-- 非今天时显示醒目提示 + 一键回到今天 -->
            <span
              v-if="diaryStore.currentDate !== getTodayDate()"
              class="diary-not-today-tag"
              title="当前查看的不是今天的日记"
            >📌 非今日</span>
          </div>
        </div>

        <!-- 日记编辑区 -->
        <textarea
          v-model="diaryStore.draftContent"
          @input="onDiaryInput"
          :placeholder="diaryStore.currentDate === getTodayDate() ? '✍️ 写下今日想法...' : `✍️ 写下 ${diaryStore.currentDate} 的想法...`"
          class="diary-textarea"
        ></textarea>

        <!-- 字数与操作 -->
        <div class="diary-footer">
          <span class="word-count">{{ diaryWordCount }} 字</span>
          <div class="diary-actions">
            <button v-if="diaryStore.hasCurrentDiary" class="diary-action-btn danger" @click="handleDeleteDiary">删除</button>
            <button
              class="diary-action-btn"
              :class="{
                modified: diaryModified,
                'non-today': diaryStore.currentDate !== getTodayDate()
              }"
              @click="handleSaveDiary"
            >
              {{ diaryStore.currentDate === getTodayDate() ? '保存' : `保存到 ${diaryStore.currentDate}` }}
            </button>
          </div>
        </div>
        <!-- 保存提示 -->
        <Transition name="toast">
          <div v-if="diaryStore.savedHint" class="diary-hint">{{ diaryStore.savedHint }}</div>
        </Transition>
      </div>

      <!-- ========== 清单视图：月度任务 ========== -->
      <div v-show="activeSubTab === 'list'" class="view-list">
        <!-- 月份导航 -->
        <div class="month-nav">
          <button class="month-nav-btn" @click="goPrevMonth">‹</button>
          <div class="month-center">
            <span class="month-label">{{ monthLabel }}</span>
            <span class="month-stats">{{ monthStats.done }}/{{ monthStats.total }}</span>
          </div>
          <button class="month-nav-btn" @click="goNextMonth">›</button>
          <button v-if="!isCurrentMonth" class="month-today-btn" @click="goThisMonth">本月</button>
        </div>

        <!-- 月度任务列表（点击空白创建） -->
        <div class="month-tasks" @click="startEditMonth">
          <div
            v-for="task in monthTasks"
            :key="task.id"
            class="todo-item"
            :class="{ completed: task.done }"
            @click.stop
          >
            <button class="todo-dot" :class="{ filled: task.done }" @click="handleToggleMonthTask(task.id)"></button>
            <span class="todo-text">{{ task.text }}</span>
            <button class="delete-btn" @click="handleDeleteMonthTask(task.id)">✕</button>
          </div>

          <!-- 正在创建的新月度任务 -->
          <div v-if="isEditingMonth()" class="todo-item editing" @click.stop>
            <span class="todo-dot"></span>
            <input
              ref="editInputRef"
              v-model="editingTask!.text"
              @keyup.enter="commitEditingTask"
              @keyup.esc="cancelEditingTask"
              @blur="handleEditBlur"
              placeholder="写月度任务..."
              class="edit-input"
            />
          </div>

          <!-- 空状态 -->
          <div v-if="monthTasks.length === 0 && !isEditingMonth()" class="empty-tip">
            点击此处创建月度任务
          </div>
        </div>
      </div>

      <!-- ========== 习惯视图：打卡/理财/减重 三子界面 ========== -->
      <div v-show="activeSubTab === 'habit'" class="view-habit">
        <!-- 习惯二级子标签：打卡/理财/减重 -->
        <nav class="habit-sub-tabs">
          <button
            class="habit-sub-tab"
            :class="{ active: activeHabitSubTab === 'checkin' }"
            @click="activeHabitSubTab = 'checkin'"
          >打卡</button>
          <span class="tab-divider">|</span>
          <button
            class="habit-sub-tab"
            :class="{ active: activeHabitSubTab === 'finance' }"
            @click="activeHabitSubTab = 'finance'"
          >理财</button>
          <span class="tab-divider">|</span>
          <button
            class="habit-sub-tab"
            :class="{ active: activeHabitSubTab === 'weight' }"
            @click="activeHabitSubTab = 'weight'"
          >减重</button>
        </nav>

        <!-- 三子界面切换（v-show 保留各子界面状态） -->
        <div v-show="activeHabitSubTab === 'checkin'" class="habit-sub-panel">
          <HabitCheckInView />
        </div>
        <div v-show="activeHabitSubTab === 'finance'" class="habit-sub-panel">
          <HabitFinanceView />
        </div>
        <div v-show="activeHabitSubTab === 'weight'" class="habit-sub-panel">
          <HabitWeightView />
        </div>
      </div>
    </div>

    <!-- 右下角浮动按钮组：清单抽屉箭头 + 灵感入口 -->
    <div class="float-btn-group">
      <!-- 灵感模块入口（💡 圆圈） -->
      <button
        class="inspiration-btn"
        @click="inspirationOpen = true"
        aria-label="打开灵感模块"
        title="灵感模块"
      >💡</button>
      <!-- 清单抽屉折叠箭头 -->
      <button
        class="drawer-toggle"
        :class="{ open: drawerOpen }"
        @click="toggleDrawer"
        :aria-label="drawerOpen ? '收起清单' : '展开清单'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="drawerOpen" points="9 6 15 12 9 18" />
          <polyline v-else points="15 6 9 12 15 18" />
        </svg>
      </button>
    </div>

    <!-- 灵感模块全屏视图 -->
    <InspirationView v-if="inspirationOpen" @close="inspirationOpen = false" />

    <!-- 清单抽屉（右侧滑出） -->
    <Teleport to="body">
      <Transition name="drawer-mask">
        <div v-if="drawerOpen" class="drawer-mask" @click="toggleDrawer"></div>
      </Transition>
      <Transition name="drawer-panel">
        <aside v-if="drawerOpen" class="drawer-panel">
          <!-- 抽屉头部 -->
          <div class="drawer-header">
            <div class="drawer-month-nav">
              <button class="drawer-nav-btn" @click="goPrevMonth">‹</button>
              <span class="drawer-month-label">{{ monthLabel }}</span>
              <button class="drawer-nav-btn" @click="goNextMonth">›</button>
            </div>
            <div class="drawer-header-actions">
              <AddToNotebookButton
                source="monthly-list"
                title="📋 月度清单"
                :date="getTodayDate()"
                :collect="collectMonthlyList"
                empty-hint="本月清单还没有任务，先去添加吧～"
              />
              <button class="drawer-close" @click="toggleDrawer">✕</button>
            </div>
          </div>

          <!-- 抽屉统计 -->
          <div class="drawer-stats">已完成 {{ monthStats.done }}/{{ monthStats.total }}</div>

          <!-- 抽屉任务列表 -->
          <div class="drawer-tasks" @click="startEditMonth">
            <div
              v-for="task in monthTasks"
              :key="task.id"
              class="todo-item"
              :class="{ completed: task.done }"
              @click.stop
            >
              <button class="todo-dot" :class="{ filled: task.done }" @click="handleAddMonthTaskToToday(task)"></button>
              <span class="todo-text" @click="handleAddMonthTaskToToday(task)">{{ task.text }}</span>
            </div>

            <div v-if="isEditingMonth()" class="todo-item editing" @click.stop>
              <span class="todo-dot"></span>
              <input
                ref="editInputRef"
                v-model="editingTask!.text"
                @keyup.enter="commitEditingTask"
                @keyup.esc="cancelEditingTask"
                @blur="handleEditBlur"
                placeholder="写月度任务..."
                class="edit-input"
              />
            </div>

            <div v-if="monthTasks.length === 0 && !isEditingMonth()" class="empty-tip">
              点击此处创建月度任务
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>
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
  position: relative;
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
  height: 56px;
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
  padding: 0;
}

.week-text {
  font-size: 15px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
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
  gap: 12px;
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

/* ========== 周视图：日期块（全部展开） ========== */
.day-block {
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-main);
}

.day-block.today {
  background: #fff;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px 4px;
}

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
  color: var(--color-text-secondary);
}

.day-count {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.today-tag {
  padding: 2px 10px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-size: 11px;
  border-radius: 10px;
}

/* 任务列表容器 */
.day-todos {
  padding: 4px 20px 12px;
  cursor: text;
}

/* ========== 通用任务项 ========== */
.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-divider);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item.completed .todo-text {
  /* 完成后文字保持原色不变浅，只加横线划掉 */
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  text-decoration-color: var(--color-text-secondary);
}

/* 圆点 */
.todo-dot {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-text-primary);
  background: transparent;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.2s;
}

/* 完成态：圆点填充（无自定义颜色时用默认墨色；有颜色时由内联 style 覆盖） */
.todo-dot.filled {
  background: var(--color-text-primary);
}

.todo-item.editing .todo-dot {
  border-style: dashed;
  border-color: var(--color-text-tertiary);
}

.todo-text {
  flex: 1;
  font-size: 15px;
  color: var(--color-text-primary);
  word-break: break-word;
  line-height: 1.4;
}

/* 抽屉清单：任务文本可点击加入今日代办 */
.drawer-tasks .todo-text {
  cursor: pointer;
}

/* ========== 颜色选择器（创建任务时选色） ========== */
.color-picker {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s, border-color 0.15s;
}

.color-dot:hover {
  transform: scale(1.12);
}

.color-dot.active {
  border-color: var(--color-text-primary);
  transform: scale(1.18);
}

.edit-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  padding: 0;
}

.edit-input::placeholder {
  color: var(--color-text-tertiary);
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
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #BF6060;
}

.empty-tip {
  text-align: center;
  padding: 12px 8px;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

/* 已有任务时的"继续添加代办"入口，始终可点击，消除找不到入口的问题 */
.continue-add-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.continue-add-tip:hover {
  background: rgba(78, 63, 55, 0.05);
  color: var(--color-text-secondary);
}

.continue-add-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1.5px solid var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: 3px;
}

.continue-add-text {
  flex: 1;
  min-width: 0;
  font-style: italic;
}

/* ========== 记录视图：日记 ========== */
.view-record {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 16px 16px;
  box-sizing: border-box;
}

.diary-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  position: relative;
  flex-wrap: wrap;
}

.diary-nav-left,
.diary-nav-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.diary-nav-center {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex: 1;
}

/* 昨天 / 今天 / 明天 快捷按钮 */
.diary-quick-btn {
  padding: 5px 12px;
  border: 1px solid var(--color-border-divider);
  border-radius: 14px;
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  transition: all 0.15s;
}

.diary-quick-btn:hover {
  border-color: var(--color-text-primary);
}

.diary-quick-btn.today {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: var(--color-bg-main);
}

.diary-quick-btn.today:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* 日期展示按钮（点击展开日期选择器） */
.diary-date-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid var(--color-border-divider);
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

.diary-date {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.diary-date-arrow {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

/* 日期选择器下拉 */
.diary-date-picker {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
}

.diary-native-date {
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  padding: 6px 10px;
  font-family: var(--font-family-sans);
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-main);
  outline: none;
}

.diary-picker-close {
  padding: 4px 10px;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* 非今日的醒目标记 */
.diary-not-today-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: #F5E0B8;
  color: #7C5C21;
  font-size: 11px;
  font-weight: var(--font-weight-medium);
}

.diary-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  background: #fff;
  padding: 14px;
  font-family: var(--font-family-sans);
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-primary);
  outline: none;
  resize: none;
  min-height: 200px;
  box-sizing: border-box;
}

.diary-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.diary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 4px 0;
}

.word-count {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.diary-actions {
  display: flex;
  gap: 8px;
}

.diary-action-btn {
  padding: 8px 18px;
  border: 1px solid var(--color-text-primary);
  border-radius: 8px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.diary-action-btn.modified {
  opacity: 1;
}

/* 非今日保存按钮：黄橙醒目色，二次提醒这是历史/未来日期保存 */
.diary-action-btn.non-today {
  background: #E09553;
  border-color: #E09553;
  color: #fff;
  opacity: 1;
}

.diary-action-btn.danger {
  background: transparent;
  color: #BF6060;
  border-color: #BF6060;
  opacity: 0.8;
}

.diary-hint {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 2000;
  pointer-events: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

/* ========== 清单视图：月度任务 ========== */
.view-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 20px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-divider);
}

.month-nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-divider);
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
}

.month-center {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
  justify-content: center;
}

.month-label {
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.month-stats {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.month-today-btn {
  padding: 4px 14px;
  border: 1px solid var(--color-text-primary);
  border-radius: 12px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

.month-tasks {
  padding: 4px 20px;
  cursor: text;
}

/* ========== 习惯视图：打卡/理财/减重 ========== */
.view-habit {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 习惯二级子标签栏 */
.habit-sub-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-divider);
  background: var(--color-bg-surface);
  flex-shrink: 0;
}

.habit-sub-tab {
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

.habit-sub-tab.active {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

/* 习惯子面板容器 */
.habit-sub-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ========== 右下角浮动按钮组（灵感入口 + 抽屉箭头） ========== */
.float-btn-group {
  position: fixed;
  right: 16px;
  bottom: 76px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.inspiration-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: #fff;
  border: 1px solid var(--color-border-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
  padding: 0;
  line-height: 1;
}

.inspiration-btn:hover {
  transform: scale(1.05);
}

/* ========== 右下角抽屉切换按钮 ========== */
.drawer-toggle {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
  padding: 0;
}

.drawer-toggle:hover {
  transform: scale(1.05);
}

.drawer-toggle svg {
  width: 20px;
  height: 20px;
}

/* ========== 清单抽屉 ========== */
.drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.drawer-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 80%;
  max-width: 360px;
  height: 100vh;
  background: var(--color-bg-main);
  z-index: 101;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
}

.drawer-mask-enter-active,
.drawer-mask-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-mask-enter-from,
.drawer-mask-leave-to {
  opacity: 0;
}

.drawer-panel-enter-active,
.drawer-panel-leave-active {
  transition: transform 0.25s ease;
}

.drawer-panel-enter-from,
.drawer-panel-leave-to {
  transform: translateX(100%);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border-divider);
}

.drawer-month-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-nav-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-divider);
  border-radius: var(--radius-full);
  background: var(--color-bg-main);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.drawer-month-label {
  font-size: 15px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.drawer-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

/* 抽屉头部右侧操作区（添加到手账 + 关闭） */
.drawer-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-stats {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-divider);
}

.drawer-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 4px 16px;
  cursor: text;
  -webkit-overflow-scrolling: touch;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .nav-content {
    height: 52px;
    padding: 0 14px;
  }

  .week-text {
    font-size: 14px;
  }

  .sub-tabs {
    gap: 10px;
  }

  .sub-tab {
    font-size: 13px;
  }

  .day-header {
    padding: 10px 16px 4px;
  }

  .day-todos {
    padding: 4px 16px 10px;
  }

  .day-number {
    font-size: 18px;
  }

  .month-nav {
    padding: 10px 16px;
  }

  .month-tasks {
    padding: 4px 16px;
  }

  .delete-btn {
    opacity: 0.4;
  }

  .float-btn-group {
    bottom: 72px;
    right: 12px;
  }
}
</style>
