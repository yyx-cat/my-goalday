<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'

const store = useTodoStore()

// 新待办输入框内容
const newTodoText = ref<string>('')

/**
 * 获取格式化的今日日期展示（如：8月17日 · 星期一）
 */
const today = computed<string>(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekDay = weekNames[now.getDay()]
  return `${month}月${day}日 · ${weekDay}`
})

/**
 * 今日已完成数量
 */
const doneCount = computed<number>(() => store.todayDoneCount)

/**
 * 今日待办总数
 */
const totalCount = computed<number>(() => store.todayTotalCount)

/**
 * 完成进度百分比
 */
const progress = computed<number>(() => store.todayProgress)

/**
 * 添加一条待办
 */
function handleAddTodo(): void {
  if (!newTodoText.value.trim()) return
  store.addTodo(newTodoText.value)
  newTodoText.value = ''
}

/**
 * 切换待办完成状态
 * @param id - 待办 id
 */
function handleToggle(id: string): void {
  store.toggleTodo(id)
}

/**
 * 删除待办
 * @param id - 待办 id
 */
function handleDelete(id: string): void {
  store.deleteTodo(id)
}

// 组件挂载时加载数据
onMounted(() => {
  store.loadTodos()
})
</script>

<template>
  <div class="todo-module">
    <!-- 标题区：手账风格，带装饰线 -->
    <div class="module-header">
      <h2 class="handwriting-font">📋 待办清单</h2>
      <span class="date-badge">{{ today }}</span>
    </div>

    <!-- 输入区：仿手写输入框 -->
    <div class="todo-input-area">
      <input
        v-model="newTodoText"
        placeholder="✍️ 写下一件要做的事..."
        class="handwriting-input"
        @keyup.enter="handleAddTodo"
      />
      <button class="add-btn" @click="handleAddTodo">+ 添加</button>
    </div>

    <!-- 任务列表：每项是便签卡片 -->
    <div class="todo-list">
      <div
        v-for="todo in store.todayTodos"
        :key="todo.id"
        class="todo-card"
        :class="{ completed: todo.done }"
      >
        <!-- 勾选框：手绘风格 -->
        <button class="check-btn" @click="handleToggle(todo.id)">
          {{ todo.done ? '☑' : '☐' }}
        </button>

        <!-- 任务文字 -->
        <span class="todo-text">{{ todo.text }}</span>

        <!-- 删除按钮 -->
        <button class="delete-btn" @click="handleDelete(todo.id)">✕</button>
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
/* ========== 模块整体容器 ========== */
.todo-module {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  /* 纸张质感：米白背景 + 柔和阴影 + 细边框 */
  background: #FFF9F0;
  border-radius: 16px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.05),
    0 8px 24px rgba(0, 0, 0, 0.06);
  padding: 24px 20px;
  border: 1px solid #F0E8D8;
  box-sizing: border-box;
}

/* ========== 标题区 ========== */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  padding-bottom: 12px;
  /* 装饰线：模拟手账本分隔线 */
  border-bottom: 2px dashed #E8DFD3;
}

.handwriting-font {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  /* 手写字体：霞鹜文楷优先 */
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  letter-spacing: 1px;
}

.date-badge {
  /* 日期小标签：复古色底 */
  background: #EFE4D4;
  color: #8B6539;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

/* ========== 输入区 ========== */
.todo-input-area {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.handwriting-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid #E8DFD3;
  border-radius: 10px;
  background: #FFFEF9;
  font-size: 15px;
  /* 手写输入风格 */
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.handwriting-input::placeholder {
  color: #B8A68E;
}

.handwriting-input:focus {
  border-color: #C4A375;
  box-shadow: 0 0 0 3px rgba(196, 163, 117, 0.15);
}

.add-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 14px;
  font-weight: 600;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.add-btn:hover {
  background: #8B6539;
}

.add-btn:active {
  transform: scale(0.97);
}

/* ========== 任务列表 ========== */
.todo-list {
  margin-bottom: 20px;
  min-height: 60px;
}

/* 便签卡片样式 */
.todo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 米白纸色 */
  background: #FDF8F0;
  border-radius: 12px;
  /* 柔和阴影，模拟纸张浮起感 */
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04);
  padding: 12px 16px;
  margin-bottom: 8px;
  /* 细边框模拟纸张边缘 */
  border: 1px solid #F0E8D8;
  transition: all 0.2s;
}

.todo-card:hover {
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.08),
    0 6px 16px rgba(0, 0, 0, 0.06);
}

/* 完成状态：整体变淡灰 */
.todo-card.completed {
  background: #FAF8F5;
  border-color: #E8DFD3;
  opacity: 0.75;
}

/* 勾选框：手绘风格 */
.check-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #9C876C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, transform 0.1s;
}

.check-btn:hover {
  color: #8B6539;
  transform: scale(1.1);
}

/* 任务文字 */
.todo-text {
  flex: 1;
  font-size: 15px;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  word-break: break-all;
  line-height: 1.5;
}

/* 完成状态：划掉 + 变淡 */
.todo-card.completed .todo-text {
  text-decoration: line-through;
  color: #B8A68E;
}

/* 删除按钮 */
.delete-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: #B8A68E;
  font-size: 14px;
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

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 24px 12px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  font-size: 14px;
}

.empty-tip p {
  margin: 0;
}

/* ========== 底部统计 & 进度条 ========== */
.module-footer {
  padding-top: 14px;
  border-top: 2px dashed #E8DFD3;
}

.module-footer > span {
  display: block;
  font-size: 13px;
  color: #7D6A52;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  margin-bottom: 8px;
}

/* 进度条容器 */
.progress-bar {
  width: 100%;
  height: 8px;
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
