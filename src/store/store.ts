import { configureStore } from '@reduxjs/toolkit';
import elementReducer from './elementSlice';
import canvasReducer from './canvasSlice';
import { syncMiddleware } from './syncMiddleware';

export const store = configureStore({
  reducer: {
    elements: elementReducer, // Data
    canvas: canvasReducer,    // View
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;