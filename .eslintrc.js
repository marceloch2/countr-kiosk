module.exports = {
  root: true,
  extends: '@react-native-community',
  rules: {
    semi: 0,
    'comma-dangle': ['error', 'never'],
    'react-hooks/exhaustive-deps': 'off',
    'react/prop-types': 'off',
    'prefer-const': [
      'error',
      {
        destructuring: 'any',
        ignoreReadBeforeAssign: false
      }
    ],
    'no-console': ['error', { allow: ['log', 'group', 'groupEnd', 'info'] }],
    'no-unused-vars': 'off',
    'react/display-name': 0,
    'max-len': ['error', { code: 100 }],
    'no-case-declarations': 'off',
    'no-extra-boolean-cast': 'off'
  }
}
