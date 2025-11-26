import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateSelectedElement, addScriptToElement, removeScriptFromElement, updateCanvasSettings } from '../store/editorSlice';
import { usePannelToggle } from '../hooks/usePannelToggle';
import { useState } from 'react';

export default function PropertiesPanel() {
  const { elements, selectedId, canvasSettings } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();
  const { isOpen, toggle } = usePannelToggle(true);

  const [availableScripts, setAvailableScripts] = useState<string[]>([]);

  // 선택된 요소 찾기
  const selectedElement = elements.find(el => el.id === selectedId);

  const handleAddScript = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scriptName = e.target.value;
    if (scriptName && selectedId) {
      dispatch(addScriptToElement({ id: selectedId, scriptName }));
      e.target.value = ''; // 선택 초기화
    }
  };


  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getScripts().then(setAvailableScripts); 

    }
  }, []);
  

  return (
    <aside 
      className={`
        relative z-50 border-l border-gray-300 bg-white shadow-sm z-20 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72 p-5' : 'w-0 p-0 border-none'}
      `}
    >
      {/* 토글 버튼 (왼쪽에 붙음) */}
      <button
        onClick={toggle}
        className="absolute -left-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg) translateX(13px)' }}
      >
        {/* 오른쪽 화살표 아이콘 */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 내부 콘텐츠 wrapper */}
      <div className={`size-full overflow-hidden ${!isOpen && 'hidden'}`}>
        
        {/* 예시: */}
        {!selectedElement ? (
           <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2 whitespace-nowrap">
              Canvas Settings
            </h3>

            {/* 캔버스 너비 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Width (px)</label>
              <input 
                type="number"
                value={canvasSettings.width}
                onChange={(e) => dispatch(updateCanvasSettings({ width: Number(e.target.value) }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 캔버스 높이 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Height (px)</label>
              <input 
                type="number"
                value={canvasSettings.height}
                onChange={(e) => dispatch(updateCanvasSettings({ height: Number(e.target.value) }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 캔버스 배경색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Background Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={canvasSettings.backgroundColor}
                  onChange={(e) => dispatch(updateCanvasSettings({ backgroundColor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
                />
                <span className="text-xs text-gray-500 uppercase">{canvasSettings.backgroundColor}</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded text-xs text-gray-400 text-center">
              요소를 클릭하면<br/>요소 속성창으로 바뀝니다.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2 whitespace-nowrap">Properties</h3>
            {/* ... 기존 속성 입력 필드들 ... */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <span className="text-xs text-blue-500 font-bold block">SELECTED ID</span>
              <span className="text-xs text-gray-600 font-mono truncate">{selectedElement.id}</span>
            </div>
             
             {/* Background Color 등 기존 코드 유지 */}
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Background Color</label>
                <div className="flex items-center gap-2">
                    <input 
                    type="color" 
                    value={selectedElement.props.backgroundColor || '#ffffff'}
                    className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
                    onChange={(e) => dispatch(updateSelectedElement({ backgroundColor: e.target.value }))}
                    />
                </div>
            </div>
            
             {/* 텍스트 속성 등 기존 코드 유지 */}
             {selectedElement.type === 'Text' && (
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Text Content</label>
                 <input 
                    type="text"
                    value={selectedElement.props.text || ''}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    onChange={(e) => dispatch(updateSelectedElement({ text: e.target.value }))}
                 />
               </div>
             )}
          </div>
        )}

        {selectedElement && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Components (Scripts)</h4>
            
            {/* 부착된 스크립트 목록 표시 */}
            <div className="space-y-2 mb-3">
              {(selectedElement.scripts || []).map(script => (
                <div key={script} className="flex justify-between items-center bg-gray-100 p-2 rounded text-sm">
                  <span className="font-mono text-blue-600">📜 {script}</span>
                  <button 
                    onClick={() => dispatch(removeScriptFromElement({ id: selectedElement.id, scriptName: script }))}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {(selectedElement.scripts || []).length === 0 && (
                <p className="text-xs text-gray-400">No scripts attached.</p>
              )}
            </div>

            {/* 스크립트 추가 (Unity의 Add Component 버튼 역할) */}
            <div className="flex gap-2">
              <select 
                className="w-full text-xs border border-gray-300 rounded p-1"
                onChange={handleAddScript}
                defaultValue=""
              >
                <option value="" disabled>+ Add Component</option>
                {availableScripts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
