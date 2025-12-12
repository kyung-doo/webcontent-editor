import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import AutocompleteInput from "./AutocompleteInput";
import PickrWidget from "./PickrWidget";
import { CSS_PROPERTIES, PROPERTY_VALUES, CSS_COLOR_NAMES } from "../constants";
import { toCamelCase, toKebabCase } from "../utils/styleUtils";
import { Edit2, Trash2 } from "lucide-react";

interface StyleRowProps {
  propKey: string;
  propValue: string;
  onCommit: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: (key: string) => void;
  isNew?: boolean;
  nextKeyInputRef?: React.RefObject<HTMLDivElement>;
  inputRef?: React.RefObject<HTMLDivElement>; // StyleRow에서 Key inputRef를 받기 위한 속성 추가
}

const setCursorToEnd = (element: HTMLElement) => {
  const range = document.createRange();
  const selection = window.getSelection();

  if (element.childNodes.length > 0) {
    if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
      range.setStart(element.firstChild, element.innerText.length);
    } else {
      range.setStart(element, 0);
    }
  } else {
    range.setStart(element, 0);
  }

  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

function StyleRow({
  propKey,
  propValue,
  onCommit,
  onDelete,
  isNew,
  nextKeyInputRef, // [추가]
}: StyleRowProps) {
  const [key, setKey] = useState(propKey);
  const [val, setVal] = useState(propValue);

  // [추가] Key AutocompleteInput의 Ref
  const keyInputRef = useRef<HTMLDivElement>(null);

  // 상위 props 변경 시 로컬 state 동기화
  useEffect(() => {
    setKey(propKey);
    setVal(propValue);
  }, [propKey, propValue]);

  // [수정] Value 또는 Key가 변경되었을 때 커밋
  const commitChange = () => {
    if (key && val) {
      if (key !== propKey || val !== propValue) {
        onCommit(propKey, key, val);
        if (isNew) {
          setKey("");
          setVal("");
        }
      }
    } else if (!key && !val && !isNew) {
      // 키/값이 모두 비었을 때 기존 속성 삭제 (선택 사항)
      onDelete(propKey);
    }
  };

  // [수정] Enter/Tab 키 입력 시 호출되며, 커밋 후 다음 Key 필드로 포커스 이동
  const handleValueEnter = useCallback(() => {
    // 1. 현재 값 커밋 (onCommit 호출)
    if (key && val) {
      onCommit(propKey, key, val);
    } else if (!key && !val && !isNew) {
      // 값이 비어있는데 엔터 친 경우 삭제
      onDelete(propKey);
    }

    // 2. 새로운 Row인 경우 Key/Value 비우기
    if (isNew) {
      setKey("");
      setVal("");
    }

    // 3. 다음 요소로 포커스 이동
    if (nextKeyInputRef?.current) {
      // 다음 행의 Key 입력 필드에 포커스
      nextKeyInputRef.current.focus();
      setCursorToEnd(nextKeyInputRef.current);
    } else if (keyInputRef.current && !isNew) {
      // 현재 행의 Key 필드로 복귀 (새 행이 아닐 경우)
      keyInputRef.current.focus();
      setCursorToEnd(keyInputRef.current);
    }
  }, [key, val, propKey, onCommit, onDelete, isNew, nextKeyInputRef]);

  // 색상 관련 속성인지 확인 (background, color, border 등)
  const isColorProp = useMemo(() => {
    const k = key.toLowerCase();
    return (
      k.includes("color") ||
      k.includes("background") ||
      k.includes("fill") ||
      k.includes("stroke") ||
      k.includes("border") ||
      k.includes("shadow") ||
      k.includes("outline") ||
      k.includes("column-rule")
    );
  }, [key]);

  // 문자열에서 모든 색상 값 추출 및 위치 정보 저장
  const extractAllColors = (str: string) => {
    if (!isColorProp) return [];
    const colorRegex = new RegExp(
      `(#(?:[0-9a-fA-F]{3}){1,2}\\b)|((?:rgb|hsl)a?\\s*\\([^)]+\\))|(\\b(?:${CSS_COLOR_NAMES.join(
        "|"
      )})\\b)`,
      "gi"
    );

    let match;
    const colors = [];
    while ((match = colorRegex.exec(str)) !== null) {
      colors.push({ value: match[0] });
    }
    return colors;
  };

  const detectedColors = useMemo(
    () => extractAllColors(val),
    [val, isColorProp]
  );

  // 다중 색상 업데이트 핸들러: 발견된 색상 중 일치하는 첫 번째 항목만 교체
  const handleMultiColorChange = (oldColor: string, newColor: string) => {
    const regex = new RegExp(
      `\\b${oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
      "i"
    );
    const newVal = val.replace(regex, newColor);

    setVal(newVal);
    onCommit(propKey, key, newVal);
  };

  return (
    <div className="flex items-start group text-xs hover:bg-gray-50 -ml-2 pl-2 rounded py-0.5 relative">
      {/* Property Key Input */}
      <div className="w-[110px] shrink-0 mr-1 pt-0.5">
        <AutocompleteInput
          value={key}
          onChange={setKey}
          onBlur={commitChange}
          onEnter={handleValueEnter} // Enter/Tab 시 Value Commit 후 다음 Key로 이동
          options={CSS_PROPERTIES}
          placeholder={isNew ? "property" : ""}
          className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none font-mono ${
            isNew ? "text-gray-400 italic" : "text-blue-700"
          }`}
          inputRef={keyInputRef} // [추가] Key Input Ref 할당
        />
      </div>

      <span className="text-gray-400 mr-1 mt-0.5 select-none">:</span>

      {/* Property Value Input + Color Picker */}
      <div className="flex-1 min-w-0 pt-0.5 flex items-center">
        {/* 다중 Pickr Widget Integration: 값 입력 필드 앞에 모든 색상 버튼을 나열 */}
        {detectedColors.length > 0 && (
          <div className="flex items-center space-x-1 pr-1 shrink-0">
            {detectedColors.map((color, index) => (
              <PickrWidget
                key={`${propKey}-${index}`}
                initialColor={color.value}
                onChange={(newColor) => {
                  handleMultiColorChange(color.value, newColor);
                }}
              />
            ))}
          </div>
        )}

        <AutocompleteInput
          value={val}
          onChange={setVal}
          onBlur={commitChange}
          onEnter={handleValueEnter} // [수정] Enter/Tab 시 Commit 후 다음 Key로 이동
          options={PROPERTY_VALUES[toCamelCase(key)] || []}
          placeholder=""
          className="w-full text-gray-800 font-mono"
        />
      </div>

      {/* Delete Button (Hover) */}
      {!isNew && (
        <button
          onClick={() => onDelete(propKey)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 absolute right-0 top-0.5 bg-white/80 px-1"
          title="Remove property"
          tabIndex={-1}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ==================================================================================
// [5] STYLESECTION COMPONENT (StyleRow의 nextKeyInputRef 전달을 위해 수정)
// ==================================================================================

interface StyleSectionProps {
  title: React.ReactNode;
  initialLabel?: string;
  styles: Record<string, any>;
  path: string[];
  onUpdate: (newStyles: Record<string, any>, path: string[]) => void;
  onDeleteSection?: () => void;
  onRename?: (newName: string) => void;
}

function StyleSection({
  title,
  initialLabel,
  styles,
  path,
  onUpdate,
  onDeleteSection,
  onRename,
}: StyleSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialLabel || "");

  // [추가] 다음 새 행의 Key Input에 대한 Ref
  const newKeyInputRef = useRef<HTMLDivElement>(null);
  const existingRowsRefs = useRef<
    Record<string, React.RefObject<HTMLDivElement>>
  >({});

  const handleCommitStyle = (
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    const camelNew = toCamelCase(newKey.trim());
    const camelOld = oldKey ? toCamelCase(oldKey.trim()) : "";
    const updates: any = {};
    if (camelOld && camelOld !== camelNew) updates[camelOld] = undefined;
    updates[camelNew] = newValue;
    onUpdate(updates, path);
  };

  const handleDeleteStyle = (key: string) => {
    const camelKey = toCamelCase(key);
    onUpdate({ [camelKey]: undefined }, path);
  };

  const handleSaveRename = () => {
    if (onRename && editValue.trim() && editValue.trim() !== initialLabel) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
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
  ]; // StyleHelper에서 가져왔다고 가정

  // 동적 Ref 할당 함수
  const getRowKeyRef = (key: string): React.RefObject<HTMLDivElement> => {
    if (!existingRowsRefs.current[key]) {
      existingRowsRefs.current[key] = React.createRef();
    }
    return existingRowsRefs.current[key];
  };

  return (
    <div className="mb-6 relative group/section">
      <div className="flex items-center justify-between mb-1 border-b border-gray-100 pb-1 h-7">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
              className="text-xs border rounded px-1 py-0.5 w-full focus:outline-blue-500 font-mono"
              autoFocus
            />
          </div>
        ) : (
          <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
            {title}
            {onRename && (
              <button
                onClick={() => {
                  setEditValue(initialLabel || "");
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover/section:opacity-100 text-gray-400 hover:text-blue-500 p-0.5 rounded transition-opacity"
                title="Rename selector"
              >
                <Edit2 size={10} />
              </button>
            )}
          </div>
        )}

        {!isEditing && onDeleteSection && (
          <button
            onClick={onDeleteSection}
            className="opacity-0 group-hover/section:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded transition-opacity"
            title="Delete this selector block"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="pl-2 border-l-2 border-gray-100 group-hover/section:border-blue-200 transition-colors">
        {Object.entries(styles).map(([key, value]) => {
          if (
            internalProps.includes(key) ||
            key.startsWith("@media") ||
            (typeof value === "object" && value !== null)
          )
            return null;

          const displayLabel = toKebabCase(key);

          return (
            <StyleRow
              key={`${path.join("-")}-${key}`}
              propKey={displayLabel}
              propValue={value as string}
              onCommit={handleCommitStyle}
              onDelete={handleDeleteStyle}
              // [수정] 다음 포커스는 New Property Input의 Key 필드입니다.
              nextKeyInputRef={newKeyInputRef}
            />
          );
        })}

        {/* New Property Input */}
        <div className="border-t border-gray-100 border-dashed pt-1 mt-1">
          <StyleRow
            key={`${path.join("-")}-new`}
            propKey=""
            propValue=""
            onCommit={handleCommitStyle}
            onDelete={() => {}}
            isNew={true}
            // [수정] New Property Input에 대한 Ref를 할당합니다.
            nextKeyInputRef={newKeyInputRef}
            // New Property Row는 자기 자신의 keyInputRef를 nextKeyInputRef로 받습니다.
            // 이는 다음 입력 완료 시 자기 자신을 다시 포커스하도록 합니다.
            // 하지만 현재 구조에서는 이 Row가 마지막이므로, New Row의 Key Ref를 다음 입력으로 받습니다.
            // (이 Row가 생성될 때는 keyInputRef가 newKeyInputRef가 됩니다.)
            inputRef={newKeyInputRef} // [수정] New Row의 Key Input Ref
          />
        </div>
      </div>
    </div>
  );
}

export default StyleRow;
