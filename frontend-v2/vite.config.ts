import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import url from "@rollup/plugin-url";
import svgr from "@svgr/rollup";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { VitePluginRadar } from "vite-plugin-radar";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

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
      url(),
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
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            // The plugin will run tests for the stories defined in your Storybook config
            // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
            storybookTest({ configDir: path.join(dirname, ".storybook") }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
            setupFiles: [".storybook/vitest.setup.ts"],
            retry: 2,
          },
        },
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/stories"],
      },
    },
  });
};
