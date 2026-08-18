<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { BookFlip, BookFlipPage } from 'vue-turnjs-flip'
import 'vue-turnjs-flip/style.css'

// 导入各个模块组件
import TodoModule from './modules/TodoModule.vue'
// import ScheduleModule from './modules/ScheduleModule.vue' // 后续阶段添加

/**
 * 单页配置类型
 * @property component - 该页要渲染的模块组件
 * @property data - 传给模块组件的 props 数据
 */
type PageComponent = typeof TodoModule

interface PageConfig {
  component: PageComponent
  data: { title?: string }
}

// 页面配置：每一页显示哪个模块，以及传给模块的数据
// 任务 2.7：临时添加 3 页用于验证翻页效果（第二、三页复用 TodoModule 仅作演示）
const pages = ref<PageConfig[]>([
  {
    component: TodoModule,
    data: { title: '📋 待办清单' },
  },
  {
    component: TodoModule,
    data: { title: '📅 第二页' },
  },
  {
    component: TodoModule,
    data: { title: '📖 第三页' },
  },
])

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
 * 翻页回调（vue-turnjs-flip 真实 API：参数为 'next' | 'prev'）
 * @param direction - 翻页方向
 */
function onFlip(direction: 'next' | 'prev'): void {
  console.log('翻页方向:', direction, '当前页码:', currentPage.value)
}

// 监听窗口尺寸变化，初始化时检测一次
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

// 组件卸载前移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

/**
 * 手账本尺寸（响应式：移动端更小）
 */
const bookWidth = computed<number>(() => (isMobile.value ? 320 : 380))
const bookHeight = computed<number>(() => (isMobile.value ? 460 : 520))
</script>

<template>
  <div class="notebook-container">
    <!-- 顶部手账本标题 -->
    <header class="notebook-header">
      <h1 class="notebook-title">📒 我的手账本</h1>
      <p class="notebook-subtitle">翻动书页，记录每一天</p>
    </header>

    <!-- 翻页手账本主体 -->
    <div
      class="book-wrapper"
      :style="{ width: bookWidth + 'px', height: bookHeight + 'px' }"
    >
      <BookFlip v-model:current-page="currentPage" @flip="onFlip">
        <!-- 每一页用一个 BookFlipPage 包裹 -->
        <BookFlipPage v-for="(page, index) in pages" :key="index">
          <div class="page-content">
            <!-- 纸张纹理叠加层（伪元素实现，详见 <style>） -->
            <!-- 动态渲染不同的模块组件 -->
            <component :is="page.component" :data="page.data" />
          </div>
        </BookFlipPage>
      </BookFlip>
    </div>

    <!-- 底部页码导航 -->
    <footer class="notebook-footer">
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
  /* 暖灰背景，模拟桌面 */
  background: #F5F0E8;
  padding: 24px 16px;
  box-sizing: border-box;
  background-image:
    /* 微妙的桌面噪点纹理 */
    radial-gradient(circle at 20% 30%, rgba(196, 163, 117, 0.05) 0, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 101, 57, 0.04) 0, transparent 50%);
}

/* ========== 顶部标题区 ========== */
.notebook-header {
  text-align: center;
  margin-bottom: 20px;
}

.notebook-title {
  margin: 0 0 4px 0;
  font-size: 28px;
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
  /* 真实书本质感：多层柔和阴影 */
  box-shadow:
    0 4px 12px rgba(94, 79, 61, 0.15),
    0 12px 32px rgba(94, 79, 61, 0.18),
    0 24px 48px rgba(94, 79, 61, 0.12);
  border-radius: 6px;
  overflow: hidden;
  background: #FDF8F0;
}

/* ========== 单页内容容器 ========== */
.page-content {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 20px 18px;
  box-sizing: border-box;
  /* 米白纸色 */
  background: #FDF8F0;
  overflow: hidden;
}

/* 任务 2.5：纸张纹理叠加层（CSS 伪元素模拟纹理） */
.page-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.04;
  /* 斜线纹理，模拟纸张纤维 */
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 3px
    );
}

/* 右侧页面（奇数页）书脊折痕阴影 */
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
    font-size: 22px;
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
