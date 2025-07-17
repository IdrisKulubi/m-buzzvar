module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/components'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    'components/**/*.ts',
    'components/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!components/**/*.test.ts',
    '!components/**/__tests__/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-location|expo-modules-core|@expo|expo|expo-secure-store)/)',
  ],
};