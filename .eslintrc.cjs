module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "airbnb",
    "airbnb/hooks",
    "airbnb-typescript",
  ],
  ignorePatterns: ['src/components/ui/**'],
  rules: {
    "react/react-in-jsx-scope": "off",
    "import/extensions": "off",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
    "react/jsx-props-no-spreading": "off",
    "react/require-default-props": "off",
  },
};
