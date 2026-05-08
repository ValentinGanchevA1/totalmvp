module.exports = {
  preset: 'react-native',
  // Packages that ship ESM or require Babel transformation in the Jest environment.
  transformIgnorePatterns: [
    'node_modules/(?!(' + [
      'react-native',
      '@react-native',
      '@react-navigation',
      'react-redux',
      '@reduxjs/toolkit',
      'redux-persist',
      'redux',
      'immer',
      'react-native-vector-icons',
      'react-native-linear-gradient',
      'react-native-permissions',
      'react-native-geolocation-service',
      'react-native-safe-area-context',
      '@stripe/stripe-react-native',
      '@react-native-firebase',
    ].join('|') + ')/)',
  ],
  // setupFilesAfterEnv runs after jest globals are available (needed for jest.mock calls).
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    '^react-native-safe-area-context$':
      '<rootDir>/node_modules/react-native-safe-area-context/jest/mock.tsx',
    '^react-native-gesture-handler$':
      '<rootDir>/__mocks__/react-native-gesture-handler.js',
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.js',
    '^react-native-map-clustering$': '<rootDir>/__mocks__/react-native-map-clustering.js',
  },
};
