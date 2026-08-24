<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWeightStore } from '@/store/modules/weightStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import type { DayChange } from '@/store/modules/weightStore'
import {
  getTodayDate,
  parseDate,
} from '@/utils/date'
import type { WeightRecord } from '@/types/weight'

/**
 * 减重视图
 * - 首次使用引导输入初始体重
 * - 按月历布局展示每日体重与日变化
 * - 支持选中任意日期登记/更新体重
 * - 月末展示月度统计（月变化、平均、最高、最低）
 */
const weightStore = useWeightStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/** 今天日期字符串 */
const today = getTodayDate()

/** 周一~周日 表头 */
const weekHeaders = ['一', '二', '三', '四', '五', '六', '日']

/** 初始体重输入值（首次使用引导） */
const initialWeightInput = ref<string>('')

/** 初始体重日期输入值（默认今天） */
const initialDateInput = ref<string>(today)

/** 编辑中日期（用户选中的日期，null 表示无） */
const editingDate = ref<string | null>(null)

/** 编辑中的体重输入值 */
const editingWeightInput = ref<string>('')

/** 体重输入框 DOM 引用 */
const weightInputRef = ref<HTMLInputElement | null>(null)

/**
 * 月历单元格数据结构
 * @property date - 日期字符串，空表示占位
 * @property day - 日期数字
 * @property inMonth - 是否属于当月
 * @property isToday - 是否今天
 * @property record - 该日体重记录（无则 null）
 * @property change - 该日日变化信息（无则 null）
 */
interface WeightCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  record: WeightRecord | null
  change: DayChange | null
}

/**
 * 月历单元格二维数组
 */
const cells = computed<WeightCell[][]>(() => {
  const dates = weightStore.monthDates
  if (dates.length === 0) return []
  // 当月1号是周几（0=周日,1=周一）
  const firstDate = parseDate(dates[0])
  const firstDay = firstDate.getDay()
  // 周日转为7，使周一为1
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const total = offset + dates.length
  const rows = Math.ceil(total / 7)
  const flat: WeightCell[] = []
  for (let i = 0; i < rows * 7; i++) {
    const dateIndex = i - offset
    if (dateIndex < 0 || dateIndex >= dates.length) {
      // 占位
      flat.push({
        date: '',
        day: 0,
        inMonth: false,
        isToday: false,
        record: null,
        change: null,
      })
    } else {
      const date = dates[dateIndex]
      const record = weightStore.monthRecords.find(r => r.date === date) ?? null
      const change = weightStore.monthDayChanges.find(c => c.date === date) ?? null
      flat.push({
        date,
        day: parseDate(date).getDate(),
        inMonth: true,
        isToday: date === today,
        record,
        change,
      })
    }
  }
  // 拆为二维
  const result: WeightCell[][] = []
  for (let r = 0; r < rows; r++) {
    result.push(flat.slice(r * 7, (r + 1) * 7))
  }
  return result
})

/** 当前月份统计 */
const stats = computed(() => weightStore.monthStats)

/** 是否已设置初始体重 */
const hasInitial = computed<boolean>(() => weightStore.hasInitialWeight)

/** 是否本月 */
const isCurrentMonth = computed<boolean>(() => weightStore.isCurrentMonth)

/** 当前月份中文展示 */
const monthLabel = computed<string>(() => weightStore.monthLabel)

/** 初始体重 */
const initialWeight = computed<number>(() => weightStore.data.initialWeight)

/** 初始日期 */
const initialDate = computed<string>(() => weightStore.data.initialDate)

/**
 * 确认保存初始体重
 */
function confirmInitialWeight(): void {
  const weight = parseFloat(initialWeightInput.value)
  if (!weight || weight <= 0 || weight > 500) return
  weightStore.setInitialWeight(weight, initialDateInput.value || today)
  initialWeightInput.value = ''
}

/**
 * 点击日期单元格
 * - 若有记录：进入编辑模式加载已有体重
 * - 若无记录：进入新建模式清空输入
 * @param date - 日期字符串
 */
function handleCellClick(date: string): void {
  if (!date) return
  editingDate.value = date
  const record = weightStore.getWeightByDate(date)
  editingWeightInput.value = record ? String(record) : ''
  // 让输入框获得焦点
  setTimeout(() => {
    weightInputRef.value?.focus()
  }, 0)
}

/**
 * 确认保存当日体重
 */
function confirmEditWeight(): void {
  if (!editingDate.value) return
  const weight = parseFloat(editingWeightInput.value)
  if (!weight || weight <= 0 || weight > 500) {
    editingDate.value = null
    return
  }
  weightStore.upsertRecord(weight, editingDate.value)
  editingDate.value = null
  editingWeightInput.value = ''
}

/**
 * 取消编辑
 */
function cancelEditWeight(): void {
  editingDate.value = null
  editingWeightInput.value = ''
}

/**
 * 删除某日体重（二次确认）
 * @param date - 日期字符串
 */
async function handleDeleteWeight(date: string): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除体重记录',
    message: `确认删除 ${date} 的体重记录吗？删除后无法恢复。`,
  })
  if (!ok) return
  if (editingDate.value === date) {
    editingDate.value = null
    editingWeightInput.value = ''
  }
  weightStore.removeRecord(date)
}

/**
 * 获取日变化的颜色类（减重绿色，增重红色，无变化灰色）
 * @param delta - 变化值
 * @returns 颜色类名
 */
function deltaColorClass(delta: number): string {
  if (delta > 0) return 'delta-up'
  if (delta < 0) return 'delta-down'
  return 'delta-zero'
}

/**
 * 格式化变化值显示（带正负号）
 * @param delta - 变化值
 * @returns 格式化字符串
 */
function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

/**
 * 是否某日正在编辑
 * @param date - 日期字符串
 * @returns 是否正在编辑
 */
function isEditing(date: string): boolean {
  return editingDate.value === date
}
</script>

<template>
  <div class="weight-view">
    <!-- 首次使用引导：输入初始体重 -->
    <div v-if="!hasInitial" class="initial-setup">
      <div class="setup-card">
        <h3 class="setup-title">设置初始体重</h3>
        <p class="setup-desc">请输入当前体重，作为后续每日变化的对比基准</p>
        <div class="setup-inputs">
          <input
            v-model="initialDateInput"
            type="date"
            class="setup-date-input"
          />
          <input
            v-model="initialWeightInput"
            type="number"
            step="0.1"
            min="20"
            max="300"
            class="setup-weight-input"
            placeholder="kg"
            @keyup.enter="confirmInitialWeight"
          />
        </div>
        <button class="setup-btn" @click="confirmInitialWeight">确认</button>
      </div>
    </div>

    <!-- 已设置初始体重后的主界面 -->
    <div v-else class="weight-main">
      <!-- 月份导航 -->
      <div class="month-nav">
        <button class="month-nav-btn" @click="weightStore.goPrevMonth">‹</button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="month-nav-btn" @click="weightStore.goNextMonth">›</button>
        <button
          v-if="!isCurrentMonth"
          class="month-today-btn"
          @click="weightStore.goThisMonth"
        >本月</button>
      </div>

      <!-- 月度统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card primary">
          <span class="stat-label">月变化</span>
          <span
            class="stat-value"
            :class="deltaColorClass(stats.monthDelta)"
          >{{ formatDelta(stats.monthDelta) }} kg</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">月初</span>
          <span class="stat-value">{{ stats.firstWeight }} kg</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">月末</span>
          <span class="stat-value">{{ stats.lastWeight }} kg</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">平均</span>
          <span class="stat-value">{{ stats.avgWeight }} kg</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">最高</span>
          <span class="stat-value">{{ stats.maxWeight }} kg</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">最低</span>
          <span class="stat-value">{{ stats.minWeight }} kg</span>
        </div>
      </div>

      <!-- 初始信息条 -->
      <div class="initial-info">
        <span>初始体重：{{ initialWeight }} kg</span>
        <span class="initial-date">{{ initialDate }}</span>
      </div>

      <!-- 月历网格 -->
      <div class="cal-wrap">
        <!-- 星期表头 -->
        <div class="cal-header">
          <span
            v-for="(h, i) in weekHeaders"
            :key="i"
            class="cal-h-cell"
          >{{ h }}</span>
        </div>

        <!-- 日期网格 -->
        <div class="cal-grid">
          <div
            v-for="(row, ri) in cells"
            :key="ri"
            class="cal-row"
          >
            <div
              v-for="(cell, ci) in row"
              :key="ri + '-' + ci"
              class="cal-cell"
              :class="{
                blank: !cell.inMonth,
                today: cell.isToday,
                recorded: cell.record !== null,
                editing: isEditing(cell.date),
              }"
              @click="cell.inMonth && handleCellClick(cell.date)"
            >
              <template v-if="cell.inMonth">
                <span class="cell-day">{{ cell.day }}</span>
                <!-- 已记录体重 -->
                <span v-if="cell.record" class="cell-weight">{{ cell.record.weight }}</span>
                <!-- 变化值 -->
                <span
                  v-if="cell.change"
                  class="cell-delta"
                  :class="deltaColorClass(cell.change.delta)"
                >{{ formatDelta(cell.change.delta) }}</span>
                <!-- 编辑输入框 -->
                <input
                  v-if="isEditing(cell.date)"
                  ref="weightInputRef"
                  v-model="editingWeightInput"
                  type="number"
                  step="0.1"
                  class="cell-input"
                  @click.stop
                  @keyup.enter="confirmEditWeight"
                  @keyup.esc="cancelEditWeight"
                  @blur="confirmEditWeight"
                />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑中的快捷操作条 -->
      <div v-if="editingDate" class="edit-bar" @click.stop>
        <span class="edit-bar-label">编辑 {{ editingDate }}</span>
        <button class="edit-confirm" @click="confirmEditWeight">保存</button>
        <button class="edit-cancel" @click="cancelEditWeight">取消</button>
        <button
          v-if="weightStore.getWeightByDate(editingDate)"
          class="edit-delete"
          @click="handleDeleteWeight(editingDate)"
        >删除</button>
      </div>

      <!-- 操作提示 -->
      <div v-if="!editingDate" class="tip-bar">
        点击日期格子登记/更新体重，回车保存
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 视图根容器 */
.weight-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ========== 首次使用引导 ========== */
.initial-setup {
  padding: 40px 16px;
  display: flex;
  justify-content: center;
}

.setup-card {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 12px;
  padding: 24px 20px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-align: center;
}

.setup-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.setup-inputs {
  display: flex;
  gap: 8px;
}

.setup-date-input,
.setup-weight-input {
  flex: 1;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--font-family-sans);
  font-size: 15px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

.setup-weight-input {
  max-width: 100px;
}

.setup-btn {
  padding: 10px;
  border: 1px solid var(--color-text-primary);
  border-radius: 8px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-size: 14px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* ========== 主界面 ========== */
.weight-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 20px;
}

/* 月份导航 */
.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  position: relative;
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

.month-label {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
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

/* 月度统计卡片组 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-card.primary {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
}

.stat-card.primary .stat-label {
  color: var(--color-bg-main);
  opacity: 0.7;
}

.stat-card.primary .stat-value {
  color: var(--color-bg-main);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.stat-value {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

/* 变化值颜色 */
.delta-up {
  color: #C76B5E;
}

.delta-down {
  color: #6BAE75;
}

.delta-zero {
  color: var(--color-text-tertiary);
}

.stat-card.primary .delta-up,
.stat-card.primary .delta-down,
.stat-card.primary .delta-zero {
  color: var(--color-bg-main);
}

/* 初始信息条 */
.initial-info {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg-surface);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.initial-date {
  color: var(--color-text-tertiary);
}

/* 月历容器 */
.cal-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cal-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 4px;
}

.cal-h-cell {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 4px 0;
}

.cal-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 4px;
  gap: 4px;
}

/* 日期格子 */
.cal-cell {
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  position: relative;
  transition: background 0.15s;
  min-height: 56px;
}

.cal-cell.blank {
  cursor: default;
}

.cal-cell:not(.blank):hover {
  background: var(--color-bg-surface);
}

.cal-cell.today {
  border-color: var(--color-text-primary);
}

.cal-cell.recorded {
  background: #fff;
  border-color: var(--color-border-divider);
}

.cal-cell.editing {
  background: var(--color-bg-surface);
  border-color: var(--color-text-primary);
}

.cell-day {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
  line-height: 1;
}

.cal-cell.recorded .cell-day,
.cal-cell.editing .cell-day {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.cell-weight {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1.1;
}

.cell-delta {
  font-size: 10px;
  line-height: 1;
}

.cell-input {
  position: absolute;
  inset: 4px;
  width: calc(100% - 8px);
  border: 1px solid var(--color-text-primary);
  border-radius: 6px;
  background: #fff;
  text-align: center;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  padding: 0;
  min: 0;
}

/* 编辑快捷操作条 */
.edit-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-surface);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.edit-bar-label {
  flex: 1;
}

.edit-confirm,
.edit-cancel,
.edit-delete {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.edit-confirm {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
}

.edit-cancel {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
}

.edit-delete {
  border-color: #BF6060;
  background: transparent;
  color: #BF6060;
}

/* 操作提示 */
.tip-bar {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 4px 0;
}
</style>
