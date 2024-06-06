import react from '@vitejs/plugin-react';
import svgr from '@svgr/rollup';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

const proxy = {
  "/backend": {
    "target": "http://localhost:8000",
    "changeOrigin": true,
    "pathRewrite": {
      "^/backend": "/static"
    }
  },
  "/api": {
    "target": "http://localhost:8000",
    "changeOrigin": true,
    "pathRewrite": {
      "^/backend": "/static"
    }
  },
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteTsconfigPaths(), svgr()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js'],
          material: ['@mui/material', '@mui/icons-material', '@mui/x-data-grid'],
          vendor: ['@reduxjs/toolkit', 'papaparse', 'react', 'react-dom', 'react-hook-form', 'react-dropzone', 'react-redux', 'react-toastify'],
        }
      }
    },
  },
  server: {
    open: true,
    proxy
  },
});
