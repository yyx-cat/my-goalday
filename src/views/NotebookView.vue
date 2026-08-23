<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { getTodayDate } from '@/utils/date'
import NotebookIndexMode from '@/components/NotebookIndexMode.vue'
import NotebookBookMode from '@/components/NotebookBookMode.vue'
import type { NotebookMode } from '@/types/notebook'

const todoStore = useTodoStore()

// 从 App.vue 根层级注入的全局方法
/**
 * Tab 切换方法（空状态里"去日程添加"会用到，以及恢复全局底部栏）
 */
const switchTab = inject<(tab: 'schedule' | 'notebook' | 'profile') => void>('switchTab', () => {
  // 默认空函数：外层未 provide 时不报错
})
/**
 * 控制全局底部栏显隐的方法（手账 Tab 有自己的底部导航，所以打开手账时隐藏全局底部栏）
 */
const setTabBarHidden = inject<(hidden: boolean) => void>('setTabBarHidden', () => {
  // 默认空函数：外层未 provide 时不报错
})
/**
 * 获取当前激活的 Tab（用于响应式判断"自己是否处于激活状态"）
 * 因为 App.vue 用 v-show 切换 Tab，所有 Tab 会同时 mount，
 * 不能在 onMounted 里直接 setTabBarHidden(true)——那样会一进来就永久隐藏全局底部栏
 */
const getActiveTab = inject<() => 'schedule' | 'notebook' | 'profile'>('getActiveTab', () => 'schedule')

/**
 * 当前手账 Tab 是否处于激活状态
 * 用 computed 包裹 getActiveTab()，使其响应 activeTab 的变化
 */
const isNotebookActive = computed<boolean>(() => {
  return getActiveTab() === 'notebook'
})

// ========== 状态 ==========

/**
 * 当前手账展示模式：'index' = 索引模式，'book' = 书本模式
 * 默认用 'index'（给用户快速定位的能力，再按需切到沉浸式书本）
 */
const currentMode = ref<NotebookMode>('index')

/**
 * 当前聚焦日期（跨模式状态保持）
 * 切换模式时会以此为锚点，跳转到两种模式对应的视图
 */
const currentFocusDate = ref<string>(getTodayDate())

// ========== 计算属性 ==========

/**
 * 是否有任何任务数据：决定"显示空状态引导"还是"显示对应模式内容"
 */
const hasAnyData = computed<boolean>(() => {
  return todoStore.todos.length > 0
})

/**
 * 切换到索引模式，并让索引模式聚焦到指定日期（默认 currentFocusDate）
 * @param fromDate - 希望在索引模式里高亮/展示的日期
 */
function switchToIndex(fromDate?: string): void {
  if (fromDate) {
    currentFocusDate.value = fromDate
  }
  currentMode.value = 'index'
}

/**
 * 切换到书本模式，并让书本模式跳转到包含指定日期的配对（默认 currentFocusDate）
 * 若目标日期没有对应的任务页，书本会回落到最新一页
 * @param fromDate - 希望在书本模式里展示的日期
 */
function switchToBook(fromDate?: string): void {
  if (fromDate) {
    currentFocusDate.value = fromDate
  }
  currentMode.value = 'book'
}

/**
 * 通用模式切换入口（供子组件 changeMode 事件 / 顶部切换按钮共同使用）
 * @param mode - 目标模式
 */
function switchMode(mode: NotebookMode): void {
  if (mode === 'index') {
    switchToIndex()
  } else {
    switchToBook()
  }
}

/**
 * 处理子组件内部日期变化（update:focusDate）：把最新聚焦日期同步到父级状态
 * @param date - 子组件 emit 回来的聚焦日期
 */
function handleFocusDateUpdate(date: string): void {
  if (date && date !== currentFocusDate.value) {
    currentFocusDate.value = date
  }
}

/**
 * 空状态按钮：跳转到「日程」Tab 让用户先添加任务
 */
function goScheduleTab(): void {
  switchTab('schedule')
}

// ========== 生命周期 ==========

onMounted(() => {
  // 确保 store 中 todos 已加载
  if (todoStore.todos.length === 0) {
    todoStore.loadTodos()
  }
})

/**
 * 响应"手账是否激活"的状态：进入手账时隐藏全局底部栏（手账有自己的底部栏），
 * 离开手账时恢复全局底部栏。这样三个 Tab 切换不会受影响。
 */
watch(
  isNotebookActive,
  (active) => {
    setTabBarHidden(active)
  },
  { immediate: true },
)

// 数据从无到有时（例如用户刚去日程添加了新任务回来），把 focusDate 拉回今天便于操作
watch(hasAnyData, (nowHas, had) => {
  if (!had && nowHas) {
    currentFocusDate.value = getTodayDate()
  }
})
</script>

<template>
  <div class="notebook-container">
    <!-- 顶部：模式切换按钮（📋 索引模式 / 📖 书本模式） -->
    <div class="mode-switcher">
      <button
        class="mode-btn"
        :class="{ active: currentMode === 'index' }"
        @click="switchMode('index')"
      >📋 索引模式</button>

      <button
        class="mode-btn"
        :class="{ active: currentMode === 'book' }"
        @click="switchMode('book')"
      >📖 书本模式</button>
    </div>

    <!-- 统一空状态：无任何任务数据时不渲染子组件，直接引导去日程 -->
    <div class="notebook-empty" v-if="!hasAnyData">
      <div class="notebook-empty-card">
        <div class="notebook-empty-icon">📒</div>
        <div class="notebook-empty-title">还没有记录，先去日程里添加任务吧~</div>
        <button class="notebook-empty-btn" @click="goScheduleTab">去日程添加</button>
      </div>
    </div>

    <!-- 有数据：按当前模式条件渲染，同时绑定 focusDate 和 update:focusDate 做跨模式日期保持 -->
    <template v-else>
      <!-- 索引模式：左 7 天列表 + 右 选中日详情 -->
      <NotebookIndexMode
        v-if="currentMode === 'index'"
        :focus-date="currentFocusDate"
        @change-mode="switchMode"
        @update:focus-date="handleFocusDateUpdate"
      />

      <!-- 书本模式：左某天 + 右下一天，支持滑动翻页 -->
      <NotebookBookMode
        v-else
        :focus-date="currentFocusDate"
        @change-mode="switchMode"
        @update:focus-date="handleFocusDateUpdate"
      />
    </template>
  </div>
</template>

<style scoped>
/* ========== 容器整体 ========== */
.notebook-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  overflow: hidden;
  position: relative;
}

/* ========== 顶部：模式切换按钮 ========== */
.mode-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 12px 6px;
  flex-shrink: 0;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  border: 1px solid var(--color-border-divider);
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
  letter-spacing: 0.3px;
}

.mode-btn:hover {
  border-color: var(--color-text-primary);
  color: var(--color-text-primary);
}

.mode-btn.active {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: #fff;
  box-shadow: 0 3px 10px rgba(26, 26, 26, 0.15);
}

/* ========== 统一空状态引导卡 ========== */
.notebook-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px 40px;
}

.notebook-empty-card {
  background: #FDFBF7;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  padding: 40px 28px;
  width: min(90%, 480px);
  text-align: center;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 5px 5px;
}

.notebook-empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
}

.notebook-empty-title {
  font-size: 16px;
  color: var(--color-text-primary);
  line-height: 1.5;
  margin-bottom: 22px;
}

.notebook-empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--color-text-primary);
  color: #fff;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.notebook-empty-btn:hover {
  opacity: 0.88;
}
</style>
