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
import { toCamelCase } from "../utils/styleUtils";

interface StyleRowProps {
  propKey: string;
  propValue: string;
  onCommit: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: (key: string) => void;
  isNew?: boolean;
  nextKeyInputRef?: React.RefObject<HTMLDivElement>;
  inputRef?: React.RefObject<HTMLDivElement>;
  fontOptions?: string[];
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

export default function StyleRow({
  propKey,
  propValue,
  onCommit,
  onDelete,
  isNew,
  nextKeyInputRef,
  inputRef,
  fontOptions = [],
}: StyleRowProps) {

  const [key, setKey] = useState(propKey);
  const [val, setVal] = useState(propValue || "");

  const keyInputRef = inputRef || useRef<HTMLDivElement>(null);
  const valueInputRef = useRef<HTMLDivElement>(null);
  const isFocusTransferring = useRef(false);

  useEffect(() => {
    setKey(propKey);
    setVal(propValue || "");
  }, [propKey, propValue]);

  // Key 필드에서 Tab/Enter 처리: Value 필드로 포커스 이동
  const handleKeyEnter = useCallback(() => {
    isFocusTransferring.current = true;

    if (valueInputRef.current) {
      valueInputRef.current.focus();
      setCursorToEnd(valueInputRef.current);
    }

    setTimeout(() => {
      isFocusTransferring.current = false;
    }, 100);
  }, [valueInputRef]);

  // Value 필드에서 Enter/Tab 처리: Commit 후 다음 Key 필드로 포커스 이동
  const handleValueEnter = useCallback((finalVal?: string) => {
    const valueToCommit = finalVal !== undefined ? finalVal : val;
    if (key && valueToCommit) {
      onCommit(propKey, key, valueToCommit);
    } else if (!key && !valueToCommit && !isNew) {
       onDelete(propKey);
    }
    
    if (isNew) {
      setKey("");
      setVal("");
    }
    
    // Slight delay to allow DOM updates
    setTimeout(() => {
        if (nextKeyInputRef?.current) {
            nextKeyInputRef.current.focus();
            setCursorToEnd(nextKeyInputRef.current);
        }
    }, 10);
    
  }, [key, val, propKey, onCommit, onDelete, isNew, nextKeyInputRef]);

  const commitChange = useCallback(() => {
    if (isFocusTransferring.current) {
      return;
    }

    if (key && val) {
      if (key !== propKey || val !== propValue) {
        onCommit(propKey, key, val);
        if (isNew) {
          setKey("");
          setVal("");
        }
      }
    } else if (!key && !val && !isNew) {
      onDelete(propKey);
    }
  }, [key, val, propKey, propValue, onCommit, isNew, onDelete]);

  const isFontFamily = 
    key.toLowerCase() === "fontfamily" || 
    key.toLowerCase() === "font-family";
    
  const valueOptions = isFontFamily 
    ? fontOptions 
    : (PROPERTY_VALUES[toCamelCase(key)] || []);

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

  const extractAllColors = (str: string) => {
    if (!isColorProp) return [];
    if (!str) return [];

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

  const handleMultiColorChange = (oldColor: string, newColor: string) => {
    // 특수문자 이스케이프 처리
    const escapedOld = oldColor.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const startBoundary = /^[a-zA-Z0-9_]/.test(oldColor) ? "\\b" : "";
    const endBoundary = /[a-zA-Z0-9_]$/.test(oldColor) ? "\\b" : "";

    const regex = new RegExp(
      `${startBoundary}${escapedOld}${endBoundary}`,
      "i"
    );

    const newVal = val.replace(regex, newColor);
    setVal(newVal);
    onCommit(propKey, key, newVal);
  };

  return (
    <div className="flex items-start group text-xs hover:bg-gray-50 -ml-2 pl-2 rounded py-0.5 relative">
      <div className="w-[110px] shrink-0 mr-1 pt-0.5">
        <AutocompleteInput
          value={key}
          onChange={setKey}
          onBlur={commitChange}
          onEnter={handleKeyEnter}
          options={CSS_PROPERTIES}
          placeholder={isNew ? "property" : ""}
          className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none font-mono ${
            isNew ? "text-gray-400 italic" : "text-blue-700"
          }`}
          inputRef={keyInputRef}
        />
      </div>

      <span className="text-gray-400 mr-1 mt-0.5 select-none">:</span>

      <div className="flex-1 min-w-0 pt-0.5 flex items-center">
        {detectedColors.length > 0 && (
          <div className="flex items-center space-x-1 pr-1 shrink-0">
            {detectedColors.map((color, index) => (
              <PickrWidget
                key={`${propKey}-${index}`}
                initialColor={color.value}
                onChange={(newColor: string) => {
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
          onEnter={handleValueEnter}
          options={valueOptions}
          placeholder=""
          className="w-full text-gray-800 font-mono"
          inputRef={valueInputRef}
          openOnEmpty={true}
        />
      </div>

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