import { configureStore } from "@reduxjs/toolkit";
import { BrowserWindow } from "electron";
import editorReducer from "../src/store/editorSlice"; // 상대 경로 주의

// Main 미들웨어: 액션이 들어오면 모든 렌더러 창에게 쏴줌
const mainMiddleware = (store: any) => (next: any) => (action: any) => {
  // console.log("⚡ [MAIN] Action Received:", action.type);
  const result = next(action);

  // 모든 열려있는 창(에디터, 프리뷰 등)에게 액션 전파
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("dispatch-renderer", {
      ...action,
      meta: { isRemote: true }, // "이건 서버(Main)에서 보낸거야"라고 표시
    });
  });

  return result;
};

export const mainStore = configureStore({
  reducer: {
    editor: editorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(mainMiddleware),
});
