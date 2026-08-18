<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { BookFlip, BookFlipPage } from 'vue-turnjs-flip'
import 'vue-turnjs-flip/style.css'
import { useNotebookStore } from '@/store/modules/notebookStore'
import { moduleRegistry } from '@/config/moduleRegistry'
import type { ModuleProps } from '@/types/module'

const notebookStore = useNotebookStore()

// 当前页码（v-model:current-page 双向绑定）
const currentPage = ref<number>(0)

// 任务 2.8：移动端尺寸适配
const isMobile = ref<boolean>(false)

/**
 * 根据窗口宽度判断是否为移动端
 */
function checkMobile(): void {
  isMobile.value = window.innerWidth < 768
}

/**
 * 翻页回调
 * @param direction - 翻页方向
 */
function onFlip(direction: 'next' | 'prev'): void {
  console.log('翻页方向:', direction, '当前页码:', currentPage.value)
}

/**
 * 当前手账本（从 store 计算属性获取）
 */
const notebook = computed(() => notebookStore.currentNotebook)

/**
 * 页面配置列表（从 store 计算属性获取）
 */
const pages = computed(() => notebookStore.currentPages)

/**
 * 手账本尺寸（响应式：移动端更小）
 */
const bookWidth = computed<number>(() => (isMobile.value ? 320 : 380))
const bookHeight = computed<number>(() => (isMobile.value ? 460 : 520))

/**
 * 获取页面渲染所需的 props 数据
 * @param title - 页面标题
 * @returns 模块 props
 */
function getModuleProps(title: string): ModuleProps {
  return { data: { title } }
}

// 监听窗口尺寸变化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

/**
 * 返回手账本列表
 */
function goBack(): void {
  notebookStore.navigate('list')
}
</script>

<template>
  <div class="notebook-container">
    <!-- 顶部手账本标题 -->
    <header class="notebook-header">
      <!-- 返回按钮 -->
      <button class="back-btn" @click="goBack">‹ 返回</button>
      <h1 class="notebook-title">
        📒 {{ notebook?.name || '我的手账本' }}
      </h1>
      <p class="notebook-subtitle">翻动书页，记录每一天</p>
    </header>

    <!-- 翻页手账本主体 -->
    <div
      v-if="pages.length > 0"
      class="book-wrapper"
      :style="{
        width: bookWidth + 'px',
        height: bookHeight + 'px',
        background: notebook?.coverColor || '#FDF8F0'
      }"
    >
      <BookFlip v-model:current-page="currentPage" @flip="onFlip">
        <BookFlipPage v-for="(page, index) in pages" :key="index">
          <div class="page-content">
            <!-- 纸张纹理叠加层（伪元素实现，详见 <style>） -->
            <!-- 动态渲染对应的模块组件 -->
            <component
              :is="moduleRegistry[page.moduleId].component"
              v-bind="getModuleProps(page.title)"
            />
          </div>
        </BookFlipPage>
      </BookFlip>
    </div>

    <!-- 空状态提示 -->
    <div v-else class="empty-notebook">
      <p>📖 这个手账本还没有页面</p>
      <button class="edit-btn" @click="notebookStore.navigate('editor')">
        去编辑页面
      </button>
    </div>

    <!-- 底部页码导航 -->
    <footer v-if="pages.length > 0" class="notebook-footer">
      <span>第 {{ currentPage + 1 }} / {{ pages.length }} 页</span>
    </footer>
  </div>
</template>

<style scoped>
/* ========== 整体容器 ========== */
.notebook-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background: #F5F0E8;
  padding: 24px 16px;
  box-sizing: border-box;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(196, 163, 117, 0.05) 0, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 101, 57, 0.04) 0, transparent 50%);
}

/* ========== 顶部标题区 ========== */
.notebook-header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 0;
  padding: 6px 12px;
  border: 1px solid #C4A375;
  border-radius: 6px;
  background: transparent;
  color: #8B6539;
  font-size: 12px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #FAF8F5;
}

.notebook-title {
  margin: 0 0 4px 0;
  font-size: 26px;
  font-weight: 700;
  font-family: 'Noto Serif SC', '思源宋体', 'Songti SC', serif;
  color: #5E4F3D;
  letter-spacing: 2px;
}

.notebook-subtitle {
  margin: 0;
  font-size: 13px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 翻书容器包装 ========== */
.book-wrapper {
  position: relative;
  box-shadow:
    0 4px 12px rgba(94, 79, 61, 0.15),
    0 12px 32px rgba(94, 79, 61, 0.18),
    0 24px 48px rgba(94, 79, 61, 0.12);
  border-radius: 6px;
  overflow: hidden;
}

/* ========== 单页内容容器 ========== */
.page-content {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 20px 18px;
  box-sizing: border-box;
  background: #FDF8F0;
  overflow: hidden;
}

/* 纸张纹理叠加层 */
.page-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.04;
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 3px
    );
}

/* 书脊折痕阴影 */
.page-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(94, 79, 61, 0.12) 0%,
    transparent 100%
  );
}

/* ========== 空手账本提示 ========== */
.empty-notebook {
  text-align: center;
  padding: 40px 20px;
  background: #FDF8F0;
  border-radius: 12px;
  border: 1px dashed #C4A375;
}

.empty-notebook p {
  margin: 0 0 12px 0;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.edit-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #A8824F;
  color: #FFF9F0;
  font-size: 13px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.edit-btn:hover {
  background: #8B6539;
}

/* ========== 底部页码区 ========== */
.notebook-footer {
  margin-top: 16px;
  font-size: 13px;
  color: #7D6A52;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  letter-spacing: 1px;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .notebook-container {
    padding: 16px 8px;
  }

  .notebook-title {
    font-size: 20px;
    letter-spacing: 1px;
  }

  .notebook-subtitle {
    font-size: 12px;
  }

  .page-content {
    padding: 16px 14px;
  }
}
</style>
