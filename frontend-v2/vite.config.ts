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
            testTimeout: 30000, // Increase timeout for CI environments
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
