export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'prisma/migrations/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/services/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'express', message: 'Service tidak boleh mengenal HTTP.' },
            { name: '@prisma/client', message: 'Service harus lewat repository.' },
          ],
          patterns: [
            { group: ['../controllers/*', '../routes/*'], message: 'Arah impor salah.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/controllers/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@prisma/client', message: 'Gunakan service.' }],
          patterns: [{ group: ['../repositories/*'], message: 'Controller tidak boleh query.' }],
        },
      ],
    },
  },
  {
    files: ['src/repositories/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'express', message: 'Repository bukan HTTP.' }],
          patterns: [
            { group: ['../services/*', '../controllers/*'], message: 'Arah impor salah.' },
          ],
        },
      ],
    },
  },
]
