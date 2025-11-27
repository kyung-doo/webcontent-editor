const plugin = require('tailwindcss/plugin');
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // safelist: [
  //   {
  //     pattern: /^(bg|text|border|w|h|p|m)-.+/,
  //     variants: ['hover', 'focus'], // 호버 효과까지 포함
  //   },
  //   {
  //     pattern: /^(flex|grid|absolute|relative|fixed)-.+/,
  //   }
  // ],
  theme: {
    extend: {},
  },
  plugins: [],
}