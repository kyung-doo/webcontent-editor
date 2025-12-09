import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  updateElementProps,
  updateElementAttributes,
  removeScriptFromElement,
  EditorElement,
} from "../store/elementSlice";
import { loadScript } from "../utils/scriptManager";
import ComponentInspector from "./ComponentInspector";
import { CSS_PROPERTIES, PROPERTY_VALUES } from "../constants";
import AutocompleteInput from "./AutocompleteInput";
import {
  Plus,
  Trash2,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Layers,
  Edit2,
  CornerDownRight, // 아이콘 추가
} from "lucide-react";
import { useModal } from "../context/ModalContext";

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
          options={CSS_PROPERTIES}
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
          options={PROPERTY_VALUES[toCamelCase(key)] || []}
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

  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{
    [scriptName: string]: any;
  }>({});

  const [localId, setLocalId] = useState("");
  const [localClass, setLocalClass] = useState("");

  // Variant 추가 UI 상태
  const [isAddingVariant, setIsAddingVariant] = useState<
    "none" | "selector" | "media"
  >("none");
  const [newSelectorName, setNewSelectorName] = useState("");

  // Variant 이름 수정 상태
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // [추가] 중첩 Selector 추가 상태 (예: Breakpoint 내부의 :hover)
  const [addingSubVariantTo, setAddingSubVariantTo] = useState<string | null>(
    null
  );
  const [newSubSelectorName, setNewSubSelectorName] = useState("");

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

  // Scripts Refresh Logic
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
      selectedElement.elementId,
      JSON.stringify(selectedElement.scripts),
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

  // Handlers
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

  // --- Variant Handlers ---

  const handleAddSelector = () => {
    if (newSelectorName.trim()) {
      const key = newSelectorName.trim();
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [key]: {} },
        })
      );
      setNewSelectorName("");
      setIsAddingVariant("none");
    }
  };

  const handleAddMedia = (width: number) => {
    const key = `@media (max-width: ${width}px)`;
    dispatch(
      updateElementProps({
        id: selectedElementId,
        props: { [key]: {} },
      })
    );
    setIsAddingVariant("none");
  };

  // [추가] 중첩 Selector 추가 핸들러 (Breakpoint 내부)
  const handleAddSubSelector = (parentKey: string) => {
    if (newSubSelectorName.trim()) {
      const childKey = newSubSelectorName.trim();

      // 부모 Variant 객체 복사
      const parentVariant =
        (selectedElement.props[parentKey] as Record<string, any>) || {};
      const newParentVariant = { ...parentVariant, [childKey]: {} }; // 자식 추가

      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [parentKey]: newParentVariant },
        })
      );

      setNewSubSelectorName("");
      setAddingSubVariantTo(null);
    }
  };

  const handleDeleteVariant = (variantKey: string) => {
    showModal({
      title: "Delete Variant",
      body: (
        <span>
          Are you sure you want to delete styles for{" "}
          <b className="text-gray-800">{variantKey}</b>?
        </span>
      ),
      showCancel: true,
      onConfirm: () => {
        dispatch(
          updateElementProps({
            id: selectedElementId,
            props: { [variantKey]: undefined },
          })
        );
      },
    });
  };

  // [추가] 중첩 Selector 삭제 핸들러
  const handleDeleteSubVariant = (parentKey: string, childKey: string) => {
    const parentVariant =
      (selectedElement.props[parentKey] as Record<string, any>) || {};
    const newParentVariant = { ...parentVariant };
    delete newParentVariant[childKey];

    dispatch(
      updateElementProps({
        id: selectedElementId,
        props: { [parentKey]: newParentVariant },
      })
    );
  };

  // --- Variant Rename Handlers ---
  const handleStartRename = (key: string) => {
    setEditingVariant(key);
    setRenameValue(key);
  };

  const handleFinishRename = () => {
    if (editingVariant && renameValue.trim()) {
      const oldKey = editingVariant;
      const newKey = renameValue.trim();

      if (oldKey !== newKey) {
        const existingStyles = selectedElement.props[oldKey];
        dispatch(
          updateElementProps({
            id: selectedElementId,
            props: {
              [oldKey]: undefined,
              [newKey]: existingStyles,
            },
          })
        );
      }
    }
    setEditingVariant(null);
    setRenameValue("");
  };

  // --- Style Commit Logic (Base + Variant + Nested Variant) ---
  // [수정] subVariantKey 파라미터 추가 (중첩 스타일 지원)
  const handleCommitStyle = (
    variantKey: string | null,
    subVariantKey: string | null, // 추가됨
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    if (!selectedElementId) return;

    const camelNewKey = toCamelCase(newKey.trim());
    const camelOldKey = oldKey ? toCamelCase(oldKey.trim()) : "";

    // 1. 기본 스타일 (Base)
    if (variantKey === null) {
      if (camelOldKey && camelOldKey !== camelNewKey) {
        dispatch(
          updateElementProps({
            id: selectedElementId,
            props: { [camelOldKey]: undefined, [camelNewKey]: newValue },
          })
        );
      } else {
        dispatch(
          updateElementProps({
            id: selectedElementId,
            props: { [camelNewKey]: newValue },
          })
        );
      }
    } else {
      // 2. 변형 스타일 (Variant)
      const currentVariantProps =
        (selectedElement.props[variantKey] as Record<string, any>) || {};

      let newVariantProps = { ...currentVariantProps };

      if (subVariantKey) {
        // 3. 중첩 변형 스타일 (Nested Variant) - 예: Media Query 내부의 :hover
        const currentSubProps =
          (currentVariantProps[subVariantKey] as Record<string, any>) || {};
        const newSubProps = { ...currentSubProps };

        if (camelOldKey && camelOldKey !== camelNewKey) {
          delete newSubProps[camelOldKey];
        }
        newSubProps[camelNewKey] = newValue;

        // 부모에 업데이트된 자식 반영
        newVariantProps[subVariantKey] = newSubProps;
      } else {
        // 1단계 변형 스타일 (Direct Variant Properties)
        if (camelOldKey && camelOldKey !== camelNewKey) {
          delete newVariantProps[camelOldKey];
        }
        newVariantProps[camelNewKey] = newValue;
      }

      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [variantKey]: newVariantProps },
        })
      );
    }
  };

  const handleDeleteStyle = (
    variantKey: string | null,
    subVariantKey: string | null,
    key: string
  ) => {
    if (!selectedElementId) return;
    const camelKey = toCamelCase(key);

    if (variantKey === null) {
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [camelKey]: undefined },
        })
      );
    } else {
      const currentVariantProps =
        (selectedElement.props[variantKey] as Record<string, any>) || {};
      let newVariantProps = { ...currentVariantProps };

      if (subVariantKey) {
        // 중첩 스타일 삭제
        const currentSubProps =
          (currentVariantProps[subVariantKey] as Record<string, any>) || {};
        const newSubProps = { ...currentSubProps };
        delete newSubProps[camelKey];
        newVariantProps[subVariantKey] = newSubProps;
      } else {
        // 1단계 스타일 삭제
        delete newVariantProps[camelKey];
      }

      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [variantKey]: newVariantProps },
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
    "isLocked",
    "isVisible",
    "isExpanded",
    "type",
    "name",
  ];

  // Helper to render a property list
  // [수정] 재귀적 렌더링 또는 2단계 명시적 렌더링 지원
  const renderPropertyList = (
    variantKey: string | null,
    subVariantKey: string | null = null
  ) => {
    let propsSource: Record<string, any> = {};

    if (variantKey === null) {
      propsSource = selectedElement.props;
    } else {
      const variant = selectedElement.props[variantKey] as Record<string, any>;
      if (!variant) propsSource = {};
      else if (subVariantKey) {
        propsSource = (variant[subVariantKey] as Record<string, any>) || {};
      } else {
        propsSource = variant;
      }
    }

    return (
      <div
        className={`pl-2 border-l-2 ${
          subVariantKey
            ? "border-purple-300 bg-purple-50/30"
            : variantKey
            ? "border-blue-300 bg-blue-50/30"
            : "border-gray-200"
        } rounded-r`}
      >
        <div className="pr-1 mb-1">
          {Object.entries(propsSource).map(([key, value]) => {
            // 내부 속성이거나, 값이 객체(다른 Variant)인 경우 제외 (여기서는 값 스타일만 렌더링)
            if (
              internalProps.includes(key) ||
              (typeof value === "object" && value !== null)
            )
              return null;

            const displayLabel = toKebabCase(key);

            return (
              <StyleRow
                key={`${variantKey || "base"}-${
                  subVariantKey || "direct"
                }-${key}`}
                propKey={displayLabel}
                propValue={value as string}
                onCommit={(oldK, newK, newV) =>
                  handleCommitStyle(variantKey, subVariantKey, oldK, newK, newV)
                }
                onDelete={(k) =>
                  handleDeleteStyle(variantKey, subVariantKey, k)
                }
              />
            );
          })}

          {/* [추가] 중첩된 객체(서브 셀렉터) 렌더링 - 1단계 Variant(예: Media Query)인 경우에만 표시 */}
          {variantKey &&
            !subVariantKey &&
            Object.entries(propsSource).map(([key, value]) => {
              if (typeof value === "object" && value !== null) {
                return (
                  <div key={key} className="mt-2 ml-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-purple-600 font-mono flex items-center gap-1">
                        <CornerDownRight size={10} /> {key}
                      </span>
                      <button
                        onClick={() => handleDeleteSubVariant(variantKey, key)}
                        className="text-gray-300 hover:text-red-500 p-0.5"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {renderPropertyList(variantKey, key)}
                  </div>
                );
              }
              return null;
            })}
        </div>
        <div className="border-t border-gray-100 border-dashed pt-1">
          <StyleRow
            key={`${variantKey || "base"}-${subVariantKey || "direct"}-new`}
            propKey=""
            propValue=""
            onCommit={(oldK, newK, newV) =>
              handleCommitStyle(variantKey, subVariantKey, oldK, newK, newV)
            }
            onDelete={() => {}}
            isNew={true}
          />
        </div>
      </div>
    );
  };

  const existingVariants = Object.entries(selectedElement.props)
    .filter(
      ([key, value]) =>
        !internalProps.includes(key) &&
        typeof value === "object" &&
        value !== null
    )
    .map(([key]) => key);

  return (
    <div className="space-y-6 p-5">
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">
        Properties
      </h3>

      {/* Attributes Section */}
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

      <div className="space-y-4 pb-4 pt-2">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-gray-800">Styles</span>

          <div className="relative">
            {isAddingVariant === "none" ? (
              <button
                onClick={() => setIsAddingVariant("selector")}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
              >
                <Plus size={10} /> Add Variant
              </button>
            ) : (
              <button
                onClick={() => setIsAddingVariant("none")}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
              >
                <X size={14} />
              </button>
            )}

            {/* Add Variant Popup */}
            {isAddingVariant !== "none" && (
              <div className="absolute right-0 top-8 w-60 z-10 p-2 bg-white rounded-md shadow-lg border border-gray-200 text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2 border-b border-gray-100 pb-2 mb-2">
                  <button
                    onClick={() => setIsAddingVariant("selector")}
                    className={`flex-1 py-1 text-center rounded text-[10px] ${
                      isAddingVariant === "selector"
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Selector
                  </button>
                  <button
                    onClick={() => setIsAddingVariant("media")}
                    className={`flex-1 py-1 text-center rounded text-[10px] ${
                      isAddingVariant === "media"
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Breakpoint
                  </button>
                </div>

                {isAddingVariant === "selector" ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newSelectorName}
                      onChange={(e) => setNewSelectorName(e.target.value)}
                      placeholder=".class or :hover"
                      className="flex-1 border rounded px-2 py-1 focus:outline-blue-500"
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddSelector()
                      }
                    />
                    <button
                      onClick={handleAddSelector}
                      disabled={!newSelectorName.trim()}
                      className="px-2 bg-blue-500 text-white rounded disabled:opacity-50 text-[10px]"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                    {breakpoints.map((bp) => (
                      <button
                        key={bp.id}
                        onClick={() => handleAddMedia(bp.width)}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded text-left transition-all group"
                      >
                        <span className="text-gray-400 group-hover:text-blue-500">
                          {bp.width >= 1200 ? (
                            <Monitor size={12} />
                          ) : bp.width >= 600 ? (
                            <Tablet size={12} />
                          ) : (
                            <Smartphone size={12} />
                          )}
                        </span>
                        <span className="font-medium">{bp.name}</span>
                        <span className="text-gray-400 text-[10px] ml-auto">
                          ≤ {bp.width}px
                        </span>
                      </button>
                    ))}
                    {breakpoints.length === 0 && (
                      <div className="text-gray-400 text-center py-2">
                        No breakpoints defined
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 1. Base Styles Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={12} className="text-gray-400" />
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
              Base Styles
            </span>
          </div>
          {renderPropertyList(null)}
        </div>

        {/* 2. Variants Sections */}
        {existingVariants.length > 0 && (
          <div className="space-y-6">
            {existingVariants.map((variantKey) => (
              <div key={variantKey} className="group/variant">
                <div className="flex justify-between items-center mb-1">
                  {editingVariant === variantKey ? (
                    // --- 수정 모드 (Input) ---
                    <div className="flex-1 mr-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleFinishRename()
                        }
                        autoFocus
                        className="w-full text-xs border border-blue-300 rounded px-1.5 py-0.5 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    // --- 보기 모드 (Span) ---
                    <div className="flex items-center gap-2">
                      <span
                        onDoubleClick={() => handleStartRename(variantKey)}
                        className="text-xs font-bold text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 break-all cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        title="Double click to edit selector"
                      >
                        {variantKey}
                      </span>

                      {/* [추가] Media Query일 경우 중첩 셀렉터 추가 버튼 표시 */}
                      {variantKey.startsWith("@media") && (
                        <div className="relative">
                          <button
                            onClick={() => setAddingSubVariantTo(variantKey)}
                            className="p-0.5 text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                            title="Add nested selector (e.g. :hover)"
                          >
                            <Plus size={10} />
                          </button>

                          {addingSubVariantTo === variantKey && (
                            <div className="absolute left-0 top-5 z-20 w-48 p-2 bg-white rounded shadow-lg border border-gray-200">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  placeholder=":hover or .class"
                                  className="flex-1 text-[10px] border rounded px-1 py-0.5 focus:outline-blue-500"
                                  value={newSubSelectorName}
                                  onChange={(e) =>
                                    setNewSubSelectorName(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleAddSubSelector(variantKey)
                                  }
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleAddSubSelector(variantKey)
                                  }
                                  disabled={!newSubSelectorName.trim()}
                                  className="text-[10px] px-1.5 bg-blue-500 text-white rounded disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                              <button
                                onClick={() => setAddingSubVariantTo(null)}
                                className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-0.5 hover:bg-gray-300"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center opacity-0 group-hover/variant:opacity-100 transition-opacity">
                    {!editingVariant && (
                      <button
                        onClick={() => handleStartRename(variantKey)}
                        className="text-gray-400 hover:text-blue-500 p-1"
                        title="Rename variant"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteVariant(variantKey)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove this variant"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {/* 1단계 및 중첩 스타일 렌더링 */}
                {renderPropertyList(variantKey)}
              </div>
            ))}
          </div>
        )}
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
  );
}
