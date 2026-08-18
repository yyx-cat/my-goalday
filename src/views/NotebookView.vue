<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { BookFlip } from 'vue-turnjs-flip'
import 'vue-turnjs-flip/style.css'
import { useTodoStore } from '@/store/modules/todoStore'
import { formatChineseDate, parseDate, getWeekDay } from '@/utils/date'
import type { Todo } from '@/types/todo'

/**
 * 手账页面数据接口
 * 每一页展示某一天的任务总结
 */
interface NotebookPage {
  /** 日期字符串 (YYYY-MM-DD) */
  date: string
  /** 星期几 */
  weekday: string
  /** 中文格式日期展示 */
  dateDisplay: string
  /** 当天所有任务 */
  todos: Todo[]
  /** 已完成任务列表 */
  doneTodos: Todo[]
  /** 未完成任务列表 */
  undoneTodos: Todo[]
  /** 已完成数量 */
  doneCount: number
  /** 任务总数 */
  totalCount: number
  /** 完成进度百分比 */
  progress: number
  /** 备注（预留字段） */
  note: string
}

const todoStore = useTodoStore()

/**
 * 当前选中的页码（0-based，传给 BookFlip 组件）
 */
const currentPage = ref<number>(0)

/**
 * 动画锁定：防止翻页过程中重复触发
 */
const isFlipping = ref<boolean>(false)

/**
 * 有任务的日期列表（倒序，最新在前）
 */
const dateList = computed<string[]>(() => {
  return todoStore.datesWithTodos
})

/**
 * 手账页面数据列表
 * 每一页展示某一天的总结
 */
const pageDataList = computed<NotebookPage[]>(() => {
  return dateList.value.map(date => {
    const todos = todoStore.getTodosByDate(date)
    const doneTodos = todos.filter(t => t.done)
    const undoneTodos = todos.filter(t => !t.done)
    const doneCount = doneTodos.length
    const totalCount = todos.length
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    // 获取星期几
    const dateObj = parseDate(date)
    const weekday = getWeekDay(dateObj)

    return {
      date,
      weekday,
      dateDisplay: formatChineseDate(date),
      todos,
      doneTodos,
      undoneTodos,
      doneCount,
      totalCount,
      progress,
      note: '',
    }
  })
})

/**
 * 是否有数据
 */
const hasData = computed<boolean>(() => pageDataList.value.length > 0)

/**
 * 总页数
 */
const totalPages = computed<number>(() => pageDataList.value.length)

/**
 * 页码显示文本
 */
const pageIndicator = computed<string>(() => {
  if (!hasData.value) return ''
  return `第 ${Math.min(currentPage.value + 1, totalPages.value)} / ${totalPages.value} 页`
})

// ========== 方法 ==========

/**
 * 切换到下一页
 */
function goNextPage(): void {
  if (!hasData.value || isFlipping.value) return
  if (currentPage.value >= totalPages.value - 1) return
  isFlipping.value = true
  currentPage.value++
  setTimeout(() => {
    isFlipping.value = false
  }, 650)
}

/**
 * 切换到上一页
 */
function goPrevPage(): void {
  if (!hasData.value || isFlipping.value) return
  if (currentPage.value <= 0) return
  isFlipping.value = true
  currentPage.value--
  setTimeout(() => {
    isFlipping.value = false
  }, 650)
}

/**
 * 点击翻页处理
 * @param e - 鼠标点击事件
 */
function handleBookClick(e: MouseEvent): void {
  if (!hasData.value || isFlipping.value) return
  if (totalPages.value <= 1) return

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const halfWidth = rect.width / 2

  // 点击左半页 → 上一页
  if (clickX < halfWidth) {
    goPrevPage()
  }
  // 点击右半页 → 下一页
  else {
    goNextPage()
  }
}

/**
 * 处理左半页触摸
 * @param e - 触摸事件
 */
function handleLeftTouch(e: TouchEvent): void {
  e.preventDefault()
  e.stopPropagation()
  goPrevPage()
}

/**
 * 处理右半页触摸
 * @param e - 触摸事件
 */
function handleRightTouch(e: TouchEvent): void {
  e.preventDefault()
  e.stopPropagation()
  goNextPage()
}

/**
 * 监听数据变化，重置页码
 */
watch(() => dateList.value.length, () => {
  if (currentPage.value >= dateList.value.length) {
    currentPage.value = Math.max(0, dateList.value.length - 1)
  }
})

/**
 * 监听 BookFlip 页码变化
 * @param page - 当前页
 */
function handlePageChange(page: number): void {
  if (page !== currentPage.value) {
    currentPage.value = page
  }
}

// 组件挂载时加载数据
onMounted(() => {
  todoStore.loadTodos()
})
</script>

<template>
  <div class="notebook-view">
    <!-- 空状态 -->
    <div v-if="!hasData" class="empty-state">
      <div class="empty-icon">📒</div>
      <p class="empty-text">还没有记录，先去日程里添加任务吧~</p>
      <button class="empty-tip-text">✨ 去写一件小目标</button>
    </div>

    <!-- 书本容器 -->
    <div v-else class="book-container">
      <!-- BookFlip 组件 -->
      <div class="book-wrapper">
        <!-- 左半页点击区域 -->
        <div class="click-zone left-zone" @click="handleBookClick" @touchstart.passive="handleLeftTouch"></div>
        
        <!-- 右半页点击区域 -->
        <div class="click-zone right-zone" @click="handleBookClick" @touchstart.passive="handleRightTouch"></div>

        <BookFlip
          :current-page="currentPage"
          @update:current-page="handlePageChange"
          :flip-duration="600"
          class="notebook-book"
        >
          <!-- 第一页及以后：动态生成 -->
          <template v-for="(page, index) in pageDataList" :key="index">
            <BookFlipPage>
              <div class="page-content">
                <!-- 日期标题 -->
                <div class="page-header">
                  <h2 class="page-date">{{ page.dateDisplay }}</h2>
                </div>

                <!-- 完成进度条 -->
                <div class="page-progress">
                  <span class="progress-label">进度 {{ page.progress }}%</span>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: page.progress + '%' }"></div>
                  </div>
                  <span class="progress-count">{{ page.doneCount }}/{{ page.totalCount }}</span>
                </div>

                <!-- 已完成任务 -->
                <div v-if="page.doneTodos.length > 0" class="task-section">
                  <h3 class="section-title">已完成</h3>
                  <div
                    v-for="todo in page.doneTodos"
                    :key="todo.id"
                    class="task-item done"
                  >
                    <span class="task-icon">☑</span>
                    <span class="task-text">{{ todo.text }}</span>
                  </div>
                </div>

                <!-- 未完成任务 -->
                <div v-if="page.undoneTodos.length > 0" class="task-section">
                  <h3 class="section-title">未完成</h3>
                  <div
                    v-for="todo in page.undoneTodos"
                    :key="todo.id"
                    class="task-item undone"
                  >
                    <span class="task-icon">☐</span>
                    <span class="task-text">{{ todo.text }}</span>
                  </div>
                </div>

                <!-- 备注区域（预留） -->
                <div v-if="page.note" class="note-section">
                  <h3 class="section-title">备注</h3>
                  <p class="note-text">{{ page.note }}</p>
                </div>

                <!-- 页码 -->
                <div class="page-number">{{ index + 1 }} / {{ pageDataList.length }}</div>
              </div>
            </BookFlipPage>
          </template>
        </BookFlip>
      </div>

      <!-- 底部页码指示器 -->
      <div class="bottom-indicator">
        <span class="indicator-text">{{ pageIndicator }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.notebook-view {
  min-height: 100%;
  width: 100%;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  overflow: hidden;
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.empty-tip-text {
  padding: 10px 24px;
  border: 1px solid #C4A375;
  border-radius: 20px;
  background: transparent;
  color: #8B6539;
  font-size: 14px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: all 0.2s;
}

.empty-tip-text:hover {
  background: #FDF8F0;
  border-color: #A8824F;
}

/* ========== 书本容器 ========== */
.book-container {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.book-wrapper {
  position: relative;
  width: 100%;
  /* 禁用 BookFlip 内部的拖拽触摸事件 */
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}

/* ========== 点击区域覆盖层 ========== */
.click-zone {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  z-index: 100;
  cursor: pointer;
  /* 确保点击事件能捕获 */
  pointer-events: auto;
  /* 视觉提示：微弱的渐变箭头 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.left-zone {
  left: 0;
}

.right-zone {
  right: 0;
}

/* 点击区域的视觉反馈 */
.click-zone:active {
  background: rgba(168, 130, 79, 0.05);
}

/* ========== 书本样式覆盖 ========== */
.notebook-book {
  /* 覆盖 vue-turnjs-flip 的默认样式 */
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 8px;
}

/* 隐藏 BookFlip 默认的导航栏 */
.notebook-book :deep(.nav-bar) {
  display: none !important;
}

.notebook-book :deep(.nav-btn) {
  display: none !important;
}

/* 调整书本外观 */
.notebook-book :deep(.turn-book) {
  background: transparent !important;
  box-shadow: 
    0 12px 40px rgba(94, 79, 61, 0.15),
    0 4px 12px rgba(94, 79, 61, 0.1),
    inset 0 0 0 1px rgba(208, 196, 180, 0.5) !important;
  border-radius: 6px !important;
  /* 禁用默认的 cursor 样式 */
  cursor: default !important;
  max-height: 60vh;
}

.notebook-book :deep(.turn-book:active) {
  cursor: default !important;
}

/* 禁用页面上的触摸事件（防止拖拽） */
.notebook-book :deep(.turn-page) {
  pointer-events: none;
}

/* 调整页面背景为米白色 */
.notebook-book :deep(.turn-page.odd) {
  background: #FDF8F0 !important;
}

.notebook-book :deep(.turn-page.even) {
  background: #FDF8F0 !important;
}

/* 隐藏页面边缘的折痕阴影 */
.notebook-book :deep(.turn-page.odd:after),
.notebook-book :deep(.turn-page.even:after) {
  display: none !important;
}

/* 调整折页包装器样式 */
.notebook-book :deep(.turn-page-wrapper) {
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(94, 79, 61, 0.08);
}

/* 隐藏组件自带的页码指示器 */
.notebook-book :deep(.pg-indicator) {
  display: none !important;
}

/* 调整书本的阴影 */
.notebook-book :deep(.turn-shadow) {
  display: none !important;
}

/* ========== 页面内容 ========== */
.page-content {
  width: 100%;
  height: 100%;
  padding: 28px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* 日期标题 */
.page-header {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px dashed #E8DFD3;
}

.page-date {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 1px;
}

/* 进度条 */
.page-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 12px;
  color: #7D6A52;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #F0E8D8;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  min-width: 0;
  background: linear-gradient(90deg, #C4A375, #A8824F);
  border-radius: 999px;
  transition: width 0.35s ease;
}

.progress-count {
  font-size: 12px;
  color: #9C876C;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  flex-shrink: 0;
}

/* 任务区块 */
.task-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #8B6539;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  padding-bottom: 4px;
  border-bottom: 1px solid #F0E8D8;
}

/* 任务项 */
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #FFFEF9;
  border-radius: 8px;
  border: 1px solid #F0E8D8;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.task-item.done {
  opacity: 0.7;
}

.task-item.done .task-text {
  text-decoration: line-through;
  color: #B8A68E;
}

.task-icon {
  font-size: 16px;
  color: #9C876C;
  flex-shrink: 0;
}

.task-item.done .task-icon {
  color: #A8824F;
}

.task-text {
  flex: 1;
  font-size: 14px;
  color: #5E4F3D;
  word-break: break-word;
  line-height: 1.5;
}

/* 备注区域 */
.note-section {
  margin-top: auto;
  padding: 12px;
  background: #FDF8F0;
  border-radius: 8px;
  border: 1px solid #E8DFD3;
}

.note-text {
  margin: 0;
  font-size: 13px;
  color: #7D6A52;
  line-height: 1.6;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* 页码 */
.page-number {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #B8A68E;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  letter-spacing: 1px;
}

/* ========== 底部指示器 ========== */
.bottom-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 20px;
  background: #FDF8F0;
  border-radius: 16px;
  border: 1px solid #E8DFD3;
}

.indicator-text {
  font-size: 13px;
  color: #7D6A52;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 1px;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .notebook-view {
    padding: 16px 12px;
  }

  .page-content {
    padding: 24px 20px;
  }

  .page-date {
    font-size: 16px;
  }

  .task-text {
    font-size: 13px;
  }

  .notebook-book :deep(.turn-book) {
    max-height: 55vh;
  }
}
</style>