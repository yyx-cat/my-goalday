<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useDiaryStore } from '@/store/modules/diaryStore'
import { useTodoStore } from '@/store/modules/todoStore'
import { formatChineseDate, getTodayDate, addDays } from '@/utils/date'
import type { ModuleProps } from '@/types/module'
import type { Mood } from '@/types/habit'

// 接收父组件传入的页面数据
const props = defineProps<ModuleProps>()

const diaryStore = useDiaryStore()
const todoStore = useTodoStore()

// 心情选项配置
const moodOptions: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: '开心' },
  { value: 'excited', emoji: '🤩', label: '激动' },
  { value: 'neutral', emoji: '😐', label: '平静' },
  { value: 'sad', emoji: '😔', label: '难过' },
]

/**
 * 模块标题
 */
const moduleTitle = computed<string>(() => props.data?.title || '📖 今日日记')

/**
 * 当前日期的中文格式
 */
const currentDateDisplay = computed<string>(() => {
  return formatChineseDate(diaryStore.currentDate)
})

/**
 * 是否是今天
 */
const isToday = computed<boolean>(() => diaryStore.currentDate === getTodayDate())

/**
 * 任务 3.3：今日任务完成情况联动展示
 */
const todayTodoSummary = computed(() => {
  const doneCount = todoStore.todayDoneCount
  const totalCount = todoStore.todayTotalCount
  const allDone = totalCount > 0 && doneCount === totalCount
  return {
    doneCount,
    totalCount,
    allDone,
    text: totalCount === 0
      ? '今天还没有待办任务'
      : allDone
        ? `🎉 今天完成了 ${doneCount} 件事，太棒了！`
        : `今天完成了 ${doneCount}/${totalCount} 件事`,
  }
})

/**
 * 最近 7 天的日期（用于底部小圆点标记）
 */
const recentDays = computed(() => {
  const today = getTodayDate()
  const days: { date: string; hasDiary: boolean; isToday: boolean; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i)
    days.push({
      date,
      hasDiary: diaryStore.hasDiary(date),
      isToday: date === today,
      label: date.split('-')[2],
    })
  }
  return days
})

/**
 * 切换到某天
 * @param date - 日期字符串
 */
function jumpToDate(date: string): void {
  diaryStore.currentDate = date
  diaryStore.loadDraft()
}

/**
 * 设置心情
 * @param mood - 心情标签
 */
function setMood(mood: Mood): void {
  diaryStore.draftMood = diaryStore.draftMood === mood ? undefined : mood
}

// 监听草稿内容变化（自动保存防抖）
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(() => diaryStore.draftContent, () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    diaryStore.saveCurrentDiary()
  }, 1000)
})

// 组件挂载时加载数据
onMounted(() => {
  diaryStore.loadDiaries()
  todoStore.loadTodos()
})
</script>

<template>
  <div class="diary-module notebook-page-module">
    <!-- 模块标题 -->
    <h3 class="module-title">{{ moduleTitle }}</h3>

    <!-- 日期切换区 -->
    <div class="date-nav">
      <button class="nav-btn" @click="diaryStore.navigateDate('prev')">‹</button>
      <div class="date-display">
        <p class="current-date">{{ currentDateDisplay }}</p>
        <button v-if="!isToday" class="today-btn" @click="diaryStore.goToToday">
          回到今天
        </button>
      </div>
      <button class="nav-btn" @click="diaryStore.navigateDate('next')">›</button>
    </div>

    <!-- 心情选择器 -->
    <div class="mood-selector">
      <span class="mood-label">今天心情：</span>
      <button
        v-for="mood in moodOptions"
        :key="mood.value"
        class="mood-btn"
        :class="{ active: diaryStore.draftMood === mood.value }"
        @click="setMood(mood.value)"
      >
        {{ mood.emoji }}
      </button>
    </div>

    <!-- 日记输入区 -->
    <div class="diary-editor-area">
      <textarea
        v-model="diaryStore.draftContent"
        placeholder="✍️ 写下今天的故事..."
        class="diary-textarea"
      ></textarea>
    </div>

    <!-- 任务 3.3：今日任务完成情况联动展示 -->
    <div v-if="isToday" class="todo-summary">
      <span class="summary-icon">📌</span>
      <span class="summary-text">{{ todayTodoSummary.text }}</span>
    </div>

    <!-- 底部状态区 -->
    <div class="module-footer">
      <!-- 字数统计 + 保存状态 -->
      <div class="footer-status">
        <span class="word-count">{{ diaryStore.currentWordCount }} 字</span>
        <span v-if="diaryStore.savedHint" class="saved-hint">
          {{ diaryStore.savedHint }}
        </span>
        <span v-else-if="diaryStore.hasCurrentDiary" class="saved-hint">
          📝 已保存
        </span>
      </div>

      <!-- 最近 7 天日记标记 -->
      <div class="recent-days">
        <div
          v-for="day in recentDays"
          :key="day.date"
          class="day-dot"
          :class="{ 'has-diary': day.hasDiary, 'today': day.isToday }"
          @click="jumpToDate(day.date)"
          :title="day.date"
        >
          {{ day.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 模块整体容器 ========== */
.diary-module {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #FDF8F0;
  border-radius: 8px;
  padding: 16px 14px;
  box-sizing: border-box;
  overflow: hidden;
}

/* ========== 标题区 ========== */
.module-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  letter-spacing: 0.5px;
}

/* ========== 日期切换区 ========== */
.date-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.nav-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #E8DFD3;
  border-radius: 50%;
  background: #FFFEF9;
  color: #8B6539;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  background: #F5F0EA;
  border-color: #C4A375;
}

.date-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.current-date {
  margin: 0;
  font-size: 13px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
  text-align: center;
}

.today-btn {
  border: none;
  background: transparent;
  color: #9C876C;
  font-size: 11px;
  cursor: pointer;
  text-decoration: underline;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.today-btn:hover {
  color: #8B6539;
}

/* ========== 心情选择器 ========== */
.mood-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.mood-label {
  font-size: 12px;
  color: #7D6A52;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

.mood-btn {
  width: 28px;
  height: 28px;
  border: 1.5px solid transparent;
  border-radius: 50%;
  background: #FAF8F5;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mood-btn:hover {
  background: #F5F0EA;
}

.mood-btn.active {
  border-color: #C4A375;
  background: #EFE4D4;
}

/* ========== 日记输入区 ========== */
.diary-editor-area {
  flex: 1;
  display: flex;
  min-height: 0;
  margin-bottom: 10px;
}

.diary-textarea {
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  border: 1.5px solid #E8DFD3;
  border-radius: 8px;
  background: #FFFEF9;
  font-size: 14px;
  line-height: 1.6;
  font-family: 'LXGW WenKai', '霞鹜文楷', 'KaiTi', '楷体', serif;
  color: #5E4F3D;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.diary-textarea::placeholder {
  color: #B8A68E;
}

.diary-textarea:focus {
  border-color: #C4A375;
}

/* ========== 任务联动展示 ========== */
.todo-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #EFE4D4;
  border-radius: 6px;
  border-left: 3px solid #A8824F;
}

.summary-icon {
  font-size: 13px;
}

.summary-text {
  font-size: 12px;
  color: #5E4F3D;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* ========== 底部状态区 ========== */
.module-footer {
  border-top: 1.5px dashed #E8DFD3;
  padding-top: 8px;
}

.footer-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
}

.word-count {
  color: #9C876C;
  font-family: 'Noto Serif SC', '思源宋体', serif;
}

.saved-hint {
  color: #8B6539;
  font-family: 'LXGW WenKai', '霞鹜文楷', serif;
}

/* 最近 7 天日记标记 */
.recent-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-dot {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  color: #B8A68E;
  background: #FAF8F5;
  border: 1px solid #F0E8D8;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Noto Serif SC', serif;
}

.day-dot:hover {
  background: #F5F0EA;
}

.day-dot.has-diary {
  background: #C4A375;
  border-color: #A8824F;
  color: #FFF9F0;
  font-weight: 600;
}

.day-dot.today {
  border: 2px solid #8B6539;
}
</style>
