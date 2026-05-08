/**
 * Chat Copilot Mobile App
 * @format
 */

import React, { ErrorInfo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { logger } from './src/utils/logger';

const handleGlobalError = (error: Error, errorInfo: ErrorInfo) => {
  logger.error('[Global Error]', error.message);
  logger.error('[Component Stack]', errorInfo.componentStack);
};

function App(): React.JSX.Element {
  return (
    <ErrorBoundary onError={handleGlobalError}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <SafeAreaProvider>
              <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
              <AppNavigator />
            </SafeAreaProvider>
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
