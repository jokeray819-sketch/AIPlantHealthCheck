import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    //host: '192.168.11.252',
    port: 3000,
    open: true
  },
  define: {
    'process.env': JSON.stringify({}),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v16.0.0'),
    'process.browser': JSON.stringify(true),
    global: 'globalThis',
    // 禁用 Lit 开发模式警告（仅在开发模式下）
    ...(process.env.NODE_ENV === 'production' ? {
      'process.env.LIT_DEV_MODE': JSON.stringify('false'),
    } : {}),
  },
  resolve: {
    alias: {
      process: 'process/browser',
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
    },
  },
  optimizeDeps: {
    include: ['process', 'process/browser'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    // 生产构建时最小化输出
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console，但可以设置为 true 来移除所有 console
        drop_debugger: true,
      },
    },
    commonjsOptions: {
      include: [/process/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})

