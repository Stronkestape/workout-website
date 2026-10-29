import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooks from "eslint-plugin-react-hooks";

// eslint-plugin-react-hooks v6 sets `configs.recommended` to a flat config array,
// while eslint-config-next 15.x expects the legacy eslintrc format via FlatCompat.
if (reactHooks.configs?.["recommended-legacy"]) {
  reactHooks.configs.recommended = reactHooks.configs["recommended-legacy"];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
