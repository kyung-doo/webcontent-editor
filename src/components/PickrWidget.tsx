import React, { useEffect, useRef } from "react";
import Pickr from "@simonwep/pickr";
import "@simonwep/pickr/dist/themes/monolith.min.css";

interface PickrWidgetProps {
  initialColor: string | null;
  onChange: (color: string) => void;
}

const PickrWidget = ({ initialColor, onChange }: PickrWidgetProps) => {
  const swatchRef = useRef<HTMLDivElement>(null);
  const pickrInstance = useRef<Pickr | null>(null);
  const isInternalChange = useRef(false);

  // Initialize Pickr
  useEffect(() => {
    if (!swatchRef.current || pickrInstance.current) return;

    // Production: Directly use the imported Pickr class
    const PickrClass = Pickr;

    const newPickr = PickrClass.create({
      el: swatchRef.current,
      theme: "monolith",
      default: initialColor || "#000000",
      useAsButton: false, // 커스텀 Swatch 사용
      padding: 8,
      position: "left-middle",
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          hex: true,
          rgba: true,
          hsla: true,
          input: true,
          save: true,
          clear: false,
        },
      },
      i18n: {
        "btn:save": "Apply",
      },
    });

    pickrInstance.current = newPickr;

    // Color Format Helper: 현재 선택된 포맷(HEX, RGBA, HSLA)으로 문자열 반환
    const getColorString = (color: any, instance: any) => {
      const representation = instance.getColorRepresentation();

      if (representation === "HEX" || representation === "HEXA") {
        return color.toHEXA().toString();
      } else if (representation === "HSLA") {
        return color.toHSLA().toString(0);
      } else {
        return color.toRGBA().toString(0);
      }
    };

    // Event Listeners
    newPickr.on("change", (color: any, source: string, instance: any) => {
      const colorStr = getColorString(color, instance);
      isInternalChange.current = true;
      onChange(colorStr);
    });

    newPickr.on("save", (color: any, instance: any) => {
      const colorStr = getColorString(color, instance);
      isInternalChange.current = true;
      onChange(colorStr);
      newPickr.hide();
    });

    // [수정 완료] Pickr가 생성한 .pcr-button 요소의 크기 강제 조정 (2em 스타일 무력화)
    const pcrButtonElement = (newPickr.getRoot() as any).button;
      
      if (pcrButtonElement instanceof HTMLElement) {
          // !important를 사용하여 라이브러리 기본 스타일(2em)을 무력화하고 6px 적용
          pcrButtonElement.style.setProperty('width', '10px', 'important');
          pcrButtonElement.style.setProperty('height', '10px', 'important');
          pcrButtonElement.style.borderRadius = '1px'; 
          pcrButtonElement.style.margin = '0'; 
          pcrButtonElement.style.padding = '0';
          pcrButtonElement.style.position = 'relative';
          pcrButtonElement.style.top = '-2px';
          pcrButtonElement.style.border = 'solid 1px #333';
      }

    return () => {
      if (pickrInstance.current) {
        pickrInstance.current.destroyAndRemove();
        pickrInstance.current = null;
      }
    };
  }, []);

  // Sync External Changes (Text Input -> Pickr)
  useEffect(() => {
    if (pickrInstance.current && initialColor) {
      if (!isInternalChange.current) {
        pickrInstance.current.setColor(initialColor);
      }
      isInternalChange.current = false;
    }
  }, [initialColor]);

  const togglePicker = () => {
    if (pickrInstance.current) {
      pickrInstance.current.show();
    }
  };

  return (
    <div className="relative mr-1.5 shrink-0 flex items-center">
      {/* Swatch Element (Pickr attaches here) */}
      <div
        ref={swatchRef}
        onClick={togglePicker}
        // 이 클래스는 Pickr가 생성한 버튼에 의해 덮어쓰여지지만, CSS 없이 크기를 빠르게 설정하는 데 사용됩니다.
        className="rounded-[1px] border border-gray-300 shadow-sm cursor-pointer relative overflow-hidden bg-white hover:border-blue-400 transition-colors"
        style={{width: '5px', height: '5px'}}
      >
        {/* 투명도 체크 패턴 배경 (Pickr preview 밑에 깔림) */}
        <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-30"></div>

        {/* 실제 색상 (Fallback용. Pickr가 로드되면 자체 Preview로 대체됨) */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: initialColor || "transparent" }}
        />
      </div>
    </div>
  );
};

export default PickrWidget;
