import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react', // ถ้าใช้ Emotion
      babel: {
        plugins: ['@emotion/babel-plugin'], // ถ้าใช้ Emotion
      },
    }),
    visualizer({ // วิเคราะห์ bundle size (เฉพาะ development)
      open: true,
      filename: 'bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    host: '172.48.0.114',
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false // ปิด error overlay ถ้าไม่ต้องการ
    },
    fs: {
      strict: true, // จำกัดการเข้าถึงไฟล์นอก project root
      allow: ['..'], // อนุญาตให้เข้าถึงเฉพาะ directory ที่จำเป็น
    },
  },
  cacheDir: 'node_modules/.vite_cache',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
         'react-dom': 'react-dom', // ถ้าใช้ react-hot-loader
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'], // ลดเวลา lookup
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'lodash-es',
      '@emotion/react',
      '@emotion/styled',
    ],
    exclude: ['moment', 'date-fns'], // ไลบรารีที่ใช้ dynamic imports
    esbuildOptions: {
      target: 'es2020',
    },
  },
  esbuild: {
    target: 'es2020',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    treeShaking: true,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV !== 'production', // ปิดใน production
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800, // เพิ่ม limit สำหรับแอปขนาดใหญ่
    reportCompressedSize: false, // ปิดการรายงานขนาด compressed
    emptyOutDir: true, // ล้างไฟล์เก่าก่อน build ใหม่
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // แยก vendor chunks อย่างชาญฉลาด
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('recharts')) return 'charts-vendor';
            if (id.includes('lodash')) return 'lodash-vendor';
            if (id.includes('axios')) return 'axios-vendor';
            return 'vendor';
          }
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
      onwarn(warning, warn) {
        // ฟิลเตอร์ warning ที่ไม่จำเป็น
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});