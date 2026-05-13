// src/utils/sentry.ts
import * as Sentry from '@sentry/react-native';

// Set SENTRY_DSN via react-native-config (SENTRY_DSN env var in .env.production)
// Disable until a real DSN is configured
const SENTRY_DSN: string | null = __DEV__ ? null : null; // replace null with Config.SENTRY_DSN when ready

export const initSentry = () => {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Capture console logs as breadcrumbs
    integrations: [
      Sentry.reactNavigationIntegration(),
    ],
    // Release health tracking
    enableAutoSessionTracking: true,
    // Capture console logs
    beforeSend: (event) => {
      // Don't send events in development
      if (__DEV__) return null;
      return event;
    },
  });
};

export const captureException = (error: Error, context?: any) => {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        environment: __DEV__ ? 'development' : 'production',
      },
      extra: context,
    });
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
};
