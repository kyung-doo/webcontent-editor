import { configureStore } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
// 👇 쪼개진 리듀서들을 가져옵니다
import elementReducer from '../src/store/elementSlice';
import canvasReducer from '../src/store/canvasSlice';

const mainMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('dispatch-renderer', { ...action, meta: { isRemote: true } });
  });
  return result;
};

export const mainStore = configureStore({
  reducer: {
    elements: elementReducer,
    canvas: canvasReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(mainMiddleware),
});