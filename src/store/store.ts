import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editorSlice';
import { syncMiddleware } from './syncMiddleware'; // 2단계에서 만든 것

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(syncMiddleware), // 미들웨어 장착
});

export type RootState = ReturnType<typeof store.getState>;