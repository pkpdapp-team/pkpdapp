// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import reactJSXRuntime from "eslint-plugin-react/configs/jsx-runtime.js";
import reactHooks from "eslint-plugin-react-hooks";
import typescript from "typescript-eslint";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default typescript.config(
  js.configs.recommended,
  typescript.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  reactRecommended,
  reactJSXRuntime,
  reactHooks.configs["recommended-latest"],
  pluginJsxA11y.flatConfigs.recommended,
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
  storybook.configs["flat/recommended"],
);
