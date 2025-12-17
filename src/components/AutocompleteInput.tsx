import React, { useEffect, useState, useRef, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

export interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: (val?: string) => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLDivElement>;
  onBlur?: () => void;
}

const AutocompleteInput = ({
  value = "",
  onChange,
  onEnter,
  options,
  placeholder,
  autoFocus,
  className,
  inputRef,
  onBlur,
}: AutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const filteredOptions = useMemo(() => {
    const safeValue = value || "";
    return options.filter(
      (opt: string) =>
        opt && opt.toLowerCase().startsWith(safeValue.toLowerCase())
    );
  }, [value, options]);

  const internalRef = useRef<HTMLDivElement>(null);
  const finalInputRef = inputRef || internalRef;

  const initialContent = useMemo(() => ({ __html: value }), []);

  const adjustHeight = () => {
    const el = finalInputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.minHeight = "1.2em";
      el.style.height = el.scrollHeight + "px";
    }
  };

  useEffect(() => {
    adjustHeight();
  }, []);

  useEffect(() => {
    if (finalInputRef.current && finalInputRef.current.innerText !== value) {
      finalInputRef.current.innerText = value;
      adjustHeight();
    }
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (
      !e.relatedTarget ||
      !e.currentTarget.parentElement?.contains(e.relatedTarget)
    ) {
      setIsOpen(false);
      if (onBlur) onBlur();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerText.replace(/\n/g, "");
    onChange(newValue);
    adjustHeight();

    if (newValue.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = finalInputRef.current;
    
    // [중요] 엔터키 줄바꿈 전역 방지
    // Key, Value 필드 모두에서 엔터키로 인한 줄바꿈을 막습니다.
    if (e.key === "Enter") {
        e.preventDefault();
    }

    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      document.execCommand("insertText", false, " ");
      return;
    }

    if ((e.key === "Backspace" || e.key === "Delete") && el) {
      if (el.innerText.length === 0) {
        e.preventDefault();
        return;
      }
    }

    if (!isOpen) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (value.length > 0) setIsOpen(true);
        } else if (e.key === "Enter") {
             // 닫혀있을 때 엔터: 줄바꿈은 이미 막혔고, onEnter 호출
             setIsOpen(false);
             if (onEnter) onEnter();
        }
        return;
    }

    // 드롭다운이 열려 있을 때
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length > 0)
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length > 0)
        setSelectedIndex(
          (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
        );
    } else if (e.key === "Enter") {
        // 엔터: 선택 수행
        if (filteredOptions.length > 0) {
            handleSelect(filteredOptions[selectedIndex], true);
        } else {
            setIsOpen(false);
            if (onEnter) onEnter();
        }
    } else if (e.key === "Tab") {
        if (!e.shiftKey && filteredOptions.length > 0) {
            // 탭: 선택하되 포커스는 유지하지 않음 (shouldRefocus: false) -> 다음 필드로 자연스럽게 이동
            handleSelect(filteredOptions[selectedIndex], false);
        } else {
            setIsOpen(false);
        }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (opt: string, shouldRefocus = true) => {
    if (!shouldRefocus) {
        // [Tab 키 처리]
        // Tab 키를 눌렀을 때 DOM 업데이트가 브라우저의 기본 포커스 이동보다 먼저 일어나
        // 포커스가 튀는 것을 방지하기 위해 setTimeout을 사용합니다.
        setIsOpen(false);
        setTimeout(() => {
            onChange(opt);
            
            // [수정] Tab 키로 선택 시에도 onEnter를 호출합니다.
            // Value 필드처럼 onEnter가 '새 줄 추가'로 연결된 경우, 
            // 탭을 눌렀을 때 'Add Header' 버튼에 멈추지 않고 
            // 바로 새 줄을 생성하여 그곳(New Key)으로 포커스가 이동하도록 흐름을 이어줍니다.
            if (onEnter) onEnter(opt);
        }, 0);
        return;
    }

    onChange(opt);
    setIsOpen(false); 
    
    // DOM 업데이트 (Enter/Click 시에만 즉시 수행)
    if (finalInputRef.current) {
        if (shouldRefocus) {
            finalInputRef.current.innerText = opt;
            adjustHeight();
            
            // 포커스 복구
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(finalInputRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }

    // [중요] onEnter는 모든 포커스/DOM 작업이 끝난 후 '마지막'에 호출합니다.
    if (onEnter) onEnter(opt);
  };

  return (
    <div className="relative w-full flex items-start">
      <div
        ref={finalInputRef as React.RefObject<HTMLDivElement>}
        role="textbox"
        contentEditable="true"
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        autoFocus={autoFocus}
        dangerouslySetInnerHTML={initialContent}
        style={{ whiteSpace: "pre-wrap" }}
        className={`${className} overflow-hidden block leading-tight py-0.5 bg-transparent border-none focus:ring-0 focus:outline-none`}
        spellCheck={false}
        suppressContentEditableWarning={true}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50">
          {filteredOptions.map((opt: string, index: number) => (
            <li
              key={opt}
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => handleSelect(opt, true)}
              className={`px-2 py-1 text-xs cursor-pointer truncate font-mono ${
                index === selectedIndex
                  ? "bg-blue-100 text-blue-800"
                  : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {placeholder && (
        <style>{`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af; pointer-events: none; display: block;
          }
        `}</style>
      )}
    </div>
  );
};


export default AutocompleteInput;