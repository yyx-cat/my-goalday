<script setup lang="ts">
import TodoModule from '@/components/TodoModule.vue'
import { computed } from 'vue'

/**
 * 获取完整的标题区日期信息（如：2026年8月17日 · 星期二）
 */
const headerDateInfo = computed<string>(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekDay = weekNames[now.getDay()]
  return `${year}年${month}月${day}日 · ${weekDay}`
})
</script>

<template>
  <div class="home-page">
    <!-- ========== 顶部标题区域 ========== -->
    <header class="page-header">
      <!-- 手账本主标题 -->
      <h1 class="notebook-title">📒 我的手账本</h1>
      <!-- 日期信息 -->
      <p class="date-info">{{ headerDateInfo }}</p>
      <!-- 装饰横线 -->
      <div class="header-divider"></div>
    </header>

    <!-- ========== 内容区域 ========== -->
    <main class="page-content">
      <!-- 待办模块 -->
      <TodoModule />
    </main>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.home-page {
  min-height: 100vh;
  width: 100%;
  /* 手账本整体背景：暖灰色，模拟纸张外页 */
  background: #FAF8F5;
  padding: 32px 20px 48px;
  box-sizing: border-box;
}

/* ========== 顶部标题区 ========== */
.page-header {
  max-width: 560px;
  margin: 0 auto 32px;
  text-align: center;
}

/* 手账本标题 */
.notebook-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  /* 思源宋体标题字体 */
  font-family: 'Noto Serif SC', '思源宋体', 'Songti SC', serif;
  color: #5E4F3D;
  letter-spacing: 2px;
}

/* 日期副标题 */
.date-info {
  margin: 0;
  font-size: 15px;
  color: #9C876C;
  /* 霞鹜文楷手写风格 */
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', serif;
}

/* 装饰分隔线 */
.header-divider {
  margin: 18px auto 0;
  width: 180px;
  height: 2px;
  /* 复古渐变线条 */
  background: linear-gradient(
    90deg,
    transparent,
    #D4C5B0 20%,
    #C4A375 50%,
    #D4C5B0 80%,
    transparent
  );
  border-radius: 2px;
}

/* ========== 内容区 ========== */
.page-content {
  width: 100%;
  /* 页面响应式边距 */
  padding: 0;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .home-page {
    padding: 20px 14px 32px;
  }

  .notebook-title {
    font-size: 26px;
    letter-spacing: 1px;
  }

  .page-header {
    margin-bottom: 24px;
  }
}
</style>
