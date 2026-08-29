<script setup lang="ts">
import { useNotebookAddonStore } from '@/store/modules/notebookAddonStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import type { AddonSource } from '@/types/notebookAddon'

/**
 * 通用"添加到手账"按钮
 * - 点击后收集当前模块数据（由父组件传入 collect 函数）
 * - 无数据时提示不添加；有数据时弹二次确认（含内容预览）
 * - 确认后写入手账附加信息（同日同模块覆盖）
 */
const addonStore = useNotebookAddonStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/**
 * 组件入参
 * @property source - 来源模块标识（同日同源覆盖）
 * @property title - 手账中显示的信息标题
 * @property date - 归属日期字符串 'YYYY-MM-DD'
 * @property collect - 数据收集函数：返回 { content } 表示有数据；返回 null 表示当天无数据不添加
 * @property emptyHint - 无数据时的提示文案（可选）
 */
interface Props {
  source: AddonSource
  title: string
  date: string
  collect: () => { content: string } | null
  emptyHint?: string
}
const props = defineProps<Props>()

/**
 * 添加结果事件
 * @property added - 是否成功添加
 */
const emit = defineEmits<{
  (e: 'added', added: boolean): void
}>()

/**
 * 点击按钮：收集数据 → 无数据提示 / 二次确认 → 写入手账
 */
async function handleClick(): Promise<void> {
  const collected = props.collect()
  if (!collected || !collected.content.trim()) {
    // 当天无数据，提示不添加
    await confirmStore.confirm({
      title: '添加到手账',
      message: props.emptyHint ?? '当天还没有填写相关内容，无法添加到手账。',
      confirmText: '知道了',
      cancelText: '关闭',
      danger: false,
    })
    emit('added', false)
    return
  }
  const ok = await confirmStore.confirm({
    title: '添加到手账',
    message: `确认将以下内容添加到手账吗？\n\n${props.title}\n${collected.content}`,
    danger: false,
  })
  if (!ok) {
    emit('added', false)
    return
  }
  addonStore.addAddon(props.date, props.source, props.title, collected.content)
  emit('added', true)
}
</script>

<template>
  <button class="add-notebook-btn" title="添加到手账" @click="handleClick">📖</button>
</template>

<style scoped>
/* 添加到手账按钮：小圆样式 */
.add-notebook-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-divider);
  background: #fff;
  font-size: 15px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.add-notebook-btn:hover {
  transform: scale(1.08);
}
</style>
