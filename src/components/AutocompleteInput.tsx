import React, { useState, useEffect, useRef } from 'react';

export interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  onBlur?: () => void;
}

export default function AutocompleteInput({ 
  value, 
  onChange, 
  onEnter, 
  options, 
  placeholder, 
  autoFocus, 
  className, 
  inputRef, 
  onBlur 
}: AutocompleteProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  // 높이 자동 조절
  const adjustHeight = () => {
    const el = finalInputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  useEffect(() => { adjustHeight(); }, [value]);

  // 필터링 로직
  useEffect(() => {
    const filtered = options.filter(opt => 
      opt && opt.toLowerCase().startsWith(value.toLowerCase())
    );
    setFilteredOptions(filtered);
    setSelectedIndex(0); 
  }, [value, options]);

  // 포커스 해제 핸들러
  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150);
    if (onBlur) onBlur();
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          onChange(filteredOptions[selectedIndex]);
          setIsOpen(false);
          if (onEnter) setTimeout(onEnter, 0);
        } else {
          if (onEnter) onEnter();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    finalInputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full flex items-start">
      <textarea
        ref={finalInputRef}
        rows={1}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`${className} resize-none overflow-hidden block leading-tight py-0.5 bg-transparent border-none focus:ring-0 focus:outline-none`}
        autoComplete="off"
        spellCheck={false}
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
    </div>
  );
}