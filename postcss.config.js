/**
 * PostCSS 配置
 * 顺序很重要：tailwindcss/nesting 必须在 tailwindcss 之前，
 * 否则原 style.css 中的嵌套语法（如 &:hover）会报错
 */
export default {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
