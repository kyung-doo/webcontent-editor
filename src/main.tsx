// src/main.tsx
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useDispatch } from 'react-redux'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { store } from './store/store'
import { setInitialState } from './store/editorSlice' 
import App from './App.tsx'
import Preview from './pages/Preview.tsx'
import { ModalProvider } from './context/ModalContext.tsx'
import './index.css'

// 상태 동기화 관리자
function StateSynchronizer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (window.electronAPI) {
      
      // [초기화] 앱 켜지자마자 Main 프로세스에 저장된 상태 가져오기
      window.electronAPI.getInitialState().then((wholeState: any) => {
        if (wholeState && wholeState.editor) {
          dispatch(setInitialState(wholeState.editor));
        }
      });

      // [실시간] 액션 구독
      const cleanup = window.electronAPI.onDispatch((action: any) => {
        dispatch(action);
      });
      return () => cleanup();
    }
  }, [dispatch]);

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* 👇 모든 라우트가 이 동기화 로직 안에서 돕니다 */}
      <ModalProvider>
        <StateSynchronizer>
          <HashRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/preview" element={<Preview />} />
            </Routes>
          </HashRouter>
        </StateSynchronizer>
      </ModalProvider>
    </Provider>
  </React.StrictMode>,
)