import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      // Catches the project's own documented recurring bug: a Tabler icon
      // (or any other identifier) used in JSX but not imported. Vite/esbuild
      // does not catch this at build time — only at runtime, when the code
      // path renders.
      "no-undef": js.configs.recommended.rules["no-undef"],
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react/jsx-no-undef": "error",
      // Bonus check for the state-into-hooks extraction phase.
      "react-hooks/rules-of-hooks": "error",
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
