import react from "@vitejs/plugin-react";
import svgr from "@svgr/rollup";
import { defineConfig, loadEnv } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { VitePluginRadar } from "vite-plugin-radar";

const proxy = {
  "/backend": {
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: {
      "^/backend": "/static",
    },
  },
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: {
      "^/backend": "/static",
    },
  },
};

// https://vitejs.dev/config/
export default ({ mode }) => {
  const { VITE_APP_GA_ID } = loadEnv(mode, process.cwd());
  const radarOptions = {
    enableDev: true,
    analytics: {
      id: VITE_APP_GA_ID,
    },
  };
  return defineConfig({
    plugins: [
      react(),
      viteTsconfigPaths(),
      svgr(),
      VitePluginRadar(radarOptions),
    ],
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks: {
            plotly: ["plotly.js-basic-dist-min"],
            material: [
              "@mui/material",
              "@mui/icons-material",
              "@mui/x-data-grid",
            ],
            vendor: [
              "@reduxjs/toolkit",
              "@reduxjs/toolkit/query",
              "papaparse",
              "react",
              "react-dom",
              "react-hook-form",
              "react-dropzone",
              "react-redux",
              "react-toastify",
            ],
          },
        },
      },
    },
    server: {
      open: true,
      proxy,
    },
  });
};
