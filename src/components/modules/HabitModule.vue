<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHabitStore } from '@/store/modules/habitStore'
import { useTodoStore } from '@/store/modules/todoStore'
import { getTodayDate, getWeekDates, formatChineseDate } from '@/utils/date'
import type { ModuleProps } from '@/types/module'

// 接收父组件传入的页面数据
const props = defineProps<ModuleProps>()

const habitStore = useHabitStore()
const todoStore = useTodoStore()

// 新习惯输入框
const newHabitName = ref<string>('')

// 本周日期数组
const weekDates = computed<string[]>(() => getWeekDates())

/**
 * 模块标题
 */
const moduleTitle = computed<string>(() => props.data?.title || '🎯 习惯打卡')

/**
 * 今日日期
 */
const today = computed<string>(() => getTodayDate())

/**
 * 本周日期展示（如：'一'、'二'）
 */
const weekDayLabels = computed<string[]>(() => {
  return weekDates.value.map(d => {
    const date = new Date(d)
    const day = date.getDay()
    return ['日', '一', '二', '三', '四', '五', '六'][day]
  })
})

/**
 * 本周日期的天数部分（如 '17'）
 */
const weekDayNumbers = computed<string[]>(() => {
  return weekDates.value.map(d => d.split('-')[2])
})

/**
 * 创建新习惯
 */
function handleCreateHabit(): void {
  if (!newHabitName.value.trim()) return
  habitStore.createHabit(newHabitName.value.trim())
  newHabitName.value = ''
}

/**
 * 切换某习惯某天的打卡状态
 * @param habitId - 习惯 id
 * @param date - 日期字符串
 */
function handleToggleCheckIn(habitId: string, date: string): void {
  habitStore.toggleCheckIn(habitId, date)
}

/**
 * 删除习惯
 * @param habitId - 习惯 id
 */
function handleDeleteHabit(habitId: string): void {
  if (confirm('确定删除该习惯吗？')) {
    habitStore.deleteHabit(habitId)
  }
}

/**
 * 判断某习惯某天是否已打卡
 * @param habitId - 习惯 id
 * @param date - 日期
 * @returns 是否已打卡
 */
function isCheckedIn(habitId: string, date: string): boolean {
  return habitStore.isCheckedIn(habitId, date)
}

/**
 * 获取习惯本月打卡率
 * @param habitId - 习惯 id
 * @returns 打卡率百分比
 */
function getHabitProgress(habitId: string): number {
  return habitStore.getHabitProgress(habitId)
}

/**
 * 任务 3.3：从今日任务创建习惯
 */
function createHabitFromTodos(): void {
  // 把今天的待办任务作为习惯创建
  const todos = todoStore.todayTodos
  if (todos.length === 0) {
    alert('今天还没有待办任务')
    return
  }
  const firstTodo = todos[0]
  habitStore.createHabit(firstTodo.text, '📌')
}

// 组件挂载时加载数据
onMounted(() => {
  habitStore.loadHabits()
  todoStore.loadTodos()
})
</script>

<template>
  <div class="habit-module notebook-page-module">
    <!-- 模块标题 -->
    <h3 class="module-title">{{ moduleTitle }}</h3>
    <p class="module-date">{{ formatChineseDate(today) }}</p>

    <!-- 新习惯输入区 -->
    <div class="habit-input-area">
      <input
        v-model="newHabitName"
        placeholder="✍️ 输入新习惯，如「每天阅读30分钟」"
        class="habit-input"
        @keyup.enter="handleCreateHabit"
      />
      <button class="create-btn" @click="handleCreateHabit">+</button>
    </div>

    <!-- 任务 3.3：从任务创建习惯快捷按钮 -->
    <button class="quick-create-btn" @click="createHabitFromTodos">
      🔗 从今日任务生成习惯
    </button>

    <!-- 本周日历表头 -->
    <div class="week-header">
      <div
        v-for="(label, index) in weekDayLabels"
        :key="index"
        class="week-day-label"
        :class="{ today: weekDates[index] === today }"
      >
        <span class="day-name">{{ label }}</span>
        <span class="day-num">{{ weekDayNumbers[index] }}</span>
      </div>
    </div>

    <!-- 习惯列表 -->
    <div class="habit-list">
      <div v-for="habit in habitStore.habits" :key="habit.id" class="habit-card">
        <!-- 习惯信息：图标、名称、进度环 -->
        <div class="habit-info">
          <span class="habit-icon">{{ habit.icon || '🎯' }}</span>
          <div class="habit-detail">
            <span class="habit-name">{{ habit.name }}</span>
            <span class="habit-progress-text">本月 {{ getHabitProgress(habit.id) }}%</span>
          </div>
          <!-- 圆环进度条 -->
          <div class="progress-ring">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="#F0E8D8"
                stroke-width="3"
              />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="#A8824F"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="81.68"
                :stroke-dashoffset="81.68 - (81.68 * getHabitProgress(habit.id)) / 100"
                transform="rotate(-90 16 16)"
              />
            </svg>
          </div>
          <!-- 删除按钮 -->
          <button class="delete-btn" @click="handleDeleteHabit(habit.id)">✕</button>
        </div>

        <!-- 本周打卡网格 -->
        <div class="check-in-grid">
          <div
            v-for="(date, index) in weekDates"
            :key="index"
            class="check-in-cell"
            :class="{
              'checked': isCheckedIn(habit.id, date),
              'today': date === today
            }"
            @click="handleToggleCheckIn(habit.id, date)"
          >
            {{ isCheckedIn(habit.id, date) ? '✓' : '○' }}
          </div>
        </div>
      </div>

      <!-- 空状态提示 -->
      <div v-if="habitStore.habits.length === 0" class="empty-tip">
        <p>🌱 还没有习惯，添加一个开始改变吧~</p>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="module-footer">
      <span>今日已打卡 {{ habitStore.todayCheckInCount }}/{{ habitStore.habitsCount }}</span>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: habitStore.todayProgress + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 模块整体容器 ========== */
.habit-module {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #FDF8F0;
  border-radius: 8px;
  padding: 16px 14px;
  box-sizing: border-box;
  overflow: hidden;
}

/* ========== 标题区 ========== */
.module-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  letter-spacing: 0.5px;
}

.module-date {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 输入区 ========== */
.habit-input-area {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.habit-input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #E8DFD3;
  border-radius: 8px;
  background: #FFFEF9;
  font-size: 13px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #5E4F3D;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.habit-input:focus {
  border-color: #C4A375;
}

.habit-input::placeholder {
  color: #B8A68E;
  font-size: 12px;
}

.create-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #8B6539;
}

/* 快捷创建按钮 */
.quick-create-btn {
  width: 100%;
  padding: 6px;
  margin-bottom: 12px;
  border: 1px dashed #C4A375;
  border-radius: 6px;
  background: transparent;
  color: #8B6539;
  font-size: 12px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-create-btn:hover {
  background: #FAF8F5;
}

/* ========== 本周日历表头 ========== */
.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
  padding: 6px 4px;
  background: #F5F0EA;
  border-radius: 6px;
}

.week-day-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.week-day-label.today .day-num {
  background: #A8824F;
  color: #FFF9F0;
  font-weight: 600;
}

.day-name {
  font-size: 11px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.day-num {
  display: inline-block;
  min-width: 18px;
  padding: 1px 4px;
  border-radius: 999px;
  font-size: 11px;
  color: #5E4F3D;
  font-family: 'Noto Serif SC', serif;
}

/* ========== 习惯列表 ========== */
.habit-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 4px;
}

.habit-list::-webkit-scrollbar {
  width: 3px;
}

.habit-list::-webkit-scrollbar-thumb {
  background: #D4C5B0;
  border-radius: 10px;
}

/* 习惯卡片 */
.habit-card {
  background: #FDF8F0;
  border: 1px solid #F0E8D8;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* 习惯信息行 */
.habit-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.habit-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.habit-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.habit-name {
  font-size: 13px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.habit-progress-text {
  font-size: 11px;
  color: #9C876C;
  font-family: 'Noto Serif SC', serif;
}

/* 删除按钮 */
.delete-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #B8A68E;
  font-size: 12px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.delete-btn:hover {
  background: #F5F0EA;
  color: #A05555;
}

/* 圆环进度条 */
.progress-ring {
  flex-shrink: 0;
}

/* 本周打卡网格 */
.check-in-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.check-in-cell {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E8DFD3;
  border-radius: 6px;
  font-size: 14px;
  color: #B8A68E;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.check-in-cell:hover {
  border-color: #C4A375;
  background: #FAF8F5;
}

.check-in-cell.checked {
  background: #A8824F;
  border-color: #A8824F;
  color: #FFF9F0;
}

.check-in-cell.today {
  border-color: #C4A375;
  border-width: 2px;
}

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 20px 8px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  font-size: 13px;
}

.empty-tip p {
  margin: 0;
}

/* ========== 底部统计 ========== */
.module-footer {
  margin-top: 12px;
  font-size: 12px;
  color: #7D6A52;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  border-top: 1.5px dashed #E8DFD3;
  padding-top: 10px;
}

.module-footer > span {
  display: block;
  margin-bottom: 6px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #F5F0EA;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #C4A375, #A8824F);
  border-radius: 999px;
  transition: width 0.35s ease;
}
</style>
