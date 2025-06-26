/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.history/**',
        'src/**/*.d.ts',
        'src/**/*.config.ts',
        'coverage/**',
        'test/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'eslint.config.js',
        'vitest.config.ts',
      ],
    },
    reporters: ['verbose'],
    typecheck: {
      enabled: true,
    },
    // デバッグ時の設定
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // テストタイムアウトを延長（デバッグ中のブレークポイント停止を考慮）
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
