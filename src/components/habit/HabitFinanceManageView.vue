<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFinanceBudgetStore } from '@/store/modules/financeBudgetStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import type { BudgetCategory, BudgetExpense } from '@/types/financeBudget'

/**
 * 理财-管理模式
 * - 用户自定义每月预算类型（名称/额度，数量自由）
 * - 类型可修改（需二次确认）与删除（二次确认）
 * - 在类型下记消费（金额 + 可选详情），自动扣除并显示剩余
 * - 每个类型可折叠，折叠区为该类型本月消费记录
 * - 消费后若剩余 < 0，弹出超支提醒
 */
const budgetStore = useFinanceBudgetStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/** 是否显示新增类型表单 */
const showAddForm = ref<boolean>(false)
/** 新类型名称输入 */
const newCatName = ref<string>('')
/** 新类型预算输入 */
const newCatBudget = ref<string>('')

/** 正在编辑的类型 ID（null 表示无） */
const editingCatId = ref<string | null>(null)
/** 编辑中的类型名称 */
const editCatName = ref<string>('')
/** 编辑中的类型预算 */
const editCatBudget = ref<string>('')

/** 各类型折叠状态（按 ID 记录，true=已折叠） */
const collapsed = ref<Record<string, boolean>>({})

/** 当前展开消费表单的类型 ID（一次只展开一个） */
const activeExpenseCatId = ref<string | null>(null)
/** 消费金额输入 */
const expenseAmount = ref<string>('')
/** 消费详情输入 */
const expenseNote = ref<string>('')

/** 超支警告文本（空表示无警告） */
const warningMessage = ref<string>('')

/** 全部预算类型 */
const categories = computed<BudgetCategory[]>(() => budgetStore.data.categories)

/** 是否已有类型 */
const hasCategories = computed<boolean>(() => categories.value.length > 0)

// 挂载时加载数据
onMounted(() => {
  budgetStore.loadBudget()
})

/**
 * 打开新增类型表单
 */
function openAddForm(): void {
  newCatName.value = ''
  newCatBudget.value = ''
  showAddForm.value = true
}

/**
 * 取消新增类型
 */
function cancelAddForm(): void {
  showAddForm.value = false
  newCatName.value = ''
  newCatBudget.value = ''
}

/**
 * 确认新增类型
 */
function confirmAddForm(): void {
  const name = newCatName.value.trim()
  const budget = parseFloat(newCatBudget.value)
  if (!name || !budget || budget <= 0) return
  budgetStore.addCategory(name, budget)
  cancelAddForm()
}

/**
 * 打开编辑类型表单（加载原值）
 * @param cat - 待编辑类型
 */
function openEditForm(cat: BudgetCategory): void {
  editingCatId.value = cat.id
  editCatName.value = cat.name
  editCatBudget.value = String(cat.budget)
}

/**
 * 取消编辑类型
 */
function cancelEditForm(): void {
  editingCatId.value = null
  editCatName.value = ''
  editCatBudget.value = ''
}

/**
 * 确认修改类型（二次确认）
 */
async function confirmEditForm(): Promise<void> {
  if (!editingCatId.value) return
  const name = editCatName.value.trim()
  const budget = parseFloat(editCatBudget.value)
  if (!name || !budget || budget <= 0) return
  const ok = await confirmStore.confirm({
    title: '修改确认',
    message: `确认修改类型「${name}」的预算为 ¥${budget.toFixed(2)} 吗？`,
    danger: false,
  })
  if (!ok) return
  budgetStore.updateCategory(editingCatId.value, { name, budget })
  cancelEditForm()
}

/**
 * 删除类型（二次确认）
 * @param cat - 待删除类型
 */
async function handleDeleteCategory(cat: BudgetCategory): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除预算类型',
    message: `确认删除类型「${cat.name}」吗？其下所有消费记录也会一并删除，删除后无法恢复。`,
  })
  if (!ok) return
  if (editingCatId.value === cat.id) cancelEditForm()
  if (activeExpenseCatId.value === cat.id) cancelExpenseForm()
  budgetStore.removeCategory(cat.id)
}

/**
 * 切换类型折叠状态
 * @param catId - 类型 ID
 */
function toggleCollapse(catId: string): void {
  collapsed.value[catId] = !collapsed.value[catId]
}

/**
 * 判断类型是否折叠
 * @param catId - 类型 ID
 * @returns 是否折叠
 */
function isCollapsed(catId: string): boolean {
  return !!collapsed.value[catId]
}

/**
 * 打开某类型的消费表单
 * @param catId - 类型 ID
 */
function openExpenseForm(catId: string): void {
  activeExpenseCatId.value = catId
  expenseAmount.value = ''
  expenseNote.value = ''
}

/**
 * 取消消费表单
 */
function cancelExpenseForm(): void {
  activeExpenseCatId.value = null
  expenseAmount.value = ''
  expenseNote.value = ''
}

/**
 * 确认添加消费
 * - 校验金额后写入，并检查是否超支，超支则弹出警告
 * @param cat - 所属类型
 */
function confirmExpenseForm(cat: BudgetCategory): void {
  const amount = parseFloat(expenseAmount.value)
  if (!amount || amount <= 0) return
  budgetStore.addExpense(cat.id, amount, expenseNote.value)
  // 计算扣除后剩余
  const remaining = budgetStore.getCategoryRemaining(cat.id)
  if (remaining < 0) {
    warningMessage.value = `「${cat.name}」已超支 ¥${(-remaining).toFixed(2)}（本月预算 ¥${cat.budget.toFixed(2)}），请注意控制支出`
  }
  cancelExpenseForm()
}

/**
 * 删除一条消费记录（二次确认）
 * @param expense - 待删除记录
 */
async function handleDeleteExpense(expense: BudgetExpense): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除消费记录',
    message: `确认删除这条消费记录（¥${expense.amount.toFixed(2)}）吗？删除后无法恢复。`,
  })
  if (!ok) return
  budgetStore.removeExpense(expense.id)
}

/**
 * 关闭超支警告条
 */
function dismissWarning(): void {
  warningMessage.value = ''
}

/**
 * 格式化金额（带 ¥ 前缀，两位小数）
 * @param n - 金额
 * @returns 格式化字符串
 */
function formatMoney(n: number): string {
  return `¥${n.toFixed(2)}`
}

/**
 * 格式化剩余额度（负数在 ¥ 前加负号）
 * @param n - 剩余值
 * @returns 格式化字符串
 */
function formatRemaining(n: number): string {
  if (n < 0) return `-¥${(-n).toFixed(2)}`
  return `¥${n.toFixed(2)}`
}

/**
 * 剩余额度颜色类（正数绿，负数红，零灰）
 * @param n - 剩余值
 * @returns 颜色类名
 */
function remainingClass(n: number): string {
  if (n > 0) return 'rem-positive'
  if (n < 0) return 'rem-negative'
  return 'rem-zero'
}

/**
 * 获取类型本月已消费总额
 * @param catId - 类型 ID
 * @returns 已消费金额
 */
function spentOf(catId: string): number {
  return budgetStore.getCategorySpent(catId)
}

/**
 * 获取类型本月剩余额度
 * @param catId - 类型 ID
 * @returns 剩余额度
 */
function remainingOf(catId: string): number {
  return budgetStore.getCategoryRemaining(catId)
}

/**
 * 获取类型本月消费记录列表
 * @param catId - 类型 ID
 * @returns 消费记录数组（倒序）
 */
function expensesOf(catId: string): BudgetExpense[] {
  return budgetStore.getCategoryExpenses(catId)
}
</script>

<template>
  <div class="manage-view">
    <!-- 空状态 -->
    <div v-if="!hasCategories && !showAddForm" class="empty-state">
      <span class="empty-icon">📋</span>
      <p class="empty-text">还没有预算类型，点击下方添加</p>
    </div>

    <!-- 类型列表 -->
    <div v-for="cat in categories" :key="cat.id" class="cat-card" :class="{ overage: remainingOf(cat.id) < 0 }">
      <!-- 类型标题行 -->
      <header class="cat-header" @click="toggleCollapse(cat.id)">
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-budget">预算 {{ formatMoney(cat.budget) }}</span>
        <span class="cat-spent">已花 {{ formatMoney(spentOf(cat.id)) }}</span>
        <span class="cat-remaining" :class="remainingClass(remainingOf(cat.id))">
          剩余 {{ formatRemaining(remainingOf(cat.id)) }}
        </span>
        <span class="cat-toggle" :class="{ collapsed: isCollapsed(cat.id) }">›</span>
      </header>

      <!-- 类型操作按钮（不参与折叠） -->
      <div class="cat-actions" @click.stop>
        <button class="cat-edit-btn" @click="openEditForm(cat)">修改</button>
        <button class="cat-delete-btn" @click="handleDeleteCategory(cat)">删除类型</button>
      </div>

      <!-- 编辑表单（内联） -->
      <div v-if="editingCatId === cat.id" class="cat-edit-form" @click.stop>
        <input
          v-model="editCatName"
          type="text"
          class="cat-name-input"
          placeholder="类型名称"
          @keyup.enter="confirmEditForm"
        />
        <input
          v-model="editCatBudget"
          type="number"
          step="0.01"
          min="0"
          class="cat-budget-input"
          placeholder="每月预算"
          @keyup.enter="confirmEditForm"
        />
        <div class="cat-form-actions">
          <button class="cat-confirm" @click="confirmEditForm">确认修改</button>
          <button class="cat-cancel" @click="cancelEditForm">取消</button>
        </div>
      </div>

      <!-- 折叠区：消费记录 + 添加消费 -->
      <div v-show="!isCollapsed(cat.id)" class="cat-body">
        <!-- 添加消费入口 -->
        <button
          v-if="activeExpenseCatId !== cat.id"
          class="add-expense-btn"
          @click.stop="openExpenseForm(cat.id)"
        >+ 记一笔</button>

        <!-- 添加消费表单 -->
        <div v-else class="expense-form" @click.stop>
          <div class="expense-form-row">
            <input
              v-model="expenseAmount"
              type="number"
              step="0.01"
              min="0"
              class="expense-amount-input"
              placeholder="金额"
              @keyup.enter="confirmExpenseForm(cat)"
            />
            <input
              v-model="expenseNote"
              type="text"
              class="expense-note-input"
              placeholder="详情（可选）"
              @keyup.enter="confirmExpenseForm(cat)"
            />
          </div>
          <div class="expense-form-actions">
            <button class="expense-confirm" @click="confirmExpenseForm(cat)">确认</button>
            <button class="expense-cancel" @click="cancelExpenseForm">取消</button>
          </div>
        </div>

        <!-- 本月消费记录列表 -->
        <div class="expense-list">
          <div v-if="expensesOf(cat.id).length === 0" class="expense-empty">本月暂无消费记录</div>
          <div
            v-for="exp in expensesOf(cat.id)"
            :key="exp.id"
            class="expense-item"
          >
            <span class="expense-amount">-{{ formatMoney(exp.amount) }}</span>
            <div class="expense-main">
              <span v-if="exp.note" class="expense-note">{{ exp.note }}</span>
              <span v-else class="expense-note placeholder">（无详情）</span>
              <span class="expense-date">{{ exp.date }}</span>
            </div>
            <button class="expense-delete" @click="handleDeleteExpense(exp)">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加预算类型（底部） -->
    <div class="add-area">
      <button
        v-if="!showAddForm"
        class="add-cat-btn"
        @click="openAddForm"
      >+ 添加预算类型</button>
      <div v-else class="cat-form" @click.stop>
        <input
          v-model="newCatName"
          type="text"
          class="cat-name-input"
          placeholder="类型名称（如：餐饮）"
          @keyup.enter="confirmAddForm"
        />
        <input
          v-model="newCatBudget"
          type="number"
          step="0.01"
          min="0"
          class="cat-budget-input"
          placeholder="每月预算"
          @keyup.enter="confirmAddForm"
        />
        <div class="cat-form-actions">
          <button class="cat-confirm" @click="confirmAddForm">确认</button>
          <button class="cat-cancel" @click="cancelAddForm">取消</button>
        </div>
      </div>
    </div>

    <!-- 超支警告条（浮动） -->
    <div v-if="warningMessage" class="warning-bar" @click="dismissWarning">
      <span class="warning-text">⚠ {{ warningMessage }}</span>
      <span class="warning-close">点击关闭</span>
    </div>
  </div>
</template>

<style scoped>
/* 视图根容器 */
.manage-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  padding-bottom: 12px;
}

/* 添加预算区（底部，占满宽度） */
.add-area {
  display: flex;
  width: 100%;
}

.add-cat-btn {
  flex: 1;
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--color-text-primary);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-family-sans);
  cursor: pointer;
}

/* 类型表单（新增/编辑通用） */
.cat-form,
.cat-edit-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
}

.cat-name-input,
.cat-budget-input {
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

.cat-name-input {
  flex: 1;
  min-width: 120px;
}

.cat-budget-input {
  width: 110px;
}

.cat-form-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.cat-confirm,
.cat-cancel {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.cat-confirm {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
}

.cat-cancel {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
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
  margin: 0;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* 类型卡片（占满可用宽度） */
.cat-card {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  overflow: hidden;
}

.cat-card.overage {
  border-color: #C76B5E;
}

/* 标题行（左右占满分布） */
.cat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}

.cat-name {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.cat-budget,
.cat-spent {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.cat-remaining {
  flex: 1;
  text-align: right;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
}

.rem-positive {
  color: #6BAE75;
}

.rem-negative {
  color: #C76B5E;
}

.rem-zero {
  color: var(--color-text-tertiary);
}

.cat-toggle {
  font-size: 18px;
  color: var(--color-text-tertiary);
  transition: transform 0.2s;
  line-height: 1;
}

.cat-toggle.collapsed {
  transform: rotate(90deg);
}

/* 类型操作按钮 */
.cat-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;
}

.cat-edit-btn,
.cat-delete-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.cat-edit-btn {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
}

.cat-delete-btn {
  border-color: #BF6060;
  background: transparent;
  color: #BF6060;
}

/* 折叠区 */
.cat-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--color-border-divider);
}

/* 添加消费按钮 */
.add-expense-btn {
  padding: 8px;
  border: 1px dashed var(--color-text-secondary);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-family-sans);
  cursor: pointer;
}

/* 消费表单 */
.expense-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expense-form-row {
  display: flex;
  gap: 8px;
}

.expense-amount-input,
.expense-note-input {
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

.expense-amount-input {
  width: 100px;
}

.expense-note-input {
  flex: 1;
  min-width: 0;
}

.expense-form-actions {
  display: flex;
  gap: 8px;
}

.expense-confirm,
.expense-cancel {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.expense-confirm {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
}

.expense-cancel {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
}

/* 消费记录列表 */
.expense-list {
  display: flex;
  flex-direction: column;
}

.expense-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.expense-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-divider);
}

.expense-item:last-child {
  border-bottom: none;
}

.expense-amount {
  min-width: 70px;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  color: #C76B5E;
}

.expense-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.expense-note {
  font-size: 12px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense-note.placeholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.expense-date {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.expense-delete {
  width: 22px;
  height: 22px;
  border: 1px solid #BF6060;
  border-radius: var(--radius-full);
  background: transparent;
  color: #BF6060;
  font-size: 13px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

/* 超支警告条 */
.warning-bar {
  position: fixed;
  left: 50%;
  bottom: 80px;
  transform: translateX(-50%);
  z-index: 30;
  max-width: 92%;
  padding: 10px 16px;
  background: #C76B5E;
  color: #fff;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(199, 107, 94, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-text {
  flex: 1;
}

.warning-close {
  font-size: 11px;
  opacity: 0.85;
  white-space: nowrap;
}
</style>
