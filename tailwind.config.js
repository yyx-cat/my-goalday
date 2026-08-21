/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // 扫描 index.html 文件
    "./index.html",
    // 扫描 src 目录下的所有 Vue、JS、TS、JSX、TSX 文件
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 自定义颜色 - 极简黑白灰 + 藕灰导航风格
      colors: {
        // 背景色系
        'bg': {
          'main': '#FCF9F6',      // 主体内容背景色（略偏米白）
          'surface': '#EAE0D8',   // 导航栏及悬浮按钮背景色（暖灰/藕灰色）
        },
        // 文字色系
        'text': {
          'primary': '#1A1A1A',   // 主标题、日期数字、周数（黑色）
          'secondary': '#666666', // 星期几、次要说明
          'tertiary': '#999999',  // 未选中的导航文字
        },
        // 边框色系
        'border': {
          'divider': '#E0E0E0',   // 列表项之间的分割线颜色
        },
      },
      // 自定义字体 - 系统无衬线（极简风格）
      fontFamily: {
        // 系统字体栈 - 跨平台原生体验
        'sans': [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      // 字号
      fontSize: {
        'xs': ['12px', 'normal'],   // 星期几
        'sm': ['14px', 'normal'],   // 导航栏标签
        'base': ['16px', 'medium'], // 顶部周数
        'lg': ['20px', 'semibold'], // 日期数字
      },
      // 间距
      spacing: {
        'safe': '16px',  // 左右安全边距
      },
    },
  },
  plugins: [],
}
