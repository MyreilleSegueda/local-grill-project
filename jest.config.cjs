module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.ts',
    'lib/**/*.tsx',
    'server/**/*.ts',
    'app/**/*.ts',
    'app/**/*.tsx',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
};
