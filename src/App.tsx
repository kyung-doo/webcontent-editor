import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import ElementBar from './components/ElementBar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AssetPanel from './components/AssetPanel'; // 👇 import 추가

function App() {
  const { elements, canvasSettings } = useSelector((state: RootState) => state.editor);

  const handleSave = () => {
    const projectData = { elements };
    if (window.electronAPI) window.electronAPI.saveProject(projectData);
  };

  // 플레이 버튼 핸들러
  const handlePlay = () => {
    // 2. Electron에게 새 창 열라고 요청
    if (window.electronAPI) {
      window.electronAPI.openPreview(canvasSettings.width, canvasSettings.height);
    } else {
      // (웹 브라우저 테스트용) 새 탭으로 열기
      window.open('/#/preview', '_blank');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden">
      
      {/* 상단 헤더 */}
      <header className="flex h-14 items-center justify-between border-b border-gray-300 bg-white px-6 shadow-sm z-30">
        {/* ... 로고 ... */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600"></div>
          <h1 className="text-lg font-bold text-gray-700">Visual Builder v1.0</h1>
        </div>

        {/* 중앙: 플레이 버튼 */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <button 
            onClick={handlePlay}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-1.5 rounded-full hover:bg-green-700 transition-all shadow-md font-bold"
          >
            <span>▶</span> Play
          </button>
        </div>
        {/* ... 저장 버튼 ... */}
        <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
          프로젝트 저장
        </button>
      </header>

      {/* 중앙 메인 영역 (상단 작업공간 + 하단 에셋패널) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* 작업 공간 (좌+중+우) - 남은 공간(flex-1)을 다 차지함 */}
        <div className="flex flex-1 overflow-hidden">
          <ElementBar />
          <Canvas />
          <PropertiesPanel />
        </div>

        {/* 👇 하단 에셋 패널 추가 (높이는 컴포넌트 내부 h-48로 고정됨) */}
        <AssetPanel />
        
      </div>
    </div>
  );
}

export default App;