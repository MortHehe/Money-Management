import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "function" },
        { blankLine: "always", prev: "function", next: "*" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".npm-cache/**",
    ".playwright/**",
    "artifacts/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);
