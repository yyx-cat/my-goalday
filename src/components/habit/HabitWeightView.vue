<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useWeightStore } from '@/store/modules/weightStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import type { DayChange } from '@/store/modules/weightStore'
import {
  getTodayDate,
  parseDate,
} from '@/utils/date'
import type { WeightMode, WeightRecord } from '@/types/weight'
import AddToNotebookButton from '@/components/common/AddToNotebookButton.vue'

/**
 * 减重视图
 * - 首次使用引导输入初始体重
 * - 支持每日 / 早晚 / 三餐 三种记录模式切换
 * - 按月历布局展示每日体重与变化（无数据用「—」占位）
 * - 月末展示月度统计（月变化、平均、最高、最低等）
 */
const weightStore = useWeightStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/** 今天日期字符串 */
const today = getTodayDate()

/**
 * 收集今日体重摘要（用于添加到手账）
 * 当天无体重记录时返回 null（不添加）
 * @returns 摘要内容或 null
 */
function collectWeightToday(): { content: string } | null {
  const weight = weightStore.getWeightByDate(today)
  if (weight === null) return null
  const change = weightStore.getDayChangeByDate(today)
  let changeLine = ''
  if (change && change.delta !== null) {
    changeLine = `\n${change.deltaLabel} ${formatDelta(change.delta)} kg`
  }
  return {
    content: `今日体重 ${weight} kg${changeLine}`,
  }
}

/** 周一~周日 表头 */
const weekHeaders = ['一', '二', '三', '四', '五', '六', '日']

/** 初始体重输入值（首次使用引导） */
const initialWeightInput = ref<string>('')

/** 初始体重日期输入值（默认今天） */
const initialDateInput = ref<string>(today)

/** 编辑中日期（用户选中的日期，null 表示无） */
const editingDate = ref<string | null>(null)

/** 编辑中的体重输入值（每日模式） */
const editingWeightInput = ref<string>('')

/** 编辑中的晨重输入值（早晚/三餐模式） */
const editingMorningInput = ref<string>('')

/** 编辑中的午重输入值（三餐模式） */
const editingNoonInput = ref<string>('')

/** 编辑中的晚重输入值（早晚/三餐模式） */
const editingEveningInput = ref<string>('')

/** 第一个输入框 DOM 引用（用于自动聚焦） */
const firstInputRef = ref<HTMLInputElement | null>(null)

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

/** 当前记录模式 */
const currentMode = computed<WeightMode>(() => weightStore.mode)

/** 模式切换选项 */
const modeOptions: { value: WeightMode; label: string }[] = [
  { value: 'daily', label: '每日' },
  { value: 'morning-evening', label: '早晚' },
  { value: 'three-meals', label: '三餐' },
]

/**
 * 月历单元格高度类名（不同模式需要不同高度）
 * @returns 模式对应的类名
 */
const cellHeightClass = computed<string>(() => {
  if (currentMode.value === 'daily') return 'cell-h-daily'
  if (currentMode.value === 'morning-evening') return 'cell-h-me'
  return 'cell-h-tm'
})

/**
 * 统计卡片列表（按模式适配）
 * 早晚模式展示均晨/均晚；其他模式展示平均/最高/最低
 */
const statCards = computed(() => {
  const s = stats.value
  if (currentMode.value === 'morning-evening') {
    return [
      { label: '月变化', value: statDelta(s.monthDelta), primary: true, colorClass: deltaColorClass(s.monthDelta) },
      { label: '月初(晨)', value: statWeight(s.firstWeight) },
      { label: '月末(晨)', value: statWeight(s.lastWeight) },
      { label: '均晨', value: statWeight(s.morningAvg) },
      { label: '均晚', value: statWeight(s.eveningAvg) },
      { label: '记录数', value: String(s.recordCount), noUnit: true },
    ]
  }
  return [
    { label: '月变化', value: statDelta(s.monthDelta), primary: true, colorClass: deltaColorClass(s.monthDelta) },
    { label: '月初', value: statWeight(s.firstWeight) },
    { label: '月末', value: statWeight(s.lastWeight) },
    { label: '平均', value: statWeight(s.avgWeight) },
    { label: '最高', value: statWeight(s.maxWeight) },
    { label: '最低', value: statWeight(s.minWeight) },
  ]
})

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
 * 切换记录模式
 * @param m - 目标模式
 */
function handleModeChange(m: WeightMode): void {
  if (m === currentMode.value) return
  // 切换前若正在编辑，先放弃当前编辑
  cancelEditWeight()
  weightStore.setMode(m)
}

/**
 * 点击日期单元格
 * - 进入编辑模式，按当前模式加载已有字段
 * @param date - 日期字符串
 */
function handleCellClick(date: string): void {
  if (!date) return
  editingDate.value = date
  const record = weightStore.getRecordByDate(date)
  if (currentMode.value === 'daily') {
    editingWeightInput.value = record?.weight ? String(record.weight) : ''
  } else if (currentMode.value === 'morning-evening') {
    editingMorningInput.value = record?.morningWeight ? String(record.morningWeight) : ''
    editingEveningInput.value = record?.eveningWeight ? String(record.eveningWeight) : ''
  } else {
    editingMorningInput.value = record?.morningWeight ? String(record.morningWeight) : ''
    editingNoonInput.value = record?.noonWeight ? String(record.noonWeight) : ''
    editingEveningInput.value = record?.eveningWeight ? String(record.eveningWeight) : ''
  }
  // 聚焦第一个输入框
  nextTick(() => {
    firstInputRef.value?.focus()
  })
}

/**
 * 解析体重输入字符串
 * @param s - 输入字符串
 * @returns 合法体重值；非法或为空返回 undefined
 */
function parseWeight(s: string): number | undefined {
  const n = parseFloat(s)
  if (!n || n <= 0 || n > 500) return undefined
  return n
}

/**
 * 确认保存当日体重（按当前模式收集字段）
 */
function confirmEditWeight(): void {
  if (!editingDate.value) return
  const m = currentMode.value
  if (m === 'daily') {
    const w = parseWeight(editingWeightInput.value)
    if (w === undefined) {
      cancelEditWeight()
      return
    }
    weightStore.upsertRecord({ weight: w }, editingDate.value)
  } else if (m === 'morning-evening') {
    const morning = parseWeight(editingMorningInput.value)
    const evening = parseWeight(editingEveningInput.value)
    if (morning === undefined && evening === undefined) {
      cancelEditWeight()
      return
    }
    weightStore.upsertRecord(
      { morningWeight: morning, eveningWeight: evening },
      editingDate.value,
    )
  } else {
    const morning = parseWeight(editingMorningInput.value)
    const noon = parseWeight(editingNoonInput.value)
    const evening = parseWeight(editingEveningInput.value)
    if (morning === undefined && noon === undefined && evening === undefined) {
      cancelEditWeight()
      return
    }
    weightStore.upsertRecord(
      { morningWeight: morning, noonWeight: noon, eveningWeight: evening },
      editingDate.value,
    )
  }
  cancelEditWeight()
}

/**
 * 取消编辑并清空所有输入
 */
function cancelEditWeight(): void {
  editingDate.value = null
  editingWeightInput.value = ''
  editingMorningInput.value = ''
  editingNoonInput.value = ''
  editingEveningInput.value = ''
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
    cancelEditWeight()
  }
  weightStore.removeRecord(date)
}

/**
 * 获取日变化的颜色类（减重绿色，增重红色，无变化或无数据灰色）
 * @param delta - 变化值（可为 null）
 * @returns 颜色类名
 */
function deltaColorClass(delta: number | null): string {
  if (delta === null) return 'delta-zero'
  if (delta > 0) return 'delta-up'
  if (delta < 0) return 'delta-down'
  return 'delta-zero'
}

/**
 * 格式化变化值显示（带正负号；null 显示「—」）
 * @param delta - 变化值
 * @returns 格式化字符串
 */
function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

/**
 * 格式化体重显示（null 显示「—」）
 * @param w - 体重值
 * @returns 格式化字符串
 */
function formatWeight(w: number | null | undefined): string {
  return w === null || w === undefined ? '—' : String(w)
}

/**
 * 统计卡片用：变化值带单位（null 显示「—」）
 * @param d - 变化值
 * @returns 带 kg 单位的字符串
 */
function statDelta(d: number | null): string {
  if (d === null) return '—'
  return `${d > 0 ? '+' : ''}${d} kg`
}

/**
 * 统计卡片用：体重带单位（null 显示「—」）
 * @param w - 体重值
 * @returns 带 kg 单位的字符串
 */
function statWeight(w: number | null): string {
  return w === null ? '—' : `${w} kg`
}

/**
 * 是否某日正在编辑
 * @param date - 日期字符串
 * @returns 是否正在编辑
 */
function isEditing(date: string): boolean {
  return editingDate.value === date
}

/**
 * 获取某 displayWeights 项的值（安全索引）
 * @param change - 日变化信息
 * @param idx - 索引
 * @returns 体重值，无则 null
 */
function getDisplayValue(change: DayChange | null, idx: number): number | null {
  if (!change) return null
  return change.displayWeights[idx]?.value ?? null
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
      <!-- 模式切换器 -->
      <div class="mode-switcher">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          class="mode-btn"
          :class="{ active: currentMode === opt.value }"
          @click="handleModeChange(opt.value)"
        >{{ opt.label }}</button>
      </div>

      <!-- 顶部操作行：添加到手账 -->
      <div class="weight-action-row">
        <AddToNotebookButton
          source="weight"
          title="⚖️ 体重记录"
          :date="today"
          :collect="collectWeightToday"
          empty-hint="今天还没有记录体重，先去登记吧～"
        />
      </div>

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
        <div
          v-for="(c, i) in statCards"
          :key="i"
          class="stat-card"
          :class="{ primary: c.primary }"
        >
          <span class="stat-label">{{ c.label }}</span>
          <span
            class="stat-value"
            :class="c.colorClass"
          >{{ c.value }}</span>
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
              :class="[
                {
                  blank: !cell.inMonth,
                  today: cell.isToday,
                  recorded: cell.record !== null,
                  editing: isEditing(cell.date),
                },
                cellHeightClass,
              ]"
              @click="cell.inMonth && handleCellClick(cell.date)"
            >
              <template v-if="cell.inMonth">
                <span class="cell-day">{{ cell.day }}</span>

                <!-- 每日模式：单体重 + 变化 -->
                <template v-if="currentMode === 'daily'">
                  <span v-if="cell.change" class="cell-weight">
                    {{ formatWeight(cell.change.weight) }}
                  </span>
                  <span
                    v-if="cell.change"
                    class="cell-delta"
                    :class="deltaColorClass(cell.change.delta)"
                  >{{ formatDelta(cell.change.delta) }}</span>
                </template>

                <!-- 早晚模式：晨/晚 + 当天变化 + 跨日变化 -->
                <template v-else-if="currentMode === 'morning-evening'">
                  <template v-if="cell.change">
                    <span class="cell-multi">
                      <span class="cell-multi-item">晨{{ formatWeight(getDisplayValue(cell.change, 0)) }}</span>
                      <span class="cell-multi-item">晚{{ formatWeight(getDisplayValue(cell.change, 1)) }}</span>
                    </span>
                    <span class="cell-delta-line">
                      <span :class="deltaColorClass(cell.change.dayDelta)">当{{ formatDelta(cell.change.dayDelta) }}</span>
                      <span :class="deltaColorClass(cell.change.delta)">夜{{ formatDelta(cell.change.delta) }}</span>
                    </span>
                  </template>
                </template>

                <!-- 三餐模式：早/午/晚 + 均值 + 跨日变化 -->
                <template v-else>
                  <template v-if="cell.change">
                    <span class="cell-multi">
                      <span class="cell-multi-item">早{{ formatWeight(getDisplayValue(cell.change, 0)) }}</span>
                      <span class="cell-multi-item">午{{ formatWeight(getDisplayValue(cell.change, 1)) }}</span>
                      <span class="cell-multi-item">晚{{ formatWeight(getDisplayValue(cell.change, 2)) }}</span>
                    </span>
                    <span class="cell-delta-line">
                      <span>均{{ formatWeight(cell.change.weight) }}</span>
                      <span :class="deltaColorClass(cell.change.delta)">Δ{{ formatDelta(cell.change.delta) }}</span>
                    </span>
                  </template>
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑中的快捷操作条（按模式显示对应输入框） -->
      <div v-if="editingDate" class="edit-bar" @click.stop>
        <span class="edit-bar-label">编辑 {{ editingDate }}</span>
        <div class="edit-inputs">
          <!-- 每日模式 -->
          <input
            v-if="currentMode === 'daily'"
            ref="firstInputRef"
            v-model="editingWeightInput"
            type="number"
            step="0.1"
            min="20"
            max="300"
            class="edit-input"
            placeholder="体重kg"
            @keyup.enter="confirmEditWeight"
            @keyup.esc="cancelEditWeight"
          />
          <!-- 早晚模式 -->
          <template v-else-if="currentMode === 'morning-evening'">
            <input
              ref="firstInputRef"
              v-model="editingMorningInput"
              type="number"
              step="0.1"
              min="20"
              max="300"
              class="edit-input"
              placeholder="晨kg"
              @keyup.enter="confirmEditWeight"
              @keyup.esc="cancelEditWeight"
            />
            <input
              v-model="editingEveningInput"
              type="number"
              step="0.1"
              min="20"
              max="300"
              class="edit-input"
              placeholder="晚kg"
              @keyup.enter="confirmEditWeight"
              @keyup.esc="cancelEditWeight"
            />
          </template>
          <!-- 三餐模式 -->
          <template v-else>
            <input
              ref="firstInputRef"
              v-model="editingMorningInput"
              type="number"
              step="0.1"
              min="20"
              max="300"
              class="edit-input"
              placeholder="早kg"
              @keyup.enter="confirmEditWeight"
              @keyup.esc="cancelEditWeight"
            />
            <input
              v-model="editingNoonInput"
              type="number"
              step="0.1"
              min="20"
              max="300"
              class="edit-input"
              placeholder="午kg"
              @keyup.enter="confirmEditWeight"
              @keyup.esc="cancelEditWeight"
            />
            <input
              v-model="editingEveningInput"
              type="number"
              step="0.1"
              min="20"
              max="300"
              class="edit-input"
              placeholder="晚kg"
              @keyup.enter="confirmEditWeight"
              @keyup.esc="cancelEditWeight"
            />
          </template>
        </div>
        <button class="edit-confirm" @click="confirmEditWeight">保存</button>
        <button class="edit-cancel" @click="cancelEditWeight">取消</button>
        <button
          v-if="weightStore.getRecordByDate(editingDate)"
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

/* 模式切换器 */
.mode-switcher {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--color-bg-surface);
  border-radius: 10px;
}

.mode-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-family-sans);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.mode-btn.active {
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  font-weight: var(--font-weight-medium);
}

/* 顶部操作行（添加到手账按钮右对齐） */
.weight-action-row {
  display: flex;
  justify-content: flex-end;
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
  padding: 2px 0;
}

/* 不同模式格子高度 */
.cal-cell.cell-h-daily {
  aspect-ratio: 1 / 1;
  min-height: 56px;
}

.cal-cell.cell-h-me {
  aspect-ratio: 1 / 1.45;
  min-height: 78px;
}

.cal-cell.cell-h-tm {
  aspect-ratio: 1 / 1.45;
  min-height: 78px;
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

/* 多体重项（早晚/三餐模式） */
.cell-multi {
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: center;
  font-size: 10px;
  line-height: 1.15;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.cell-multi-item {
  white-space: nowrap;
}

/* 变化行（当天/跨日 或 均值/变化） */
.cell-delta-line {
  display: flex;
  gap: 6px;
  font-size: 9.5px;
  line-height: 1;
  margin-top: 1px;
}

/* 编辑快捷操作条 */
.edit-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-bg-surface);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.edit-bar-label {
  margin-right: 4px;
}

.edit-inputs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.edit-input {
  width: 70px;
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 6px 8px;
  font-family: var(--font-family-sans);
  font-size: 13px;
  color: var(--color-text-primary);
  outline: none;
  background: #fff;
  min: 0;
}

.edit-input:focus {
  border-color: var(--color-text-primary);
}

.edit-confirm,
.edit-cancel,
.edit-delete {
  padding: 6px 12px;
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
