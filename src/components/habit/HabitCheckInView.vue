<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useHabitStore } from '@/store/modules/habitStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import {
  getTodayDate,
  getMonthKey,
  addMonths,
  formatMonthLabel,
  getMonthDates,
} from '@/utils/date'
import HabitCalendar from './HabitCalendar.vue'

/**
 * 习惯打卡视图
 * - 点击空白处就地创建新习惯
 * - 每个习惯可展开/折叠当月日历
 * - 选中日期后需点确认按钮完成打卡/取消打卡
 */
const habitStore = useHabitStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/** 今天日期字符串 */
const today = getTodayDate()

/** 当前展开的习惯 id（同时只展开一个，null 表示全收起） */
const expandedHabitId = ref<string | null>(null)

/** 当前选中的日期字符串（默认今天） */
const selectedDate = ref<string>(today)

/** 习惯月历所在月份键 */
const habitMonth = ref<string>(getMonthKey())

/** 正在创建新习惯的输入状态 */
const creatingHabit = ref<boolean>(false)

/** 新习惯名称输入文本 */
const newHabitName = ref<string>('')

/** 新习惯图标输入文本 */
const newHabitIcon = ref<string>('')

/** 名称输入框 DOM 引用 */
const nameInputRef = ref<HTMLInputElement | null>(null)

/** 当前展开月份的所有日期字符串数组 */
const monthDates = computed<string[]>(() => getMonthDates(`${habitMonth.value}-01`))

/** 当前月份中文展示 */
const monthLabel = computed<string>(() => formatMonthLabel(habitMonth.value))

/**
 * 获取某习惯本月打卡日期数组
 * @param habitId - 习惯 id
 * @returns 本月已打卡日期字符串数组
 */
function getMonthCheckIns(habitId: string): string[] {
  const habit = habitStore.habits.find(h => h.id === habitId)
  if (!habit) return []
  // 过滤出当月的打卡日期
  const monthSet = new Set(monthDates.value)
  return habit.checkIns.filter(d => monthSet.has(d))
}

/**
 * 判断某习惯某日是否已打卡
 * @param habitId - 习惯 id
 * @param date - 日期字符串
 * @returns 是否已打卡
 */
function isHabitCheckedIn(habitId: string, date: string): boolean {
  return getMonthCheckIns(habitId).includes(date)
}

/**
 * 切换习惯展开/折叠状态
 * @param habitId - 习惯 id
 */
function toggleExpand(habitId: string): void {
  if (expandedHabitId.value === habitId) {
    expandedHabitId.value = null
  } else {
    expandedHabitId.value = habitId
    // 默认选中今天
    selectedDate.value = today
    habitMonth.value = getMonthKey()
  }
}

/**
 * 点击日历单元格
 * @param date - 日期字符串
 */
function handleCellClick(date: string): void {
  selectedDate.value = date
}

/**
 * 确认打卡某习惯的选中日期
 * 若已打卡则取消，未打卡则打卡
 * @param habitId - 习惯 id
 */
function handleConfirmCheckIn(habitId: string): void {
  if (!selectedDate.value) return
  habitStore.toggleCheckIn(habitId, selectedDate.value)
}

/**
 * 切换月历到上一个月
 */
function goPrevMonth(): void {
  habitMonth.value = addMonths(habitMonth.value, -1)
  // 当月日期改变后选中日期失效，重置为今天
  selectedDate.value = today
}

/**
 * 切换月历到下一个月
 */
function goNextMonth(): void {
  habitMonth.value = addMonths(habitMonth.value, 1)
  selectedDate.value = today
}

/**
 * 回到本月
 */
function goThisMonth(): void {
  habitMonth.value = getMonthKey()
  selectedDate.value = today
}

/** 是否本月 */
const isCurrentMonth = computed<boolean>(() => habitMonth.value === getMonthKey())

/**
 * 获取某习惯本月打卡率
 * @param habitId - 习惯 id
 * @returns 打卡率百分比 (0-100)
 */
function getProgress(habitId: string): number {
  const habit = habitStore.habits.find(h => h.id === habitId)
  if (!habit) return 0
  const monthSet = new Set(monthDates.value)
  const total = monthDates.value.filter(d => d <= today).length
  if (total === 0) return 0
  const done = habit.checkIns.filter(d => monthSet.has(d) && d <= today).length
  return Math.round((done / total) * 100)
}

/**
 * 开始创建新习惯（点击空白处触发）
 */
async function startCreateHabit(): Promise<void> {
  if (creatingHabit.value) {
    nameInputRef.value?.focus()
    return
  }
  creatingHabit.value = true
  newHabitName.value = ''
  newHabitIcon.value = ''
  await nextTick()
  nameInputRef.value?.focus()
}

/**
 * 确认创建新习惯
 */
function confirmCreateHabit(): void {
  const name = newHabitName.value.trim()
  if (!name) {
    creatingHabit.value = false
    return
  }
  const icon = newHabitIcon.value.trim() || '🎯'
  habitStore.createHabit(name, icon)
  creatingHabit.value = false
  newHabitName.value = ''
  newHabitIcon.value = ''
}

/**
 * 取消创建新习惯
 */
function cancelCreateHabit(): void {
  creatingHabit.value = false
  newHabitName.value = ''
  newHabitIcon.value = ''
}

/**
 * 删除习惯（二次确认）
 * @param habitId - 习惯 id
 */
async function handleDeleteHabit(habitId: string): Promise<void> {
  const habit = habitStore.habits.find(h => h.id === habitId)
  const name = habit?.name ?? '该习惯'
  const ok = await confirmStore.confirm({
    title: '删除习惯',
    message: `确认删除「${name}」及其全部打卡记录吗？删除后无法恢复。`,
  })
  if (!ok) return
  if (expandedHabitId.value === habitId) {
    expandedHabitId.value = null
  }
  habitStore.deleteHabit(habitId)
}
</script>

<template>
  <div class="check-in-view">
    <!-- 习惯列表区域 -->
    <div class="habit-list" @click="startCreateHabit">
      <div
        v-for="habit in habitStore.habits"
        :key="habit.id"
        class="habit-card"
        @click.stop
      >
        <!-- 习惯头部：图标 + 名称 + 统计 + 操作 -->
        <div class="habit-head" @click="toggleExpand(habit.id)">
          <span class="habit-icon">{{ habit.icon || '🎯' }}</span>
          <span class="habit-name">{{ habit.name }}</span>
          <span class="habit-stat">{{ getProgress(habit.id) }}%</span>
          <button
            class="habit-expand"
            :class="{ open: expandedHabitId === habit.id }"
            @click.stop="toggleExpand(habit.id)"
            aria-label="展开日历"
          >‹</button>
          <button
            class="habit-delete"
            @click.stop="handleDeleteHabit(habit.id)"
            aria-label="删除习惯"
          >✕</button>
        </div>

        <!-- 展开的月历 + 确认打卡 -->
        <div v-if="expandedHabitId === habit.id" class="habit-calendar-wrap" @click.stop>
          <!-- 月份导航 -->
          <div class="cal-month-nav">
            <button class="cal-nav-btn" @click="goPrevMonth">‹</button>
            <span class="cal-month-label">{{ monthLabel }}</span>
            <button class="cal-nav-btn" @click="goNextMonth">›</button>
            <button
              v-if="!isCurrentMonth"
              class="cal-today-btn"
              @click="goThisMonth"
            >本月</button>
          </div>

          <!-- 月历 -->
          <HabitCalendar
            :month-dates="monthDates"
            :check-ins="getMonthCheckIns(habit.id)"
            :today="today"
            @toggle-date="handleCellClick"
          />

          <!-- 选中日期 + 确认按钮 -->
          <div class="confirm-row">
            <span class="selected-text">
              {{ selectedDate || '请选择日期' }}
              <span
                v-if="selectedDate && isHabitCheckedIn(habit.id, selectedDate)"
                class="checked-tag"
              >已打卡</span>
            </span>
            <button
              class="confirm-btn"
              :class="{ cancel: selectedDate && isHabitCheckedIn(habit.id, selectedDate) }"
              :disabled="!selectedDate"
              @click="handleConfirmCheckIn(habit.id)"
            >
              {{ selectedDate && isHabitCheckedIn(habit.id, selectedDate) ? '取消打卡' : '确认打卡' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 就地创建新习惯 -->
      <div v-if="creatingHabit" class="habit-card creating" @click.stop>
        <div class="habit-create-row">
          <input
            ref="nameInputRef"
            v-model="newHabitName"
            class="create-input name-input"
            placeholder="习惯名称（如：早起喝水）"
            @keyup.enter="confirmCreateHabit"
            @keyup.esc="cancelCreateHabit"
          />
          <input
            v-model="newHabitIcon"
            class="create-input icon-input"
            placeholder="🎯"
            maxlength="2"
          />
          <button class="create-confirm" @click="confirmCreateHabit">确认</button>
          <button class="create-cancel" @click="cancelCreateHabit">取消</button>
        </div>
      </div>

      <!-- 空状态 + 新建提示 -->
      <div v-if="habitStore.habits.length === 0 && !creatingHabit" class="empty-state">
        <span class="empty-icon">🎯</span>
        <p class="empty-text">点击此处创建第一个习惯</p>
      </div>

      <!-- 底部空白创建引导（已有习惯时） -->
      <div
        v-if="habitStore.habits.length > 0 && !creatingHabit"
        class="bottom-create-hint"
      >
        + 点击空白处新增习惯
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 视图根容器 */
.check-in-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* 习惯列表区（点击空白处创建） */
.habit-list {
  flex: 1;
  padding: 12px 16px 16px;
  cursor: text;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 单个习惯卡片 */
.habit-card {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  overflow: hidden;
}

.habit-card.creating {
  background: var(--color-bg-surface);
  border-style: dashed;
  border-color: var(--color-text-tertiary);
}

/* 卡片头部 */
.habit-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
}

.habit-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.habit-name {
  flex: 1;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  word-break: break-word;
}

.habit-stat {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.habit-expand {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  transform: rotate(-90deg);
  transition: transform 0.2s;
  padding: 0;
}

.habit-expand.open {
  transform: rotate(90deg);
}

.habit-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.habit-card:hover .habit-delete {
  opacity: 1;
}

.habit-delete:hover {
  color: #BF6060;
}

/* 月历折叠区 */
.habit-calendar-wrap {
  padding: 8px 14px 14px;
  border-top: 1px solid var(--color-border-divider);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 月份导航 */
.cal-month-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  position: relative;
}

.cal-nav-btn {
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

.cal-month-label {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.cal-today-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-text-primary);
  border-radius: 12px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* 选中日期 + 确认按钮 */
.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
}

.selected-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.checked-tag {
  padding: 1px 8px;
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border-radius: 8px;
  font-size: 11px;
}

.confirm-btn {
  padding: 6px 16px;
  border: 1px solid var(--color-text-primary);
  border-radius: 8px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  transition: opacity 0.2s;
}

.confirm-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.confirm-btn.cancel {
  background: transparent;
  color: #BF6060;
  border-color: #BF6060;
}

/* 就地创建新习惯 */
.habit-create-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}

.create-input {
  border: none;
  background: transparent;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  padding: 4px 0;
}

.create-input::placeholder {
  color: var(--color-text-tertiary);
}

.name-input {
  flex: 1;
}

.icon-input {
  width: 36px;
  text-align: center;
}

.create-confirm {
  padding: 6px 14px;
  border: 1px solid var(--color-text-primary);
  border-radius: 8px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

.create-cancel {
  padding: 6px 14px;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  opacity: 0.5;
}

.empty-text {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0;
}

/* 底部创建提示 */
.bottom-create-hint {
  text-align: center;
  padding: 16px 8px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  border: 1px dashed var(--color-border-divider);
  border-radius: 8px;
  background: transparent;
  margin-top: 4px;
}
</style>
