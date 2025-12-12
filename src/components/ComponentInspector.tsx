import React from 'react';
import { useDispatch } from 'react-redux';
// ⭐ [중요] 액션들을 'elementSlice'에서 가져와야 합니다!
import { 
  updateScriptValue, 
  removeScriptFromElement,
  addScriptToElement,
  resetScriptValues
} from '../store/elementSlice';
import { useModal } from '../context/ModalContext';

// ⭐ 타입 import
interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'select' | 'array';
  label?: string;
  default?: any;
  options?: string[];
}

interface ComponentInspectorProps {
  selectedElement: any;
  availableScripts: string[];
  scriptSchemas: { [scriptName: string]: { [field: string]: FieldDef } }; 
}

export default function ComponentInspector({ selectedElement, availableScripts, scriptSchemas }: ComponentInspectorProps) {
  const dispatch = useDispatch();
  const selectedId = selectedElement.elementId; // elementId 사용

  const { showModal } = useModal();

  // --- 핸들러 함수들 ---
  const handleRemoveScript = (scriptName: string) => {
    dispatch(removeScriptFromElement({ id: selectedId, scriptName }));
  };

  const handleResetScript = (scriptName: string) => {
    showModal({
      title: '알림',
      body: `Reset ${scriptName.split('/').pop()} values?`,
      showCancel: false,
      onConfirm: () => {
        dispatch(resetScriptValues({ id: selectedId, scriptName }));
      }
    });
  };

  const handleFieldChange = (scriptName: string, fieldName: string, value: any) => {
    dispatch(updateScriptValue({ id: selectedId, scriptName, fieldName, value }));
  };

  const handleAddArrayItem = (scriptName: string, fieldName: string, currentArray: any[]) => {
    // 타입 추론 (기존 데이터 기반)
    let newItem: any = "";
    if (currentArray && currentArray.length > 0) {
      const first = currentArray[0];
      if (typeof first === 'number') newItem = 0;
      else if (typeof first === 'boolean') newItem = false;
    }
    const newArray = [...(currentArray || []), newItem];
    handleFieldChange(scriptName, fieldName, newArray);
  };

  const handleRemoveArrayItem = (scriptName: string, fieldName: string, currentArray: any[], index: number) => {
    const newArray = [...currentArray];
    newArray.splice(index, 1);
    handleFieldChange(scriptName, fieldName, newArray);
  };

  const handleArrayItemChange = (scriptName: string, fieldName: string, currentArray: any[], index: number, newValue: any) => {
    const newArray = [...currentArray];
    newArray[index] = newValue;
    handleFieldChange(scriptName, fieldName, newArray);
  };

  const handleAddScript = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scriptName = e.target.value;
    if (scriptName) {
      dispatch(addScriptToElement({ id: selectedId, scriptName }));
      e.target.value = '';
    }
  };


  // --- 렌더링 ---
  return (
    <div className="mt-2 pt-4 border-t border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold uppercase text-gray-500">Components</h4>
        <span className="text-[10px] text-gray-400">{selectedElement.scripts?.length || 0} attached</span>
      </div>
      
      {/* 1. 스크립트 목록 렌더링 */}
      <div className="space-y-4 mb-4">
        {(selectedElement.scripts || []).map((scriptName: string) => (
          <div key={scriptName} className="border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden">
            
            {/* 헤더 */}
            <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-lg">📜</span>
                <span className="font-semibold text-xs text-gray-700 truncate" title={scriptName}>
                  {scriptName.split('/').pop()}
                </span>
              </div>
              <div className="flex gap-1">
                {/* 리셋 버튼 */}
                <button onClick={() => handleResetScript(scriptName)} className="text-gray-400 hover:text-blue-500 p-1" title="Reset">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 0h-4.582m4.582 0a8.001 8.001 0 01-15.356 2m15.356-2H15" /></svg>
                </button>
                {/* 삭제 버튼 */}
                <button onClick={() => handleRemoveScript(scriptName)} className="text-gray-400 hover:text-red-500 p-1" title="Remove">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* 필드 (Inspector) */}
            <div className="p-3 space-y-3 bg-white">
              {scriptSchemas[scriptName] ? (
                Object.entries(scriptSchemas[scriptName]).map(([fieldName, fieldDef]) => {
                  const currentValue = selectedElement.scriptValues?.[scriptName]?.[fieldName] ?? fieldDef.default;
                  
                  // (A) 배열 타입
                  if (fieldDef.type === 'array') {
                    const arrayVal = Array.isArray(currentValue) ? currentValue : [];
                    return (
                      <div key={fieldName} className="flex flex-col gap-2 border border-gray-100 rounded p-2 bg-gray-50/50">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">{fieldDef.label || fieldName}</label>
                          <span className="text-[9px] text-gray-400 bg-gray-200 px-1 rounded">{arrayVal.length} items</span>
                        </div>
                        <div className="space-y-1">
                          {arrayVal.map((item: any, idx: number) => {
                             const vType = typeof item;
                             return (
                               <div key={idx} className="flex items-center gap-1">
                                 <span className="text-[9px] text-gray-400 w-4 text-right">{idx}</span>
                                 {vType === 'number' ? (
                                   <input type="number" value={item} onChange={(e) => handleArrayItemChange(scriptName, fieldName, arrayVal, idx, Number(e.target.value))} className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1"/>
                                 ) : vType === 'boolean' ? (
                                   <input type="checkbox" checked={!!item} onChange={(e) => handleArrayItemChange(scriptName, fieldName, arrayVal, idx, e.target.checked)} className="flex-1 h-4"/>
                                 ) : (
                                   <input type="text" value={item} onChange={(e) => handleArrayItemChange(scriptName, fieldName, arrayVal, idx, e.target.value)} className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1"/>
                                 )}
                                 <button onClick={() => handleRemoveArrayItem(scriptName, fieldName, arrayVal, idx)} className="text-gray-400 hover:text-red-500 px-1">
                                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                               </div>
                             );
                          })}
                        </div>
                        <button onClick={() => handleAddArrayItem(scriptName, fieldName, arrayVal)} className="w-full py-1 text-[10px] bg-white border border-gray-300 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">+ Add Item</button>
                      </div>
                    );
                  }

                  // (B) 일반 타입
                  return (
                    <div key={fieldName} className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{fieldDef.label || fieldName}</label>
                      {fieldDef.type === 'number' && <input type="number" value={currentValue} onChange={(e) => handleFieldChange(scriptName, fieldName, Number(e.target.value))} className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"/>}
                      {fieldDef.type === 'string' && <input type="text" value={currentValue} onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"/>}
                      {fieldDef.type === 'boolean' && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!currentValue} onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.checked)} className="accent-blue-500 h-4 w-4"/><span className="text-xs text-gray-600 select-none">{currentValue ? 'True' : 'False'}</span></label>}
                      {fieldDef.type === 'select' && <select value={currentValue} onChange={(e) => handleFieldChange(scriptName, fieldName, e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none bg-white">{fieldDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>}
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center">No exposed fields</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 2. 스크립트 추가 드롭다운 */}
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
  );
}