## 📌 React + JS重构

1✅、node22.19.0 npm 10.9.3
```bash
node -v
npm -v
```

2✅、用 Vite 初始化项目
```bash
npm create vite@latest playfun -- --template react
cd playfun
npm i
```

3✅、安装Tailwind
```bash
npm i -D tailwindcss@3.4.13 postcss@8 autoprefixer@10
.\node_modules\.bin\tailwindcss.cmd init -p
```

4✅、tailwind.config.js
```bash
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

5✅、src/index.css
```bash
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 可选：让深色背景更接近预览 */
:root { color-scheme: dark; }
html,body,#root{ height:100%; }
body{ @apply bg-[#191426] text-white; }
```

6✅、src/main.jsx
```bash
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

7✅、替换src/App.jsx代码

8✅、启动开发服务器
```bash
npm run dev -- --host
```
