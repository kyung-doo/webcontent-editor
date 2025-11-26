import { Middleware } from '@reduxjs/toolkit';

export const syncMiddleware: Middleware = (store) => (next) => (action: any) => {
  // 1. 이미 메인에서 처리되어 돌아온 액션(isRemote)이면 -> 그냥 리듀서로 넘김
  if (action.meta?.isRemote) {
    return next(action);
  }

  console.log('📤 [Renderer] Sending to Main:', action.type);

  // 2. 내가 발생시킨 액션이면 -> 메인 프로세스로 전송 (내 로컬엔 적용 안 함)
  if (window.electronAPI) {
    window.electronAPI.dispatch(action);
  }

  // 로컬에서는 무시 (메인 갔다가 돌아오면 그때 실행됨)
  return;
};