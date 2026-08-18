<script setup lang="ts">
// 引入手账本容器组件
import Notebook from '@/components/Notebook.vue'
</script>

<template>
  <!-- 应用根组件，渲染翻页手账本 -->
  <Notebook />
</template>

<style>
/* 应用级全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 重置默认 body 样式 */
body {
  margin: 0;
  padding: 0;
  background: #F5F0E8;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'Noto Serif SC', '思源宋体', serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
