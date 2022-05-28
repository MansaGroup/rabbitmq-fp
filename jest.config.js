module.exports = {
  globalSetup: '<rootDir>/test/jest-setup.ts',
  globalTeardown: '<rootDir>/test/jest-teardown.ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest'],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*InMem.ts',
    '!src/**/*.spec-part.ts',
    '!src/index.ts',
  ],
  reporters: ['default', 'jest-sonar'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  maxWorkers: 1,
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
