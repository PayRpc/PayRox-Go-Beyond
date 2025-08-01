import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        // Test framework globals
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': 'off', // Disabled for better development experience
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for flexibility
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions
      
      // General rules
      'no-console': 'off', // Allow console.log in scripts
      'prefer-const': 'off', // More lenient
      'no-var': 'error',
      'eqeqeq': 'off', // More lenient
      'curly': 'off', // Disable curly brace requirements
      
      // Code style
      'indent': 'off', // Let prettier handle this
      'quotes': 'off', // Let prettier handle this
      'semi': 'off', // Let prettier handle this
      'comma-trailing': 'off',
      
      // Allow unused parameters in function signatures
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    },
  },
  {
    files: ['hardhat.config.ts', 'scripts/**/*.ts', 'test/**/*.ts', 'tasks/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // More lenient for infrastructure files
      '@typescript-eslint/no-unused-vars': 'off', // More lenient for scripts and tests
      'no-unused-vars': 'off',
      'curly': 'off',
    },
  },
  {
    files: ['cli/dist/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script', // CommonJS for dist files
      globals: {
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off', // Disable for dist files
    },
  },
  {
    ignores: [
      'node_modules/',
      'artifacts/',
      'cache/',
      'coverage/',
      'typechain-types/',
      'dist/',
      'build/',
      'cli/dist/',
    ],
  },
];
