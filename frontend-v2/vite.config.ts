import react from '@vitejs/plugin-react';
import svgr from '@svgr/rollup';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

function manualChunks(id) {
  if (id.includes('node_modules/plotly.js')) {
    return 'plotly';
  }
  if (id.includes('node_modules')) {
    return 'vendor';
  }
}

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
        manualChunks
      }
    },
  },
  server: {
    open: true,
    proxy
  },
});
