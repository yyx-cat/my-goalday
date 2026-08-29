<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '@/store/modules/financeStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import { getTodayDate } from '@/utils/date'
import type { FinanceMode, FinanceRecord, FinanceRecordType } from '@/types/finance'
import HabitFinanceManageView from '@/components/habit/HabitFinanceManageView.vue'
import AddToNotebookButton from '@/components/common/AddToNotebookButton.vue'

/**
 * 理财界面
 * - 顶部板块切换：记账模式 / 管理模式
 * - 记账模式：添加收支记录（类型/金额/详细记录），自动统计支出/收入/结余
 * - 支出区块在上、收入区块在下，均可折叠收起
 * - 管理模式：预留（后续实现）
 */
const financeStore = useFinanceStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/** 当前板块模式（记账/管理） */
const activeMode = ref<FinanceMode>('book')

/** 是否显示添加记录表单 */
const showAddForm = ref<boolean>(false)

/** 新记录类型（支出/收入），默认支出 */
const formType = ref<FinanceRecordType>('expense')

/** 新记录金额输入 */
const formAmount = ref<string>('')

/** 新记录详细记录（备注）输入 */
const formNote = ref<string>('')

/** 新记录日期输入（默认今天） */
const formDate = ref<string>(getTodayDate())

/**
 * 收集今日收支摘要（用于添加到手账）
 * 当天无记账记录时返回 null（不添加）
 * @returns 摘要内容或 null
 */
function collectFinanceToday(): { content: string } | null {
  const today = getTodayDate()
  const list = financeStore.records.filter(r => r.date === today)
  if (list.length === 0) return null
  const expenseSum = list
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)
  const incomeSum = list
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)
  const lines = list.map(r => {
    const sign = r.type === 'expense' ? '-' : '+'
    return `${sign}¥${r.amount.toFixed(2)}${r.note ? `（${r.note}）` : ''}`
  })
  return {
    content: `支出 ¥${expenseSum.toFixed(2)} · 收入 ¥${incomeSum.toFixed(2)}\n${lines.join('\n')}`,
  }
}

/** 支出区块是否折叠 */
const expenseCollapsed = ref<boolean>(false)

/** 收入区块是否折叠 */
const incomeCollapsed = ref<boolean>(false)

/** 支出记录列表（倒序） */
const expenseRecords = computed<FinanceRecord[]>(() => financeStore.expenseRecords)

/** 收入记录列表（倒序） */
const incomeRecords = computed<FinanceRecord[]>(() => financeStore.incomeRecords)

/** 支出总额 */
const totalExpense = computed<number>(() => financeStore.totalExpense)

/** 收入总额 */
const totalIncome = computed<number>(() => financeStore.totalIncome)

/** 结余（收入 - 支出） */
const balance = computed<number>(() => financeStore.balance)

/** 是否有支出记录 */
const hasExpense = computed<boolean>(() => expenseRecords.value.length > 0)

/** 是否有收入记录 */
const hasIncome = computed<boolean>(() => incomeRecords.value.length > 0)

/** 板块切换选项 */
const modeOptions: { value: FinanceMode; label: string }[] = [
  { value: 'book', label: '记账模式' },
  { value: 'manage', label: '管理模式' },
]

/**
 * 切换板块模式
 * @param m - 目标模式
 */
function handleModeChange(m: FinanceMode): void {
  if (m === activeMode.value) return
  activeMode.value = m
}

/**
 * 打开添加记录表单（默认支出、今天）
 */
function openAddForm(): void {
  formType.value = 'expense'
  formAmount.value = ''
  formNote.value = ''
  formDate.value = getTodayDate()
  showAddForm.value = true
}

/**
 * 切换新记录类型
 * @param t - 类型（支出/收入）
 */
function setFormType(t: FinanceRecordType): void {
  formType.value = t
}

/**
 * 取消添加记录，关闭表单
 */
function cancelAddForm(): void {
  showAddForm.value = false
  formAmount.value = ''
  formNote.value = ''
}

/**
 * 确认添加记录
 * 校验金额合法后写入 store，并清空表单
 */
function confirmAddForm(): void {
  const amount = parseFloat(formAmount.value)
  if (!amount || amount <= 0) return
  financeStore.addRecord(formType.value, amount, formDate.value, formNote.value)
  // 添加后自动展开对应区块，便于查看
  if (formType.value === 'expense') expenseCollapsed.value = false
  else incomeCollapsed.value = false
  cancelAddForm()
}

/**
 * 删除一条记录（二次确认）
 * @param record - 待删除记录
 */
async function handleDelete(record: FinanceRecord): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除理财记录',
    message: `确认删除这条${record.type === 'expense' ? '支出' : '收入'}记录（¥${record.amount.toFixed(2)}）吗？删除后无法恢复。`,
  })
  if (!ok) return
  financeStore.removeRecord(record.id)
}

/**
 * 切换支出区块折叠状态
 */
function toggleExpense(): void {
  expenseCollapsed.value = !expenseCollapsed.value
}

/**
 * 切换收入区块折叠状态
 */
function toggleIncome(): void {
  incomeCollapsed.value = !incomeCollapsed.value
}

/**
 * 格式化金额显示（带 ¥ 前缀，两位小数）
 * @param n - 金额
 * @returns 格式化字符串
 */
function formatMoney(n: number): string {
  return `¥${n.toFixed(2)}`
}

/**
 * 格式化结余显示（负数加负号在 ¥ 前）
 * @param n - 结余值
 * @returns 格式化字符串
 */
function formatBalance(n: number): string {
  if (n < 0) return `-¥${(-n).toFixed(2)}`
  return `¥${n.toFixed(2)}`
}

/**
 * 获取结余颜色类（正数绿色，负数红色，零灰色）
 * @param n - 结余值
 * @returns 颜色类名
 */
function balanceClass(n: number): string {
  if (n > 0) return 'balance-positive'
  if (n < 0) return 'balance-negative'
  return 'balance-zero'
}
</script>

<template>
  <div class="finance-view">
    <!-- 板块切换器 -->
    <div class="mode-switcher">
      <button
        v-for="opt in modeOptions"
        :key="opt.value"
        class="mode-btn"
        :class="{ active: activeMode === opt.value }"
        @click="handleModeChange(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <!-- 记账模式 -->
    <div v-if="activeMode === 'book'" class="book-mode">
      <!-- 顶部操作行：添加到手账 -->
      <div class="book-action-row">
        <AddToNotebookButton
          source="finance"
          title="💰 今日收支"
          :date="getTodayDate()"
          :collect="collectFinanceToday"
          empty-hint="今天还没有记账记录，先去添加一笔吧～"
        />
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card expense">
          <span class="stat-label">总支出</span>
          <span class="stat-value">{{ formatMoney(totalExpense) }}</span>
        </div>
        <div class="stat-card income">
          <span class="stat-label">总收入</span>
          <span class="stat-value">{{ formatMoney(totalIncome) }}</span>
        </div>
        <div class="stat-card balance">
          <span class="stat-label">结余</span>
          <span class="stat-value" :class="balanceClass(balance)">{{ formatBalance(balance) }}</span>
        </div>
      </div>

      <!-- 添加记录按钮 / 表单 -->
      <div class="add-area">
        <button
          v-if="!showAddForm"
          class="add-btn"
          @click="openAddForm"
        >+ 添加记录</button>

        <!-- 内联添加表单 -->
        <div v-else class="add-form" @click.stop>
          <!-- 类型切换 -->
          <div class="form-type-row">
            <button
              class="form-type-btn"
              :class="{ active: formType === 'expense', 'type-expense': true }"
              @click="setFormType('expense')"
            >支出</button>
            <button
              class="form-type-btn"
              :class="{ active: formType === 'income', 'type-income': true }"
              @click="setFormType('income')"
            >收入</button>
          </div>
          <!-- 金额 + 日期 -->
          <div class="form-inputs">
            <input
              v-model="formAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-amount-input"
              placeholder="金额"
              @keyup.enter="confirmAddForm"
            />
            <input
              v-model="formDate"
              type="date"
              class="form-date-input"
            />
          </div>
          <!-- 详细记录 -->
          <input
            v-model="formNote"
            type="text"
            class="form-note-input"
            placeholder="详细记录（可选）"
            @keyup.enter="confirmAddForm"
          />
          <!-- 操作按钮 -->
          <div class="form-actions">
            <button class="form-confirm" @click="confirmAddForm">确认</button>
            <button class="form-cancel" @click="cancelAddForm">取消</button>
          </div>
        </div>
      </div>

      <!-- 支出区块（上，可折叠） -->
      <section class="record-section expense-section">
        <header class="section-header" @click="toggleExpense">
          <span class="section-title">支出</span>
          <span class="section-amount expense-text">{{ formatMoney(totalExpense) }}</span>
          <span class="section-count">{{ expenseRecords.length }} 笔</span>
          <span class="section-toggle" :class="{ collapsed: expenseCollapsed }">›</span>
        </header>
        <div v-show="!expenseCollapsed" class="section-body">
          <div v-if="!hasExpense" class="empty-tip">暂无支出记录</div>
          <div
            v-for="r in expenseRecords"
            :key="r.id"
            class="record-item"
          >
            <span class="record-amount expense-text">-{{ formatMoney(r.amount) }}</span>
            <div class="record-main">
              <span v-if="r.note" class="record-note">{{ r.note }}</span>
              <span v-else class="record-note placeholder">（无备注）</span>
              <span class="record-date">{{ r.date }}</span>
            </div>
            <button class="record-delete" @click="handleDelete(r)">×</button>
          </div>
        </div>
      </section>

      <!-- 收入区块（下，可折叠） -->
      <section class="record-section income-section">
        <header class="section-header" @click="toggleIncome">
          <span class="section-title">收入</span>
          <span class="section-amount income-text">{{ formatMoney(totalIncome) }}</span>
          <span class="section-count">{{ incomeRecords.length }} 笔</span>
          <span class="section-toggle" :class="{ collapsed: incomeCollapsed }">›</span>
        </header>
        <div v-show="!incomeCollapsed" class="section-body">
          <div v-if="!hasIncome" class="empty-tip">暂无收入记录</div>
          <div
            v-for="r in incomeRecords"
            :key="r.id"
            class="record-item"
          >
            <span class="record-amount income-text">+{{ formatMoney(r.amount) }}</span>
            <div class="record-main">
              <span v-if="r.note" class="record-note">{{ r.note }}</span>
              <span v-else class="record-note placeholder">（无备注）</span>
              <span class="record-date">{{ r.date }}</span>
            </div>
            <button class="record-delete" @click="handleDelete(r)">×</button>
          </div>
        </div>
      </section>
    </div>

    <!-- 管理模式：预算类型与消费管理 -->
    <div v-else class="manage-mode">
      <HabitFinanceManageView />
    </div>
  </div>
</template>

<style scoped>
/* 视图根容器 */
.finance-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 16px 20px;
  gap: 12px;
}

/* 板块切换器 */
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

/* ========== 记账模式 ========== */
.book-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部操作行（添加到手账按钮右对齐） */
.book-action-row {
  display: flex;
  justify-content: flex-end;
}

/* 统计卡片行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.stat-value {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

/* 添加记录区 */
.add-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-btn {
  padding: 10px;
  border: 1px dashed var(--color-text-primary);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-family-sans);
  cursor: pointer;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
}

/* 类型切换行 */
.form-type-row {
  display: flex;
  gap: 6px;
}

.form-type-btn {
  flex: 1;
  padding: 8px 0;
  border: 1px solid var(--color-border-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-family-sans);
  cursor: pointer;
}

.form-type-btn.type-expense.active {
  background: #C76B5E;
  border-color: #C76B5E;
  color: #fff;
}

.form-type-btn.type-income.active {
  background: #6BAE75;
  border-color: #6BAE75;
  color: #fff;
}

/* 金额 + 日期输入行 */
.form-inputs {
  display: flex;
  gap: 8px;
}

.form-amount-input,
.form-date-input,
.form-note-input {
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

.form-amount-input {
  flex: 1;
}

.form-date-input {
  width: auto;
}

.form-note-input {
  width: 100%;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.form-confirm,
.form-cancel {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.form-confirm {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
}

.form-cancel {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
}

/* ========== 记录区块 ========== */
.record-section {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.section-title {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.section-amount {
  flex: 1;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.section-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.section-toggle {
  font-size: 18px;
  color: var(--color-text-tertiary);
  transition: transform 0.2s;
  line-height: 1;
}

.section-toggle.collapsed {
  transform: rotate(90deg);
}

.section-body {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border-divider);
}

.empty-tip {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 单条记录 */
.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-divider);
}

.record-item:last-child {
  border-bottom: none;
}

.record-amount {
  min-width: 80px;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.record-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.record-note {
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-note.placeholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.record-date {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.record-delete {
  width: 24px;
  height: 24px;
  border: 1px solid #BF6060;
  border-radius: var(--radius-full);
  background: transparent;
  color: #BF6060;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

/* 支出/收入颜色 */
.expense-text {
  color: #C76B5E;
}

.income-text {
  color: #6BAE75;
}

.balance-positive {
  color: #6BAE75;
}

.balance-negative {
  color: #C76B5E;
}

.balance-zero {
  color: var(--color-text-tertiary);
}

/* ========== 管理模式占位 ========== */
.manage-mode {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.manage-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.manage-icon {
  font-size: 48px;
  opacity: 0.5;
}

.manage-title {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.manage-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-tertiary);
}
</style>
