import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test output (JMeter dashboards, Lighthouse and Playwright reports).
    "docs/**",
    "tests/load/results/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
