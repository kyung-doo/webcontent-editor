import React, { useEffect, useState, useRef, useMemo } from "react";

export interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLDivElement>;
  onBlur?: () => void;
}

// 커서 위치를 맨 끝으로 이동시키는 유틸리티 (가장 안정적인 방식)
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


const AutocompleteInput = ({ 
  value, onChange, onEnter, options, placeholder, autoFocus, className, inputRef, onBlur 
}: AutocompleteProps) => {
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLDivElement>(null);
  const finalInputRef = inputRef || internalInputRef;
  
  const initialContent = useMemo(() => ({ __html: value }), []);
  const initialValueRef = useRef(value); 
  
  const adjustHeight = () => {
    const el = finalInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.minHeight = '1.2em'; 
      el.style.height = el.scrollHeight + 'px';
    }
  };

  useEffect(() => { 
    if (finalInputRef.current && initialValueRef.current.length > 0) {
      finalInputRef.current.focus();
      setCursorToEnd(finalInputRef.current);
    }
    adjustHeight(); 
  }, []);

  useEffect(() => {
    if (finalInputRef.current && finalInputRef.current.innerText !== value) {
        finalInputRef.current.innerText = value;
        finalInputRef.current.focus();
        if (value.length > 0) {
            setCursorToEnd(finalInputRef.current);
        }
        adjustHeight();
    }
  }, [value]);

  useEffect(() => {
    const filtered = options.filter(opt => 
      opt && opt.toLowerCase().startsWith(value.toLowerCase())
    );
    setFilteredOptions(filtered);
    setSelectedIndex(0); 
    setIsOpen(value.length > 0 && filtered.length > 0);
  }, [value, options]);


  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
    }
  };

  const handleFocus = () => {
    // Autocomplete 목록 열림은 타이핑(value 변화)에 의존
  }
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerText.replace(/\n/g, ''); 
    onChange(newValue);
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = finalInputRef.current;

    // [수정] 스페이스바 입력 처리
    if (e.code === 'Space') {
      e.preventDefault(); 
      e.stopPropagation(); 
      document.execCommand("insertText", false, ' '); 
      return; 
    }
    
    // Backspace/Delete 키로 엘리먼트가 사라지는 문제 방지
    if ((e.key === 'Backspace' || e.key === 'Delete') && el) {
        const selection = window.getSelection();
        const isCollapsedAtStart = selection?.isCollapsed && selection.anchorOffset === 0 && selection.focusOffset === 0;

        if (el.innerText.length === 0 || isCollapsedAtStart) {
            e.preventDefault();
            return;
        }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') { // [수정] Enter/Tab 키 처리
      if (!e.shiftKey) { 
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          const selectedOption = filteredOptions[selectedIndex];
          handleSelect(selectedOption); 
        } else {
          if (onEnter) onEnter(); // Key/Value 커밋 로직 호출
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (opt: string) => {
    onChange(opt); 
    setIsOpen(false);
    finalInputRef.current?.focus(); 
    if (onEnter) onEnter();
  };
  
  return (
    <div ref={containerRef} className="relative w-full flex items-start">
      <div
        ref={finalInputRef as React.RefObject<HTMLDivElement>}
        role="textbox"
        contentEditable="true"
        onInput={handleInput} 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder} 
        autoFocus={autoFocus}
        dangerouslySetInnerHTML={initialContent}
        style={{ whiteSpace: 'pre-wrap' }}
        className={`${className} overflow-hidden block leading-tight py-0.5 bg-transparent border-none focus:ring-0 focus:outline-none`}
        spellCheck={false}
        suppressContentEditableWarning={true} 
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 w-full max-h-40 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50">
          {filteredOptions.map((opt, index) => (
            <li
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault(); 
                handleSelect(opt);
              }}
              className={`px-2 py-1 text-xs cursor-pointer truncate font-mono ${
                index === selectedIndex ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50 text-gray-600'
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
            color: #9ca3af; /* gray-400 */
            pointer-events: none;
            display: block;
          }
        `}</style>
      )}
    </div>
  );
};

export default AutocompleteInput;