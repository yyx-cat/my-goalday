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
      // 自定义颜色 - 手账复古风格
      colors: {
        // 米白色系
        'cream': {
          50: '#FFFEF9',
          100: '#FFF9F0',
          200: '#FFF3E0',
          300: '#FCE8C8',
          400: '#F5D9A8',
          500: '#E8C78A',
        },
        // 暖灰色系
        'warm-gray': {
          50: '#FAF8F5',
          100: '#F5F0EA',
          200: '#E8DFD3',
          300: '#D4C5B0',
          400: '#B8A68E',
          500: '#9C876C',
          600: '#7D6A52',
          700: '#5E4F3D',
        },
        // 复古棕色系
        'vintage-brown': {
          50: '#F8F3ED',
          100: '#EFE4D4',
          200: '#DCC6A7',
          300: '#C4A375',
          400: '#A8824F',
          500: '#8B6539',
          600: '#6E4E2B',
        },
        // 复古墨绿
        'vintage-green': {
          100: '#E5EDE4',
          200: '#C5D6C2',
          300: '#9DB898',
          400: '#6F9369',
          500: '#4E7348',
        },
        // 复古脏粉
        'vintage-pink': {
          100: '#F6E4E4',
          200: '#ECC7C7',
          300: '#D99F9F',
          400: '#BF7575',
          500: '#A05555',
        },
        // 复古雾霾蓝
        'vintage-blue': {
          100: '#E1E8ED',
          200: '#BFCFDB',
          300: '#90AEC2',
          400: '#628BA5',
          500: '#436E89',
        },
      },
      // 自定义字体 - 手账风格
      fontFamily: {
        // 霞鹜文楷 - 手写风格主字体
        'kai': ['"LXGW WenKai"', '"霞鹜文楷"', 'serif'],
        // 思源宋体 - 正式标题字体
        'song': ['"Noto Serif SC"', '"Source Han Serif SC"', '"思源宋体"', 'serif'],
        // 手写体通用回退
        'handwriting': ['"LXGW WenKai"', '"霞鹜文楷"', '"Ma Shan Zheng"', '"楷体"', 'KaiTi', 'serif'],
      },
    },
  },
  plugins: [],
}

