export default {
  test: {
    environment: 'node',
    clearMocks: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    pool: 'threads',
  },
};
