import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { selectElement } from "../store/editorSlice";

interface RuntimeElementProps {
  element: any;
  selectedId?: string | null;
  mode: "edit" | "preview";
}

export default function RuntimeElement({
  element,
  selectedId,
  mode,
}: RuntimeElementProps) {
  const dispatch = useDispatch();
  const domRef = useRef<HTMLDivElement>(null);

  // 🟢 1. 스크립트 엔진 (그대로 유지)
  useEffect(() => {
    if (mode !== "preview" || !element.scripts || !domRef.current) return;
    const loadScripts = async () => {
      for (const scriptPath of element.scripts) {
        try {
          const module = await import(
            /* @vite-ignore */ `/assets/${scriptPath}?t=${Date.now()}`
          );
          if (module.default?.onStart) {
            module.default.onStart(domRef.current, element.props);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadScripts();
  }, [element.scripts, mode]);

  // 🟢 2. 클릭 이벤트 (그대로 유지)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === "edit") {
      if (element.id) dispatch(selectElement(element.id));
      return;
    }
    if (mode === "preview" && element.scripts) {
      element.scripts.forEach(async (scriptPath: string) => {
        try {
          const module = await import(
            /* @vite-ignore */ `/assets/${scriptPath}`
          );
          if (module.default?.onClick)
            module.default.onClick(domRef.current, element.props);
        } catch (e) {}
      });
    }
  };

  // 🟢 3. 렌더링 (여기가 변경됨!)
  return (
    <div
      ref={domRef}
      id={element.id}
      onClick={handleClick}
      // 👇 [변경] absolute -> relative로 변경 (이제 요소들이 겹치지 않고 쌓입니다)
      // inline-block이나 flex 등을 쓰지 않았으므로 div는 기본적으로 블록(한 줄 차지) 요소가 됩니다.
      className={`relative transition-all 
        ${
          mode === "edit"
            ? "cursor-pointer hover:ring-1 hover:ring-blue-300"
            : ""
        } 
        ${
          mode === "edit" && selectedId === element.id
            ? "ring-2 ring-blue-500 z-10"
            : ""
        }
      `}
      style={{
        // 기본 스타일
        padding: element.type === "Image" ? 0 : "20px",
        backgroundColor: element.props.backgroundColor || "transparent",
        minWidth: element.type === "Image" ? "auto" : "50px",
        minHeight: element.type === "Image" ? "auto" : "50px",

        // 👇 [중요] left, top이 있어도 relative면 '원래 위치 기준'으로 움직이므로,
        // 아예 무시하고 싶다면 아래 줄을 지우거나, element.props가 덮어쓰게 냅두면 됩니다.
        // 여기선 ...element.props가 뒤에 오므로 props에 좌표가 있으면 '상대적으로' 이동합니다.

        ...element.props,
      }}
    >
      {/* 내용물 (그대로 유지) */}
      {element.type === "Image" ? (
        <img
          src={element.props.src}
          alt="element"
          className="max-w-full h-auto pointer-events-none" // 이미지 크기 반응형으로
          style={{ width: element.props.width, height: element.props.height }}
        />
      ) : element.type === "Text" ? (
        <span
          style={{
            fontSize: element.props.fontSize,
            color: element.props.color,
          }}
        >
          {element.props.text}
        </span>
      ) : (
        <span className="text-xs text-gray-400 select-none">Box</span>
      )}
    </div>
  );
}
