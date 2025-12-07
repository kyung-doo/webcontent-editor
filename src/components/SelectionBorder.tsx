import React from "react";

interface SelectionBorderProps {
  bounds: { x: number; y: number; w: number; h: number } | null;
  // [수정됨] Canvas에서 전달받을 선택된 요소의 개수
  selectedCount: number; 
  // [선택사항] 단일 선택 시 요소의 타입 (예: 'Text', 'Box')
  selectedType?: string; 
  elementIdToDisplay?: string;
}

export default function SelectionBorder({
  bounds,
  selectedCount,
  selectedType,
  elementIdToDisplay
}: SelectionBorderProps) {
  if (!bounds || selectedCount === 0) return null;

  const { x, y, w, h } = bounds;

  // 라벨 텍스트 결정 로직
  let labelText: string;

  if (selectedCount > 1) {
    // 1. 그룹 선택 (최우선)
    labelText = `Selected (${selectedCount} items)`;
  } else {
    // 2. 단일 선택
    if (elementIdToDisplay) {
        // [핵심 수정] elementIdToDisplay가 있으면 그것을 표시
        labelText = elementIdToDisplay;
    } else {
        // ID가 없으면 타입 표시 (기존 로직)
        labelText = selectedType && selectedType !== 'Group' ? selectedType : "Element";
    }
  }

  return (
    <div
      className="SelectionGroupBorder absolute pointer-events-none z-[999] border-2 border-blue-500 border-dashed"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
      }}
    >
      {/* 상단 라벨 (선택된 갯수와 타입에 따라 동적으로 표시) */}
      <div className="absolute top-0 left-0 -translate-y-full bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm whitespace-nowrap">
        {labelText}
      </div>
    </div>
  );
}