import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Edit2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import StyleRow from "./StyleRow";
import { toKebabCase, toCamelCase } from "../utils/styleUtils";
import { INTERNAL_PROPS } from "../constants";

interface StyleSectionProps {
  title: React.ReactNode;
  initialLabel?: string;
  styles: Record<string, any>;
  path: string[];
  onUpdate: (
    newStyles: Record<string, any>,
    path: string[],
    isReplace?: boolean
  ) => void;
  onDeleteSection?: () => void;
  onRename?: (newName: string) => void;
  fontOptions?: string[];
}

export default function StyleSection({
  title,
  initialLabel,
  styles,
  path,
  onUpdate,
  onDeleteSection,
  onRename,
  fontOptions = [],
}: StyleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialLabel || "");
  const newKeyInputRef = useRef<HTMLDivElement>(null);

  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const rowKeyRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>(
    {}
  );

  useEffect(() => {
    const savedOrder = styles._keysOrder as string[] | undefined;

    const currentKeys = Object.keys(styles).filter(
      (key) =>
        !INTERNAL_PROPS.includes(key) &&
        !key.startsWith("@media") &&
        (typeof styles[key] !== "object" || styles[key] === null)
    );

    setOrderedKeys((prev) => {
      let baseOrder =
        savedOrder && Array.isArray(savedOrder) ? savedOrder : prev;

      const nextOrder = baseOrder.filter((k) => currentKeys.includes(k));

      currentKeys.forEach((k) => {
        if (!nextOrder.includes(k)) {
          nextOrder.push(k);
        }
      });

      return nextOrder;
    });
  }, [styles]);

  const handleCommitStyle = (
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    const rawOld = oldKey ? oldKey.trim() : "";
    const camelNew = toCamelCase(newKey.trim());

    // [수정] oldKey(케밥케이스, 예: background-color)를 카멜케이스(예: backgroundColor)로 변환
    const camelOld = toCamelCase(rawOld);

    let newOrderedKeys = [...orderedKeys];

    // [수정] 비교 로직 개선: rawOld !== camelNew 대신 camelOld !== camelNew 사용
    if (rawOld && camelNew && camelOld !== camelNew) {
      // [수정] 배열 내 키가 rawOld(케밥) 또는 camelOld(카멜)과 일치하면 교체
      newOrderedKeys = newOrderedKeys.map((k) =>
        k === rawOld || k === camelOld ? camelNew : k
      );
      setOrderedKeys(newOrderedKeys);
    } else if (!rawOld && camelNew) {
      if (!newOrderedKeys.includes(camelNew)) newOrderedKeys.push(camelNew);
      setOrderedKeys(newOrderedKeys);
    }

    const updates: any = {};

    // [수정] 실제 속성 제거 시에도 카멜케이스 비교가 더 안전할 수 있으나,
    // 보통 삭제는 rawOld(기존 키) 기준으로 진행합니다.
    // 단, rawOld가 camelNew와 같다면(단순 값 변경 등) 삭제하지 않습니다.
    if (rawOld && camelOld !== camelNew) {
      // rawOld가 kebab-case여도 스타일 객체가 camelCase라면 camelOld를 지워야 할 수 있습니다.
      // 여기서는 확실하게 지우기 위해 둘 다 undefined 처리하거나, toCamelCase(rawOld)를 사용합니다.
      updates[toCamelCase(rawOld)] = undefined;
      // 만약 styles 객체가 kebab-case 키도 가지고 있다면 updates[rawOld] = undefined; 도 필요할 수 있습니다.
    }

    updates[camelNew] = newValue;
    updates["_keysOrder"] = newOrderedKeys;

    onUpdate(updates, path, false);
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

  const handleAddProperty = () => {
    setIsOpen(true);
    if (newKeyInputRef.current) {
      const input = newKeyInputRef.current.querySelector("input");
      if (input) input.focus();
    }
  };

  const getRowKeyRef = (key: string) => {
    if (!rowKeyRefs.current[key]) {
      rowKeyRefs.current[key] = React.createRef();
    }
    return rowKeyRefs.current[key];
  };

  return (
    <div className="mb-6 relative group/section">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 border-b border-gray-100 pb-1 h-7">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
              className="text-xs border rounded px-1 py-0.5 w-full focus:outline-blue-500 font-mono"
              autoFocus
            />
          ) : (
            <div
              className="text-xs font-bold text-gray-600 flex items-center gap-2 cursor-pointer"
              onDoubleClick={() => {
                if (onRename) {
                  setEditValue(initialLabel || "");
                  setIsEditing(true);
                }
              }}
            >
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
        </div>

        {!isEditing && (
          <div className="flex items-center opacity-0 group-hover/section:opacity-100 transition-opacity">
            <button
              onClick={handleAddProperty}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Add Property"
            >
              <Plus size={12} />
            </button>
            {onDeleteSection && (
              <button
                onClick={onDeleteSection}
                className="p-1 text-gray-400 hover:text-red-500 rounded ml-1"
                title="Delete this selector block"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rows */}
      {isOpen && (
        <div className="pl-2 border-l-2 border-gray-100 group-hover/section:border-blue-200 transition-colors">
          {orderedKeys.length === 0 && (
            <div className="text-[10px] text-gray-300 italic pl-1 mb-1">
              No styles
            </div>
          )}
          {orderedKeys.map((key, index) => {
            const value = styles[key];
            if (value === undefined) return null;
            const displayLabel = toKebabCase(key);

            const nextRef =
              index < orderedKeys.length - 1
                ? getRowKeyRef(orderedKeys[index + 1])
                : newKeyInputRef;

            return (
              <StyleRow
                key={`row-${key}`}
                propKey={displayLabel}
                propValue={value as string}
                onCommit={handleCommitStyle}
                onDelete={handleDeleteStyle}
                inputRef={getRowKeyRef(key)}
                nextKeyInputRef={nextRef}
                fontOptions={fontOptions}
              />
            );
          })}

          <div className="border-t border-gray-100 border-dashed pt-1 mt-1">
            <StyleRow
              key="new-row"
              propKey=""
              propValue=""
              onCommit={handleCommitStyle}
              onDelete={() => {}}
              isNew={true}
              nextKeyInputRef={newKeyInputRef}
              inputRef={newKeyInputRef}
              fontOptions={fontOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
}
