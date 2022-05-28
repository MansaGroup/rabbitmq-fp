module.exports = {
  '*': 'prettier --ignore-unknown --write',
  '*.{js,ts}': 'eslint --config .eslintrc.js --fix',
  'package{,-lock}.json': () => 'depcheck',
};
