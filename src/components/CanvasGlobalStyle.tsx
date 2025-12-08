import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { ELEMENT_MIN_SIZE } from "../constants";
import { objectToCssString } from "../utils/styleUtils";

const getSelectorInfo = (element: any) => {
  const internalId = element.elementId;
  if (!internalId) return null;
  let customId = element.props?.id;
  
  if (!customId && element.id && element.id !== internalId) {
    customId = element.id;
  }
  
  const finalSelector = (customId && String(customId).trim().length > 0)
    ? `#${String(customId).trim()}` 
    : `[data-id="${internalId}"]`;

  return { internalId, finalSelector };
};

export default function CanvasGlobalStyle() {
  const { elements } = useSelector((state: any) => state.elements);
  const { activeContainerId, mode } = useSelector((state: any) => state.canvas);
  const { pages, activePageId } = useSelector((state: any) => state.page);

  const activePage = pages
    ? pages.find((p: any) => p.pageId === activePageId)
    : null;
  const currentRootId = activePage?.rootElementId || "root";

  const isPreview = mode === "preview";
  const isRootMode = activeContainerId === currentRootId;

  // 빠른 조회를 위해 Map 생성
  const elementsMap = useMemo(() => {
    return new Map(
      elements
        .map((el: any) => {
          return el.elementId ? [el.elementId, el] : null;
        })
        .filter(Boolean) as [string, any][]
    );
  }, [elements]);

  const elementsCss = useMemo(() => {
    if (!elements || elements.length === 0) return "";

    // [수정] 부모 경로 추적 및 현재 페이지 소속 여부 검증
    // 반환값: 유효한 선택자 문자열 또는 null (현재 페이지에 속하지 않는 경우)
    const getFullSelector = (element: any, depth: number = 0): string | null => {
      // 무한 루프 방지
      if (depth > 20) return null;

      const info = getSelectorInfo(element);
      if (!info) return null;

      // 1. 현재 페이지 Root의 직계 자식인 경우 -> 유효함 (Base Case)
      // 이 경우에만 #activePageId를 부모로 붙여줍니다.
      if (element.parentId === currentRootId) {
         return `#${activePageId} > ${info.finalSelector}`;
      }

      // 2. 부모가 있는 경우 -> 재귀적으로 부모가 현재 Root에 연결되어 있는지 확인
      if (element.parentId) {
        const parent = elementsMap.get(element.parentId);
        if (parent) {
          const parentSelector = getFullSelector(parent, depth + 1);
          
          // 부모가 유효한 경로(현재 Root에 연결됨)를 가지고 있다면 결합
          if (parentSelector) {
            return `${parentSelector} ${info.finalSelector}`;
          }
        }
      }

      // 3. 부모가 없거나, 부모가 존재하지만 현재 Root와 연결되지 않은 경우 (다른 페이지의 요소 등)
      // 스타일 생성에서 제외하기 위해 null 반환
      return null;
    };

    return elements
      .filter(
        (element: any) =>
          element.elementId && element.elementId !== currentRootId
      )
      .map((element: any) => {
        const { internalId } = getSelectorInfo(element) || {};
        if (!internalId) return "";

        // [수정] 전체 계층 경로 생성 (유효성 검증 포함)
        const finalSelector = getFullSelector(element);
        
        // 선택자가 null이면(다른 페이지 요소이면) CSS 생성 생략
        if (!finalSelector) return "";

        // --- 상호작용 및 스타일 로직 ---
        const isActiveContainer = internalId === activeContainerId;
        const isDirectChild = element.parentId === activeContainerId;

        // Pointer Events (클릭 제어)
        let pointerEvents = "none";

        if (isPreview) {
          pointerEvents = "auto";
        } else if (isRootMode) {
          if (element.parentId === currentRootId) pointerEvents = "auto";
        } else {
          if (isDirectChild) pointerEvents = "auto";
          if (isActiveContainer) pointerEvents = "none";
        }

        const style: React.CSSProperties = {
          position: "absolute",
          left: element.props?.left ?? element.x,
          top: element.props?.top ?? element.y,
          width: element.props?.width ?? element.width ?? "auto",
          height: element.props?.height ?? element.height ?? "auto",
          backgroundColor:
            element.props?.backgroundColor ?? element.backgroundColor ?? "",

          minWidth: element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,
          minHeight:
            element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,

          ...element.props,

          pointerEvents: pointerEvents as any,
          zIndex: isActiveContainer ? 100 : element.props?.zIndex || "auto",
        };

        const cssBody = objectToCssString(style);

        return `${finalSelector} { ${cssBody} }`;
      })
      .filter((css: string) => css !== "") // 빈 문자열 필터링
      .join("\n");
  }, [
    elements,
    elementsMap,
    activeContainerId,
    isPreview,
    isRootMode,
    currentRootId,
    activePageId,
  ]);

  const resetCss = `
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto !important; 
    }
  `;

  return createPortal(
    <style id="canvas-global-styles" type="text/css">
      {resetCss}
      {elementsCss}
    </style>,
    document.head
  );
}