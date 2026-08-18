<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'

// 接收父组件（Notebook）传入的页面数据
const props = defineProps<{
  data?: { title?: string }
}>()

const todoStore = useTodoStore()

// 新待办输入框内容
const newTodoText = ref<string>('')

/**
 * 今日待办列表（从 store 计算属性获取）
 */
const todos = computed(() => todoStore.todayTodos)

/**
 * 今日已完成数量
 */
const doneCount = computed<number>(() => todoStore.todayDoneCount)

/**
 * 今日待办总数
 */
const totalCount = computed<number>(() => todoStore.todayTotalCount)

/**
 * 完成进度百分比 (0-100)
 */
const progress = computed<number>(() => todoStore.todayProgress)

/**
 * 今日日期展示（如：2026年8月18日）
 */
const today = computed<string>(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

/**
 * 模块标题（默认“📋 待办清单”）
 */
const moduleTitle = computed<string>(() => props.data?.title || '📋 待办清单')

/**
 * 添加一条待办
 */
function addTodo(): void {
  const text = newTodoText.value.trim()
  if (!text) return
  todoStore.addTodo(text)
  newTodoText.value = ''
}

/**
 * 切换待办完成状态
 * @param id - 待办 id
 */
function toggleTodo(id: string): void {
  todoStore.toggleTodo(id)
}

/**
 * 删除待办
 * @param id - 待办 id
 */
function deleteTodo(id: string): void {
  todoStore.deleteTodo(id)
}

// 组件挂载时加载待办数据
onMounted(() => {
  todoStore.loadTodos()
})
</script>

<template>
  <div class="todo-module notebook-page-module">
    <!-- 模块标题（小标题样式） -->
    <h3 class="module-title">{{ moduleTitle }}</h3>

    <!-- 日期显示 -->
    <p class="module-date">{{ today }}</p>

    <!-- 输入区（适配窄版，单行布局） -->
    <div class="todo-input-area">
      <input
        v-model="newTodoText"
        placeholder="✍️ 写下一件要做的事..."
        class="handwriting-input"
        @keyup.enter="addTodo"
      />
    </div>

    <!-- 任务列表（可滚动区域） -->
    <div class="todo-list">
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="todo-card"
        :class="{ completed: todo.done }"
      >
        <!-- 勾选框：手绘风格 -->
        <button class="check-btn" @click="toggleTodo(todo.id)">
          {{ todo.done ? '☑' : '☐' }}
        </button>

        <!-- 任务文字 -->
        <span class="todo-text">{{ todo.text }}</span>

        <!-- 删除按钮 -->
        <button class="delete-btn" @click="deleteTodo(todo.id)">✕</button>
      </div>

      <!-- 空状态提示 -->
      <div v-if="totalCount === 0" class="empty-tip">
        <p>✨ 今天还没有待办，写一件小目标吧~</p>
      </div>
    </div>

    <!-- 底部统计：手账风格的进度 -->
    <div class="module-footer">
      <span>已完成 {{ doneCount }}/{{ totalCount }}</span>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 模块整体容器（适配手账本窄页面） ========== */
.todo-module {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 纸张质感：米白背景 + 细边框 */
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
  /* 手写字体：霞鹜文楷优先 */
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
.todo-input-area {
  margin-bottom: 12px;
}

.handwriting-input {
  width: 100%;
  padding: 8px 12px;
  border: 1.5px solid #E8DFD3;
  border-radius: 8px;
  background: #FFFEF9;
  font-size: 14px;
  /* 手写输入风格 */
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.handwriting-input::placeholder {
  color: #B8A68E;
}

.handwriting-input:focus {
  border-color: #C4A375;
  box-shadow: 0 0 0 2px rgba(196, 163, 117, 0.15);
}

/* ========== 任务列表（可滚动） ========== */
.todo-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 4px;
  padding-right: 4px;
  min-height: 0; /* 让 flex 子项能正确收缩 */
}

/* 自定义滚动条 */
.todo-list::-webkit-scrollbar {
  width: 3px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: #D4C5B0;
  border-radius: 10px;
}

.todo-list::-webkit-scrollbar-track {
  background: transparent;
}

/* 便签卡片样式 */
.todo-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #FDF8F0;
  border-radius: 8px;
  margin-bottom: 6px;
  border: 1px solid #F0E8D8;
  /* 柔和阴影 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.todo-card:hover {
  border-color: #D4C5B0;
  transform: translateY(-1px);
}

/* 完成状态：整体变淡 */
.todo-card.completed {
  background: #FAF8F5;
  opacity: 0.75;
}

/* 勾选框：手绘风格 */
.check-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: #9C876C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, transform 0.1s;
  padding: 0;
}

.check-btn:hover {
  color: #8B6539;
  transform: scale(1.1);
}

/* 任务文字 */
.todo-text {
  flex: 1;
  font-size: 14px;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  word-break: break-word;
  line-height: 1.4;
}

/* 完成状态：划掉 + 变淡 */
.todo-card.completed .todo-text {
  text-decoration: line-through;
  color: #B8A68E;
}

/* 删除按钮 */
.delete-btn {
  flex-shrink: 0;
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
  padding: 0;
}

.delete-btn:hover {
  background: #F5F0EA;
  color: #A05555;
}

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 24px 8px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  font-size: 13px;
}

.empty-tip p {
  margin: 0;
}

/* ========== 底部统计 & 进度条 ========== */
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

/* 进度条容器 */
.progress-bar {
  width: 100%;
  height: 6px;
  background: #F5F0EA;
  border-radius: 999px;
  overflow: hidden;
}

/* 进度条填充 */
.progress-fill {
  height: 100%;
  min-width: 0;
  /* 复古渐变配色 */
  background: linear-gradient(90deg, #C4A375, #A8824F);
  border-radius: 999px;
  transition: width 0.35s ease;
}
</style>
