module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    // Allow console.log in Cloud Functions for logging
    "no-console": "off",
    // Relax some strict rules for Cloud Functions
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    // Allow unused parameters in function signatures (common in callbacks/interfaces)
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "args": "after-used"
    }],
  },
  ignorePatterns: [
    "lib/**/*", // Ignore compiled files
    "node_modules/**/*",
  ],
};
