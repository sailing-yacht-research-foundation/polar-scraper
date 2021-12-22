process.env.NODE_ENV = 'test';

module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['node_modules', '<rootDir>/src/types'],
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  setupFiles: ['dotenv/config'],
};
