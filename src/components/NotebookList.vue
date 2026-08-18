<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotebookStore } from '@/store/modules/notebookStore'

const notebookStore = useNotebookStore()

// 新建手账本弹窗显隐
const showCreateModal = ref<boolean>(false)

// 新手账本名称
const newName = ref<string>('')

// 新手账本封面色（提供预设色板）
const newColor = ref<string>('#A8824F')

// 预设封面色板
const colorPalette: string[] = [
  '#A8824F', // 复古棕
  '#4E7348', // 墨绿
  '#BF7575', // 脏粉
  '#628BA5', // 雾霾蓝
  '#8B6539', // 深棕
  '#7D6A52', // 暖灰
]

/**
 * 打开新建弹窗
 */
function openCreateModal(): void {
  newName.value = ''
  newColor.value = '#A8824F'
  showCreateModal.value = true
}

/**
 * 确认创建手账本
 */
function handleCreate(): void {
  if (!newName.value.trim()) {
    alert('请输入手账本名称')
    return
  }
  const notebook = notebookStore.createNotebook(newName.value.trim(), newColor.value)
  showCreateModal.value = false
  // 创建后直接打开
  notebookStore.openNotebook(notebook.id)
}

/**
 * 打开手账本（进入查看模式）
 * @param id - 手账本 id
 */
function handleOpen(id: string): void {
  notebookStore.openNotebook(id)
}

/**
 * 编辑手账本配置
 * @param id - 手账本 id
 */
function handleEdit(id: string): void {
  notebookStore.switchNotebook(id)
  notebookStore.navigate('editor')
}

/**
 * 删除手账本
 * @param id - 手账本 id
 * @param name - 手账本名称（用于确认提示）
 */
function handleDelete(id: string, name: string): void {
  if (confirm(`确定删除「${name}」吗？此操作不可恢复。`)) {
    notebookStore.deleteNotebook(id)
  }
}

// 组件挂载时加载手账本列表
onMounted(() => {
  notebookStore.loadNotebooks()
})
</script>

<template>
  <div class="notebook-list-page">
    <!-- 顶部标题区 -->
    <header class="page-header">
      <h1 class="page-title">📒 我的手账本</h1>
      <p class="page-subtitle">选择一本翻翻看，或新建一本</p>
    </header>

    <!-- 操作区 -->
    <div class="actions">
      <button class="primary-btn" @click="openCreateModal">+ 新建手账本</button>
    </div>

    <!-- 手账本网格 -->
    <div v-if="notebookStore.notebooks.length > 0" class="notebook-grid">
      <div
        v-for="notebook in notebookStore.notebooks"
        :key="notebook.id"
        class="notebook-card"
      >
        <!-- 封面 -->
        <div
          class="notebook-cover"
          :style="{ background: notebook.coverColor || '#A8824F' }"
          @click="handleOpen(notebook.id)"
        >
          <span class="cover-icon">📒</span>
          <span class="cover-name">{{ notebook.name }}</span>
          <span class="cover-pages">{{ notebook.pages.length }} 页</span>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <button class="action-btn" @click="handleOpen(notebook.id)">📖 翻开</button>
          <button class="action-btn" @click="handleEdit(notebook.id)">⚙️ 编辑</button>
          <button class="action-btn danger" @click="handleDelete(notebook.id, notebook.name)">
            🗑 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <p>📝 还没有手账本</p>
      <p class="empty-tip">点击上方按钮，创建你的第一本手账吧~</p>
    </div>

    <!-- 新建手账本弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3 class="modal-title">创建新手账本</h3>

        <!-- 名称输入 -->
        <div class="form-group">
          <label class="form-label">手账本名称</label>
          <input
            v-model="newName"
            placeholder="如：我的日常手账"
            class="form-input"
            @keyup.enter="handleCreate"
          />
        </div>

        <!-- 封面色选择 -->
        <div class="form-group">
          <label class="form-label">封面颜色</label>
          <div class="color-palette">
            <button
              v-for="color in colorPalette"
              :key="color"
              class="color-swatch"
              :class="{ active: newColor === color }"
              :style="{ background: color }"
              @click="newColor = color"
            ></button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions">
          <button class="cancel-btn" @click="showCreateModal = false">取消</button>
          <button class="confirm-btn" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.notebook-list-page {
  min-height: 100vh;
  width: 100%;
  background: #FAF8F5;
  padding: 32px 20px;
  box-sizing: border-box;
}

/* ========== 顶部标题区 ========== */
.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
  letter-spacing: 2px;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 操作区 ========== */
.actions {
  text-align: center;
  margin-bottom: 24px;
}

.primary-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s, transform 0.1s;
}

.primary-btn:hover {
  background: #8B6539;
}

.primary-btn:active {
  transform: scale(0.97);
}

/* ========== 手账本网格 ========== */
.notebook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.notebook-card {
  background: #FDF8F0;
  border-radius: 12px;
  border: 1px solid #F0E8D8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.notebook-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

/* 封面 */
.notebook-cover {
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  color: #FFF9F0;
  position: relative;
  transition: filter 0.2s;
}

.notebook-cover:hover {
  filter: brightness(1.1);
}

.cover-icon {
  font-size: 36px;
}

.cover-name {
  font-size: 16px;
  font-weight: 600;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  letter-spacing: 1px;
}

.cover-pages {
  font-size: 12px;
  opacity: 0.8;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  border-top: 1px solid #F0E8D8;
}

.action-btn {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #7D6A52;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s, color 0.2s;
  border-right: 1px solid #F0E8D8;
}

.action-btn:last-child {
  border-right: none;
}

.action-btn:hover {
  background: #FAF8F5;
  color: #5E4F3D;
}

.action-btn.danger:hover {
  background: #FBF0F0;
  color: #A05555;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9C876C;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.empty-state .empty-tip {
  font-size: 13px;
  color: #B8A68E;
}

/* ========== 新建弹窗 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(94, 79, 61, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: #FDF8F0;
  border-radius: 12px;
  padding: 24px 20px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.modal-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #7D6A52;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1.5px solid #E8DFD3;
  border-radius: 8px;
  background: #FFFEF9;
  font-size: 14px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #5E4F3D;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #C4A375;
}

/* 色板 */
.color-palette {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.active {
  border-color: #5E4F3D;
  transform: scale(1.1);
}

/* 弹窗操作按钮 */
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s;
}

.cancel-btn {
  background: #F5F0EA;
  color: #7D6A52;
}

.cancel-btn:hover {
  background: #E8DFD3;
}

.confirm-btn {
  background: #A8824F;
  color: #FFF9F0;
}

.confirm-btn:hover {
  background: #8B6539;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .notebook-list-page {
    padding: 20px 14px;
  }

  .page-title {
    font-size: 24px;
  }

  .notebook-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
