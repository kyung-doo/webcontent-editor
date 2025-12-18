import { configureStore } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import elementReducer from '../src/store/elementSlice';
import canvasReducer from '../src/store/canvasSlice';
import pageReducer from '../src/store/pageSlice';
import fontReducer from '../src/store/fontSlice';

const mainMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('dispatch-renderer', { ...action, meta: { isRemote: true } });
  });
  return result;
};

export const mainStore = configureStore({
  devTools: true,
  reducer: {
    elements: elementReducer,
    canvas: canvasReducer,
    page: pageReducer,
    font: fontReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(mainMiddleware),
});