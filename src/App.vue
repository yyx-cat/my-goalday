<script setup lang="ts">
import { ref } from 'vue'
import ScheduleView from '@/views/ScheduleView.vue'
import NotebookView from '@/views/NotebookView.vue'
import ProfileView from '@/views/ProfileView.vue'

/**
 * Tab 项类型
 * @property key - Tab 唯一标识
 * @property label - Tab 文字
 * @property icon - Tab 图标 SVG 标识（calendar=日历/book=书本/target=目标）
 * @property component - Tab 对应的视图组件
 */
interface TabItem {
  key: 'schedule' | 'notebook' | 'profile'
  label: string
  icon: 'calendar' | 'book' | 'target'
  component: typeof ScheduleView
}

// 三个 Tab 配置：日程(日历) / 手账(书本) / 我的(目标)
const tabs: TabItem[] = [
  {
    key: 'schedule',
    label: '日程',
    icon: 'calendar',
    component: ScheduleView,
  },
  {
    key: 'notebook',
    label: '手账',
    icon: 'book',
    component: NotebookView,
  },
  {
    key: 'profile',
    label: '我的',
    icon: 'target',
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

    <!-- 底部固定 Tab 栏（藕灰背景 + 线条图标） -->
    <nav class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <!-- 日历图标 -->
        <svg v-if="tab.icon === 'calendar'" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="9.5" x2="21" y2="9.5" />
          <line x1="8" y1="3" x2="8" y2="6.5" />
          <line x1="16" y1="3" x2="16" y2="6.5" />
        </svg>
        <!-- 书本图标（打开的书） -->
        <svg v-else-if="tab.icon === 'book'" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6.5C12 6.5 10 5 6 5C4.5 5 3 5.5 3 5.5V18C3 18 4.5 17.5 6 17.5C10 17.5 12 19 12 19" />
          <path d="M12 6.5C12 6.5 14 5 18 5C19.5 5 21 5.5 21 5.5V18C21 18 19.5 17.5 18 17.5C14 17.5 12 19 12 19" />
          <line x1="12" y1="6.5" x2="12" y2="19" />
        </svg>
        <!-- 目标图标（同心圆 + 中心点） -->
        <svg v-else class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <!-- 文字 -->
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* ========== 全局布局：flex 列 ========== */
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-main);
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
  justify-content: space-around;
  align-items: center;
  height: 60px;
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border-divider);
  /* 安全区域适配（iPhone X 等全面屏底部留白） */
  padding: 0 10px;
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
  gap: 3px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 0;
  transition: all 0.2s;
  font-family: var(--font-family-sans);
  color: var(--color-text-tertiary);
}

.tab-item:hover {
  color: var(--color-text-secondary);
}

/* 选中状态：高亮为黑色 */
.tab-item.active {
  color: var(--color-text-primary);
}

/* Tab SVG 图标 */
.tab-svg {
  width: 24px;
  height: 24px;
  transition: transform 0.2s;
}

.tab-item.active .tab-svg {
  /* 选中时图标轻微上移，强调选中感 */
  transform: translateY(-1px);
}

/* Tab 文字 */
.tab-label {
  font-size: 12px;
  font-weight: var(--font-weight-normal);
  letter-spacing: 0.5px;
}

.tab-item.active .tab-label {
  font-weight: var(--font-weight-medium);
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .tab-bar {
    height: 56px;
  }

  .tab-svg {
    width: 22px;
    height: 22px;
  }

  .tab-label {
    font-size: 11px;
  }
}
</style>
