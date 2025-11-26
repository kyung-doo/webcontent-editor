import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editorSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  devTools: true,
});
// TypeScript 타입을 위한 설정
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;