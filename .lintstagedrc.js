module.exports = {
  '*': 'prettier --ignore-unknown --write',
  '*.{js,ts}': 'eslint --config .eslintrc.js --fix',
  'package{,-lock}.json': () => 'npm run ensure-no-unused-deps',
};
