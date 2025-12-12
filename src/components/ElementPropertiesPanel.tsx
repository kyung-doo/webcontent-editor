import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  updateElementProps,
  updateElementAttributes,
  removeScriptFromElement,
  EditorElement,
} from "../store/elementSlice";
import ComponentInspector from "./ComponentInspector";
import AutocompleteInput from "./AutocompleteInput";
import {
  Plus,
  Smartphone,
  Monitor,
  X,
  ChevronDown,
} from "lucide-react";
import { useModal } from "../context/ModalContext";
import { loadScript } from "../utils/scriptManager";
import StyleSection from "./StyleSection";
import { INTERNAL_PROPS } from "../constants";



// --- Main Component ---
interface ElementPropertiesPanelProps {
  selectedElement: EditorElement;
}

export default function ElementPropertiesPanel({
  selectedElement,
}: ElementPropertiesPanelProps) {
  const dispatch = useDispatch();
  const selectedElementId = selectedElement.elementId;
  const { showModal } = useModal();

  // Canvas Settings (Breakpoints)
  const breakpoints =
    useSelector(
      (state: RootState) => state.canvas.canvasSettings.breakpoints
    ) || [];

  // Local States
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{
    [scriptName: string]: any;
  }>({});
  const [localId, setLocalId] = useState("");
  const [localClass, setLocalClass] = useState("");

  // Context Management
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string>("base");

  // Selector Addition State
  const [isAddingSelector, setIsAddingSelector] = useState(false);
  const [newSelectorInput, setNewSelectorInput] = useState("&");

  // ID/Class Sync
  useEffect(() => {
    if (selectedElement) {
      setLocalId(selectedElement.id || "");
      setLocalClass(selectedElement.className || "");
    }
  }, [
    selectedElement.elementId,
    selectedElement.id,
    selectedElement.className,
  ]);

  // [최적화] selectedElement에서 필요한 값만 추출하여 의존성 관리
  const { elementId, scripts } = selectedElement;

  // [수정] Scripts Refresh Logic
  const refreshAll = useCallback(
    async (forceReload = false) => {
      // @ts-ignore
      if (!window.electronAPI) return; // Electron이 아니면 로직 수행 안함

      try {
        // @ts-ignore
        const latestScripts = await window.electronAPI.getScripts();
        setAvailableScripts(latestScripts);

        // 스크립트가 없는 경우 스키마 초기화 후 리턴
        if (!scripts || scripts.length === 0) {
          setScriptSchemas({});
          return;
        }

        const validScripts: string[] = [];

        // 유효성 검사 및 정리
        scripts.forEach((scriptPath: string) => {
          if (latestScripts.includes(scriptPath)) {
            validScripts.push(scriptPath);
          } else {
            // 파일이 실제 디스크에서 삭제된 경우 엘리먼트에서도 제거 (단, API가 정상 동작할 때만)
            if (latestScripts.length > 0) {
              dispatch(
                removeScriptFromElement({
                  id: elementId,
                  scriptName: scriptPath,
                })
              );
            }
          }
        });

        // 유효한 스크립트들을 loadScript로 읽어와서 fields(스키마) 추출
        const schemas: any = {};
        await Promise.all(
          validScripts.map(async (scriptPath) => {
            try {
              // loadScript는 동적 import를 수행하여 모듈을 반환함
              const module = await loadScript(scriptPath, forceReload);
              // 모듈 내부에 fields 정의가 있으면 스키마로 저장
              if (module?.default?.fields) {
                schemas[scriptPath] = module.default.fields;
              }
            } catch (e) {
              console.error(`Failed to load schema for ${scriptPath}`, e);
            }
          })
        );

        setScriptSchemas(schemas);
        console.log("✅ Schemas refreshed for:", elementId);
      } catch (error) {
        console.error("Failed to refresh scripts:", error);
      }
    },
    [elementId, scripts, dispatch]
  ); // [최적화] selectedElement 전체가 아닌 필요한 값만 의존

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // --- Handlers: Update Styles ---
  const updateStyleAtPath = (
    newStyles: Record<string, any>,
    path: string[]
  ) => {
    if (path.length === 0) {
      dispatch(updateElementProps({ id: selectedElementId, props: newStyles }));
      return;
    }

    const rootKey = path[0];
    const rootValue = { ...(selectedElement.props[rootKey] || {}) };

    if (path.length === 1) {
      const updatedVariant = { ...rootValue, ...newStyles };
      Object.keys(newStyles).forEach((k) => {
        if (newStyles[k] === undefined) delete updatedVariant[k];
      });
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [rootKey]: updatedVariant },
        })
      );
    } else if (path.length === 2) {
      const subKey = path[1];
      const subValue = { ...(rootValue[subKey] || {}) };
      const updatedSubVariant = { ...subValue, ...newStyles };
      Object.keys(newStyles).forEach((k) => {
        if (newStyles[k] === undefined) delete updatedSubVariant[k];
      });
      rootValue[subKey] = updatedSubVariant;
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [rootKey]: rootValue },
        })
      );
    }
  };

  // --- Handlers: Selector Management ---
  const handleAddSelector = () => {
    if (!newSelectorInput.trim()) return;

    const newSelector = newSelectorInput.trim();

    // 현재 Context(Breakpoint)에 빈 객체로 Selector 생성
    let pathToAdd = [];
    if (selectedBreakpoint !== "base") pathToAdd.push(selectedBreakpoint);
    pathToAdd.push(newSelector);

    // Create entry in Redux
    updateStyleAtPath({}, pathToAdd);

    setNewSelectorInput("&");
    setIsAddingSelector(false);
  };

  const handleRenameSelector = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const validNewName = newName.trim();

    // Check collision in current context
    const contextStyles =
      selectedBreakpoint === "base"
        ? selectedElement.props
        : selectedElement.props[selectedBreakpoint] || {};

    if (contextStyles[validNewName]) {
      // Simple alert or modal could be used here
      console.warn("Selector name already exists");
      return;
    }

    // Move properties from old key to new key
    if (selectedBreakpoint === "base") {
      const oldStyles = selectedElement.props[oldName];
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: {
            [oldName]: undefined, // Delete old
            [validNewName]: oldStyles, // Add new
          },
        })
      );
    } else {
      const bpKey = selectedBreakpoint;
      const bpObj = { ...(selectedElement.props[bpKey] || {}) };

      // Move styles
      bpObj[validNewName] = bpObj[oldName];
      delete bpObj[oldName];

      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [bpKey]: bpObj },
        })
      );
    }
  };

  const handleDeleteSelector = (selectorName: string) => {
    showModal({
      title: "Delete Selector",
      body: (
        <span>
          Are you sure you want to delete styles for <b>{selectorName}</b> in
          this breakpoint?
        </span>
      ),
      showCancel: true,
      onConfirm: () => {
        let parentPath = [];
        if (selectedBreakpoint !== "base") parentPath.push(selectedBreakpoint);

        if (parentPath.length === 0) {
          // Root에서 삭제
          dispatch(
            updateElementProps({
              id: selectedElementId,
              props: { [selectorName]: undefined },
            })
          );
        } else {
          // Breakpoint 내부에서 삭제
          const bpKey = parentPath[0];
          const bpObj = { ...selectedElement.props[bpKey] };
          delete bpObj[selectorName];
          dispatch(
            updateElementProps({
              id: selectedElementId,
              props: { [bpKey]: bpObj },
            })
          );
        }
      },
    });
  };

  // --- Handlers: Attribute ---
  const commitAttribute = (name: string, value: string) => {
    if (selectedElementId) {
      if (
        (name === "id" && value !== selectedElement.id) ||
        (name === "className" && value !== (selectedElement.className || ""))
      ) {
        dispatch(
          updateElementAttributes({ id: selectedElementId, name, value })
        );
      }
    }
  };

  // --- Data Preparation for Rendering ---
  const rootProps =
    selectedBreakpoint === "base"
      ? selectedElement.props
      : selectedElement.props[selectedBreakpoint] || {};

  // 1. Base Styles (Context Root)
  const baseStyles = rootProps; // Contains styles + nested selectors

  // 2. Selectors (Context Children)
  const selectors = Object.keys(baseStyles).filter((key) => {
    if (INTERNAL_PROPS.includes(key)) return false;
    if (key.startsWith("@media")) return false;
    const val = baseStyles[key];
    return typeof val === "object" && val !== null;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* 1. Header & Attributes */}
      <div className="p-4 border-b shrink-0">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">
          Properties
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold w-8">ID</span>
            <input
              type="text"
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              onBlur={() => commitAttribute("id", localId)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="flex-1 min-w-0  focus:outline-none text-xs text-gray-700 font-mono py-1"
              placeholder="id"
            />
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-gray-500 font-bold w-8 mt-[4px]">
              CLASS
            </span>
            <div className="flex-1 min-w-0">
              <AutocompleteInput
                value={localClass}
                onChange={setLocalClass}
                onBlur={() => commitAttribute("className", localClass)}
                options={[]}
                className="w-full bg-transparent border-b border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono py-1"
                placeholder="class names"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Text Content Editor (Only for Text Type) */}
      <div className="px-4 py-2 shrink-0">
        {selectedElement.type === "Text" && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-600">Content</span>
            <textarea
              rows={2}
              value={selectedElement.props.text || ""}
              onChange={(e) =>
                dispatch(
                  updateElementProps({
                    id: selectedElementId!,
                    props: { text: e.target.value },
                  })
                )
              }
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none resize-none font-mono"
            />
          </div>
        )}
      </div>

      {/* 2. Breakpoint Context Selection */}
      <div className="px-4 py-2 shrink-0">
        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">
          Styles
        </h3>
        <div className="relative">
          <select
            value={selectedBreakpoint}
            onChange={(e) => setSelectedBreakpoint(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs border rounded appearance-none focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
          >
            <option value="base">Default (All Devices)</option>
            {breakpoints.map((bp) => (
              <option key={bp.id} value={`@media (max-width: ${bp.width}px)`}>
                {bp.name} (≤ {bp.width}px)
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-gray-500">
            {selectedBreakpoint === "base" ? (
              <Monitor size={14} />
            ) : (
              <Smartphone size={14} />
            )}
          </div>
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-400">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 3. Style Sections (Flat View) */}
      <div className="flex-1 p-4 pt-0">
        {/* --- SECTION 1: Base Styles --- */}
        <StyleSection
          title={<span className="text-gray-800">Base Styles</span>}
          styles={baseStyles}
          path={selectedBreakpoint === "base" ? [] : [selectedBreakpoint]}
          onUpdate={updateStyleAtPath}
        />

        {/* --- SECTION 2: Selector Styles --- */}
        {selectors.map((sel) => (
          <StyleSection
            key={sel}
            title={<span className="text-purple-700 font-mono">{sel}</span>}
            initialLabel={sel}
            styles={baseStyles[sel]}
            path={
              selectedBreakpoint === "base" ? [sel] : [selectedBreakpoint, sel]
            }
            onUpdate={updateStyleAtPath}
            onDeleteSection={() => handleDeleteSelector(sel)}
            onRename={(newName) => handleRenameSelector(sel, newName)}
          />
        ))}

        {/* --- SECTION 3: Add Selector --- */}
        <div className="mt-1">
          {isAddingSelector ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="text"
                value={newSelectorInput}
                onChange={(e) => setNewSelectorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSelector()}
                placeholder=":hover, .active"
                className="flex-1 border rounded px-2 py-1 text-xs focus:outline-blue-500 font-mono"
                autoFocus
              />
              <button
                onClick={handleAddSelector}
                className="bg-blue-500 text-white px-2 rounded text-xs hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingSelector(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSelector(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={12} /> Add Selector
            </button>
          )}
        </div>

        {/* Component Inspector */}
        <div className="pt-1">
          <ComponentInspector
            selectedElement={selectedElement}
            availableScripts={availableScripts}
            scriptSchemas={scriptSchemas}
          />
        </div>
      </div>
    </div>
  );
}
