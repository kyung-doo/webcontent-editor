import { configureStore } from '@reduxjs/toolkit';
import elementReducer from './elementSlice';
import canvasReducer from './canvasSlice';
import pageSlice from './pageSlice';
import { syncMiddleware } from './syncMiddleware';

export const store = configureStore({
  reducer: {
    page: pageSlice,
    elements: elementReducer, // Data
    canvas: canvasReducer,    // View
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;