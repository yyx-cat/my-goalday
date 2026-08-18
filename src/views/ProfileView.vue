<script setup lang="ts">
import { computed } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useHabitStore } from '@/store/modules/habitStore'
import { useDiaryStore } from '@/store/modules/diaryStore'
import { useNotebookStore } from '@/store/modules/notebookStore'
import { onMounted } from 'vue'

const todoStore = useTodoStore()
const habitStore = useHabitStore()
const diaryStore = useDiaryStore()
const notebookStore = useNotebookStore()

// 统计数据
const stats = computed(() => [
  { icon: '📋', label: '今日待办', value: `${todoStore.todayDoneCount}/${todoStore.todayTotalCount}` },
  { icon: '🎯', label: '习惯数', value: `${habitStore.todayCheckInCount}/${habitStore.habitsCount}` },
  { icon: '📖', label: '日记数', value: `${diaryStore.diaries.length}` },
  { icon: '📒', label: '手账本', value: `${notebookStore.notebooks.length}` },
])

// 设置项（占位演示）
const settings = [
  { icon: '🎨', label: '主题外观', value: '复古手账' },
  { icon: '🔔', label: '提醒设置', value: '未开启' },
  { icon: '💾', label: '数据备份', value: '本地存储' },
  { icon: 'ℹ️', label: '关于应用', value: 'v1.0.0' },
]

// 组件挂载时加载各模块数据，用于统计展示
onMounted(() => {
  todoStore.loadTodos()
  habitStore.loadHabits()
  diaryStore.loadDiaries()
  notebookStore.loadNotebooks()
})
</script>

<template>
  <div class="profile-view">
    <!-- 顶部标题区 -->
    <header class="view-header">
      <h1 class="view-title">⚙️ 我的</h1>
    </header>

    <!-- 用户头像卡片 -->
    <div class="user-card">
      <div class="avatar">😊</div>
      <div class="user-info">
        <p class="user-name">手账爱好者</p>
        <p class="user-desc">用一本手账，记录每一天</p>
      </div>
    </div>

    <!-- 统计数据网格 -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-item">
        <span class="stat-icon">{{ stat.icon }}</span>
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- 设置列表 -->
    <div class="settings-list">
      <div v-for="setting in settings" :key="setting.label" class="setting-item">
        <span class="setting-icon">{{ setting.icon }}</span>
        <span class="setting-label">{{ setting.label }}</span>
        <span class="setting-value">{{ setting.value }}</span>
        <span class="setting-arrow">›</span>
      </div>
    </div>

    <!-- 占位提示 -->
    <p class="placeholder-hint">（个人中心占位 · 后续阶段实现完整功能）</p>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.profile-view {
  min-height: 100%;
  width: 100%;
  background: #FAF8F5;
  padding: 24px 20px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

/* ========== 顶部标题区 ========== */
.view-header {
  text-align: center;
  margin-bottom: 4px;
}

.view-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
  letter-spacing: 2px;
}

/* ========== 用户卡片 ========== */
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FDF8F0;
  border: 1px solid #F0E8D8;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #EFE4D4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.user-desc {
  margin: 0;
  font-size: 12px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 统计数据网格 ========== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  background: #FDF8F0;
  border: 1px solid #F0E8D8;
  border-radius: 10px;
}

.stat-icon {
  font-size: 22px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #5E4F3D;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

.stat-label {
  font-size: 12px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 设置列表 ========== */
.settings-list {
  display: flex;
  flex-direction: column;
  background: #FDF8F0;
  border: 1px solid #F0E8D8;
  border-radius: 12px;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #F0E8D8;
  cursor: pointer;
  transition: background 0.2s;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: #FAF8F5;
}

.setting-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.setting-label {
  flex: 1;
  font-size: 14px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.setting-value {
  font-size: 12px;
  color: #9C876C;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

.setting-arrow {
  color: #B8A68E;
  font-size: 16px;
}

/* ========== 占位提示 ========== */
.placeholder-hint {
  margin: 8px 0 0 0;
  text-align: center;
  font-size: 11px;
  color: #B8A68E;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .profile-view {
    padding: 16px 14px 24px;
  }

  .view-title {
    font-size: 22px;
  }
}
</style>
