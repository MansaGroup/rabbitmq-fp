module.exports = {
  extends: [
    "@mansagroup/eslint-config/recommended",
    "@mansagroup/eslint-config/node",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "tsconfig.json",
      },
    },
  },
  rules: {
    '@typescript-eslint/no-restricted-imports': 'off'
  }
};
