<script setup lang="ts">
import { useNotebookStore } from '@/store/modules/notebookStore'
import { templates } from '@/config/templates'

const notebookStore = useNotebookStore()

/**
 * 根据模版创建手账本并进入查看模式
 * @param templateId - 模版 ID
 */
function selectTemplate(templateId: string): void {
  const notebook = notebookStore.createNotebookFromTemplate(templateId)
  if (notebook) {
    notebookStore.openNotebook(notebook.id)
  }
}

/**
 * 不选择任何模版，直接进入列表（创建空白手账本）
 */
function skipOnboarding(): void {
  // 创建一个默认空白手账本
  const notebook = notebookStore.createNotebook('我的手账本')
  notebookStore.openNotebook(notebook.id)
}
</script>

<template>
  <div class="onboarding-page">
    <!-- 顶部欢迎语 -->
    <header class="onboarding-header">
      <h1 class="welcome-title">📒 欢迎使用手账本</h1>
      <p class="welcome-subtitle">选择一个模版，快速开始你的手账之旅</p>
    </header>

    <!-- 模版卡片网格 -->
    <div class="template-grid">
      <button
        v-for="template in templates"
        :key="template.id"
        class="template-card"
        @click="selectTemplate(template.id)"
      >
        <!-- 模版封面（带颜色） -->
        <div
          class="template-cover"
          :style="{ background: template.coverColor || '#A8824F' }"
        >
          <span class="cover-icon">{{ template.name.split(' ')[0] }}</span>
          <span class="cover-name">{{ template.name.split(' ').slice(1).join(' ') }}</span>
        </div>

        <!-- 模版描述 -->
        <div class="template-info">
          <p class="template-desc">{{ template.description }}</p>
          <div class="template-modules">
            <span
              v-for="(page, index) in template.pages"
              :key="index"
              class="module-tag"
            >
              {{ page.title.split(' ')[0] }}
            </span>
          </div>
        </div>
      </button>
    </div>

    <!-- 跳过按钮 -->
    <div class="skip-area">
      <button class="skip-btn" @click="skipOnboarding">
        跳过，创建空白手账本
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.onboarding-page {
  min-height: 100vh;
  width: 100%;
  background: #FAF8F5;
  padding: 40px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ========== 顶部欢迎语 ========== */
.onboarding-header {
  text-align: center;
  margin-bottom: 32px;
}

.welcome-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  color: #5E4F3D;
  letter-spacing: 2px;
}

.welcome-subtitle {
  margin: 0;
  font-size: 14px;
  color: #9C876C;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 模版网格 ========== */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.template-card {
  background: #FDF8F0;
  border: 1.5px solid #F0E8D8;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-align: left;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border-color: #C4A375;
}

/* 模版封面 */
.template-cover {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #FFF9F0;
}

.cover-icon {
  font-size: 36px;
}

.cover-name {
  font-size: 18px;
  font-weight: 600;
  font-family: 'Noto Serif SC', '思源宋体', serif;
  letter-spacing: 1px;
}

/* 模版信息 */
.template-info {
  padding: 14px;
}

.template-desc {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.template-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.module-tag {
  padding: 3px 8px;
  background: #EFE4D4;
  color: #8B6539;
  font-size: 11px;
  border-radius: 999px;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 跳过按钮 ========== */
.skip-area {
  margin-top: 32px;
}

.skip-btn {
  padding: 8px 20px;
  border: 1px dashed #C4A375;
  border-radius: 8px;
  background: transparent;
  color: #9C876C;
  font-size: 13px;
  cursor: pointer;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  transition: background 0.2s, color 0.2s;
}

.skip-btn:hover {
  background: #FAF8F5;
  color: #5E4F3D;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .onboarding-page {
    padding: 24px 14px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .template-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
</style>
