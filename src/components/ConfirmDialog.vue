<script setup lang="ts">
import { useConfirmStore } from '@/store/modules/confirmStore'

/**
 * 全局确认弹窗组件
 * 由 confirmStore 驱动显示/隐藏
 * 通过 Teleport 挂载到 body，避免被父级 scoped 样式限制
 */
const confirmStore = useConfirmStore()

/**
 * 点击确认按钮
 */
function onConfirm(): void {
  confirmStore.handleConfirm()
}

/**
 * 点击取消按钮
 */
function onCancel(): void {
  confirmStore.handleCancel()
}

/**
 * 点击遮罩层（视同取消）
 */
function onMaskClick(): void {
  confirmStore.handleCancel()
}

/**
 * 阻止弹窗主体点击事件冒泡到遮罩层
 */
function stopPropagation(e: Event): void {
  e.stopPropagation()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="confirmStore.visible"
        class="confirm-mask"
        @click="onMaskClick"
      >
        <div class="confirm-box" @click="stopPropagation">
          <!-- 标题 -->
          <h3 v-if="confirmStore.title" class="confirm-title">{{ confirmStore.title }}</h3>
          <!-- 正文 -->
          <p class="confirm-message">{{ confirmStore.message }}</p>
          <!-- 操作按钮 -->
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="onCancel">
              {{ confirmStore.cancelText }}
            </button>
            <button
              class="confirm-btn ok"
              :class="{ danger: confirmStore.danger }"
              @click="onConfirm"
            >
              {{ confirmStore.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩层：全屏覆盖，居中显示弹窗 */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 24px;
}

/* 弹窗主体 */
.confirm-box {
  width: 100%;
  max-width: 320px;
  background: var(--color-bg-main);
  border-radius: 14px;
  padding: 20px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

/* 标题 */
.confirm-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-align: center;
}

/* 正文 */
.confirm-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  text-align: center;
  word-break: break-word;
}

/* 操作按钮组 */
.confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.confirm-btn {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border-divider);
  background: transparent;
  font-family: var(--font-family-sans);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

/* 取消按钮 */
.confirm-btn.cancel {
  color: var(--color-text-secondary);
}

.confirm-btn.cancel:hover {
  background: var(--color-bg-surface);
}

/* 确认按钮（默认主色） */
.confirm-btn.ok {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: var(--color-bg-main);
}

/* 危险动作确认按钮（红色） */
.confirm-btn.ok.danger {
  background: #BF6060;
  border-color: #BF6060;
  color: #fff;
}

.confirm-btn.ok:hover {
  opacity: 0.9;
}

/* 弹窗过渡动画 */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-active .confirm-box,
.confirm-fade-leave-active .confirm-box {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-box,
.confirm-fade-leave-to .confirm-box {
  transform: scale(0.92);
  opacity: 0;
}
</style>
