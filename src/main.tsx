import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { HashRouter, Routes, Route } from "react-router-dom";
import { store } from "./store/store";
import { setElements } from "./store/elementSlice";
import { setCanvasState } from "./store/canvasSlice";
import { setPages, setActivePage } from "./store/pageSlice";
import { ModalProvider } from "./context/ModalContext.tsx";
import App from "./App.tsx";
import Preview from "./pages/Preview.tsx";
import "./index.css";
import { setFonts } from "./store/fontSlice.ts";

function StateSynchronizer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // window.electronAPI 타입 단언 (TypeScript 에러 방지용)
    const electronAPI = (window as any).electronAPI;

    if (electronAPI) {
      // 1. 초기 상태 로드
      electronAPI.getInitialState().then((wholeState: any) => {
        console.log("🔄 초기 상태 수신:", wholeState);

        if (wholeState) {
          // Element 데이터 복구
          if (wholeState.elements?.elements) {
            // [수정] Main Process의 State가 객체(Map) 형태일 수 있으므로
            // 배열로 변환하여 setElements에 전달해야 합니다.
            const rawElements = wholeState.elements.elements;

            // 배열이면 그대로, 객체면 values만 추출하여 배열로 변환
            const elementsArray = Array.isArray(rawElements)
              ? rawElements
              : Object.values(rawElements);

            dispatch(setElements(elementsArray));
          }

          // Canvas 데이터 복구
          if (wholeState.canvas) {
            dispatch(
              setCanvasState({
                canvasSettings: wholeState.canvas.canvasSettings,
                selectedIds: [],
                selectedElementId: null,
                activeContainerId: wholeState.canvas.activeContainerId || "root",
                currentTool: "select",
                clipboard: [],
              })
            );
          }

          // Page 데이터 복구
          if (wholeState.page) {
            if (wholeState.page.pages) {
              dispatch(setPages(wholeState.page.pages));
            }
            if (wholeState.page.activePageId) {
              dispatch(setActivePage(wholeState.page.activePageId));
            }
          }

          // 폰트 데이터 복구
          if(wholeState.font) {
            if(wholeState.font.fonts) {
              dispatch(setFonts(wholeState.font.fonts));
            }
          }

        }
      });

      // 실시간 동기화
      const cleanup = electronAPI.onDispatch((action: any) => {
        dispatch({
          ...action,
          meta: { ...action.meta, fromElectron: true },
        });
      });
      return () => cleanup();
    }
  }, [dispatch]);

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.Fragment>
    <Provider store={store}>
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
  </React.Fragment>
);
