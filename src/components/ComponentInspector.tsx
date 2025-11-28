import React from "react";
import { useDispatch } from "react-redux";
import {
  updateScriptValue,
  removeScriptFromElement,
  addScriptToElement,
  resetScriptValues,
} from "../store/elementSlice";

import { useModal } from "../context/ModalContext";

interface FieldDef {
  type: "string" | "number" | "boolean" | "select" | "array";
  label?: string;
  default?: any;
  options?: string[]; // select 타입용
}

// --- 인터페이스 정의 ---
interface ComponentInspectorProps {
  selectedElement: any; // EditorElement
  availableScripts: string[];
  // 스키마 타입을 FieldDef 기반으로 명시
  scriptSchemas: { [scriptName: string]: { [field: string]: FieldDef } };
}

export default function ComponentInspector({
  selectedElement,
  availableScripts,
  scriptSchemas,
}: ComponentInspectorProps) {
  const dispatch = useDispatch();
  const { showModal, hideModal } = useModal();
  const selectedId = selectedElement.id;

  // --- 핸들러 함수들 (외부로 뺀 상태) ---
  const handleRemoveScript = (
    dispatch: any,
    id: string,
    scriptName: string
  ) => {
    dispatch(removeScriptFromElement({ id, scriptName }));
  };

  const handleFieldChange = (
    dispatch: any,
    id: string,
    scriptName: string,
    fieldName: string,
    value: any
  ) => {
    dispatch(updateScriptValue({ id, scriptName, fieldName, value }));
  };

  const handleAddArrayItem = (
    dispatch: any,
    id: string,
    scriptName: string,
    fieldName: string,
    currentArray: any[]
  ) => {
    let newItem: any = "";
    if (currentArray && currentArray.length > 0) {
      const firstItem = currentArray[0];
      if (typeof firstItem === "number") newItem = 0;
      else if (typeof firstItem === "boolean") newItem = false;
    }
    const newArray = [...(currentArray || []), newItem];
    handleFieldChange(dispatch, id, scriptName, fieldName, newArray);
  };

  const handleRemoveArrayItem = (
    dispatch: any,
    id: string,
    scriptName: string,
    fieldName: string,
    currentArray: any[],
    index: number
  ) => {
    const newArray = [...currentArray];
    newArray.splice(index, 1);
    handleFieldChange(dispatch, id, scriptName, fieldName, newArray);
  };

  const handleArrayItemChange = (
    dispatch: any,
    id: string,
    scriptName: string,
    fieldName: string,
    currentArray: any[],
    index: number,
    newValue: any
  ) => {
    const newArray = [...currentArray];
    newArray[index] = newValue;
    handleFieldChange(dispatch, id, scriptName, fieldName, newArray);
  };

  const handleAddScript = (
    dispatch: any,
    id: string,
    scriptName: string,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (scriptName && id) {
      dispatch(addScriptToElement({ id, scriptName }));
      e.target.value = "";
    }
  };

  const handleResetScript = (dispatch: any, id: string, scriptName: string) => {
    showModal({
      title: "알림",
      body: `정말로 ${scriptName
        .split("/")
        .pop()}의 모든 값을 초기화하시겠습니까?`,
      showCancel: false,
      onConfirm: () => {
        dispatch(resetScriptValues({ id, scriptName }));
        hideModal();
      },
    });
  };

  return (
    <div className="mt-8 pt-4 border-t border-gray-200">
      <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">
        Components
      </h4>

      <div className="space-y-4 mb-4">
        {(selectedElement.scripts || []).map((scriptName: string) => (
          <div
            key={scriptName}
            className="border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden"
          >
            {/* 스크립트 헤더 (제목 + 버튼들) */}
            <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-200">
              {/* 왼쪽: 제목 */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-lg">📜</span>
                <span
                  className="font-semibold text-xs text-gray-700 truncate"
                  title={scriptName}
                >
                  {scriptName.split("/").pop()}
                </span>
              </div>

              {/* 오른쪽: 리셋 및 삭제 버튼 */}
              <div className="flex gap-2">
                {/* 🔁 리셋 버튼 (새로 추가됨) */}
                <button
                  onClick={() =>
                    handleResetScript(dispatch, selectedId, scriptName)
                  }
                  className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"
                  title="Reset to Default"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 0h-4.582m4.582 0a8.001 8.001 0 01-15.356 2m15.356-2H15"
                    />
                  </svg>
                </button>

                {/* 🗑️ 삭제 버튼 (기존 유지) */}
                <button
                  onClick={() =>
                    handleRemoveScript(dispatch, selectedId, scriptName)
                  }
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                  title="Remove Component"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 필드 UI (SerializeField) */}
            {Object.entries(scriptSchemas[scriptName]).length > 0 && (
              <div className="p-3 space-y-3 bg-white">
                {scriptSchemas[scriptName] &&
                  Object.entries(scriptSchemas[scriptName]).map(
                    ([fieldName, fieldDef]) => {
                      const currentValue =
                        selectedElement.scriptValues?.[scriptName]?.[
                          fieldName
                        ] ?? fieldDef.default;

                      // --- 렌더링 로직 시작 ---
                      if (fieldDef.type === "array") {
                        const arrayVal = Array.isArray(currentValue)
                          ? currentValue
                          : [];
                        return (
                          <div
                            key={fieldName}
                            className="flex flex-col gap-2 border border-gray-100 rounded p-2 bg-gray-50/50"
                          >
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">
                                {fieldDef.label || fieldName}
                              </label>
                              <span className="text-[9px] text-gray-400 bg-gray-200 px-1 rounded">
                                {arrayVal.length} items
                              </span>
                            </div>

                            <div className="space-y-1">
                              {arrayVal.map((item: any, idx: number) => {
                                const valueType = typeof item;
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1"
                                  >
                                    <span className="text-[9px] text-gray-400 w-4 text-right">
                                      {idx}
                                    </span>
                                    {valueType === "number" ? (
                                      <input
                                        type="number"
                                        value={item}
                                        onChange={(e) =>
                                          handleArrayItemChange(
                                            dispatch,
                                            selectedId,
                                            scriptName,
                                            fieldName,
                                            arrayVal,
                                            idx,
                                            Number(e.target.value)
                                          )
                                        }
                                        className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1"
                                      />
                                    ) : valueType === "boolean" ? (
                                      <input
                                        type="checkbox"
                                        checked={!!item}
                                        onChange={(e) =>
                                          handleArrayItemChange(
                                            dispatch,
                                            selectedId,
                                            scriptName,
                                            fieldName,
                                            arrayVal,
                                            idx,
                                            e.target.checked
                                          )
                                        }
                                        className="flex-1 h-4"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={item}
                                        onChange={(e) =>
                                          handleArrayItemChange(
                                            dispatch,
                                            selectedId,
                                            scriptName,
                                            fieldName,
                                            arrayVal,
                                            idx,
                                            e.target.value
                                          )
                                        }
                                        className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1"
                                      />
                                    )}

                                    <button
                                      onClick={() =>
                                        handleRemoveArrayItem(
                                          dispatch,
                                          selectedId,
                                          scriptName,
                                          fieldName,
                                          arrayVal,
                                          idx
                                        )
                                      }
                                      className="text-gray-400 hover:text-red-500 transition-colors px-1"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              onClick={() =>
                                handleAddArrayItem(
                                  dispatch,
                                  selectedId,
                                  scriptName,
                                  fieldName,
                                  arrayVal
                                )
                              }
                              className="w-full py-1 text-[10px] bg-white border border-gray-300 rounded text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                              + Add Item
                            </button>
                          </div>
                        );
                      }

                      // 일반 타입 렌더링 (number, string, boolean, select)
                      return (
                        <div key={fieldName} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">
                            {fieldDef.label || fieldName}
                          </label>
                          {fieldDef.type === "number" && (
                            <input
                              type="number"
                              value={currentValue}
                              onChange={(e) =>
                                handleFieldChange(
                                  dispatch,
                                  selectedId,
                                  scriptName,
                                  fieldName,
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          )}
                          {fieldDef.type === "string" && (
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) =>
                                handleFieldChange(
                                  dispatch,
                                  selectedId,
                                  scriptName,
                                  fieldName,
                                  e.target.value
                                )
                              }
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          )}
                          {fieldDef.type === "boolean" && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!currentValue}
                                onChange={(e) =>
                                  handleFieldChange(
                                    dispatch,
                                    selectedId,
                                    scriptName,
                                    fieldName,
                                    e.target.checked
                                  )
                                }
                                className="accent-blue-500 h-4 w-4"
                              />
                              <span className="text-xs text-gray-600 select-none">
                                {currentValue ? "True" : "False"}
                              </span>
                            </label>
                          )}
                          {fieldDef.type === "select" && (
                            <select
                              value={currentValue}
                              onChange={(e) =>
                                handleFieldChange(
                                  dispatch,
                                  selectedId,
                                  scriptName,
                                  fieldName,
                                  e.target.value
                                )
                              }
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                            >
                              {fieldDef.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    }
                  )}
              </div>
            )}
          </div>
        ))}

        {/* Add Component Dropdown */}
        <div className="relative pt-4 border-t border-gray-200">
          <select
            className="w-full text-xs border border-gray-300 rounded-md p-2 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
            onChange={(e) =>
              handleAddScript(dispatch, selectedId, e.target.value, e)
            }
            value=""
          >
            <option value="" disabled>
              + Add Component
            </option>
            {availableScripts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
