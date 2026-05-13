// src/common/sentry.ts
import * as Sentry from '@sentry/node';
import { httpIntegration, consoleIntegration } from '@sentry/node';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Capture console logs as breadcrumbs in production
    integrations: [
      httpIntegration(), // Removed { tracing: true } as it is not valid in @sentry/node v8+
      consoleIntegration(),
    ],
    // Don't send events in development
    beforeSend: (event) => {
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });
};
