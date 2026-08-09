import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import tailwindcss from 'eslint-plugin-tailwindcss';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const typeScriptFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const typedConfigs = [
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
].map((config) => ({ ...config, files: config.files ?? typeScriptFiles }));

export default tseslint.config(
  {
    ignores: [
      '.angular/**',
      '.electron/**',
      '.electrobun/**',
      'artifacts/**',
      'coverage/**',
      'dist/**',
      'examples/**',
      '**/*.js',
      '**/*.mjs',
      'node_modules/**',
      'out-tsc/**',
      'out/**',
      'projects/version-info.ts',
    ],
  },
  eslint.configs.recommended,
  ...typedConfigs,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': [
        {
          type: 'electron',
          pattern: 'projects/electron',
          partialMatch: false,
        },
        {
          type: 'docs',
          pattern: 'projects/docs',
          partialMatch: false,
        },
      ],
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: false,
          checkUnknownLocals: false,
          checkInternals: false,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['projects/**/src/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/sort-keys-in-type-decorator': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 10, styles: 0 }],
      '@angular-eslint/inject-at-top': 'error',
      'no-unused-private-class-members': 'off',
      '@typescript-eslint/no-unused-private-class-members': 'error',
      'max-lines': ['error', { max: 2000, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-at-else': 'error',
      '@angular-eslint/template/prefer-at-empty': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/attributes-order': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/prefer-contextual-for-variables': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Call[args.length > 0]:not(BoundEvent Call)',
          message:
            'Avoid calling functions with arguments in templates. Use signals, properties, or pure pipes instead.',
        },
      ],
      'max-lines': ['error', { max: 2000, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['**/*.ts', '**/*.html'],
    plugins: {
      tailwindcss,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: path.join(import.meta.dirname, 'projects/electron/src/styles.css'),
      },
    },
    rules: {
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/enforces-negative-arbitrary-values': 'error',
      'tailwindcss/enforces-shorthand': 'error',
      'tailwindcss/important-modifier-suffix': 'error',
      'tailwindcss/no-arbitrary-value': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-custom-classname': 'error',
      'tailwindcss/no-unnecessary-arbitrary-value': 'error',
    },
  },
  {
    files: ['projects/docs/src/**/*.ts', 'projects/docs/src/**/*.html'],
    settings: {
      tailwindcss: {
        cssConfigPath: path.join(import.meta.dirname, 'projects/docs/src/styles.css'),
      },
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'max-lines': ['error', { max: 2000, skipBlankLines: false, skipComments: false }],
    },
  },
  prettier,
);
