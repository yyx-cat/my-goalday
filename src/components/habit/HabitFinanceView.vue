<script setup lang="ts">
/**
 * 理财界面（占位）
 * 当前为空，预留后续实现
 */
</script>

<template>
  <div class="finance-view">
    <div class="finance-placeholder">
      <span class="finance-icon">💰</span>
      <p class="finance-title">理财功能即将上线</p>
      <p class="finance-desc">这里将用于记录收支与理财计划</p>
    </div>
  </div>
</template>

<style scoped>
/* 理财视图根容器 */
.finance-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.finance-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.finance-icon {
  font-size: 48px;
  opacity: 0.5;
}

.finance-title {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.finance-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-tertiary);
}
</style>
