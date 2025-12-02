import React, { useState, useEffect, useLayoutEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

interface SelectionGroupBorderProps {
  selectedIds: string[];
  paperRef: React.RefObject<HTMLDivElement>;
  zoom: number;
}

export default function SelectionGroupBorder({
  selectedIds,
  paperRef,
  zoom,
}: SelectionGroupBorderProps) {
  const [rect, setRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // 요소 위치 변경 감지용
  const elements = useSelector((state: RootState) => state.elements.elements);

  useLayoutEffect(() => {
    if (!paperRef.current || selectedIds.length < 2) {
      setRect(null);
      return;
    }

    const paperRect = paperRef.current.getBoundingClientRect();
		
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasValid = false;

    const expandByRect = (r: DOMRect) => {
      const localX = (r.left - paperRect.left) / zoom;
      const localY = (r.top - paperRect.top) / zoom;
      const localW = r.width / zoom;
      const localH = r.height / zoom;

      minX = Math.min(minX, localX);
      minY = Math.min(minY, localY);
      maxX = Math.max(maxX, localX + localW);
      maxY = Math.max(maxY, localY + localH);
      hasValid = true;
    };

    selectedIds.forEach((id: string) => {
      const node = document.querySelector(`[data-id="${id}"]`);
      if (node) {
        expandByRect(node.getBoundingClientRect());
        // Deep Search
        const descendants = node.querySelectorAll("[data-id]");
        descendants.forEach((child: any) =>
          expandByRect(child.getBoundingClientRect())
        );
      }
    });

    if (hasValid && minX !== Infinity) {
      const P = 4;
      setRect({
        x: minX - P,
        y: minY - P,
        w: maxX - minX + P * 2,
        h: maxY - minY + P * 2,
      });
    } else {
      setRect(null);
    }
  }, [selectedIds, zoom, paperRef, elements]);

  if (!rect) return null;

  return (
    <div
      className="absolute pointer-events-none z-[999] border-2 border-blue-500 border-dashed"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        transition: "none",
      }}
    >
      <div className="absolute top-0 left-0 -translate-y-full bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm whitespace-nowrap">
        {selectedIds.length} items selected
      </div>
    </div>
  );
}
