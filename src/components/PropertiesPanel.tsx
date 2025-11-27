import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  updateSelectedElement, 
  updateCanvasSettings,
  updateElementAttributes,
  removeScriptFromElement, 
} from '../store/editorSlice';
import { loadScript } from '../utils/scriptManager'; 
import ComponentInspector from './ComponentInspector';
import { CSS_PROPERTIES, PROPERTY_VALUES } from '../constants'; 

// =============================================================================
// 1. 커스텀 자동완성 입력 컴포넌트 (Textarea Ver)
// =============================================================================
interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  onBlur?: () => void;
}

function AutocompleteInput({ value, onChange, onEnter, options, placeholder, autoFocus, className, inputRef, onBlur }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  const adjustHeight = () => {
    const el = finalInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  useEffect(() => { adjustHeight(); }, [value]);

  useEffect(() => {
    const filtered = options.filter(opt => opt && opt.toLowerCase().startsWith(value.toLowerCase()));
    setFilteredOptions(filtered);
    setSelectedIndex(0); 
  }, [value, options]);

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
    if (onBlur) onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          onChange(filteredOptions[selectedIndex]);
          setIsOpen(false);
          if (onEnter) setTimeout(onEnter, 0);
        } else {
          if (onEnter) onEnter();
        }
      }
    } else if (e.key === 'Escape') setIsOpen(false);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    finalInputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full flex items-start">
      <textarea
        ref={finalInputRef}
        rows={1}
        value={value}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${className} resize-none overflow-hidden block leading-tight py-0.5`}
        autoComplete="off"
        spellCheck={false}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50">
          {filteredOptions.map((opt, index) => (
            <li
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              className={`px-2 py-1 text-xs cursor-pointer truncate font-mono ${index === selectedIndex ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// =============================================================================
// 2. StyleRow Component
// =============================================================================
interface StyleRowProps {
  propKey: string;
  propValue: string;
  onCommit: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: (key: string) => void;
  isNew?: boolean; 
}

function StyleRow({ propKey, propValue, onCommit, onDelete, isNew }: StyleRowProps) {
  const [key, setKey] = useState(propKey);
  const [val, setVal] = useState(propValue);

  useEffect(() => {
    setKey(propKey);
    setVal(propValue);
  }, [propKey, propValue]);

  const handleValueEnter = () => {
    if (key && val) {
      onCommit(propKey, key, val);
      if (isNew) { setKey(''); setVal(''); }
    }
  };

  return (
    <div className="flex items-start group text-xs hover:bg-gray-50 -ml-2 pl-2 rounded py-0.5 relative">
      {/* Key */}
      <div className="w-[110px] shrink-0 mr-1 pt-0.5">
        <AutocompleteInput
          value={key}
          onChange={setKey}
          options={CSS_PROPERTIES}
          placeholder={isNew ? "property" : ""}
          className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none font-mono ${isNew ? 'text-gray-400 italic' : 'text-blue-700'}`}
        />
      </div>
      <span className="text-gray-400 mr-1 mt-0.5 select-none">:</span>
      {/* Value */}
      <div className="flex-1 min-w-0 pt-0.5">
        <AutocompleteInput
          value={val}
          onChange={setVal}
          onEnter={handleValueEnter}
          options={PROPERTY_VALUES[key.toLowerCase()] || []}
          placeholder=""
          className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-800 font-mono"
        />
      </div>
      <span className="text-gray-400 ml-1 mt-0.5 select-none">;</span>
      {/* Delete */}
      {!isNew && (
        <button 
          onClick={() => onDelete(propKey)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 absolute right-0 top-0.5 bg-white/80 px-1"
          title="Remove property"
        >
          ×
        </button>
      )}
    </div>
  );
}


// =============================================================================
// 3. Main Panel
// =============================================================================
export default function PropertiesPanel() {
  // ⭐ 기존 구조 유지 (selectedId 사용)
  const { elements, selectedId, canvasSettings } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();
  
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{ [scriptName: string]: any }>({});

  // ⭐ 로컬 상태 (ID, Class 포커스 튕김 방지)
  const [localId, setLocalId] = useState('');
  const [localClass, setLocalClass] = useState('');

  // ⭐ 요소 찾기 (기존 id 기준)
  const selectedElement = elements.find(el => el.id === selectedId);

  // 선택된 요소 변경 시 로컬 상태 동기화
  useEffect(() => {
    if (selectedElement) {
      setLocalId(selectedElement.id);
      setLocalClass(selectedElement.className || '');
    }
  }, [selectedElement?.id]); // ID가 바뀌면 로컬 상태도 갱신

  const refreshAll = useCallback(async (forceReload = false) => {
    if (!window.electronAPI) return;
    const latestScripts = await window.electronAPI.getScripts();
    setAvailableScripts(latestScripts);

    if (!selectedElement) { setScriptSchemas({}); return; }

    const validScripts: string[] = [];
    if (selectedElement.scripts) {
        selectedElement.scripts.forEach(scriptPath => {
            if (latestScripts.includes(scriptPath)) validScripts.push(scriptPath);
            else dispatch(removeScriptFromElement({ id: selectedElement.id, scriptName: scriptPath }));
        });
    }
    const schemas: any = {};
    await Promise.all(validScripts.map(async (scriptPath) => {
      try {
        const module = await loadScript(scriptPath, forceReload);
        if (module?.default?.fields) schemas[scriptPath] = module.default.fields;
      } catch (e) {}
    }));
    setScriptSchemas(schemas);
  }, [selectedElement, dispatch]);

  useEffect(() => { refreshAll(false); }, [refreshAll]);
  useEffect(() => {
    const handleFocus = () => refreshAll(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshAll]);


  // --- 핸들러 ---
  const handleStyleChange = (key: string, value: any) => {
    if (selectedId) dispatch(updateSelectedElement({ [key]: value }));
  };

  // ⭐ HTML 속성 커밋 (포커스 유지 핵심 로직)
  const commitAttribute = (name: string, value: string) => {
    if (selectedId && selectedElement) {
        if (name === 'id' && value !== selectedElement.id) {
            // ID 변경 시 Redux 업데이트 (selectedId도 같이 바뀌도록 editorSlice가 처리해야 함)
            dispatch(updateElementAttributes({ id: selectedId, name, value }));
            setLocalId(value); // 로컬 상태 즉시 동기화
        } else if (name === 'className' && value !== (selectedElement.className || '')) {
            dispatch(updateElementAttributes({ id: selectedId, name, value }));
        }
    }
  };

  const handleCommitStyle = (oldKey: string, newKey: string, newValue: string) => {
    if (!selectedId) return;
    if (oldKey && oldKey !== newKey) {
      dispatch(updateSelectedElement({ [oldKey]: undefined, [newKey]: newValue }));
    } else {
      dispatch(updateSelectedElement({ [newKey]: newValue }));
    }
  };
  
  const handleDeleteStyle = (key: string) => {
    if (selectedId) dispatch(updateSelectedElement({ [key]: undefined }));
  };

  const internalProps = ['className', 'src', 'text', 'scripts', 'scriptValues', 'id'];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-white pb-20">
        {!selectedElement ? (
          <div className="space-y-6 p-5">
             <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">Canvas Settings</h3>
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Width (px)</label>
              <input type="number" value={canvasSettings.width} onChange={(e) => dispatch(updateCanvasSettings({ width: Number(e.target.value) }))} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"/>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Height (px)</label>
              <input type="number" value={canvasSettings.height} onChange={(e) => dispatch(updateCanvasSettings({ height: Number(e.target.value) }))} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"/>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={canvasSettings.backgroundColor} onChange={(e) => dispatch(updateCanvasSettings({ backgroundColor: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"/>
                <span className="text-xs text-gray-500 uppercase">{canvasSettings.backgroundColor}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-5">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">Properties</h3>
            
            {/* Attributes (로컬 상태 사용) */}
            <div className="space-y-3 border-b pb-4 border-gray-100">
                <span className="text-xs font-bold text-gray-800 block mb-1">Attributes</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold w-8">ID</span>
                    <input 
                        type="text" 
                        value={localId} 
                        onChange={(e) => setLocalId(e.target.value)} 
                        onBlur={() => commitAttribute('id', localId)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { commitAttribute('id', localId); e.currentTarget.blur(); }}}
                        className="flex-1 min-w-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono" 
                        placeholder="id"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold w-8">CLASS</span>
                    <AutocompleteInput 
                        value={localClass}
                        onChange={setLocalClass}
                        onBlur={() => commitAttribute('className', localClass)} // 포커스 나가면 저장
                        onEnter={() => {
                          commitAttribute('className', localClass);
                          (document.activeElement as HTMLElement)?.blur(); 
                        }}
                        options={[]} // 나중에 여기에 Tailwind 클래스 리스트 넣으면 대박남!
                        className="flex-1 min-w-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono bg-transparent"
                        placeholder="class names"
                    />
                </div>
            </div>

            {/* Styles */}
            <div className="space-y-1 pb-4 pt-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-800">Styles</span>
                    <span className="text-[9px] text-gray-400">element.style {'{'}</span>
                </div>
                <div className="pl-2 border-l-2 border-gray-100">
                    <div className="max-h-80 pr-1 mb-2">
                        {Object.entries(selectedElement.props).map(([key, value]) => {
                            if (internalProps.includes(key)) return null;
                            return (
                                <StyleRow 
                                    key={key} 
                                    propKey={key} 
                                    propValue={value as string} 
                                    onCommit={handleCommitStyle}
                                    onDelete={handleDeleteStyle}
                                />
                            );
                        })}
                    </div>
                    <div className="border-t border-gray-100 border-dashed pt-1">
                        <StyleRow 
                            key="new-row"
                            propKey="" 
                            propValue="" 
                            onCommit={handleCommitStyle} 
                            onDelete={() => {}} 
                            isNew={true}
                        />
                    </div>
                </div>
                <div className="text-[9px] text-gray-400 mt-1">{'}'}</div>
            </div>

            {/* Content */}
            {selectedElement.type === 'Text' && (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                  <span className="text-xs font-bold text-gray-800 block mb-1">Content</span>
                  <textarea rows={2} value={selectedElement.props.text || ''} className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none resize-none font-mono" onChange={(e) => dispatch(updateSelectedElement({ text: e.target.value }))}/>
              </div>
            )}

            {/* Component Inspector */}
            <ComponentInspector 
                selectedElement={selectedElement}
                availableScripts={availableScripts}
                scriptSchemas={scriptSchemas}
            />
          </div>
        )}
    </div>
  );
}