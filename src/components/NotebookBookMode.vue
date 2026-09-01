<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, inject, watch, nextTick } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useDiaryStore } from '@/store/modules/diaryStore'
import { getTodayDate } from '@/utils/date'
import type { BookPage } from '@/types/notebook'
import NotebookBookPageSide from '@/components/NotebookBookPageSide.vue'

/**
 * 组件入参
 * @property initialDate - 初始聚焦日期（不提供时默认打开封面页）
 * @property focusDate - 受控模式下的外部聚焦日期（父组件驱动跳转到包含某天的页）
 */
interface Props {
  initialDate?: string
  focusDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialDate: undefined,
  focusDate: undefined,
})

/**
 * 组件事件
 * @event changeMode - 请求切换到索引模式（emit 'index'）
 * @event update:focusDate - 内部翻页后通知父级当前聚焦日期，用于跨模式保持
 */
interface Emits {
  (e: 'changeMode', mode: 'index'): void
  (e: 'update:focusDate', date: string): void
}
const emit = defineEmits<Emits>()

/**
 * 从 App.vue 根层级注入的 Tab 切换方法（用于空状态"去日程添加"）
 * 若外层未 provide，则降级为空函数，点击按钮不报错
 */
const switchTab = inject<(tab: string) => void>('switchTab', () => {
  // 默认空函数：避免 TS 类型推断为 undefined，同时保持无副作用
})

/**
 * 从父级 NotebookView 注入：双击日期页面跳转到日程记录视图并定位到该日期
 * 若外层未 provide，则降级为空函数
 */
const jumpToScheduleRecord = inject<(date: string) => void>('jumpToScheduleRecord', () => {
  // 默认空函数：外层未 provide 时不报错
})

const todoStore = useTodoStore()
const diaryStore = useDiaryStore()

/**
 * 便捷函数：向父级 emit 当前聚焦日期（用于跨模式状态保持）
 * @param date - 要同步的日期字符串
 */
function emitFocusDate(date: string): void {
  if (!date) return
  emit('update:focusDate', date)
}

// ========== 状态 ==========

/**
 * 当前展示的是第几页（0-based）
 * 第 0 页是整本书的封面页，之后每周 4 张内容页
 */
const currentIndex = ref<number>(0)

/**
 * 所有书本双页列表（来源于 todoStore.getBookPages，正序：旧→新）
 */
const bookPages = computed<BookPage[]>(() => {
  return todoStore.getBookPages()
})

/**
 * 总页数（封面 1 + 每周 4 张内容页），0 表示空（没有任何任务）
 */
const totalPages = computed<number>(() => {
  return bookPages.value.length
})

/**
 * 翻页动画锁：动画期间禁止再次交互
 */
const isAnimating = ref<boolean>(false)

/**
 * 视觉上当前展示的页 index（与 currentIndex 同步，动画期间保持原值）
 */
const visualIndex = ref<number>(0)

/**
 * 翻页方向：'next' 下一页 / 'prev' 上一页 / null 静止
 */
const flipDirection = ref<'next' | 'prev' | null>(null)

/**
 * 翻动层是否处于"已翻状态"（rotateY(-180deg)）
 * false = rotateY(0)  正面朝外
 * true  = rotateY(-180deg)  反面朝外
 */
const flipFlipped = ref<boolean>(false)

/**
 * 翻动层正面所用的页对象（动画期间有效）
 * - 下一页动画时：正面 = 当前页
 * - 上一页动画时：正面 = 上一页（动画结束时显示在右页位置）
 */
const flipFrontPage = ref<BookPage | null>(null)

/**
 * 翻动层反面所用的页对象（动画期间有效）
 * - 下一页动画时：反面 = 下一页
 * - 上一页动画时：反面 = 当前页（动画开始时显示在左页位置）
 */
const flipBackPage = ref<BookPage | null>(null)

// ========== 核心方法 ==========

/**
 * 是否有下一页
 * @returns true = 可以翻到下一页
 */
function hasNext(): boolean {
  return currentIndex.value < bookPages.value.length - 1
}

/**
 * 是否有上一页
 * @returns true = 可以翻到上一页
 */
function hasPrev(): boolean {
  return currentIndex.value > 0
}

/**
 * 根据日期查找所在的双页 index（0-based）
 * 查找规则：该日期等于页的 leftDate / rightDate / weekStart
 * @param date - 目标日期
 * @returns 页 index，找不到返回 -1
 */
function findPageIndexByDate(date: string): number {
  if (!date) return -1
  const all = bookPages.value
  for (let i = 0; i < all.length; i++) {
    const p = all[i]
    if (p.leftDate === date || p.rightDate === date || p.weekStart === date) {
      return i
    }
  }
  return -1
}

/**
 * 获取某页的"聚焦日期"（用于跨模式状态保持）
 * - cover 页：用 weekStart
 * - week-overview 页：用 rightDate（周一）
 * - weekday-pair 页：用 leftDate
 * @param page - 书本双页
 * @returns 聚焦日期字符串，无法提取时返回空字符串
 */
function getFocusDateOfPage(page: BookPage | undefined): string {
  if (!page) return ''
  if (page.type === 'cover') return page.weekStart
  if (page.type === 'week-overview') return page.rightDate ?? page.weekStart
  return page.leftDate ?? page.weekStart
}

/**
 * 翻到下一页：右页绕书脊向左翻（rotateY 0 → -180deg）
 * 翻动层正面=当前右页，反面=下一页的左页；翻完后 currentIndex 前进一位
 */
function goNextPair(): void {
  if (isAnimating.value) return
  if (!hasNext()) return
  isAnimating.value = true
  flipDirection.value = 'next'

  // 准备翻动层内容
  flipFrontPage.value = bookPages.value[currentIndex.value]      // 当前页（正面=右页内容）
  flipBackPage.value = bookPages.value[currentIndex.value + 1]    // 下一页（反面=左页内容）
  flipFlipped.value = false  // 初始 rotateY(0)

  // 下一帧再启动动画，确保 initial state 已渲染
  nextTick(() => {
    requestAnimationFrame(() => {
      flipFlipped.value = true  // 过渡到 rotateY(-180deg)
    })
  })

  // 动画结束后切换 currentIndex
  window.setTimeout(() => {
    currentIndex.value += 1
    visualIndex.value = currentIndex.value
    isAnimating.value = false
    flipDirection.value = null
    flipFlipped.value = false
    flipFrontPage.value = null
    flipBackPage.value = null

    const focusD = getFocusDateOfPage(bookPages.value[currentIndex.value])
    if (focusD) emitFocusDate(focusD)
  }, 420)
}

/**
 * 翻到上一页：翻动层从 rotateY(-180deg) 回到 rotateY(0)
 * 翻动层正面=上一页（动画结束时显示在右页位置），反面=当前页（动画开始时显示在左页位置）
 */
function goPrevPair(): void {
  if (isAnimating.value) return
  if (!hasPrev()) return
  isAnimating.value = true
  flipDirection.value = 'prev'

  // 准备翻动层内容
  flipFrontPage.value = bookPages.value[currentIndex.value - 1]  // 上一页（正面）
  flipBackPage.value = bookPages.value[currentIndex.value]        // 当前页（反面）
  flipFlipped.value = true   // 初始 rotateY(-180deg)（已翻到左页那边）

  // 用 nextTick 等待 DOM 应用初始 transform 后，再启动过渡
  nextTick(() => {
    requestAnimationFrame(() => {
      flipFlipped.value = false  // 过渡回 rotateY(0)
    })
  })

  window.setTimeout(() => {
    currentIndex.value -= 1
    visualIndex.value = currentIndex.value
    isAnimating.value = false
    flipDirection.value = null
    flipFlipped.value = false
    flipFrontPage.value = null
    flipBackPage.value = null

    const focusD = getFocusDateOfPage(bookPages.value[currentIndex.value])
    if (focusD) emitFocusDate(focusD)
  }, 420)
}

// ========== 交互 ==========

// ========== 自定义双击检测：双击页面跳转到该日记录 ==========
// 不能用原生 @dblclick，因为它会先触发两次 @click 翻页，导致 visualPage 已变、取到错误日期
// 改为：第一次 click 延迟执行翻页，若 250ms 内来了第二次 click 则判定为双击 → 跳转（不翻页）
// 注意：event.currentTarget 在事件结束后会被 DOM 置空，必须在事件同步阶段立即取 rect
let pendingClickTimer: ReturnType<typeof setTimeout> | null = null
const DBL_CLICK_DELAY = 250

/**
 * 左页点击（带双击感知）：单击延迟翻页，双击则跳转到左页日期记录
 * 左页左半侧单击 → 翻上一页
 * @param event - 原生点击事件
 */
function onLeftPageClickDblAware(event: MouseEvent): void {
  if (isAnimating.value) return
  // 同步阶段立即记录点击位置（setTimeout 回调里 currentTarget 已是 null）
  const el = event.currentTarget as HTMLElement | null
  const rect = el?.getBoundingClientRect() ?? null
  const clickX = rect ? event.clientX - rect.left : 0
  if (pendingClickTimer) {
    // 第二次点击 → 双击命中
    clearTimeout(pendingClickTimer)
    pendingClickTimer = null
    const date = visualPage.value?.leftDate ?? null
    if (date) jumpToScheduleRecord(date)
    return
  }
  // 第一次点击 → 延迟执行翻页，给双击留窗口
  pendingClickTimer = setTimeout(() => {
    pendingClickTimer = null
    // 用闭包里保存的 rect 判断点击位置，不依赖 event.currentTarget
    if (rect && clickX < rect.width / 2) {
      goPrevPair()
    }
  }, DBL_CLICK_DELAY)
}

/**
 * 右页点击（带双击感知）：单击延迟翻页，双击则跳转到右页日期记录
 * 右页右半侧单击 → 翻下一页
 * @param event - 原生点击事件
 */
function onRightPageClickDblAware(event: MouseEvent): void {
  if (isAnimating.value) return
  // 同步阶段立即记录点击位置（setTimeout 回调里 currentTarget 已是 null）
  const el = event.currentTarget as HTMLElement | null
  const rect = el?.getBoundingClientRect() ?? null
  const clickX = rect ? event.clientX - rect.left : 0
  if (pendingClickTimer) {
    // 第二次点击 → 双击命中
    clearTimeout(pendingClickTimer)
    pendingClickTimer = null
    const date = visualPage.value?.rightDate ?? null
    if (date) jumpToScheduleRecord(date)
    return
  }
  // 第一次点击 → 延迟执行翻页，给双击留窗口
  pendingClickTimer = setTimeout(() => {
    pendingClickTimer = null
    // 用闭包里保存的 rect 判断点击位置，不依赖 event.currentTarget
    if (rect && clickX >= rect.width / 2) {
      goNextPair()
    }
  }, DBL_CLICK_DELAY)
}

/**
 * 键盘事件：← 上一页 / → 下一页
 * @param event - 键盘按下事件
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    goPrevPair()
  } else if (event.key === 'ArrowRight') {
    goNextPair()
  }
}

/**
 * 请求父组件切换到索引模式
 */
function switchToIndexMode(): void {
  emit('changeMode', 'index')
}

/**
 * 空状态按钮：切换到「日程」Tab
 */
function goScheduleTab(): void {
  if (typeof switchTab === 'function') {
    switchTab('schedule')
  }
}

/**
 * 快速跳转到包含"今天"的页（用户翻远了能一键回到当前周）
 */
function jumpToToday(): void {
  const today = getTodayDate()
  const idx = findPageIndexByDate(today)
  if (idx < 0 || idx === currentIndex.value) return
  currentIndex.value = idx
  visualIndex.value = idx
  const focusD = getFocusDateOfPage(bookPages.value[idx])
  if (focusD) emitFocusDate(focusD)
}

/**
 * 快速跳转到整本书的封面页（第 0 页）
 */
function jumpToCover(): void {
  if (currentIndex.value === 0) return
  currentIndex.value = 0
  visualIndex.value = 0
  const focusD = getFocusDateOfPage(bookPages.value[0])
  if (focusD) emitFocusDate(focusD)
}

// ========== 当前视觉页数据 ==========

/**
 * 当前视觉展示的双页对象
 */
const visualPage = computed<BookPage | null>(() => {
  if (visualIndex.value < 0 || visualIndex.value >= bookPages.value.length) return null
  return bookPages.value[visualIndex.value]
})

// ========== 生命周期 ==========

/**
 * 响应父级外部传入的 focusDate：跳转到包含该日期的页
 * 找不到对应页时不跳（保持当前页），避免和内部 emit 回来的日期产生死循环
 */
watch(
  () => props.focusDate,
  (newDate) => {
    if (!newDate) return
    const idx = findPageIndexByDate(newDate)
    if (idx < 0) return
    if (idx === currentIndex.value) return
    currentIndex.value = idx
    visualIndex.value = idx
  },
  { immediate: false },
)

onMounted(() => {
  // 保证 todoStore 数据已载入
  if (todoStore.todos.length === 0) {
    todoStore.loadTodos()
  }
  // 保证 diaryStore 数据已载入（书本模式会展示每日日记内容）
  if (diaryStore.diaries.length === 0) {
    diaryStore.loadDiaries()
  }

  // 初始化页 index（按优先级）：
  //   1. 父组件传入的 focusDate / initialDate → 跳到包含该日期的页
  //   2. 默认跳到包含"今天"的页（用户进入手账时立即看到当前周）
  //   3. 找不到对应页 → 回落到封面页（index=0）
  // 整本书按"年"生成所有周，从封面翻到今天要 200+ 页不现实，所以默认定位到今天
  const prefDate = props.focusDate || props.initialDate
  let initIndex: number
  if (prefDate && bookPages.value.length > 0) {
    const found = findPageIndexByDate(prefDate)
    initIndex = found >= 0 ? found : 0
  } else if (bookPages.value.length > 0) {
    const todayIdx = findPageIndexByDate(getTodayDate())
    initIndex = todayIdx >= 0 ? todayIdx : 0
  } else {
    initIndex = 0
  }
  currentIndex.value = initIndex
  visualIndex.value = initIndex

  const focusD = getFocusDateOfPage(bookPages.value[initIndex])
  if (focusD) {
    emitFocusDate(focusD)
  } else if (prefDate) {
    emitFocusDate(prefDate)
  }

  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  // 清理双击检测的待执行计时器，避免组件卸载后仍触发翻页
  if (pendingClickTimer) {
    clearTimeout(pendingClickTimer)
    pendingClickTimer = null
  }
})
</script>

<template>
  <div class="book-mode">
    <!-- 顶部栏：仅保留切换按钮，不显示页码 -->
    <div class="mode-header">
      <div class="page-title">📒 我的手账</div>
      <button class="mode-switch" @click="switchToIndexMode">切换到索引模式</button>
    </div>

    <!-- 空状态：没有任何任务数据 -->
    <div class="empty-state" v-if="totalPages === 0">
      <div class="empty-inner">
        <div class="empty-icon">📒</div>
        <div class="empty-title">还没有记录，先去日程里添加任务吧~</div>
        <button class="empty-btn" @click="goScheduleTab">去日程添加</button>
      </div>
    </div>

    <!-- 正常：双页书本（3D 翻页） -->
    <template v-else>
      <div class="book-wrapper">
        <div class="book-pages">
          <!-- 左页：静态展示当前 visualPage 的左页 -->
          <section
            class="paper left-page"
            :class="{ 'left-clickable': hasPrev() }"
            @click="onLeftPageClickDblAware"
            title="双击跳转到该日记录"
          >
            <NotebookBookPageSide :page="visualPage" side="left" />
          </section>

          <!-- 书脊 -->
          <div class="book-spine"></div>

          <!-- 右页区域：静态右页 + 3D 翻动层 -->
          <div class="right-page-area">
            <!-- 静态右页 -->
            <section
              class="paper right-page-static"
              :class="{ 'right-clickable': hasNext() }"
              @click="onRightPageClickDblAware"
              title="双击跳转到该日记录"
            >
              <NotebookBookPageSide :page="visualPage" side="right" />
            </section>

            <!-- 3D 翻动层：仅在动画期间显示 -->
            <div
              v-if="isAnimating && flipFrontPage && flipBackPage"
              class="flip-layer"
              :class="{ flipped: flipFlipped }"
            >
              <!-- 正面：绕书脊旋转前半段可见 -->
              <div class="flip-side flip-front">
                <NotebookBookPageSide :page="flipFrontPage" side="right" />
              </div>
              <!-- 反面：绕书脊旋转后半段可见 -->
              <div class="flip-side flip-back">
                <NotebookBookPageSide :page="flipBackPage" side="left" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮：封面 / 上一页 / 周标识 / 今天 / 下一页 -->
      <nav class="book-bottom-bar">
        <button
          class="book-nav-btn cover-btn"
          :disabled="currentIndex === 0 || isAnimating"
          @click="jumpToCover"
          title="跳到封面"
        >📒 封面</button>

        <button
          class="book-nav-btn prev"
          :disabled="!hasPrev() || isAnimating"
          @click="goPrevPair"
        >◀ 上一页</button>

        <div class="book-page-hint">
          {{ visualPage?.type === 'cover' ? '封面' : `第 ${visualPage?.weekNumber} 周` }}
        </div>

        <button
          class="book-nav-btn today-btn"
          :disabled="isAnimating"
          @click="jumpToToday"
          title="跳到今天"
        >📌 今天</button>

        <button
          class="book-nav-btn next"
          :disabled="!hasNext() || isAnimating"
          @click="goNextPair"
        >下一页 ▶</button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
/* ========== 书本模式整体容器 ========== */
.book-mode {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
  overflow: hidden;
  position: relative;
}

/* ========== 顶部栏 ========== */
.mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 6px;
  flex-shrink: 0;
}

.page-title {
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.mode-switch {
  border: 1px solid var(--color-text-primary);
  background: transparent;
  color: var(--color-text-primary);
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-switch:hover {
  background: var(--color-text-primary);
  color: #fff;
}

/* ========== 空状态 ========== */
.empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px 80px;
}

.empty-inner {
  background: #FDFBF7;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  padding: 40px 28px;
  width: min(90%, 480px);
  text-align: center;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 5px 5px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 16px;
  color: var(--color-text-primary);
  margin-bottom: 22px;
  line-height: 1.5;
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--color-text-primary);
  color: #fff;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.empty-btn:hover {
  opacity: 0.88;
}

/* ========== 主体：双页书本（3D 透视） ========== */
.book-wrapper {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 顶部留白 + 为底部导航栏留空间，整体更像一本书（不会占满屏幕） */
  padding: 16px 12px 80px;
  box-sizing: border-box;
  overflow: visible;
  /* 整个书本区域启用 3D 透视 */
  perspective: 1800px;
}

.book-pages {
  /*
   * 书本比例设计（接近一本翻开的笔记本，宽:高 ≈ 1:0.85，比之前更长更高）
   * - 宽度：最多 840px（大桌面），或 92% 视口宽度
   * - 高度：按宽度的 0.85 比例（保证书本看起来像书，同时更长一点）
   * - 再夹一个上限：剩余可用高度的 100%，避免溢出
   */
  width: min(92vw, 840px);
  aspect-ratio: 1 / 0.85;
  max-height: calc(100vh - 180px);
  max-width: 100%;
  display: flex;
  align-items: stretch;
  position: relative;
}

/* 纸张通用样式 */
.paper {
  background: #FDFBF7;
  border-radius: 4px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  box-sizing: border-box;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 5px 5px;
  position: relative;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.left-page,
.right-page-static {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  cursor: default;
}

.left-page.left-clickable,
.right-page-static.right-clickable {
  cursor: pointer;
}

/* 书脊中线 */
.book-spine {
  width: 14px;
  flex-shrink: 0;
  background: linear-gradient(90deg,
    rgba(0, 0, 0, 0.12),
    rgba(0, 0, 0, 0.02) 30%,
    rgba(0, 0, 0, 0.02) 70%,
    rgba(0, 0, 0, 0.12)
  );
  margin: 0 -2px;
  position: relative;
  z-index: 2;
}

/* ========== 右页区域（包含静态右页 + 3D 翻动层） ========== */
.right-page-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  /* 子元素 3D 透视，让翻动层有立体感 */
  perspective: 1500px;
  /* 不需要 preserve-3d：仅 .flip-layer 自身需要 preserve-3d 管理正反两面 */
  /* 作为 flex 容器让 .right-page-static 撑满整个右页区域 */
  display: flex;
  align-items: stretch;
}

.right-page-static {
  position: relative;
  z-index: 1;
  /* 在 flex 容器中撑满（兜底，避免 width/height 塌陷导致右页只显示一半） */
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
}

/* ========== 3D 翻动层 ========== */
.flip-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.4s ease-in-out;
  /* 绕左边缘（书脊）旋转 */
  transform-origin: left center;
  /* 翻动层在静态右页之上，覆盖其点击 */
  z-index: 10;
  pointer-events: none;
  /* 初始状态：正面朝外（rotateY(0)） */
  transform: rotateY(0deg);
  /* 阴影：翻动时有立体感 */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

/* 翻到反面朝外（rotateY(-180deg)） */
.flip-layer.flipped {
  transform: rotateY(-180deg);
}

/* 翻动层的正反两面 */
.flip-side {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 隐藏背面，避免穿透 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
  background: #FDFBF7;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.035) 1px, transparent 0);
  background-size: 5px 5px;
  border-radius: 4px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.03);
  box-sizing: border-box;
}

/* 正面：默认位置 */
.flip-front {
  transform: rotateY(0deg);
}

/* 反面：预先旋转 180 度，这样翻过去后正面朝外 */
.flip-back {
  transform: rotateY(180deg);
}

/* ========== 底部栏：封面 / 上一页 / 周标识 / 今天 / 下一页 ========== */
.book-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  background: var(--color-bg-surface);
  border-top: 1px solid var(--color-border-divider);
  padding: 0 10px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  z-index: 20;
  font-family: var(--font-family-sans);
}

.book-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--color-border-divider);
  background: #fff;
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.book-nav-btn:hover:not(:disabled) {
  border-color: var(--color-text-primary);
}

.book-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 封面按钮 / 今天按钮：暖色背景突出快捷跳转 */
.book-nav-btn.cover-btn,
.book-nav-btn.today-btn {
  background: #F5EAE3;
  border-color: #E5C8B6;
  color: #6B4F3F;
}

.book-nav-btn.cover-btn:hover:not(:disabled),
.book-nav-btn.today-btn:hover:not(:disabled) {
  background: #EAD9CC;
  border-color: #C9A58E;
}

.book-page-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  text-align: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .mode-header {
    padding: 8px 12px 4px;
  }

  .book-wrapper {
    padding: 10px 6px 80px;
  }

  .book-pages {
    /* 手机端：宽占比再小一点，呈现"一本书"的感觉（周围留白明显），比之前更长一点 */
    width: min(94vw, 840px);
    /* 书本宽高比 1:0.95 — 手机屏幕较长，略微拉高避免太扁 */
    aspect-ratio: 1 / 0.95;
    max-height: calc(100vh - 190px);
    /* 让书本与顶栏、底栏保持距离，看起来是独立的"书" */
    margin: 0 auto;
    box-shadow: 0 12px 28px rgba(78, 63, 55, 0.18);
    border-radius: 4px;
    overflow: hidden;
  }

  /* 移动端按钮更紧凑 */
  .book-nav-btn {
    padding: 0 6px;
    font-size: 11px;
    height: 34px;
  }

  .book-page-hint {
    font-size: 11px;
  }

  /* 手机端：空状态减少底部 padding */
  .empty-state {
    padding: 0 16px 80px;
  }
}
</style>
