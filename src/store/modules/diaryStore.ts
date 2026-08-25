import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Diary, Mood } from '@/types/diary'
import {
  getDiaries,
  saveDiary as storageSaveDiary,
  deleteDiary as storageDeleteDiary,
  getDiary as storageGetDiary,
} from '@/utils/diaryStorage'
import { getTodayDate, addDays } from '@/utils/date'

/**
 * 日记状态管理 Store
 */
export const useDiaryStore = defineStore('diary', () => {
  // 所有日记数据
  const diaries = ref<Diary[]>([])

  // 当前选中的日期
  const currentDate = ref<string>(getTodayDate())

  // 当前编辑中的日记内容（实时编辑，未保存的草稿）
  const draftContent = ref<string>('')

  // 当前编辑中的心情
  const draftMood = ref<Mood | undefined>(undefined)

  // 保存状态提示
  const savedHint = ref<string>('')

  // 待跳转的记录日期（手账双击日期后，切到日程→记录视图并定位到该日期）
  // 由手账组件写入，ScheduleView watch 消费后清空
  const pendingOpenRecordDate = ref<string | null>(null)

  /**
   * 从 localStorage 加载所有日记
   */
  function loadDiaries(): void {
    diaries.value = getDiaries()
    loadDraft()
  }

  /**
   * 加载当前日期对应的日记到草稿区
   */
  function loadDraft(): void {
    const diary = storageGetDiary(currentDate.value)
    draftContent.value = diary?.content || ''
    draftMood.value = diary?.mood
  }

  /**
   * 切换当前日期（'prev' 前一天，'next' 后一天）
   * @param direction - 切换方向
   */
  function navigateDate(direction: 'prev' | 'next'): void {
    const offset = direction === 'prev' ? -1 : 1
    currentDate.value = addDays(currentDate.value, offset)
    loadDraft()
  }

  /**
   * 跳转到今天
   */
  function goToToday(): void {
    currentDate.value = getTodayDate()
    loadDraft()
  }

  /**
   * 跳转到指定日期（供日期选择器直接选择任意日期）
   * @param date - 目标日期字符串 'YYYY-MM-DD'
   */
  function goToDate(date: string): void {
    if (!date) return
    currentDate.value = date
    loadDraft()
  }

  /**
   * 请求跳转到日程模块的记录视图并定位到指定日期
   * 由手账组件双击日期页面时调用：先写入 pending 状态，
   * 再由 ScheduleView watch 消费（切到 record 子标签 + goToDate + 清 pending）
   * @param date - 目标日期字符串 'YYYY-MM-DD'
   */
  function requestOpenRecordAtDate(date: string): void {
    if (!date) return
    pendingOpenRecordDate.value = date
  }

  /**
   * 保存当前草稿为日记
   */
  function saveCurrentDiary(): void {
    const content = draftContent.value.trim()
    if (!content) {
      // 内容为空，删除已有日记
      storageDeleteDiary(currentDate.value)
    } else {
      storageSaveDiary(currentDate.value, content, draftMood.value)
    }
    diaries.value = getDiaries()
    showSavedHint()
  }

  /**
   * 删除当前日期的日记
   */
  function deleteCurrentDiary(): void {
    storageDeleteDiary(currentDate.value)
    diaries.value = getDiaries()
    draftContent.value = ''
    draftMood.value = undefined
    showSavedHint('已删除')
  }

  /**
   * 显示保存提示
   * @param hint - 提示文字（默认 '📝 已保存'）
   */
  function showSavedHint(hint: string = '📝 已保存'): void {
    savedHint.value = hint
    setTimeout(() => {
      savedHint.value = ''
    }, 2000)
  }

  /**
   * 判断某天是否有日记
   * @param date - 日期字符串
   * @returns 是否有日记
   */
  function hasDiary(date: string): boolean {
    return diaries.value.some(d => d.date === date)
  }

  // ========== 计算属性 ==========

  /**
   * 当前日期是否已有日记
   */
  const hasCurrentDiary = computed<boolean>(() => hasDiary(currentDate.value))

  /**
   * 当前日记字数统计
   */
  const currentWordCount = computed<number>(() => draftContent.value.length)

  return {
    // 状态
    diaries,
    currentDate,
    draftContent,
    draftMood,
    savedHint,
    pendingOpenRecordDate,
    // 计算属性
    hasCurrentDiary,
    currentWordCount,
    // 方法
    loadDiaries,
    loadDraft,
    navigateDate,
    goToToday,
    goToDate,
    requestOpenRecordAtDate,
    saveCurrentDiary,
    deleteCurrentDiary,
    hasDiary,
  }
})
