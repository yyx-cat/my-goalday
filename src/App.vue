<script setup lang="ts">
import { ref } from 'vue'
import ScheduleView from '@/views/ScheduleView.vue'
import NotebookView from '@/views/NotebookView.vue'
import ProfileView from '@/views/ProfileView.vue'

/**
 * Tab 项类型
 * @property key - Tab 唯一标识
 * @property label - Tab 文字
 * @property icon - Tab 图标 emoji
 * @property component - Tab 对应的视图组件
 */
interface TabItem {
  key: 'schedule' | 'notebook' | 'profile'
  label: string
  icon: string
  component: typeof ScheduleView
}

// 三个 Tab 配置：日程 / 手账 / 我的
const tabs: TabItem[] = [
  {
    key: 'schedule',
    label: '日程',
    icon: '📅',
    component: ScheduleView,
  },
  {
    key: 'notebook',
    label: '手账',
    icon: '📒',
    component: NotebookView,
  },
  {
    key: 'profile',
    label: '我的',
    icon: '⚙️',
    component: ProfileView,
  },
]

// 当前激活的 Tab（默认「日程」）
const activeTab = ref<TabItem['key']>('schedule')
</script>

<template>
  <!-- 全局布局：flex 列布局，主内容区 + 固定底部 Tab -->
  <div class="app-layout">
    <!-- 主内容区：占满剩余空间 -->
    <!-- 使用 v-show 切换 Tab，保留各 Tab 的内部状态 -->
    <main class="app-main">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        v-show="activeTab === tab.key"
        class="tab-panel"
      >
        <component :is="tab.component" />
      </div>
    </main>

    <!-- 底部固定 Tab 栏 -->
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <!-- 图标 -->
        <span class="tab-icon">{{ tab.icon }}</span>
        <!-- 文字 -->
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style>
/* ========== 应用级全局样式重置 ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background: #FAF8F5;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'Noto Serif SC', '思源宋体', serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

<style scoped>
/* ========== 全局布局：flex 列 ========== */
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ========== 主内容区 ========== */
.app-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 每个 Tab 面板：占满主内容区，独立滚动 */
.tab-panel {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ========== 底部 Tab 栏 ========== */
.tab-bar {
  flex-shrink: 0;
  display: flex;
  height: 60px;
  background: #FDF8F0;
  border-top: 1px solid #E8DFD3;
  /* 顶部阴影，让 Tab 栏与内容区分隔 */
  box-shadow: 0 -2px 12px rgba(94, 79, 61, 0.06);
  /* 安全区域适配（iPhone X 等全面屏底部留白） */
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 10;
}

/* 单个 Tab 项 */
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 0;
  transition: all 0.2s;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  color: #9C876C;
}

.tab-item:hover {
  color: #8B6539;
}

/* 选中状态：高亮 */
.tab-item.active {
  color: #A8824F;
}

.tab-item.active .tab-icon {
  /* 选中时图标轻微上移 + 放大，强调选中感 */
  transform: translateY(-1px) scale(1.1);
}

/* Tab 图标 */
.tab-icon {
  font-size: 22px;
  line-height: 1;
  transition: transform 0.2s;
}

/* Tab 文字 */
.tab-label {
  font-size: 12px;
  letter-spacing: 1px;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .tab-bar {
    height: 56px;
  }

  .tab-icon {
    font-size: 20px;
  }

  .tab-label {
    font-size: 11px;
  }
}
</style>
