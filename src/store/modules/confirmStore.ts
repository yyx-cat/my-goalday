import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 确认弹窗选项
 * @property title - 弹窗标题（可选，默认"请确认"）
 * @property message - 弹窗正文信息
 * @property confirmText - 确认按钮文字（可选，默认"确认"）
 * @property cancelText - 取消按钮文字（可选，默认"取消"）
 * @property danger - 是否为危险动作（true 时确认按钮显示红色，默认 true）
 */
export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

/**
 * 全局确认弹窗状态管理 Store
 * 通过 Promise 异步等待用户选择结果，调用方可以 await confirm()
 */
export const useConfirmStore = defineStore('confirm', () => {
  /** 弹窗是否可见 */
  const visible = ref<boolean>(false)

  /** 弹窗标题 */
  const title = ref<string>('请确认')

  /** 弹窗正文 */
  const message = ref<string>('')

  /** 确认按钮文字 */
  const confirmText = ref<string>('确认')

  /** 取消按钮文字 */
  const cancelText = ref<string>('取消')

  /** 是否为危险动作（决定确认按钮颜色） */
  const danger = ref<boolean>(true)

  /** Promise 解析函数引用，用户点击后调用 */
  let resolver: ((value: boolean) => void) | null = null

  /**
   * 弹出确认弹窗，返回 Promise 等待用户选择
   * @param options - 弹窗选项
   * @returns 用户是否点击确认（true=确认，false=取消）
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    title.value = options.title ?? '请确认'
    message.value = options.message
    confirmText.value = options.confirmText ?? '确认'
    cancelText.value = options.cancelText ?? '取消'
    danger.value = options.danger ?? true
    visible.value = true
    return new Promise<boolean>(resolve => {
      resolver = resolve
    })
  }

  /**
   * 用户点击确认按钮
   */
  function handleConfirm(): void {
    visible.value = false
    resolver?.(true)
    resolver = null
  }

  /**
   * 用户点击取消按钮（或关闭弹窗）
   */
  function handleCancel(): void {
    visible.value = false
    resolver?.(false)
    resolver = null
  }

  return {
    // 状态
    visible,
    title,
    message,
    confirmText,
    cancelText,
    danger,
    // 方法
    confirm,
    handleConfirm,
    handleCancel,
  }
})
