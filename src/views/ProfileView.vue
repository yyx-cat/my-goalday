<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/store/modules/todoStore'
import { useHabitStore } from '@/store/modules/habitStore'
import {
  loadProfile,
  saveProfile,
  AVATAR_OPTIONS,
  type UserProfile,
} from '@/utils/userProfile'
import {
  downloadExport,
  importFromFile,
  clearAllData,
  getDataSize,
} from '@/utils/dataManager'

const todoStore = useTodoStore()
const habitStore = useHabitStore()

/**
 * 单条统计项数据结构
 * @property icon - 图标 emoji
 * @property label - 统计项名称
 * @property value - 统计值文本
 */
interface StatItem {
  icon: string
  label: string
  value: string
}

/** 用户资料（响应式） */
const profile = ref<UserProfile>(loadProfile())

/** 是否正在编辑昵称 */
const editingNickname = ref<boolean>(false)
/** 昵称编辑输入框临时文本 */
const nicknameInput = ref<string>('')

/** 是否正在编辑简介 */
const editingBio = ref<boolean>(false)
/** 简介编辑输入框临时文本 */
const bioInput = ref<string>('')

/** 头像选择面板是否展开 */
const avatarPickerOpen = ref<boolean>(false)

/** 清空数据确认弹窗是否显示 */
const clearConfirmOpen = ref<boolean>(false)

/** 导入的文件输入框引用 */
const importFileRef = ref<HTMLInputElement | null>(null)

/** 操作反馈提示文本 */
const toastText = ref<string>('')
/** 操作反馈提示是否显示 */
const toastVisible = ref<boolean>(false)

/** 数据占用大小（字节） */
const dataSize = ref<number>(0)

// 统计数据（真实反映 store 中的数据）
const stats = computed<StatItem[]>(() => [
  {
    icon: '📋',
    label: '今日待办',
    value: `${todoStore.todayDoneCount}/${todoStore.todayTotalCount}`,
  },
  {
    icon: '🎯',
    label: '今日习惯',
    value: `${habitStore.todayCheckInCount}/${habitStore.habitsCount}`,
  },
  {
    icon: '📅',
    label: '记录天数',
    value: `${todoStore.datesWithTodosCount}`,
  },
  {
    icon: '✨',
    label: '习惯总数',
    value: `${habitStore.habitsCount}`,
  },
])

/**
 * 显示操作反馈提示
 * @param text - 提示文本
 */
function showToast(text: string): void {
  toastText.value = text
  toastVisible.value = true
  setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

// ========== 用户资料编辑 ==========

/**
 * 刷新本地数据大小统计
 */
function refreshDataSize(): void {
  dataSize.value = getDataSize()
}

/**
 * 开始编辑昵称
 */
function startEditNickname(): void {
  nicknameInput.value = profile.value.nickname
  editingNickname.value = true
}

/**
 * 保存昵称
 */
function commitNickname(): void {
  const name = nicknameInput.value.trim()
  if (name) {
    profile.value.nickname = name
    saveProfile(profile.value)
  }
  editingNickname.value = false
}

/**
 * 开始编辑简介
 */
function startEditBio(): void {
  bioInput.value = profile.value.bio
  editingBio.value = true
}

/**
 * 保存简介
 */
function commitBio(): void {
  profile.value.bio = bioInput.value.trim()
  saveProfile(profile.value)
  editingBio.value = false
}

/**
 * 切换头像选择面板
 */
function toggleAvatarPicker(): void {
  avatarPickerOpen.value = !avatarPickerOpen.value
}

/**
 * 选择头像
 * @param avatar - 头像 emoji
 */
function selectAvatar(avatar: string): void {
  profile.value.avatar = avatar
  saveProfile(profile.value)
  avatarPickerOpen.value = false
}

// ========== 数据管理 ==========

/**
 * 导出数据为 JSON 文件下载
 */
function handleExport(): void {
  downloadExport()
  showToast('数据已导出')
}

/**
 * 触发导入文件选择
 */
function triggerImport(): void {
  importFileRef.value?.click()
}

/**
 * 处理导入文件
 * @param event - 文件选择事件
 */
async function handleImport(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const success = await importFromFile(file)
  if (success) {
    showToast('导入成功，正在刷新...')
    // 重置文件输入，便于再次选择同一文件
    target.value = ''
    // 延迟刷新，让用户看到提示
    setTimeout(() => {
      window.location.reload()
    }, 800)
  } else {
    showToast('导入失败，文件格式不正确')
    target.value = ''
  }
}

/**
 * 打开清空确认弹窗
 */
function openClearConfirm(): void {
  clearConfirmOpen.value = true
}

/**
 * 确认清空所有数据
 */
function confirmClearData(): void {
  clearAllData()
  clearConfirmOpen.value = false
  showToast('数据已清空，正在刷新...')
  setTimeout(() => {
    window.location.reload()
  }, 800)
}

// 组件挂载时加载各模块数据，刷新统计
onMounted(() => {
  todoStore.loadTodos()
  habitStore.loadHabits()
  refreshDataSize()
})
</script>

<template>
  <div class="profile-view">
    <!-- 顶部标题区 -->
    <header class="view-header">
      <h1 class="view-title">我的</h1>
    </header>

    <!-- 用户头像卡片 -->
    <div class="user-card">
      <!-- 头像（点击切换 emoji） -->
      <button class="avatar" @click="toggleAvatarPicker">{{ profile.avatar }}</button>
      <div class="user-info">
        <!-- 昵称（点击编辑） -->
        <div v-if="!editingNickname" class="user-name-row" @click="startEditNickname">
          <p class="user-name">{{ profile.nickname }}</p>
          <span class="edit-icon">✎</span>
        </div>
        <input
          v-else
          v-model="nicknameInput"
          @keyup.enter="commitNickname"
          @keyup.esc="editingNickname = false"
          @blur="commitNickname"
          class="name-input"
          maxlength="16"
        />
        <!-- 简介（点击编辑） -->
        <div v-if="!editingBio" class="user-desc-row" @click="startEditBio">
          <p class="user-desc">{{ profile.bio }}</p>
          <span class="edit-icon">✎</span>
        </div>
        <input
          v-else
          v-model="bioInput"
          @keyup.enter="commitBio"
          @keyup.esc="editingBio = false"
          @blur="commitBio"
          class="desc-input"
          maxlength="30"
        />
      </div>

      <!-- 头像选择面板 -->
      <div v-if="avatarPickerOpen" class="avatar-picker">
        <button
          v-for="avatar in AVATAR_OPTIONS"
          :key="avatar"
          class="avatar-option"
          :class="{ selected: avatar === profile.avatar }"
          @click="selectAvatar(avatar)"
        >{{ avatar }}</button>
      </div>
    </div>

    <!-- 统计数据网格 -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-item">
        <span class="stat-icon">{{ stat.icon }}</span>
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- 数据管理区 -->
    <section class="section">
      <h2 class="section-title">数据管理</h2>
      <div class="settings-list">
        <!-- 导出数据 -->
        <div class="setting-item" @click="handleExport">
          <span class="setting-icon">📤</span>
          <span class="setting-label">导出数据</span>
          <span class="setting-value">{{ Math.round(dataSize / 1024 * 10) / 10 }}KB</span>
          <span class="setting-arrow">›</span>
        </div>
        <!-- 导入数据 -->
        <div class="setting-item" @click="triggerImport">
          <span class="setting-icon">📥</span>
          <span class="setting-label">导入数据</span>
          <span class="setting-value">从备份恢复</span>
          <span class="setting-arrow">›</span>
        </div>
        <!-- 清空数据 -->
        <div class="setting-item danger" @click="openClearConfirm">
          <span class="setting-icon">🗑️</span>
          <span class="setting-label">清空所有数据</span>
          <span class="setting-value">不可恢复</span>
          <span class="setting-arrow">›</span>
        </div>
      </div>
      <!-- 隐藏的文件输入（用于导入） -->
      <input
        ref="importFileRef"
        type="file"
        accept="application/json,.json"
        class="hidden-file"
        @change="handleImport"
      />
    </section>

    <!-- 关于区 -->
    <section class="section">
      <h2 class="section-title">关于</h2>
      <div class="about-card">
        <p class="about-name">MyGoalDay · 我的目标日</p>
        <p class="about-version">版本 v1.0.0</p>
        <p class="about-desc">一款极简风格的手账式待办应用，记录每一天的小目标。</p>
      </div>
    </section>

    <!-- 清空确认弹窗 -->
    <div v-if="clearConfirmOpen" class="modal-mask" @click="clearConfirmOpen = false">
      <div class="modal-content" @click.stop>
        <p class="modal-title">确认清空？</p>
        <p class="modal-desc">将删除所有待办、习惯和资料数据，此操作不可恢复。</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="clearConfirmOpen = false">取消</button>
          <button class="modal-btn confirm" @click="confirmClearData">确认清空</button>
        </div>
      </div>
    </div>

    <!-- 操作反馈提示 -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastText }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ========== 页面整体 ========== */
.profile-view {
  min-height: 100%;
  width: 100%;
  background: var(--color-bg-main);
  padding: 24px 16px 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  font-family: var(--font-family-sans);
}

/* ========== 顶部标题区 ========== */
.view-header {
  text-align: center;
}

.view-title {
  margin: 0;
  font-size: 22px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: 1px;
}

/* ========== 用户卡片 ========== */
.user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--color-bg-surface);
  border-radius: 12px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-bg-main);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.avatar:hover {
  transform: scale(1.05);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.user-name {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.edit-icon {
  font-size: 13px;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity 0.2s;
}

.user-name-row:hover .edit-icon,
.user-desc-row:hover .edit-icon {
  opacity: 1;
}

.name-input {
  width: 100%;
  border: none;
  background: var(--color-bg-main);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 17px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  font-family: var(--font-family-sans);
  outline: none;
}

.user-desc-row {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.user-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.desc-input {
  width: 100%;
  border: none;
  background: var(--color-bg-main);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-family: var(--font-family-sans);
  outline: none;
}

/* 头像选择面板 */
.avatar-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 16px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--color-border-divider);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 20;
}

.avatar-option {
  width: 36px;
  height: 36px;
  border: 1.5px solid transparent;
  border-radius: var(--radius-full);
  background: var(--color-bg-main);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
}

.avatar-option:hover {
  border-color: var(--color-text-tertiary);
}

.avatar-option.selected {
  border-color: var(--color-text-primary);
  background: var(--color-bg-surface);
}

/* ========== 统计数据网格 ========== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  background: var(--color-bg-surface);
  border-radius: 10px;
}

.stat-icon {
  font-size: 22px;
}

.stat-value {
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* ========== 通用区块 ========== */
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  padding: 0 4px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

/* ========== 设置列表 ========== */
.settings-list {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border-radius: 12px;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-divider);
  cursor: pointer;
  transition: background 0.15s;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  background: var(--color-bg-main);
}

.setting-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.setting-label {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
}

.setting-value {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.setting-arrow {
  color: var(--color-text-tertiary);
  font-size: 16px;
}

.setting-item.danger .setting-label {
  color: #BF6060;
}

.setting-item.danger .setting-icon {
  opacity: 0.8;
}

/* 隐藏的文件输入 */
.hidden-file {
  display: none;
}

/* ========== 关于卡片 ========== */
.about-card {
  padding: 16px;
  background: var(--color-bg-surface);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.about-name {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.about-version {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.about-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ========== 弹窗 ========== */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 320px;
  background: #fff;
  border-radius: 12px;
  padding: 24px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-align: center;
}

.modal-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  border: none;
  border-radius: 8px;
  padding: 10px 0;
  font-size: 14px;
  font-family: var(--font-family-sans);
  cursor: pointer;
  transition: background 0.15s;
}

.modal-btn.cancel {
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
}

.modal-btn.cancel:hover {
  background: #D9CFC7;
}

.modal-btn.confirm {
  background: #BF6060;
  color: #fff;
}

.modal-btn.confirm:hover {
  background: #A85050;
}

/* ========== 操作反馈提示 ========== */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-family: var(--font-family-sans);
  z-index: 2000;
  pointer-events: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

/* ========== 移动端适配 ========== */
@media (max-width: 640px) {
  .profile-view {
    padding: 16px 14px 32px;
    gap: 16px;
  }

  .view-title {
    font-size: 20px;
  }

  .stat-item {
    padding: 12px 8px;
  }

  .stat-value {
    font-size: 16px;
  }

  .avatar-picker {
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }
}
</style>
