// src/main.tsx
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useDispatch } from 'react-redux'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { store } from './store/store'
import { setElements } from './store/elementSlice'
import { setCanvasState } from './store/canvasSlice'
import { ModalProvider } from './context/ModalContext.tsx'
import App from './App.tsx'
import Preview from './pages/Preview.tsx'
import './index.css'

function StateSynchronizer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (window.electronAPI) {
      // 1. 초기 상태 로드
      window.electronAPI.getInitialState().then((wholeState: any) => {
        console.log('초기 상태 수신:', wholeState);
        
        if (wholeState) {
          // Element 데이터 복구
          if (wholeState.elements && wholeState.elements.elements) {
            dispatch(setElements(wholeState.elements.elements));
          }
          
          // Canvas 데이터 복구
          if (wholeState.canvas) {
            dispatch(setCanvasState({
              canvasSettings: wholeState.canvas.canvasSettings,
              selectedIds: [],
              selectedElementId: null,
              activeContainerId: '',
              currentTool: 'select',
              clipboard: []
            }));
          }
        }
      });

      // 2. 실시간 동기화
      const cleanup = window.electronAPI.onDispatch((action: any) => {
        dispatch(action);
      });
      return () => cleanup();
    }
  }, [dispatch]);

  return <>{children}</>;
}

// ... (render 부분 동일)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.Fragment>
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
  </React.Fragment>,
)