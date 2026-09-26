import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import formatjs from "eslint-plugin-formatjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.claude/**",
      "apps/mobile/**",
      "Cyberpunk Sudoku UI Mockups/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly" } },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // UI copy lives in packages/i18n. Brand names opt out with an inline disable comment.
    files: ["apps/web/src/**/*.tsx"],
    ignores: ["**/*.test.tsx", "apps/web/src/test/**"],
    plugins: { formatjs },
    rules: {
      "formatjs/no-literal-string-in-jsx": [
        "error",
        { props: { include: [["*", "{aria-label,label,placeholder,title,alt}"]] } },
      ],
    },
  }
);
