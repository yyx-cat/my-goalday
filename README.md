# 📒 我的手账本 - My GoalDay

> 一个手账风格的轻量级日程管理工具，让你像在纸上写字一样自然地管理待办事项。

[![Deploy to GitHub Pages](https://github.com/yyx-cat/my-goalday/actions/workflows/deploy.yml/badge.svg)](https://github.com/yyx-cat/my-goalday/actions/workflows/deploy.yml)

---

## 项目简介

**我的手账本** 是一个受 GoalDay 启发、采用 Vue 3 构建的纯前端日程管理应用。它摒弃了传统待办工具复杂的输入流程，通过「点击即创建、就地输入」的交互方式，让记录任务变得像在手账本上写字一样自然。

### 核心特色

- **多日期卡片视图**：默认展示最近7天，上下滑动查看更早日期，无限滚动加载
- **就地添加任务**：点击卡片空白区域直接创建任务，输入框自动聚焦，按回车保存
- **沉浸式任务管理**：完成任务时圆点变实心、文字变浅（不划掉），保持视觉整洁
- **自动生成手账**：系统自动将每日任务汇总成翻页手账，点击左右翻页
- **手账风格 UI**：米白暖灰配色、霞鹜文楷字体、纸张纹理质感
- **本地数据存储**：所有数据存储在浏览器 localStorage，无需联网，打开即用

---

## 技术栈

| 技术 | 用途 |
|------|------|
| **Vue 3** (Composition API) | 前端框架 |
| **TypeScript** | 类型安全 |
| **Vite** | 构建工具 |
| **Pinia** | 状态管理 |
| **localStorage** | 数据持久化 |
| **Tailwind CSS** | 样式基础 |
| **vue-turnjs-flip** | 手账翻页效果 |
| **GitHub Actions** | 自动化部署 |

---

## 截图

> 待补充截图

| 日程页 | 手账页 | 我的页 |
|--------|--------|--------|
| ![日程页](./screenshots/schedule.png) | ![手账页](./screenshots/notebook.png) | ![我的页](./screenshots/profile.png) |

---

## 在线体验

项目已部署至 GitHub Pages，欢迎体验：

[https://yyx-cat.github.io/my-goalday/](https://yyx-cat.github.io/my-goalday/)

> 所有数据仅存储在本地浏览器，不会上传到任何服务器。

---

## 本地运行

### 环境要求

- Node.js >= 18.0.0
- npm 或 pnpm

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/yyx-cat/my-goalday.git
cd my-goalday

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 项目结构

```
src/
├── types/               # TypeScript 类型定义
│   ├── todo.ts          # 待办事项接口
│   ├── habit.ts         # 习惯打卡接口
│   ├── diary.ts         # 日记接口
│   └── notebook.ts      # 手账本配置接口
│
├── utils/               # 工具函数
│   ├── date.ts          # 日期处理（格式化、加减、范围生成）
│   ├── storage.ts       # 待办数据读写
│   ├── habitStorage.ts  # 习惯数据读写
│   └── notebookStorage.ts # 手账本配置读写
│
├── store/modules/       # Pinia 状态管理
│   ├── todoStore.ts     # 待办状态
│   ├── habitStore.ts    # 习惯状态
│   └── notebookStore.ts # 手账本状态
│
├── views/               # 页面组件
│   ├── ScheduleView.vue # 日程页（核心）
│   ├── NotebookView.vue # 手账页（自动生成）
│   └── ProfileView.vue  # 我的页
│
├── config/              # 配置文件
│   └── templates.ts     # 预设手账本模版
│
├── App.vue              # 根组件（底部 Tab 布局）
├── main.ts              # 入口文件
└── style.css            # 全局样式
```

---

## 核心功能说明

### 日程页

- 默认加载最近 7 天的日期卡片
- 点击卡片空白区域 → 自动创建任务输入框
- 输入文字后按回车 → 保存任务
- 点击圆点 → 切换任务完成状态

### 手账页

- 自动汇总所有有任务的日期
- 每一页展示一天的完成情况（已完成/未完成）
- 点击书页左右侧翻页
- 翻页动画为左右翻页效果

### 我的页

- 统计概览（待办完成数、习惯数、日记数）
- 数据导出/导入

---

## 开发计划

- [x] 多日期卡片视图 + 就地输入
- [x] 自动生成翻页手账
- [x] 本地数据持久化
- [x] 底部 Tab 切换
- [x] GitHub Pages 自动部署
- [x] 习惯打卡模块
- [×] 日记模块
- [x] 数据导入/导出
- [ ] 新手引导

---

## 贡献

本项目是个人学习与兴趣驱动的独立开发项目，欢迎 Fork 和 Star！

如有建议或问题，欢迎提 Issue。
