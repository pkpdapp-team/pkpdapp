import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import reactJSXRuntime from "eslint-plugin-react/configs/jsx-runtime.js";
import reactHooks from "eslint-plugin-react-hooks";
import typescript from "typescript-eslint";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default [
  js.configs.recommended,
  reactRecommended,
  reactJSXRuntime,
  reactHooks.configs["recommended-latest"],
  pluginJsxA11y.flatConfigs.recommended,
  ...typescript.configs.recommended,
  prettier,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    ignores: ["src/app/api.ts", "src/app/backendApi.ts"],
  },
];
