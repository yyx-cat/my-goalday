<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotebookStore } from '@/store/modules/notebookStore'
import { getModuleList } from '@/config/moduleRegistry'
import type { ModuleConfig, ModuleId } from '@/types/module'

const notebookStore = useNotebookStore()

// 所有可用模块列表
const moduleList = computed<ModuleConfig[]>(() => getModuleList())

// 是否显示"添加页面"弹窗
const showAddModal = ref<boolean>(false)

// 选中的模块 ID
const selectedModuleId = ref<ModuleId>('todo')

// 新页面标题（可选，留空则使用模块默认标题）
const newPageTitle = ref<string>('')

/**
 * 当前正在编辑的手账本
 */
const notebook = computed(() => notebookStore.currentNotebook)

/**
 * 打开"添加页面"弹窗
 */
function openAddModal(): void {
  selectedModuleId.value = 'todo'
  newPageTitle.value = ''
  showAddModal.value = true
}

/**
 * 确认添加页面
 */
function handleAddPage(): void {
  if (!notebook.value) return
  const module = moduleList.value.find(m => m.id === selectedModuleId.value)
  if (!module) return
  const title = newPageTitle.value.trim() || module.defaultTitle
  notebookStore.addPage(notebook.value.id, selectedModuleId.value, title)
  showAddModal.value = false
}

/**
 * 删除页面
 * @param index - 页面索引
 */
function handleRemovePage(index: number): void {
  if (!notebook.value) return
  if (confirm('确定删除这一页吗？')) {
    notebookStore.removePage(notebook.value.id, index)
  }
}

/**
 * 上移页面
 * @param index - 当前索引
 */
function handleMoveUp(index: number): void {
  if (!notebook.value) return
  if (index === 0) return
  notebookStore.reorderPage(notebook.value.id, index, index - 1)
}

/**
 * 下移页面
 * @param index - 当前索引
 */
function handleMoveDown(index: number): void {
  if (!notebook.value) return
  if (index === notebook.value.pages.length - 1) return
  notebookStore.reorderPage(notebook.value.id, index, index + 1)
}

/**
 * 实时更新页面标题
 * @param index - 页面索引
 * @param newTitle - 新标题
 */
function handleTitleChange(index: number, newTitle: string): void {
  if (!notebook.value) return
  notebookStore.updatePageTitle(notebook.value.id, index, newTitle)
}

/**
 * 返回列表
 */
function goBack(): void {
  notebookStore.navigate('list')
}

/**
 * 进入翻页查看模式
 */
function openViewer(): void {
  notebookStore.navigate('viewer')
}

/**
 * 根据模块 ID 获取模块配置
 * @param id - 模块 ID
 * @returns 模块配置
 */
function getModule(id: ModuleId): ModuleConfig | undefined {
  return moduleList.value.find(m => m.id === id)
}
</script>

<template>
  <div class="editor-page">
    <!-- 顶部导航 -->
    <header class="editor-header">
      <button class="nav-btn" @click="goBack">‹ 返回</button>
      <h1 class="editor-title">⚙️ 编辑手账本</h1>
      <button class="nav-btn" @click="openViewer">📖 查看</button>
    </header>

    <!-- 手账本信息 -->
    <div v-if="notebook" class="notebook-info">
      <h2 class="notebook-name">{{ notebook.name }}</h2>
      <p class="notebook-meta">{{ notebook.pages.length }} 个页面</p>
    </div>

    <!-- 页面列表 -->
    <div v-if="notebook" class="page-list">
      <div
        v-for="(page, index) in notebook.pages"
        :key="index"
        class="page-item"
      >
        <!-- 页面序号 -->
        <span class="page-index">{{ index + 1 }}</span>

        <!-- 模块图标 -->
        <span class="module-icon">{{ getModule(page.moduleId)?.icon }}</span>

        <!-- 标题输入框 -->
        <input
          :value="page.title"
          class="title-input"
          placeholder="页面标题"
          @input="handleTitleChange(index, ($event.target as HTMLInputElement).value)"
        />

        <!-- 排序按钮 -->
        <div class="sort-btns">
          <button
            class="sort-btn"
            :disabled="index === 0"
            @click="handleMoveUp(index)"
          >↑</button>
          <button
            class="sort-btn"
            :disabled="index === notebook.pages.length - 1"
            @click="handleMoveDown(index)"
          >↓</button>
        </div>

        <!-- 删除按钮 -->
        <button class="delete-btn" @click="handleRemovePage(index)">✕</button>
      </div>
    </div>

    <!-- 添加页面按钮 -->
    <div class="add-page-area">
      <button class="add-page-btn" @click="openAddModal">
        + 添加新页面
      </button>
    </div>

    <!-- 添加页面弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <h3 class="modal-title">选择模块</h3>

        <!-- 模块选择列表 -->
        <div class="module-list">
          <button
            v-for="module in moduleList"
            :key="module.id"
            class="module-option"
            :class="{ active: selectedModuleId === module.id }"
            @click="selectedModuleId = module.id"
          >
            <span class="option-icon">{{ module.icon }}</span>
            <div class="option-info">
              <span class="option-name">{{ module.name }}</span>
              <span class="option-desc">{{ module.description }}</span>
            </div>
          </button>
        </div>

        <!-- 自定义标题 -->
        <div class="form-group">
          <label class="form-label">页面标题（可选）</label>
          <input
            v-model="newPageTitle"
            :placeholder="getModule(selectedModuleId)?.defaultTitle"
            class="form-input"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions">
          <button class="cancel-btn" @click="showAddModal = false">取消</button>
          <button class="confirm-btn" @click="handleAddPage">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.editor-page {
  min-height: 100vh;
  width: 100%;
  background: #FAF8F5;
  padding: 20px;
  box-sizing: border-box;
}

/* ========== 顶部导航 ========== */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 600px;
  margin: 0 auto 20px;
  padding-bottom: 12px;
  border-bottom: 2px dashed #E8DFD3;
}

.nav-btn {
  padding: 6px 14px;
  border: 1px solid #C4A375;
  border-radius: 6px;
  background: transparent;
  color: #8B6539;
  font-size: 13px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #FAF8F5;
}

.editor-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
}

/* ========== 手账本信息 ========== */
.notebook-info {
  text-align: center;
  margin-bottom: 20px;
}

.notebook-name {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 700;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
}

.notebook-meta {
  margin: 0;
  font-size: 12px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 页面列表 ========== */
.page-list {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #FDF8F0;
  border: 1px solid #F0E8D8;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.page-index {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #EFE4D4;
  color: #8B6539;
  border-radius: 50%;
  font-size: 11px;
  font-family: 'Noto Serif SC', serif;
  font-weight: 600;
}

.module-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.title-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid #E8DFD3;
  border-radius: 6px;
  background: #FFFEF9;
  font-size: 14px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #5E4F3D;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.title-input:focus {
  border-color: #C4A375;
}

/* 排序按钮组 */
.sort-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sort-btn {
  width: 22px;
  height: 16px;
  border: 1px solid #E8DFD3;
  background: #FFFEF9;
  color: #8B6539;
  font-size: 10px;
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  line-height: 1;
  transition: background 0.2s;
}

.sort-btn:hover:not(:disabled) {
  background: #EFE4D4;
}

.sort-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.delete-btn {
  width: 24px;
  height: 24px;
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
  background: #FBF0F0;
  color: #A05555;
}

/* ========== 添加按钮区 ========== */
.add-page-area {
  max-width: 600px;
  margin: 16px auto 0;
}

.add-page-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed #C4A375;
  border-radius: 8px;
  background: transparent;
  color: #8B6539;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s;
}

.add-page-btn:hover {
  background: #FAF8F5;
}

/* ========== 模态框 ========== */
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

/* 模块选项列表 */
.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.module-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #E8DFD3;
  border-radius: 8px;
  background: #FFFEF9;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.module-option:hover {
  border-color: #C4A375;
  background: #FAF8F5;
}

.module-option.active {
  border-color: #A8824F;
  background: #EFE4D4;
}

.option-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.option-desc {
  font-size: 11px;
  color: #9C876C;
}

/* 表单 */
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
  .editor-page {
    padding: 14px 12px;
  }

  .editor-title {
    font-size: 16px;
  }
}
</style>
