module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.js',
        '!**/node_modules/**',
        '!**/test/**',
        '!**/coverage/**'
    ],
    testMatch: [
        '**/test/**/*.test.js'
    ],
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    testTimeout: 10000
};
