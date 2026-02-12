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
  rules: {
    "react/react-in-jsx-scope": "off",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
  },
};
