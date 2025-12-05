import { useState, useLayoutEffect } from "react";
import { EditorElement } from "../store/elementSlice";

/**
 * 선택된 요소들의 전체 영역(Bounding Box)을 계산하는 훅
 * * @param selectedIds 선택된 요소들의 ID 배열
 * @param elements 전체 요소 리스트 (의존성 감지용 - 자식 구조 변경 시 재계산)
 * @param zoom 캔버스 줌 배율
 * @param paperRef 캔버스(Paper) DOM Ref
 * @returns {x, y, w, h} | null
 */
export default function useSelectionBounds(
  selectedIds: string[],
  elements: EditorElement[],
  zoom: number,
  paperRef: React.RefObject<HTMLDivElement>
) {
  const [selectionBounds, setSelectionBounds] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    // 1. 선택된 게 없거나 종이(Paper) DOM이 없으면 계산 불가 -> null
    if (selectedIds.length === 0 || !paperRef.current) {
      setSelectionBounds(null);
      return;
    }

    const paperRect = paperRef.current.getBoundingClientRect();

    // 초기값: 무한대 (최소/최대 비교를 위해)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let hasValid = false;

    // 영역 확장 헬퍼 함수: DOMRect를 받아서 Local 좌표로 변환 후 Bounds 갱신
    const expandByRect = (rect: DOMRect) => {
      // 크기가 없는 요소(display:none 등)는 무시
      if (rect.width === 0 && rect.height === 0) return;

      // 화면 절대 좌표(Screen) -> 캔버스 내부 좌표(Local) 변환 공식
      // (현재좌표 - 종이시작점) / 줌배율
      const lx = (rect.left - paperRect.left) / zoom;
      const ly = (rect.top - paperRect.top) / zoom;
      const lw = rect.width / zoom;
      const lh = rect.height / zoom;

      minX = Math.min(minX, lx);
      minY = Math.min(minY, ly);
      maxX = Math.max(maxX, lx + lw);
      maxY = Math.max(maxY, ly + lh);
      hasValid = true;
    };

    // 2. 선택된 ID들을 순회하며 측정
    selectedIds.forEach((id) => {
      const node = document.querySelector(`[data-id="${id}"]`);

      if (node) {
        // A. 본체 영역 포함 (필수)
        expandByRect(node.getBoundingClientRect());

        // B. 히트 영역 포함 (그룹의 빈 공간 등 논리적 크기)
        const hitArea = node.querySelector(".group-hit-area");
        if (hitArea) {
          expandByRect(hitArea.getBoundingClientRect());
        }

        // C. 자손들 모두 포함 (그룹 영역 밖으로 튀어나간 자식까지 커버)
        const descendants = node.querySelectorAll("[data-id]");
        descendants.forEach((child) =>
          expandByRect(child.getBoundingClientRect())
        );
      }
    });

    // 3. 결과 반영
    if (hasValid) {
      setSelectionBounds({
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      });
    } else {
      setSelectionBounds(null);
    }
  }, [selectedIds, elements, zoom]); // elements가 변하면(이동, 리사이즈 등) 재계산

  return selectionBounds;
}
