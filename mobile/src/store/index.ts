// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import authReducer from '../features/auth/authSlice';
import mapReducer from '../features/map/mapSlice';
import chatReducer from '../features/chat/chatSlice';
import discoveryReducer from '../features/discovery/discoverySlice';
import profileReducer from '../features/profile/profileSlice';
import profileEditReducer from '../features/profile/profileEditSlice';
import verificationReducer from '../features/verification/verificationSlice';
import interactionsReducer from '../features/interactions/interactionsSlice';
import tradingReducer from '../features/trading/tradingSlice';

// Increment STORE_VERSION whenever a persisted slice's state shape changes.
// Add a migration function for the new version so existing installs upgrade
// gracefully instead of corrupting on update.
const STORE_VERSION = 1;

const migrations: Record<number, (state: any) => any> = {
  // v0 → v1: auth.user gained isVisible field; default it to true
  1: (state) => ({
    ...state,
    auth: {
      ...state.auth,
      user: state.auth?.user ? { isVisible: true, ...state.auth.user } : null,
    },
  }),
};

const rootReducer = combineReducers({
  auth: authReducer,
  map: mapReducer,
  chat: chatReducer,
  discovery: discoveryReducer,
  profile: profileReducer,
  profileEdit: profileEditReducer,
  verification: verificationReducer,
  interactions: interactionsReducer,
  trading: tradingReducer,
});

const persistConfig = {
  key: 'root',
  version: STORE_VERSION,
  storage: AsyncStorage,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
  // Only persist auth and discovery preferences; volatile state (map, chat) reloads from API.
  whitelist: ['auth', 'discovery'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
