import React, { useEffect, useState, useCallback } from "react";
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
import { Plus, Smartphone, Monitor, X, ChevronDown } from "lucide-react";
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

  const breakpoints =
    useSelector(
      (state: RootState) => state.canvas.canvasSettings.breakpoints
    ) || [];

  const fonts = useSelector((state: RootState) => state.font.fonts).map(x => x.name);

  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{
    [scriptName: string]: any;
  }>({});
  const [localId, setLocalId] = useState("");
  const [localClass, setLocalClass] = useState("");
  
  // [추가] 텍스트 내용을 위한 로컬 상태 (한글 IME 문제 해결용)
  const [localText, setLocalText] = useState("");

  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string>("base");
  const [isAddingSelector, setIsAddingSelector] = useState(false);
  const [newSelectorInput, setNewSelectorInput] = useState("&");

  useEffect(() => {
    if (selectedElement) {
      setLocalId(selectedElement.id || "");
      setLocalClass(selectedElement.className || "");
      // [추가] 요소가 선택될 때만 로컬 텍스트 초기화 (타이핑 중 업데이트 방지)
      setLocalText(selectedElement.props.text || "");
    }
  }, [
    selectedElement.elementId,
    // selectedElement.id, // id나 class가 바뀔 때 텍스트를 초기화할 필요는 없지만, 안전하게 유지
    // selectedElement.className,
    // 중요: selectedElement.props.text는 의존성에서 제외하여 타이핑 중 루프 방지
  ]);

  const { elementId, scripts } = selectedElement;

  const refreshAll = useCallback(
    async (forceReload = false) => {
      // @ts-ignore
      if (!window.electronAPI) return;

      try {
        // @ts-ignore
        const latestScripts = await window.electronAPI.getScripts();
        setAvailableScripts(latestScripts);

        if (!scripts || scripts.length === 0) {
          setScriptSchemas({});
          return;
        }

        const validScripts: string[] = [];

        scripts.forEach((scriptPath: string) => {
          if (latestScripts.includes(scriptPath)) {
            validScripts.push(scriptPath);
          } else {
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

        const schemas: any = {};
        await Promise.all(
          validScripts.map(async (scriptPath) => {
            try {
              const module = await loadScript(scriptPath, forceReload);
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
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const updateStyleAtPath = (
    newStyles: Record<string, any>,
    path: string[],
    isReplace = false
  ) => {
    if (path.length === 0) {
      dispatch(updateElementProps({ id: selectedElementId, props: newStyles }));
      return;
    }

    const rootKey = path[0];
    const rootValue = { ...(selectedElement.props[rootKey] || {}) };

    if (path.length === 1) {
      let updatedVariant;
      if (isReplace) {
        const preservedProps: any = {};
        Object.keys(rootValue).forEach((k) => {
          if (INTERNAL_PROPS.includes(k) || k.startsWith("@media")) {
            preservedProps[k] = rootValue[k];
          }
        });
        updatedVariant = { ...newStyles, ...preservedProps };
      } else {
        updatedVariant = { ...rootValue, ...newStyles };
      }

      Object.keys(newStyles).forEach((k) => {
        if (newStyles[k] === undefined && !isReplace) delete updatedVariant[k];
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

  const handleAddSelector = () => {
    if (!newSelectorInput.trim()) return;
    const newSelector = newSelectorInput.trim();
    let pathToAdd = [];
    if (selectedBreakpoint !== "base") pathToAdd.push(selectedBreakpoint);
    pathToAdd.push(newSelector);
    updateStyleAtPath({}, pathToAdd);
    setNewSelectorInput("&");
    setIsAddingSelector(false);
  };

  const handleRenameSelector = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const validNewName = newName.trim();
    const contextStyles =
      selectedBreakpoint === "base"
        ? selectedElement.props
        : selectedElement.props[selectedBreakpoint] || {};

    if (contextStyles[validNewName]) {
      console.warn("Selector name already exists");
      return;
    }

    if (selectedBreakpoint === "base") {
      const oldStyles = selectedElement.props[oldName];
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: {
            [oldName]: undefined,
            [validNewName]: oldStyles,
          },
        })
      );
    } else {
      const bpKey = selectedBreakpoint;
      const bpObj = { ...(selectedElement.props[bpKey] || {}) };
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
          dispatch(
            updateElementProps({
              id: selectedElementId,
              props: { [selectorName]: undefined },
            })
          );
        } else {
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

  const rootProps =
    selectedBreakpoint === "base"
      ? selectedElement.props
      : selectedElement.props[selectedBreakpoint] || {};

  const baseStyles = rootProps;

  const selectors = Object.keys(baseStyles).filter((key) => {
    if (INTERNAL_PROPS.includes(key)) return false;
    if (key.startsWith("@media")) return false;
    const val = baseStyles[key];
    return typeof val === "object" && val !== null;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
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
              onKeyDown={(e) => {
                // 한글 조합 중이면 엔터키 처리 방지 (중복 입력 방지)
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") e.currentTarget.blur();
              }}
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

      <div className="px-4 py-2 shrink-0">
        {selectedElement.type === "Text" && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-600">Content</span>
            <textarea
              rows={2}
              // [수정] localText 사용 (props.text 직접 바인딩 X)
              value={localText}
              onChange={(e) => {
                const newVal = e.target.value;
                setLocalText(newVal); // 1. 로컬 상태 즉시 업데이트
                dispatch(
                  updateElementProps({
                    id: selectedElementId!,
                    props: { text: newVal }, // 2. 리덕스에 업데이트 요청 (비동기)
                  })
                );
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none resize-none font-mono"
            />
          </div>
        )}
      </div>

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

      <div className="flex-1 p-4 pt-0">
        <StyleSection
          title={<span className="text-gray-800">Base Styles</span>}
          styles={baseStyles}
          path={selectedBreakpoint === "base" ? [] : [selectedBreakpoint]}
          onUpdate={updateStyleAtPath}
          fontOptions={fonts}
        />

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
            fontOptions={fonts}
          />
        ))}

        <div className="mt-1">
          {isAddingSelector ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="text"
                value={newSelectorInput}
                onChange={(e) => setNewSelectorInput(e.target.value)}
                onKeyDown={(e) => {
                  // 한글 조합 중이면 엔터키 추가 방지
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") handleAddSelector();
                }}
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