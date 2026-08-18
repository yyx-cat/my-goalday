<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { getTodayDate, addDays, formatChineseDate } from '@/utils/date'

const todoStore = useTodoStore()

// 当前选中的日期（YYYY-MM-DD 格式）
const currentDate = ref<string>(getTodayDate())

// 新任务输入框内容
const newTaskText = ref<string>('')

// 滑动手势相关变量
let touchStartX = 0
const SWIPE_THRESHOLD = 50 // 滑动触发阈值（像素）

/**
 * 页面过渡动画方向：'left' 右滑到下一天，'right' 左滑到上一天
 */
const slideDirection = ref<'left' | 'right'>('left')
const isAnimating = ref<boolean>(false)

// ========== 计算属性 ==========

/**
 * 当前日期的中文显示（如：2026年8月18日 · 星期二）
 */
const dateDisplay = computed<string>(() => {
  return formatChineseDate(currentDate.value)
})

/**
 * 是否是今天
 */
const isToday = computed<boolean>(() => currentDate.value === getTodayDate())

/**
 * 当前日期的任务列表
 */
const currentTodos = computed(() => {
  return todoStore.getTodosByDate(currentDate.value)
})

/**
 * 当前日期的已完成数量
 */
const doneCount = computed<number>(() => {
  return todoStore.getDateDoneCount(currentDate.value)
})

/**
 * 当前日期的任务总数
 */
const totalCount = computed<number>(() => {
  return todoStore.getDateTotalCount(currentDate.value)
})

/**
 * 当前日期的完成进度
 */
const progress = computed<number>(() => {
  return todoStore.getDateProgress(currentDate.value)
})

// ========== 方法 ==========

/**
 * 切换到上一天
 */
function goPrevDay(): void {
  if (isAnimating.value) return
  slideDirection.value = 'right'
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, -1)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 切换到下一天
 */
function goNextDay(): void {
  if (isAnimating.value) return
  slideDirection.value = 'left'
  isAnimating.value = true
  currentDate.value = addDays(currentDate.value, 1)
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 回到今天
 */
function goToday(): void {
  if (isToday.value) return
  // 如果切换方向不明，默认从左滑入
  const today = getTodayDate()
  slideDirection.value = today > currentDate.value ? 'left' : 'right'
  isAnimating.value = true
  currentDate.value = today
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

/**
 * 添加任务
 */
function handleAddTask(): void {
  const text = newTaskText.value.trim()
  if (!text) return
  todoStore.addTodo(text, currentDate.value)
  newTaskText.value = ''
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

// ========== 手势滑动处理 ==========

/**
 * 触摸开始
 * @param e - 触摸事件
 */
function handleTouchStart(e: TouchEvent): void {
  touchStartX = e.touches[0].clientX
}

/**
 * 触摸结束
 * @param e - 触摸事件
 */
function handleTouchEnd(e: TouchEvent): void {
  const touchEndX = e.changedTouches[0].clientX
  const diff = touchStartX - touchEndX

  // 左滑（手指向左移动）→ 切换到下一天
  if (diff > SWIPE_THRESHOLD) {
    goNextDay()
  }
  // 右滑（手指向右移动）→ 切换到上一天
  else if (diff < -SWIPE_THRESHOLD) {
    goPrevDay()
  }
}

// 组件挂载时加载数据
onMounted(() => {
  todoStore.loadTodos()
})
</script>

<template>
  <div class="schedule-view">
    <!-- 任务 2.1：日期导航栏 -->
    <header class="date-nav">
      <button class="nav-btn" @click="goPrevDay" :disabled="isAnimating">‹</button>
      <div class="date-center">
        <p class="date-text">{{ dateDisplay }}</p>
        <button
          v-if="!isToday"
          class="today-btn"
          @click="goToday"
        >今天</button>
      </div>
      <button class="nav-btn" @click="goNextDay" :disabled="isAnimating">›</button>
    </header>

    <!-- 任务列表区域（支持手势滑动） -->
    <div
      class="task-list-area"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- 页面过渡动画容器 -->
      <div
        class="task-list-container"
        :class="[isAnimating ? `slide-${slideDirection}` : '']"
      >
        <!-- 任务列表 -->
        <div class="task-list">
          <div
            v-for="todo in currentTodos"
            :key="todo.id"
            class="task-card"
            :class="{ completed: todo.done }"
          >
            <!-- 复选框 -->
            <button class="check-btn" @click="handleToggleTodo(todo.id)">
              {{ todo.done ? '☑' : '☐' }}
            </button>

            <!-- 任务文字 -->
            <span class="task-text">{{ todo.text }}</span>

            <!-- 删除按钮 -->
            <button class="delete-btn" @click="handleDeleteTodo(todo.id)">✕</button>
          </div>

          <!-- 空状态提示 -->
          <div v-if="totalCount === 0" class="empty-tip">
            <p>✨ 今天还没有待办，写一件小目标吧~</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部区域：进度 + 添加任务 -->
    <footer class="bottom-area">
      <!-- 进度显示 -->
      <div class="progress-section">
        <div class="progress-text">
          <span>已完成 {{ doneCount }}/{{ totalCount }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: progress + '%' }"
          ></div>
        </div>
      </div>

      <!-- 添加任务输入框 -->
      <div class="add-task-area">
        <input
          v-model="newTaskText"
          placeholder="✍️ 写下一件事..."
          class="task-input"
          @keyup.enter="handleAddTask"
        />
        <button class="add-btn" @click="handleAddTask">+</button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.schedule-view {
  min-height: 100%;
  width: 100%;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========== 日期导航栏 ========== */
.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  background: #FDF8F0;
  border-bottom: 1px solid #F0E8D8;
  flex-shrink: 0;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid #E8DFD3;
  border-radius: 50%;
  background: #FFFEF9;
  color: #8B6539;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.nav-btn:hover:not(:disabled) {
  border-color: #C4A375;
  background: #FAF8F5;
  transform: scale(1.05);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-center {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.date-text {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  letter-spacing: 0.5px;
}

.today-btn {
  padding: 2px 10px;
  border: 1px solid #C4A375;
  border-radius: 12px;
  background: transparent;
  color: #8B6539;
  font-size: 11px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s;
}

.today-btn:hover {
  background: #EFE4D4;
}

/* ========== 任务列表区域 ========== */
.task-list-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.task-list-container {
  width: 100%;
  height: 100%;
  padding: 12px 16px;
  overflow-y: auto;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

/* 滑动过渡动画 */
.slide-left {
  animation: slideOutLeft 0.3s ease-out, slideInRight 0.3s ease-out 0.15s;
}

.slide-right {
  animation: slideOutRight 0.3s ease-out, slideInLeft 0.3s ease-out 0.15s;
}

@keyframes slideOutLeft {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(-30px); opacity: 0.3; }
}

@keyframes slideInRight {
  0% { transform: translateX(30px); opacity: 0.3; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(30px); opacity: 0.3; }
}

@keyframes slideInLeft {
  0% { transform: translateX(-30px); opacity: 0.3; }
  100% { transform: translateX(0); opacity: 1; }
}

/* 任务列表滚动条 */
.task-list-container::-webkit-scrollbar {
  width: 4px;
}

.task-list-container::-webkit-scrollbar-thumb {
  background: #D4C5B0;
  border-radius: 10px;
}

.task-list-container::-webkit-scrollbar-track {
  background: transparent;
}

/* 任务卡片列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 任务卡片 */
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FDF8F0;
  border-radius: 10px;
  border: 1px solid #F0E8D8;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.03);
  transition: all 0.2s;
}

.task-card:hover {
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.05);
}

.task-card.completed {
  background: #FAF8F5;
  border-color: #E8DFD3;
  opacity: 0.75;
}

/* 复选框 */
.check-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 22px;
  color: #9C876C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s, transform 0.1s;
  padding: 0;
}

.check-btn:hover {
  color: #8B6539;
  transform: scale(1.1);
}

.task-card.completed .check-btn {
  color: #A8824F;
}

/* 任务文字 */
.task-text {
  flex: 1;
  font-size: 15px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  word-break: break-word;
  line-height: 1.5;
}

.task-card.completed .task-text {
  text-decoration: line-through;
  color: #B8A68E;
}

/* 删除按钮 */
.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #B8A68E;
  font-size: 16px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
}

.delete-btn:hover {
  background: #FBF0F0;
  color: #A05555;
}

/* 空状态提示 */
.empty-tip {
  text-align: center;
  padding: 40px 20px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  font-size: 14px;
}

.empty-tip p {
  margin: 0;
}

/* ========== 底部区域 ========== */
.bottom-area {
  flex-shrink: 0;
  background: #FDF8F0;
  border-top: 1px solid #F0E8D8;
  padding: 12px 16px;
}

/* 进度显示 */
.progress-section {
  margin-bottom: 12px;
}

.progress-text {
  margin-bottom: 6px;
  font-size: 12px;
  color: #7D6A52;
  font-family: 'Noto Serif SC', '思源宋体', serif;
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
  min-width: 0;
  background: linear-gradient(90deg, #C4A375, #A8824F);
  border-radius: 999px;
  transition: width 0.35s ease;
}

/* 添加任务区 */
.add-task-area {
  display: flex;
  gap: 10px;
}

.task-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid #E8DFD3;
  border-radius: 10px;
  background: #FFFEF9;
  font-size: 15px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #5E4F3D;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.task-input::placeholder {
  color: #B8A68E;
}

.task-input:focus {
  border-color: #C4A375;
  box-shadow: 0 0 0 3px rgba(196, 163, 117, 0.15);
}

.add-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 22px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
  flex-shrink: 0;
}

.add-btn:hover {
  background: #8B6539;
}

.add-btn:active {
  transform: scale(0.95);
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .schedule-view {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .date-nav {
    padding: 16px 12px;
  }

  .date-text {
    font-size: 15px;
  }

  .task-list-container {
    padding: 10px 12px;
  }

  .task-card {
    padding: 10px 12px;
  }

  .task-text {
    font-size: 14px;
  }

  .bottom-area {
    padding: 10px 12px;
  }
}
</style>
