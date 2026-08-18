<script setup lang="ts">
// 引入首页
import Home from '@/views/Home.vue'
</script>

<template>
  <!-- 应用根组件，直接渲染首页 -->
  <Home />
</template>

<style>
/* 应用级全局样式 */
#app {
  width: 100%;
  margin: 0;
  text-align: left;
  border: none;
  min-height: 100vh;
  display: block;
}

/* 重置默认 body 样式，避免影响手账背景 */
body {
  margin: 0;
  padding: 0;
  background: #FAF8F5;
}
</style>
