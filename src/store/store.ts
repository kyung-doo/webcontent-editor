import { configureStore } from '@reduxjs/toolkit';
import elementReducer from './elementSlice';
import canvasReducer from './canvasSlice';
import pageSlice from './pageSlice';
import fontSlice from './fontSlice';
import { syncMiddleware } from './syncMiddleware';


export const store = configureStore({
  devTools: true,
  reducer: {
    page: pageSlice,
    elements: elementReducer, // Data
    canvas: canvasReducer,    // View
    font: fontSlice
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(syncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;