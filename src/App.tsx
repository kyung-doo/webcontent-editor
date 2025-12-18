import { useState } from "react";
import LeftSidebar from "./components/LeftSidebar";
import Canvas from "./components/Canvas";
import RightSidebar from "./components/RightSidebar";
import BottomPanel from "./components/BottomPanel";
import CanvasGlobalStyle from "./components/CanvasGlobalStyle";
import { Type, MonitorPlay, Save, LayoutTemplate } from "lucide-react";
import FontManager from "./components/FontManager";
import { FontProvider, useFontState } from "./context/FontContext";


function AppContent() {
  // [MOCK] Redux State 대체
  const elements = []; 
  const canvasSettings = { width: 1920, height: 1080 };
  const activePageId = 'page-1';

  // [수정 포인트 1] useFontState를 사용하여 전역 폰트 상태 가져오기
  const { activeFont } = useFontState();

  // [수정 포인트 2] 로컬 폰트 배열(activeFonts) 상태 제거 -> Store가 관리함
  const [isFontManagerOpen, setIsFontManagerOpen] = useState(false);
  
  const handleSave = () => {
    console.log("Saving project...");
    // window.electronAPI.saveProject({ elements });
  };

  const handlePlay = () => {
    // 2. Electron에게 새 창 열라고 요청
    if (window.electronAPI) {
      // [수정] Electron 메인 프로세스로 pageId를 함께 전달합니다.
      // (Electron의 main.js/preload.js에서도 인자를 받아 URL 쿼리를 붙이도록 처리 필요)
      window.electronAPI.openPreview(
        canvasSettings.width,
        canvasSettings.height,
        activePageId
      );
    } else {
      // (웹 브라우저 테스트용) 새 탭으로 열기
      // [수정] URL 뒤에 쿼리 파라미터 추가 (?pageId=...)
      window.open(`/#/preview?pageId=${activePageId}`, "_blank");
    }
  };

  return (
    <>
      <CanvasGlobalStyle mode="edit" />

      {/* [수정 포인트 3] 가져온 activeFont를 최상위 div 스타일에 적용 */}
      <div 
        className="flex h-screen flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden transition-all duration-300"
      >
        <header className="flex h-14 items-center justify-between border-b border-gray-300 bg-white px-6 shadow-sm z-30">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
               <LayoutTemplate className="text-white w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-gray-700">Visual Builder v1.0</h1>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <button onClick={handlePlay} className="flex items-center gap-2 bg-green-600 text-white px-6 py-1.5 rounded-full hover:bg-green-700 transition-all shadow-md font-bold">
              <MonitorPlay size={18} /> Play
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFontManagerOpen(true)}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Type size={16} className="text-gray-500" />
              <span>폰트 관리</span>
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 truncate max-w-[100px]">
                {activeFont}
              </span>
            </button>

            <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} /> 저장
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <LeftSidebar />
            <Canvas />
            <RightSidebar />
          </div>
          <BottomPanel />
        </div>

        {/* [수정 포인트 4] FontManager에 불필요한 props 전달 제거 */}
        <FontManager
          isOpen={isFontManagerOpen}
          onClose={() => setIsFontManagerOpen(false)}
        />
      </div>
    </>
  );
}

// [중요] App 컴포넌트에서 FontProvider를 감싸줍니다.
// 이렇게 해야 AppContent 내부에서 useFontState를 사용할 수 있습니다.
export default function App() {
  return (
    <FontProvider>
      <AppContent />
    </FontProvider>
  );
}

