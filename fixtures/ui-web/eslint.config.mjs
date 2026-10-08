import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    // ESLint's default parser cannot read TypeScript at all — without this
    // every .tsx file is a parsing error rather than a lint result.
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // The base no-unused-vars rule does not understand that JSX references
      // an identifier, so it reports every imported component as unused. The
      // TypeScript one does.
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
