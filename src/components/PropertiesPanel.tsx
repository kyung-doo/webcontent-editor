import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  updateSelectedElement, 
  addScriptToElement, 
  removeScriptFromElement, 
  updateCanvasSettings,
  updateScriptValue 
} from '../store/editorSlice';
import { usePannelToggle } from '../hooks/usePannelToggle';

// 스크립트 내부 fields 정의 타입
interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'select';
  label?: string;
  default?: any;
  options?: string[]; // type이 'select'일 때 사용
}

export default function PropertiesPanel() {
  const { elements, selectedId, canvasSettings } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();
  const { isOpen, toggle } = usePannelToggle(true);
  
  // 사용 가능한 전체 스크립트 파일 목록
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  
  // 현재 선택된 요소의 스크립트 필드 정보(Schema) 캐싱
  const [scriptSchemas, setScriptSchemas] = useState<{ [scriptName: string]: { [field: string]: FieldDef } }>({});

  const selectedElement = elements.find(el => el.id === selectedId);

  // 1. 전체 스크립트 목록 로드 (마운트 시)
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getScripts().then(setAvailableScripts);
    }
  }, []);

  // 2. 선택된 요소의 스크립트 정보를 읽어서 스키마 생성
  useEffect(() => {
    if (!selectedElement?.scripts) {
      setScriptSchemas({});
      return;
    }

    const loadSchemas = async () => {
      const schemas: any = {};
      for (const scriptPath of selectedElement.scripts ?? []) {
        try {
          // 캐시 방지를 위해 timestamp 추가하여 동적 import
          const module = await import(/* @vite-ignore */ `/assets/${scriptPath}?t=${Date.now()}`);
          if (module.default?.fields) {
            schemas[scriptPath] = module.default.fields;
          }
        } catch (e) {
          console.error(`Schema load failed for ${scriptPath}`, e);
        }
      }
      setScriptSchemas(schemas);
    };
    loadSchemas();
  }, [selectedElement?.scripts]);


  // 3. 핸들러: 스크립트 변수값 변경
  const handleFieldChange = (scriptName: string, fieldName: string, value: any) => {
    if (selectedId) {
      dispatch(updateScriptValue({ id: selectedId, scriptName, fieldName, value }));
    }
  };

  // 4. 핸들러: 스크립트 추가
  const handleAddScript = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scriptName = e.target.value;
    if (scriptName && selectedId) {
      dispatch(addScriptToElement({ id: selectedId, scriptName }));
      e.target.value = ''; // 선택 초기화
    }
  };

  return (
    <aside 
      className={`
        relative border-l border-gray-300 bg-white shadow-sm z-20 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-80 p-5' : 'w-0 p-0 border-none'}
      `}
    >
      {/* 토글 버튼 */}
      <button
        onClick={toggle}
        className="absolute -left-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className={`w-full overflow-y-auto h-full scrollbar-thin ${!isOpen && 'hidden'}`}>
        
        {/* =========================================
            CASE 1: 요소가 선택되지 않음 -> 캔버스 설정
           ========================================= */}
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
              요소를 클릭하여<br/>세부 속성을 편집하세요.
            </div>
          </div>
        ) : (
          /* =========================================
             CASE 2: 요소 선택됨 -> 속성 및 컴포넌트 편집
             ========================================= */
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2 whitespace-nowrap">Properties</h3>

            {/* ID 정보 */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <span className="text-xs text-blue-500 font-bold block">SELECTED ID</span>
              <span className="text-xs text-gray-600 font-mono truncate block">{selectedElement.id}</span>
            </div>

            {/* 기본 속성: 배경색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Color / Background</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={selectedElement.props.backgroundColor || '#ffffff'}
                  className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
                  onChange={(e) => dispatch(updateSelectedElement({ backgroundColor: e.target.value }))}
                />
              </div>
            </div>

            {/* 텍스트 요소 전용 속성 */}
            {selectedElement.type === 'Text' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Text Content</label>
                  <input 
                    type="text"
                    value={selectedElement.props.text || ''}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    onChange={(e) => dispatch(updateSelectedElement({ text: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Font Size</label>
                  <select 
                    value={selectedElement.props.fontSize || '16px'}
                    onChange={(e) => dispatch(updateSelectedElement({ fontSize: e.target.value }))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="12px">12px</option>
                    <option value="16px">16px</option>
                    <option value="24px">24px</option>
                    <option value="32px">32px</option>
                    <option value="48px">48px</option>
                  </select>
                </div>
              </>
            )}

            {/* --- Components (Scripts) Section --- */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Components</h4>
              
              {/* 추가된 스크립트 목록 */}
              <div className="space-y-4 mb-4">
                {(selectedElement.scripts || []).map(scriptName => (
                  <div key={scriptName} className="border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden">
                    
                    {/* 스크립트 헤더 (제목 + 삭제 버튼) */}
                    <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg">📜</span>
                        <span className="font-semibold text-xs text-gray-700 truncate" title={scriptName}>
                          {scriptName.split('/').pop()} {/* 파일명만 표시 */}
                        </span>
                      </div>
                      <button 
                        onClick={() => dispatch(removeScriptFromElement({ id: selectedElement.id, scriptName }))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove Component"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* 스크립트 필드 (Unity Inspector) */}
                    <div className="p-3 space-y-3 bg-white">
                      {scriptSchemas[scriptName] ? (
                        Object.entries(scriptSchemas[scriptName]).map(([fieldName, fieldDef]) => {
                          // 현재 값 (저장된 값 없으면 Default 사용)
                          const currentValue = selectedElement.scriptValues?.[scriptName]?.[fieldName] ?? fieldDef.default;

                          return (
                            <div key={fieldName} className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                {fieldDef.label || fieldName}
                              </label>
                              
                              {/* --- 타입별 입력 UI --- */}
                              {fieldDef.type === 'number' && (
                                <input 
                                  type="number" 
                                  value={currentValue}
                                  onChange={(e) => handleFieldChange(scriptName, fieldName, Number(e.target.value))}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                />
                              )}
                              
                              {fieldDef.type === 'string' && (
                                <input 
                                  type="text" 
                                  value={currentValue}
                                  onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                />
                              )}
                              
                              {fieldDef.type === 'boolean' && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!currentValue}
                                    onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.checked)}
                                    className="accent-blue-500 h-4 w-4"
                                  />
                                  <span className="text-xs text-gray-600 select-none">
                                    {currentValue ? 'True' : 'False'}
                                  </span>
                                </label>
                              )}

                              {fieldDef.type === 'select' && (
                                <select
                                  value={currentValue}
                                  onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none bg-white"
                                >
                                  {fieldDef.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-gray-400 italic text-center">No exposed fields</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {(!selectedElement.scripts || selectedElement.scripts.length === 0) && (
                  <p className="text-xs text-gray-400 text-center py-2">No components attached.</p>
                )}
              </div>

              {/* 컴포넌트 추가 버튼 */}
              <div className="relative">
                <select 
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                  onChange={handleAddScript}
                  value=""
                >
                  <option value="" disabled>+ Add Component</option>
                  {availableScripts.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}