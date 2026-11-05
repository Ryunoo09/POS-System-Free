import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'prisma/migrations/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/services/**/*.ts'],
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
    files: ['src/controllers/**/*.ts'],
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
    files: ['src/repositories/**/*.ts'],
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
)
