import React, { useRef, useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
import StyleRow from "./StyleRow";
import { toKebabCase, toCamelCase } from "../utils/styleUtils";
import { INTERNAL_PROPS } from "../constants";

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

  // [추가] 다음 새 행의 Key Input에 대한 Ref (포커스 이동용)
  const newKeyInputRef = useRef<HTMLDivElement>(null);

  const handleCommitStyle = (
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    // toCamelCase는 통합된 헬퍼 함수를 사용
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
  
  const internalPropsList = INTERNAL_PROPS as string[]; 

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
            internalPropsList.includes(key) ||
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
            // [수정] New Property Row는 자기 자신의 Key Ref를 nextKeyInputRef로 받습니다.
            nextKeyInputRef={newKeyInputRef} 
            inputRef={newKeyInputRef} // New Row의 Key Input Ref
          />
        </div>
      </div>
    </div>
  );
}

export default StyleSection;