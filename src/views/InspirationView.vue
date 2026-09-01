<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInspirationStore } from '@/store/modules/inspirationStore'
import { useMonthlyTaskStore } from '@/store/modules/monthlyTaskStore'
import { useConfirmStore } from '@/store/modules/confirmStore'
import type { InspirationItem, InspirationModule } from '@/types/inspiration'

/**
 * 灵感模块视图（全屏覆盖）
 * - 展示内置 + 自建灵感模块，每个模块含多条灵感
 * - 用户可新建模块、向模块添加条目、删除自建模块/条目
 * - 可将单条灵感或整个模块批量加入月度清单
 */
const inspirationStore = useInspirationStore()
/** 月度任务 store（用于将灵感加入月清单） */
const monthlyTaskStore = useMonthlyTaskStore()
/** 全局确认弹窗 store */
const confirmStore = useConfirmStore()

/**
 * 关闭视图（由父组件 provide 的 close 回调注入）
 */
const closeInspiration = defineEmits<{
  (e: 'close'): void
}>()

/** 全部灵感模块 */
const modules = computed<InspirationModule[]>(() => inspirationStore.data.modules)

/** 是否显示新建模块表单 */
const showAddModule = ref<boolean>(false)
/** 新建模块名称输入 */
const newModuleName = ref<string>('')

/** 当前展开条目添加表单的模块 ID（一次只展开一个） */
const activeAddItemId = ref<string | null>(null)
/** 新条目文本输入 */
const newItemText = ref<string>('')

/** Toast 提示文本（空表示无） */
const toastText = ref<string>('')

// 挂载时加载数据
onMounted(() => {
  inspirationStore.loadInspiration()
})

/**
 * 关闭视图
 */
function handleClose(): void {
  closeInspiration('close')
}

/**
 * 打开新建模块表单
 */
function openAddModule(): void {
  newModuleName.value = ''
  showAddModule.value = true
}

/**
 * 取消新建模块
 */
function cancelAddModule(): void {
  showAddModule.value = false
  newModuleName.value = ''
}

/**
 * 确认新建模块
 */
function confirmAddModule(): void {
  const name = newModuleName.value.trim()
  if (!name) return
  inspirationStore.addModule(name)
  cancelAddModule()
}

/**
 * 删除自建模块（二次确认，内置不可删）
 * @param module - 待删除模块
 */
async function handleDeleteModule(module: InspirationModule): Promise<void> {
  if (module.builtIn) return
  const ok = await confirmStore.confirm({
    title: '删除灵感模块',
    message: `确认删除模块「${module.name}」吗？其下所有灵感条目也会一并删除，删除后无法恢复。`,
  })
  if (!ok) return
  inspirationStore.removeModule(module.id)
}

/**
 * 打开某模块的条目添加表单
 * @param moduleId - 模块 ID
 */
function openAddItem(moduleId: string): void {
  activeAddItemId.value = moduleId
  newItemText.value = ''
}

/**
 * 取消条目添加表单
 */
function cancelAddItem(): void {
  activeAddItemId.value = null
  newItemText.value = ''
}

/**
 * 确认添加条目
 * @param moduleId - 所属模块 ID
 */
function confirmAddItem(moduleId: string): void {
  const text = newItemText.value.trim()
  if (!text) return
  inspirationStore.addItem(moduleId, text)
  cancelAddItem()
}

/**
 * 删除条目（二次确认）
 * @param item - 待删除条目
 */
async function handleDeleteItem(item: InspirationItem): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '删除灵感条目',
    message: `确认删除这条灵感「${item.text}」吗？删除后无法恢复。`,
  })
  if (!ok) return
  inspirationStore.removeItem(item.id)
}

/**
 * 将单条灵感加入月度清单（二次确认）
 * @param item - 灵感条目
 * @param module - 所属灵感模块（用于记录来源）
 */
async function handleAddItemToMonth(item: InspirationItem, module: InspirationModule): Promise<void> {
  const ok = await confirmStore.confirm({
    title: '加入月度清单',
    message: `是否将「${item.text}」加入本月清单？`,
    danger: false,
  })
  if (!ok) return
  monthlyTaskStore.addTask(item.text, undefined, module.name)
  showToast(`已加入月度清单：${item.text}`)
}

/**
 * 将整个模块的条目批量加入月度清单（二次确认）
 * @param module - 灵感模块
 */
async function handleAddModuleToMonth(module: InspirationModule): Promise<void> {
  const items = inspirationStore.getItemsByModule(module.id)
  if (items.length === 0) {
    showToast('该模块暂无灵感条目')
    return
  }
  const ok = await confirmStore.confirm({
    title: '批量加入月度清单',
    message: `是否将模块「${module.name}」的全部 ${items.length} 条灵感加入本月清单？`,
    danger: false,
  })
  if (!ok) return
  items.forEach(i => monthlyTaskStore.addTask(i.text, undefined, module.name))
  showToast(`已批量加入 ${items.length} 条到月度清单`)
}

/**
 * 获取模块下条目列表
 * @param moduleId - 模块 ID
 * @returns 条目数组
 */
function itemsOf(moduleId: string): InspirationItem[] {
  return inspirationStore.getItemsByModule(moduleId)
}

/**
 * 显示 Toast 提示（2 秒后自动消失）
 * @param text - 提示文本
 */
function showToast(text: string): void {
  toastText.value = text
  setTimeout(() => {
    toastText.value = ''
  }, 2000)
}
</script>

<template>
  <div class="inspiration-view">
    <!-- 顶部导航条 -->
    <header class="ins-header">
      <button class="ins-back" @click="handleClose">‹ 返回</button>
      <h1 class="ins-title">💡 灵感模块</h1>
      <button class="ins-add-module" @click="openAddModule">+ 模块</button>
    </header>

    <!-- 新建模块表单 -->
    <div v-if="showAddModule" class="module-form">
      <input
        v-model="newModuleName"
        type="text"
        class="module-name-input"
        placeholder="模块名称（如：读书计划）"
        @keyup.enter="confirmAddModule"
      />
      <div class="module-form-actions">
        <button class="form-confirm" @click="confirmAddModule">确认</button>
        <button class="form-cancel" @click="cancelAddModule">取消</button>
      </div>
    </div>

    <!-- 模块列表 -->
    <div class="module-list">
      <section
        v-for="module in modules"
        :key="module.id"
        class="module-card"
      >
        <!-- 模块标题行 -->
        <header class="module-header">
          <span class="module-name">{{ module.name }}</span>
          <span v-if="module.builtIn" class="module-tag">内置</span>
          <span class="module-count">{{ itemsOf(module.id).length }} 条</span>
          <div class="module-actions">
            <button
              class="add-all-btn"
              @click="handleAddModuleToMonth(module)"
              title="全部加入月清单"
            >全部加入</button>
            <button
              v-if="!module.builtIn"
              class="module-delete"
              @click="handleDeleteModule(module)"
            >删除</button>
          </div>
        </header>

        <!-- 条目列表 -->
        <div class="item-list">
          <div
            v-for="item in itemsOf(module.id)"
            :key="item.id"
            class="item-row"
          >
            <span class="item-dot">·</span>
            <span class="item-text">{{ item.text }}</span>
            <div class="item-actions">
              <button
                class="item-add"
                @click="handleAddItemToMonth(item, module)"
                title="加入月清单"
              >+ 加入</button>
              <button
                v-if="!module.builtIn"
                class="item-delete"
                @click="handleDeleteItem(item)"
              >×</button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="itemsOf(module.id).length === 0" class="item-empty">
            暂无灵感，点击下方添加
          </div>
        </div>

        <!-- 添加条目入口 -->
        <button
          v-if="activeAddItemId !== module.id"
          class="add-item-btn"
          @click="openAddItem(module.id)"
        >+ 添加灵感</button>

        <!-- 添加条目表单 -->
        <div v-else class="item-form">
          <input
            v-model="newItemText"
            type="text"
            class="item-input"
            placeholder="写下你的灵感..."
            @keyup.enter="confirmAddItem(module.id)"
          />
          <div class="item-form-actions">
            <button class="form-confirm" @click="confirmAddItem(module.id)">确认</button>
            <button class="form-cancel" @click="cancelAddItem">取消</button>
          </div>
        </div>
      </section>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="toastText" class="toast">{{ toastText }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* 视图根容器：全屏覆盖 */
.inspiration-view {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-main);
  font-family: var(--font-family-sans);
}

/* 顶部导航条 */
.ins-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-divider);
  background: #fff;
  flex-shrink: 0;
}

.ins-back {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 15px;
  font-family: var(--font-family-sans);
  cursor: pointer;
  padding: 4px 8px;
}

.ins-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.ins-add-module {
  border: 1px solid var(--color-text-primary);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* 新建模块表单 */
.module-form {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--color-border-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-name-input {
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

.module-form-actions,
.item-form-actions {
  display: flex;
  gap: 8px;
}

.form-confirm,
.form-cancel {
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: var(--font-family-sans);
  border: 1px solid;
}

.form-confirm {
  border-color: var(--color-text-primary);
  background: var(--color-text-primary);
  color: var(--color-bg-main);
}

.form-cancel {
  border-color: var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
}

/* 模块列表（可滚动） */
.module-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 模块卡片 */
.module-card {
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  overflow: hidden;
  /* flex 子元素不收缩，保证内容撑开后由父容器滚动 */
  flex-shrink: 0;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border-divider);
  flex-wrap: wrap;
}

.module-name {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.module-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-border-divider);
  color: var(--color-text-tertiary);
}

.module-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.module-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.add-all-btn {
  border: 1px solid var(--color-text-primary);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

.module-delete {
  border: 1px solid #BF6060;
  background: transparent;
  color: #BF6060;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

/* 条目列表 */
.item-list {
  padding: 4px 12px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-divider);
}

.item-row:last-child {
  border-bottom: none;
}

.item-dot {
  color: var(--color-text-tertiary);
  font-size: 18px;
  line-height: 1;
}

.item-text {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  word-break: break-word;
}

.item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.item-add {
  border: 1px solid var(--color-text-primary);
  background: transparent;
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: var(--font-family-sans);
}

.item-delete {
  width: 22px;
  height: 22px;
  border: 1px solid #BF6060;
  border-radius: var(--radius-full);
  background: transparent;
  color: #BF6060;
  font-size: 13px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.item-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 添加条目 */
.add-item-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-top: 1px dashed var(--color-border-divider);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-family-sans);
  cursor: pointer;
}

.item-form {
  padding: 10px 12px;
  border-top: 1px solid var(--color-border-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-input {
  border: 1px solid var(--color-border-divider);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: var(--font-family-sans);
  font-size: 14px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-main);
}

/* Toast 提示 */
.toast {
  position: fixed;
  left: 50%;
  bottom: 80px;
  transform: translateX(-50%);
  z-index: 60;
  max-width: 90%;
  padding: 10px 16px;
  background: var(--color-text-primary);
  color: var(--color-bg-main);
  border-radius: 8px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
