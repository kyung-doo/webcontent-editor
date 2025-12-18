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
  /** 빈 값일 때도 포커스 시 자동으로 목록을 열지 여부 */
  openOnEmpty?: boolean;
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
  openOnEmpty = false, // 기본값 false (Key 필드 등은 입력 시에만 열리게 유지)
}: AutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredOptions = useMemo(() => {
    const safeValue = value || "";
    // openOnEmpty가 true이고 값이 비어있으면 모든 옵션 반환
    if (openOnEmpty && safeValue === "") {
      return options;
    }
    return options.filter(
      (opt: string) =>
        opt && opt.toLowerCase().startsWith(safeValue.toLowerCase())
    );
  }, [value, options, openOnEmpty]);

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

  const handleFocus = () => {
    // 포커스 시 빈 값이어도 열리도록 설정된 경우 목록 오픈
    if (openOnEmpty) {
      setIsOpen(true);
    }
  };

  const handleClick = () => {
    // 클릭 시에도 동일하게 동작 (이미 포커스된 상태에서 클릭 시 등)
    if (openOnEmpty) {
      setIsOpen(true);
    }
  };

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

    // openOnEmpty가 true면 텍스트 길이가 0이어도 오픈
    if (newValue.length > 0 || openOnEmpty) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = finalInputRef.current;

    // [중요] 엔터키 줄바꿈 전역 방지
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
        // openOnEmpty가 true면 빈 값에서도 화살표로 오픈 가능
        if (value.length > 0 || openOnEmpty) setIsOpen(true);
      } else if (e.key === "Enter") {
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
      setIsOpen(false);
      setTimeout(() => {
        onChange(opt);
        if (onEnter) onEnter(opt);
      }, 0);
      return;
    }

    onChange(opt);
    setIsOpen(false);

    // DOM 업데이트
    if (finalInputRef.current) {
      if (shouldRefocus) {
        finalInputRef.current.innerText = '';
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
        onFocus={handleFocus} // 포커스 핸들러
        onClick={handleClick} // 클릭 핸들러 추가 (포커스된 상태 클릭 대응)
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