import path from "node:path";
import react from "@vitejs/plugin-react";
import url from "@rollup/plugin-url";
import svgr from "@svgr/rollup";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { VitePluginRadar } from "vite-plugin-radar";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

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
  // django-allauth OAuth + email-confirmation endpoints
  "/accounts": {
    target: "http://localhost:8000",
    changeOrigin: true,
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
    plugins: [react(), url(), svgr(), VitePluginRadar(radarOptions)],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/plotly.js")) {
              return "plotly";
            }
            if (
              id.includes("node_modules/@mui/material") ||
              id.includes("node_modules/@mui/icons-material") ||
              id.includes("node_modules/@mui/x-data-grid") ||
              id.includes("node_modules/@reduxjs/toolkit") ||
              id.includes("node_modules/@reduxjs/toolkit/query") ||
              id.includes("node_modules/papaparse") ||
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react-hook-form") ||
              id.includes("node_modules/react-dropzone") ||
              id.includes("node_modules/react-redux") ||
              id.includes("node_modules/react-toastify")
            ) {
              return "vendor";
            }
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
            storybookTest({
              configDir: path.join(import.meta.dirname, ".storybook"),
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
            retry: 2,
            testTimeout: 30000, // Increase timeout for CI environments
            // Cap concurrent browser workers. These story tests render heavy MUI
            // trees; on high-core machines the default (one worker per core) causes
            // CPU contention that starves in-flight renders/requests and makes
            // timing-sensitive stories flaky. 4 bounds contention while keeping
            // parallelism. It's a ceiling, so low-core CI (e.g. 2 cores) is
            // unaffected.
            maxWorkers: 4,
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
