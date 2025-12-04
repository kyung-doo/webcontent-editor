import React from "react";

interface TransformLayerProps {
  // Canvas에서 이미 줌과 좌표 보정이 끝난 박스 정보를 받음
  selectedBox: { x: number; y: number; w: number; h: number } | null;
  anchor: { x: number; y: number };
  onResizeStart: (e: React.MouseEvent, direction: string) => void;
  onAnchorStart: (e: React.MouseEvent) => void;
}

export default function TransformLayer({
  selectedBox,
  anchor,
  onResizeStart,
  onAnchorStart,
}: TransformLayerProps) {
  if (!selectedBox) return null;

  const { x, y, w, h } = selectedBox;
  const { x: anchorX, y: anchorY } = anchor;

  // 핸들 스타일
  const handleStyle =
    "absolute w-2.5 h-2.5 bg-white border border-blue-500 z-[1001] pointer-events-auto box-border";

  return (
    <div
      className="absolute pointer-events-none z-[1000]"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {/* 파란 테두리 */}
      <div className="absolute inset-0 border border-blue-500 pointer-events-none"></div>

      {/* 8방향 리사이즈 핸들 */}
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

      {/* 앵커 포인트 (항상 표시) */}
      <div
        className="absolute w-4 h-4 cursor-crosshair pointer-events-auto flex items-center justify-center z-[1002]"
        style={{
          left: `${anchorX * 100}%`,
          top: `${anchorY * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={onAnchorStart}
      >
        <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center shadow-sm hover:scale-125 transition-transform">
          <div className="w-0.5 h-0.5 bg-blue-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
