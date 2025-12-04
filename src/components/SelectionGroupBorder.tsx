import React from "react";

interface SelectionGroupBorderProps {
  bounds: { x: number; y: number; w: number; h: number } | null;
}

export default function SelectionGroupBorder({
  bounds,
}: SelectionGroupBorderProps) {
  if (!bounds) return null;

  const { x, y, w, h } = bounds;

  return (
    <div
      className="SelectionGroupBorder absolute pointer-events-none z-[999] border-2 border-blue-500 border-dashed"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transition: "none",
      }}
    >
      {/* 상단 라벨 (선택된 갯수 표시는 Canvas에서 하거나 여기서 조건부 렌더링) */}
      <div className="absolute top-0 left-0 -translate-y-full bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm whitespace-nowrap">
        Group
      </div>
    </div>
  );
}
