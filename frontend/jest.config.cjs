/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['tests/**/*.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 60000, // Stagehand tests need time for LLM calls
  setupFiles: ['<rootDir>/tests/setup.ts'],
}
