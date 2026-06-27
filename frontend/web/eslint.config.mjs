import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler readiness diagnostics. The compiler is not enabled in
    // this project (no `reactCompiler: true`), and these rules fire on
    // idiomatic client-init hooks (timers/subscriptions reading Date.now on
    // mount) and on third-party hooks (@tanstack/react-virtual). Keep them as
    // advisory warnings rather than errors; all correctness rules stay strict.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
