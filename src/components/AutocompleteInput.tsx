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


const AutocompleteInput = ({ 
  value = "", // [수정] 기본값 설정
  onChange, onEnter, options, placeholder, autoFocus, className, inputRef, onBlur 
}: AutocompleteProps) => {
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  
  const ignoreNextOpen = useRef(false);

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
    setTimeout(() => setIsOpen(false));
    adjustHeight(); 
  }, []);

  useEffect(() => {
    if (finalInputRef.current && finalInputRef.current.innerText !== value) {
        finalInputRef.current.innerText = value;
        adjustHeight();
    }
  }, [value]);

  useEffect(() => {
    // [수정] value가 undefined인 경우 방어 코드 추가
    const safeValue = value || "";
    const filtered = options.filter((opt: string) => 
      opt && opt.toLowerCase().startsWith(safeValue.toLowerCase())
    );
    setFilteredOptions(filtered);
    setSelectedIndex(0); 
    
    const shouldOpen = safeValue.length > 0 && filtered.length > 0;
    
    if (ignoreNextOpen.current) {
        ignoreNextOpen.current = false;
        setIsOpen(false);
    } else {
        setIsOpen(shouldOpen);
    }
    
  }, [value, options]);


  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
    }
  };

  const handleFocus = () => {}
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerText.replace(/\n/g, ''); 
    onChange(newValue);
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = finalInputRef.current;

    if (e.code === 'Space') {
      e.preventDefault(); 
      e.stopPropagation(); 
      document.execCommand("insertText", false, ' '); 
      return; 
    }
    
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
    } else if (e.key === 'Enter' || e.key === 'Tab') { 
      if (!e.shiftKey) { 
        e.preventDefault(); 
        
        setIsOpen(false); 
        
        if (isOpen && filteredOptions.length > 0) {
          const selectedOption = filteredOptions[selectedIndex];
          handleSelect(selectedOption); 
        } else {
          if (onEnter) onEnter();
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
    
    ignoreNextOpen.current = true;
    
    // onEnter를 즉시 호출 (포커스 이동)
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
              }}
              onClick={() => handleSelect(opt)}
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
