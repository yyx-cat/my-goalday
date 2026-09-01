#  MyGoalDay · 我的目标日

> 一款手账风格的极简目标管理应用 —— 用纸张的温度，记录每一天的小目标。

MyGoalDay 是一个基于 **Vue 3 + TypeScript** 构建的纯前端单页应用。它将「日程待办」「手账总结」「个人中心」融合进一本虚拟的手账本：日程里记录的任务与数据会自动生成手账页面，支持拟真的 3D 翻页体验。所有数据保存在浏览器本地，无需注册登录，注重隐私与轻量。

## 功能特性

### 日程（Schedule）
- **每日待办**：按周视图展开一周任务，点击空白处就地创建，支持自定义颜色标记，回车保存
- **今日记录**：日记编辑器，支持心情标记与非今日日期保存提醒
- **月度清单**：以月为单位的任务清单，支持划掉、加入今日待办与删除二次确认
- **习惯管理**：
  - **习惯打卡**：自定义习惯 + 月历打卡，进度百分比统计
  - **理财记账**：支出/收入记录，自动汇总结余，区块可折叠
  - **理财管理**：自定义预算类型（名称/额度自由设定），自动扣减与剩余额度计算，超支浮动提醒
  - **减重记录**：每日 / 早晚 / 三餐三种记录模式，自动计算体重变化趋势
- **灵感模块**：内置与自建灵感集合，一键将灵感加入月度清单
- **清单抽屉**：右下角箭头快速展开月度清单侧边栏

### 手账（Notebook）
- **书本拟真**：封面 → 周总览 → 单日双页的 3D 翻页动画（`transform-style: preserve-3d` + 60fps GPU 加速）
- **自动生成**：日程任务自动排版为手账页面，无需手动整理
- **模块摘要**：月清单 / 收支 / 体重 / 打卡摘要可一键「添加到手账」，按日归档
- **自适应排版**：内容过长时自动缩小字号，保证信息完整呈现
- **双模式浏览**：索引模式（快速跳转）与书本模式（沉浸翻页）

### 我的（Profile）
- 数据导出 / 导入（JSON 备份恢复）、一键清空（危险操作二次确认）
- 随时重温新手引导

### 其他
- **新手引导**：基于 [Driver.js](https://driverjs.com/) 的分步高亮引导，首次启动自动弹出
- **二次确认**：所有删除/危险操作均通过全局确认弹窗防护

### 在线体验
项目已部署至 GitHub Pages，欢迎体验：
https://yyx-cat.github.io/my-goalday/

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | [Vue 3](https://vuejs.org/)（Composition API + `<script setup>`） |
| 语言 | TypeScript（严格模式） |
| 状态管理 | [Pinia](https://pinia.vuejs.org/)（单向数据流） |
| 构建工具 | [Vite](https://vite.dev/) |
| 样式 | 原生 CSS 变量 + [Tailwind CSS](https://tailwindcss.com/) |
| 引导 | Driver.js |
| 数据持久化 | localStorage（模块化键值设计） |

## 项目结构

```
src/
├── components/          # 组件
│   ├── common/          # 通用组件（添加到手账按钮等）
│   ├── habit/           # 习惯子模块（打卡/理财/减重）
│   ├── ConfirmDialog.vue    # 全局二次确认弹窗
│   └── Notebook*.vue        # 手账书本模式组件
├── config/              # 配置（新手引导步骤等）
├── store/
│   └── modules/         # Pinia 状态模块（一域一 store）
├── types/               # TypeScript 类型定义（集中管理）
├── utils/               # 存储与工具函数（localStorage CRUD）
└── views/               # 页面级视图（日程/手账/我的/灵感）
```

> 架构约定：类型集中在 `types/`，存储逻辑在 `utils/`（每个数据域一个独立 localStorage key），组件只与 Pinia Store 通信，保证单向数据流。

## 快速开始

```bash
# 克隆项目
git clone https://github.com/yyx-cat/my-goalday.git
cd my-goalday

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览构建结果
npm run preview

# 部署到 GitHub Pages（可选）
npm run deploy
```

## 数据说明

- 所有数据存储于浏览器 `localStorage`，键名以 `my-goalday-` 前缀模块化隔离
- 「我的」页面支持一键导出 JSON 备份与导入恢复，换浏览器不丢数据
- 清空应用数据前请先导出备份

## License

[MIT](./LICENSE)
