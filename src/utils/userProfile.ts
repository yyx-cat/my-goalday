/** 用户资料在 localStorage 中的 key */
const PROFILE_KEY = 'my-goalday-profile'

/**
 * 用户资料数据结构
 * @property nickname - 昵称
 * @property avatar - 头像（emoji 字符）
 * @property bio - 个人简介
 */
export interface UserProfile {
  nickname: string
  avatar: string
  bio: string
}

/** 默认用户资料 */
const DEFAULT_PROFILE: UserProfile = {
  nickname: '手账爱好者',
  avatar: '😊',
  bio: '记录每一天',
}

/**
 * 从 localStorage 加载用户资料
 * 若无记录则返回默认资料
 * @returns 用户资料对象
 */
export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) {
      return { ...DEFAULT_PROFILE }
    }
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    // 合并默认值，确保字段完整
    return {
      nickname: parsed.nickname ?? DEFAULT_PROFILE.nickname,
      avatar: parsed.avatar ?? DEFAULT_PROFILE.avatar,
      bio: parsed.bio ?? DEFAULT_PROFILE.bio,
    }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

/**
 * 保存用户资料到 localStorage
 * @param profile - 用户资料对象
 */
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

/**
 * 可选头像列表（emoji）
 */
export const AVATAR_OPTIONS: string[] = [
  '😊',
  '😎',
  '🥰',
  '🤓',
  '😴',
  '🦊',
  '🐱',
  '🐰',
  '🌟',
  '🎯',
  '📒',
  '✏️',
]
