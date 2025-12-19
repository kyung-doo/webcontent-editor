import React, { useEffect, useState, useRef, useMemo } from "react";


export interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: (val?: string, noFocus?: boolean) => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLDivElement>;
  onBlur?: () => void;
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
  openOnEmpty = false,
}: AutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // useEffect에 의한 DOM 덮어쓰기를 방지하기 위한 플래그
  const isInternalChange = useRef(false);

  const filteredOptions = useMemo(() => {
    const safeValue = value || "";
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

  // 초기 렌더링 시에만 dangerouslySetInnerHTML 사용
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

  // 외부 value prop 변경 시 DOM 업데이트
  useEffect(() => {
    // 내부에서 변경 중이라면 DOM을 덮어쓰지 않음 (커서 튐 방지)
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (finalInputRef.current && finalInputRef.current.innerText !== value) {
      finalInputRef.current.innerText = value;
      adjustHeight();
    }
  }, [value]);

  const handleFocus = () => {
    if (openOnEmpty) {
      setIsOpen(true);
    }
  };

  const handleClick = () => {
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

    // [수정됨] 숫자 증감 로직: 선택된 텍스트가 "숫자" 또는 "숫자+단위"일 때 동작
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const selection = window.getSelection();
      
      // 1. 셀렉션이 있고, 실제로 텍스트가 선택된 상태(!isCollapsed)인지 확인
      if (selection && !selection.isCollapsed && el) {
        const selectedText = selection.toString();
        
        // 정규식: 숫자(소수점 포함) + 선택적 단위(알파벳, %)
        const numberPattern = /(-?\d+(?:\.\d+)?)([a-z%]*)/i;
        const match = selectedText.match(numberPattern);

        if (match) {
          e.preventDefault(); // 기본 커서 이동 방지

          const fullMatch = match[0]; // 매칭된 전체 문자열 (예: "10px", "0.5")
          const numStr = match[1];    // 숫자 부분 (예: "10", "0.5")
          const unit = match[2] || ""; // 단위 부분 (예: "px", "")
          
          const currentNum = parseFloat(numStr);
          const isShift = e.shiftKey;
          const step = isShift ? 10 : 1;
          const direction = e.key === "ArrowUp" ? 1 : -1;

          // 부동소수점 연산 오차 방지
          let newNum = currentNum + direction * step;
          newNum = Math.round(newNum * 1000) / 1000;
          
          const newNumStr = newNum.toString();
          const newValStr = newNumStr + unit;

          // 선택된 텍스트 내에서 매칭된 부분만 새로운 값으로 교체 (주변 문자 보존)
          const newText = selectedText.replace(fullMatch, newValStr);

          // DOM 업데이트 전 플래그 설정 (useEffect가 덮어쓰지 않도록)
          isInternalChange.current = true;

          // 3. 즉시 DOM 업데이트 (execCommand를 사용하여 Undo/Redo 스택 보존)
          // execCommand 실행 시 input 이벤트가 발생하여 handleInput -> onChange가 호출됨
          document.execCommand("insertText", false, newText);

          // 5. 셀렉션(드래그) 상태 복구
          // [중요] execCommand 이후 DOM이 변경되었으므로 selection 객체를 다시 가져와야 안전함
          const afterSelection = window.getSelection();
          if (!afterSelection) return;

          const focusNode = afterSelection.focusNode;
          const focusOffset = afterSelection.focusOffset; 

          if (focusNode) {
             const startOffset = focusOffset - newText.length;
             // startOffset이 유효한지 확인 후 선택 영역 설정
             if (startOffset >= 0) {
                 const newRange = document.createRange();
                 newRange.setStart(focusNode, startOffset);
                 newRange.setEnd(focusNode, focusOffset);
                 afterSelection.removeAllRanges();
                 afterSelection.addRange(newRange);
             }
          }
          
          if (onEnter) {
            onEnter(el.innerText.replace(/\n/g, ""), true);
          }

          return; // 숫자 처리가 되었으므로 리스트 네비게이션 로직 등은 건너뜀
        }
      }
    }

    // 아래는 기존 리스트 네비게이션 로직 유지
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (value.length > 0 || openOnEmpty) setIsOpen(true);
      } else if (e.key === "Enter") {
        setIsOpen(false);
        if (onEnter) onEnter();
      }
      return;
    }

    // 드롭다운이 열려 있을 때
    if (e.key === "ArrowDown") {
      if (filteredOptions.length > 0){
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === "ArrowUp") {
      if (filteredOptions.length > 0) {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
        );
      }
    } else if (e.key === "Enter") {
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
      setIsOpen(false);
      setTimeout(() => {
        onChange(opt);
        if (onEnter) onEnter(opt);
      }, 0);
      return;
    }

    onChange(opt);
    setIsOpen(false);

    if (finalInputRef.current) {
      if (shouldRefocus) {
        finalInputRef.current.innerText = "";
        adjustHeight();

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
        onFocus={handleFocus}
        onClick={handleClick}
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