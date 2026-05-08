// Silence TurboModuleRegistry.getEnforcing() for unknown native modules so
// tests don't throw on native code that can't run in Node.js.
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const registry = jest.requireActual(
    'react-native/Libraries/TurboModule/TurboModuleRegistry',
  );
  return {
    ...registry,
    getEnforcing: (name) => {
      // Return a no-op proxy instead of throwing for unregistered modules.
      return new Proxy(
        {},
        { get: () => () => null, set: () => true },
      );
    },
    get: (name) => null,
  };
});

// Common native module stubs
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/messaging', () => () => ({
  getToken: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn(),
  requestPermission: jest.fn(),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: { performRequest: jest.fn(), onCredentialRevoked: jest.fn() },
  AppleAuthRequestOperation: {},
  AppleAuthRequestScope: {},
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn(), signOut: jest.fn() },
}));

jest.mock('react-native-fbsdk-next', () => ({
  LoginManager: { logInWithPermissions: jest.fn() },
  AccessToken: { getCurrentAccessToken: jest.fn() },
  GraphRequest: jest.fn(),
  GraphRequestManager: jest.fn(() => ({ addRequest: jest.fn(), start: jest.fn() })),
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {},
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
}));

jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }) => children,
  useStripe: () => ({ initPaymentSheet: jest.fn(), presentPaymentSheet: jest.fn() }),
}));
