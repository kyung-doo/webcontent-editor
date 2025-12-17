import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
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
}

export default function StyleSection({
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
  const newKeyInputRef = useRef<HTMLDivElement>(null);

  // [순서 유지 상태]
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const rowKeyRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>(
    {}
  );

  // 1. 초기 로드 및 Redux 변경 시 순서 동기화 (단, _keysOrder가 있다면 우선순위)
  useEffect(() => {
    // styles 객체에 저장된 순서 메타데이터(_keysOrder)가 있다면 그것을 사용
    const savedOrder = styles._keysOrder as string[] | undefined;

    // 현재 유효한 스타일 키 목록
    const currentKeys = Object.keys(styles).filter(
      (key) =>
        !INTERNAL_PROPS.includes(key) &&
        !key.startsWith("@media") &&
        (typeof styles[key] !== "object" || styles[key] === null)
    );

    setOrderedKeys((prev) => {
      // 저장된 순서가 있다면 그것을 기반으로 정렬
      let baseOrder =
        savedOrder && Array.isArray(savedOrder) ? savedOrder : prev;

      // 1. 유효하지 않은 키 제거
      const nextOrder = baseOrder.filter((k) => currentKeys.includes(k));

      // 2. 누락된 키(새로 추가된 키 등) 추가
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
    const camelNew = toCamelCase(newKey.trim());
    const camelOld = oldKey ? toCamelCase(oldKey.trim()) : "";

    // 키 변경 시 로컬 순서 즉시 업데이트
    let newOrderedKeys = [...orderedKeys];
    if (camelOld && camelNew && camelOld !== camelNew) {
      newOrderedKeys = newOrderedKeys.map((k) =>
        k === camelOld ? camelNew : k
      );
      setOrderedKeys(newOrderedKeys);
    } else if (!camelOld && camelNew) {
      if (!newOrderedKeys.includes(camelNew)) newOrderedKeys.push(camelNew);
      setOrderedKeys(newOrderedKeys);
    }

    const updates: any = {};
    if (camelOld && camelOld !== camelNew) updates[camelOld] = undefined;
    updates[camelNew] = newValue;

    // [중요] 순서 정보를 함께 저장 (_keysOrder)
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

  const getRowKeyRef = (key: string) => {
    if (!rowKeyRefs.current[key]) {
      rowKeyRefs.current[key] = React.createRef();
    }
    return rowKeyRefs.current[key];
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
              key={`row-${key}`} // 고유 key 사용으로 컴포넌트 재생성 방지
              propKey={displayLabel}
              propValue={value as string}
              onCommit={handleCommitStyle}
              onDelete={handleDeleteStyle}
              inputRef={getRowKeyRef(key)}
              nextKeyInputRef={nextRef}
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
          />
        </div>
      </div>
    </div>
  );
}
