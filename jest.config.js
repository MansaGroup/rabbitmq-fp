export default {
  globalSetup: '<rootDir>/test/jest-setup.ts',
  globalTeardown: '<rootDir>/test/jest-teardown.ts',
  setupFilesAfterEnv: ['jest-extended/all'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  extensionsToTreatAsEsm: ['.ts'],
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*InMem.ts',
    '!src/**/*.spec-part.ts',
    '!src/main.ts',
  ],
  reporters: ['default', 'jest-sonar'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 200000,
  maxWorkers: 1,
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
