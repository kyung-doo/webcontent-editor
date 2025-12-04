import React, { useRef, useEffect } from "react";

interface TransformLayerProps {
  selectedBox: { x: number; y: number; w: number; h: number } | null;
  anchor: { x: number; y: number };
  onResizeStart: (e: React.MouseEvent, direction: string) => void;
  // ⭐ 변경: 앵커 업데이트 콜백
  onAnchorUpdate: (x: number, y: number) => void;
}

export default function TransformLayer({
  selectedBox,
  anchor,
  onResizeStart,
  onAnchorUpdate,
}: TransformLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const isDraggingAnchor = useRef(false);

  if (!selectedBox) return null;

  const { x, y, w, h } = selectedBox;
  const { x: anchorX, y: anchorY } = anchor;

  const handleStyle =
    "absolute w-2.5 h-2.5 bg-white border border-blue-500 z-[1001] pointer-events-auto box-border";

  // --- 앵커 드래그 로직 (Local) ---
  const handleAnchorMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingAnchor.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingAnchor.current || !layerRef.current) return;

      const rect = layerRef.current.getBoundingClientRect();

      // 박스 내부에서의 마우스 상대 위치
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      // 비율 변환 (0 ~ 1)
      let newX = offsetX / rect.width;
      let newY = offsetY / rect.height;

      // 범위 제한 및 스냅 (0, 0.5, 1 근처에서 자석 효과)
      newX = Math.min(1, Math.max(0, newX));
      newY = Math.min(1, Math.max(0, newY));

      const SNAP = 0.05;
      if (Math.abs(newX - 0.5) < SNAP) newX = 0.5;
      if (Math.abs(newX - 0) < SNAP) newX = 0;
      if (Math.abs(newX - 1) < SNAP) newX = 1;

      if (Math.abs(newY - 0.5) < SNAP) newY = 0.5;
      if (Math.abs(newY - 0) < SNAP) newY = 0;
      if (Math.abs(newY - 1) < SNAP) newY = 1;

      onAnchorUpdate(newX, newY);
    };

    const handleMouseUp = () => {
      isDraggingAnchor.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onAnchorUpdate]);

  return (
    <div
      ref={layerRef} // ⭐ DOM 측정을 위해 Ref 연결
      className="absolute pointer-events-none z-[1000]"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {/* 테두리 */}
      <div className="absolute inset-0 border border-blue-500 pointer-events-none"></div>

      {/* 리사이즈 핸들 */}
      <div
        className={`${handleStyle} cursor-nw-resize`}
        style={{ top: 0, left: 0, transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "nw")}
      />
      <div
        className={`${handleStyle} cursor-n-resize`}
        style={{ top: 0, left: "50%", transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "n")}
      />
      <div
        className={`${handleStyle} cursor-ne-resize`}
        style={{ top: 0, left: "100%", transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "ne")}
      />

      <div
        className={`${handleStyle} cursor-w-resize`}
        style={{ top: "50%", left: 0, transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "w")}
      />
      <div
        className={`${handleStyle} cursor-e-resize`}
        style={{ top: "50%", left: "100%", transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "e")}
      />

      <div
        className={`${handleStyle} cursor-sw-resize`}
        style={{ top: "100%", left: 0, transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "sw")}
      />
      <div
        className={`${handleStyle} cursor-s-resize`}
        style={{ top: "100%", left: "50%", transform: "translate(-50%, -50%)" }}
        onMouseDown={(e) => onResizeStart(e, "s")}
      />
      <div
        className={`${handleStyle} cursor-se-resize`}
        style={{
          top: "100%",
          left: "100%",
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={(e) => onResizeStart(e, "se")}
      />

      {/* 앵커 포인트 (항상 표시, 자체 핸들러 사용) */}
      <div
        className="absolute w-4 h-4 cursor-crosshair pointer-events-auto flex items-center justify-center z-[1002]"
        style={{
          left: `${anchorX * 100}%`,
          top: `${anchorY * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={handleAnchorMouseDown} // ⭐ 로컬 핸들러 연결
      >
        <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center shadow-sm hover:scale-125 transition-transform">
          <div className="w-0.5 h-0.5 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
