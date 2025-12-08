import { configureStore, combineReducers } from '@reduxjs/toolkit';
import deliveriesReducer from './slices/deliveriesSlice';
import settingsReducer from './slices/settingsSlice';
import themeReducer from './slices/themeSlice';

// Combine all reducers
const rootReducer = combineReducers({
  deliveries: deliveriesReducer,
  settings: settingsReducer,
  theme: themeReducer,
});

// Configure store
// ВСІ ДАНІ ЗБЕРІГАЮТЬСЯ В SQLITE, НЕ В REDUX!
// Redux використовується тільки для UI state
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Allow Date objects and other complex types
        ignoredActions: [],
      },
    }),
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;





