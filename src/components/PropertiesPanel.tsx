import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { updateCanvasSettings } from "../store/canvasSlice";
import {
  updateElementProps,
  updateElementAttributes,
  removeScriptFromElement,
} from "../store/elementSlice";
import { loadScript } from "../utils/scriptManager";
import ComponentInspector from "./ComponentInspector";
import { CSS_PROPERTIES, PROPERTY_VALUES } from "../constants";
import AutocompleteInput from "./AutocompleteInput";

// --- Utility Functions ---
const toKebabCase = (str: string) =>
  str.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
const toCamelCase = (str: string) =>
  str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

// --- StyleRow Component ---
interface StyleRowProps {
  propKey: string;
  propValue: string;
  onCommit: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: (key: string) => void;
  isNew?: boolean;
}

function StyleRow({
  propKey,
  propValue,
  onCommit,
  onDelete,
  isNew,
}: StyleRowProps) {
  const [key, setKey] = useState(propKey);
  const [val, setVal] = useState(propValue);

  useEffect(() => {
    setKey(propKey);
    setVal(propValue);
  }, [propKey, propValue]);

  const commitChange = () => {
    if (key && val) {
      if (key !== propKey || val !== propValue) {
        onCommit(propKey, key, val);
        if (isNew) {
          setKey("");
          setVal("");
        }
      }
    }
  };

  const handleValueEnter = () => {
    if (key && val) {
      onCommit(propKey, key, val);
      if (isNew) {
        setKey("");
        setVal("");
      }
    }
  };

  return (
    <div className="flex items-start group text-xs hover:bg-gray-50 -ml-2 pl-2 rounded py-0.5 relative">
      <div className="w-[110px] shrink-0 mr-1 pt-0.5">
        <AutocompleteInput
          value={key}
          onChange={setKey}
          onBlur={commitChange}
          options={CSS_PROPERTIES} // kebab-case options recommended here
          placeholder={isNew ? "property" : ""}
          className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none font-mono ${
            isNew ? "text-gray-400 italic" : "text-blue-700"
          }`}
        />
      </div>
      <span className="text-gray-400 mr-1 mt-0.5 select-none">:</span>
      <div className="flex-1 min-w-0 pt-0.5">
        <AutocompleteInput
          value={val}
          onChange={setVal}
          onBlur={commitChange}
          onEnter={handleValueEnter}
          options={PROPERTY_VALUES[toCamelCase(key)] || []} // Convert key to camelCase to find values
          placeholder=""
          className="w-full text-gray-800 font-mono"
        />
      </div>
      <span className="text-gray-400 ml-1 mt-0.5 select-none">;</span>
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

// --- Main Panel ---
export default function PropertiesPanel() {
  const { elements } = useSelector((state: RootState) => state.elements);
  const { selectedElementId, canvasSettings } = useSelector(
    (state: RootState) => state.canvas
  );
  const dispatch = useDispatch();

  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{
    [scriptName: string]: any;
  }>({});

  const [localId, setLocalId] = useState("");
  const [localClass, setLocalClass] = useState("");

  const selectedElement = elements.find(
    (el) => el.elementId === selectedElementId
  );

  useEffect(() => {
    if (selectedElement) {
      setLocalId(selectedElement.id || "");
      setLocalClass(selectedElement.className || "");
    }
  }, [selectedElement?.elementId]);

  const refreshAll = useCallback(
    async (forceReload = false) => {
      if (!window.electronAPI) return;
      const latestScripts = await window.electronAPI.getScripts();
      setAvailableScripts(latestScripts);
      if (!selectedElement) {
        setScriptSchemas({});
        return;
      }

      const validScripts: string[] = [];
      if (selectedElement.scripts) {
        selectedElement.scripts.forEach((scriptPath) => {
          if (latestScripts.includes(scriptPath)) validScripts.push(scriptPath);
          else
            dispatch(
              removeScriptFromElement({
                id: selectedElement.elementId,
                scriptName: scriptPath,
              })
            );
        });
      }
      const schemas: any = {};
      await Promise.all(
        validScripts.map(async (scriptPath) => {
          try {
            const module = await loadScript(scriptPath, forceReload);
            if (module?.default?.fields)
              schemas[scriptPath] = module.default.fields;
          } catch (e) {}
        })
      );
      setScriptSchemas(schemas);
    },
    [
      selectedElement?.elementId,
      JSON.stringify(selectedElement?.scripts),
      dispatch,
    ]
  );

  useEffect(() => {
    refreshAll(false);
  }, [refreshAll]);

  useEffect(() => {
    const handleFocus = () => refreshAll(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshAll]);

  const commitAttribute = (name: string, value: string) => {
    if (selectedElementId && selectedElement) {
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

  // ⭐ [수정] 스타일 저장/수정 (kebab -> camel)
  const handleCommitStyle = (
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    if (!selectedElementId) return;

    const camelNewKey = toCamelCase(newKey.trim());
    const camelOldKey = oldKey ? toCamelCase(oldKey.trim()) : "";

    if (camelOldKey && camelOldKey !== camelNewKey) {
      // 키 이름이 바뀌었으면 기존 키 삭제 후 새 키 추가
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [camelOldKey]: undefined, [camelNewKey]: newValue },
        })
      );
    } else {
      // 값만 바뀌었거나 새 속성 추가
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [camelNewKey]: newValue },
        })
      );
    }
  };

  // ⭐ [수정] 스타일 삭제 (kebab -> camel)
  const handleDeleteStyle = (key: string) => {
    if (selectedElementId) {
      const camelKey = toCamelCase(key);
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [camelKey]: undefined },
        })
      );
    }
  };

  const internalProps = [
    "className",
    "src",
    "text",
    "scripts",
    "scriptValues",
    "id",
    "elementId",
    "children",
    "parentId",
    "anchorX",
    "anchorY",
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-white pb-20">
      {!selectedElement ? (
        <div className="space-y-6 p-5">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">
            Canvas Settings
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Width (px)
            </label>
            <input
              type="number"
              value={canvasSettings.width}
              onChange={(e) =>
                dispatch(
                  updateCanvasSettings({ width: Number(e.target.value) })
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Height (px)
            </label>
            <input
              type="number"
              value={canvasSettings.height}
              onChange={(e) =>
                dispatch(
                  updateCanvasSettings({ height: Number(e.target.value) })
                )
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={canvasSettings.backgroundColor}
                onChange={(e) =>
                  dispatch(
                    updateCanvasSettings({ backgroundColor: e.target.value })
                  )
                }
                className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
              />
              <span className="text-xs text-gray-500 uppercase">
                {canvasSettings.backgroundColor}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 p-5">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">
            Properties
          </h3>

          <div className="space-y-3 border-b pb-4 border-gray-100">
            <span className="text-xs font-bold text-gray-800 block mb-1">
              Attributes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-bold w-8">ID</span>
              <input
                type="text"
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
                onBlur={() => commitAttribute("id", localId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitAttribute("id", localId);
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1 min-w-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono"
                placeholder="id"
              />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <span className="text-[10px] text-gray-500 font-bold w-8 mt-1.5">
                CLASS
              </span>
              <div className="flex-1 min-w-0">
                <AutocompleteInput
                  value={localClass}
                  onChange={setLocalClass}
                  onBlur={() => commitAttribute("className", localClass)}
                  onEnter={() => {
                    commitAttribute("className", localClass);
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  options={[]}
                  className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono"
                  placeholder="class names"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 pb-4 pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-800">Styles</span>
            </div>
            <div className="pl-2 border-l-2 border-gray-100">
              <div className="max-h-80 overflow-y-auto scrollbar-thin pr-1 mb-2">
                {Object.entries(selectedElement.props).map(([key, value]) => {
                  if (internalProps.includes(key)) return null;

                  // ⭐ [수정] 렌더링 시: camel -> kebab
                  const displayLabel = toKebabCase(key);

                  return (
                    <StyleRow
                      key={key}
                      propKey={displayLabel}
                      propValue={value as string}
                      onCommit={handleCommitStyle}
                      onDelete={handleDeleteStyle}
                    />
                  );
                })}
              </div>
              <div className="border-t border-gray-100 border-dashed pt-1">
                {/* 새 항목 추가 행 */}
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
            <div className="text-[9px] text-gray-400 mt-1">{"}"}</div>
          </div>

          {selectedElement.type === "Text" && (
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <span className="text-xs font-bold text-gray-800 block mb-1">
                Content
              </span>
              <textarea
                rows={2}
                value={selectedElement.props.text || ""}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none resize-none font-mono"
                onChange={(e) =>
                  dispatch(
                    updateElementProps({
                      id: selectedElementId!,
                      props: { text: e.target.value },
                    })
                  )
                }
              />
            </div>
          )}

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
