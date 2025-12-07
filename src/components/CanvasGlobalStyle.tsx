import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { ELEMENT_MIN_SIZE } from "../constants";
import { objectToCssString } from "../utils/styleUtils";


const getSelectorInfo = (element: any) => {
  const internalId = element.elementId;
  const cssId = element.id;

  if (!internalId) return null;

  const selector = cssId ? `#${cssId}` : `[data-id="${internalId}"]`;

  return { internalId, cssId, selector };
};

// ----------------------------------------------------------------------

export default function CanvasGlobalStyle() {
  const { elements } = useSelector((state: any) => state.elements);
  const { activeContainerId, selectedIds, mode } = useSelector(
    (state: any) => state.canvas
  );

  const isPreview = mode === "preview";
  const isRootMode = activeContainerId === "root";

  // 0. Map 생성
  const elementsMap = useMemo(() => {
    return new Map(elements.map((el: any) => {
      return el.elementId ? [el.elementId, el] : null;
    }).filter(Boolean) as [string, any][]);
  }, [elements]);

  // 1. 동적 요소 스타일 생성
  const elementsCss = useMemo(() => {
    return elements
      .filter((element: any) => element.elementId && element.elementId !== 'root')
      .map((element: any) => {
        const info = getSelectorInfo(element);
        if (!info) return "";

        const { internalId, selector: selfSelector } = info;

        // [최종 선택자 결정]
        let finalSelector = selfSelector;
        if (element.parentId && element.parentId !== 'root') {
          const parent = elementsMap.get(element.parentId);
          if (parent) {
            const parentInfo = getSelectorInfo(parent);
            if (parentInfo) {
              finalSelector = `${parentInfo.selector}  ${selfSelector}`;
            }
          }
        }

        // --- B. 상호작용 및 스타일 로직 ---
        const isActiveContainer = internalId === activeContainerId;
        const isDirectChild = element.parentId === activeContainerId;

        // Pointer Events (클릭 제어)
        let pointerEvents = "none"; 

        if (isPreview) {
          pointerEvents = "auto";
        } else if (isRootMode) {
           // 루트 모드: 루트의 직계 자식만 클릭 가능
           if (element.parentId === 'root') pointerEvents = "auto";
           // 그 외 자손들은 none 유지 (클릭 투과)
        } else {
           // 컨테이너 내부 모드: 활성 컨테이너의 직계 자식만 클릭 가능
           if (isDirectChild) pointerEvents = "auto";
           // 활성 컨테이너 자체는 none 유지 (투과)
           if (isActiveContainer) pointerEvents = "none";
        }


        // [수정] isActiveContainer일 때 투명하게 처리
        const shouldHideVisuals = isActiveContainer && !isPreview;         

        // --- C. CSS 객체 생성 ---
        const style: React.CSSProperties = {
          position: "absolute",
          left: element.props?.left ?? element.x,
          top: element.props?.top ?? element.y,
          width: element.props?.width ?? element.width ?? "auto",
          height: element.props?.height ?? element.height ?? "auto",
          backgroundColor: element.props?.backgroundColor ?? element.backgroundColor ?? "",
          
          minWidth: element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,
          minHeight: element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,

          ...element.props,

          filter: "none",
          pointerEvents: pointerEvents as any,
          zIndex: isActiveContainer ? 100 : element.props?.zIndex || "auto",
        };

        // [핵심 수정] 활성 컨테이너의 배경/경계 숨기기
        if (shouldHideVisuals) {
          style.backgroundColor = "transparent";
          style.border = "none";
          style.boxShadow = "none";
          style.outline = "none";
          style.backgroundImage = "none";
          style.opacity = 1; // opacity 30% 방지
        }

        const cssBody = objectToCssString(style);

        return `${finalSelector} { ${cssBody} }`;
      })
      .filter(Boolean)
      .join("\n");
  }, [
    elements,
    elementsMap,
    activeContainerId,
    selectedIds,
    isPreview,
    isRootMode,
  ]);

  // 2. 기본 리셋 스타일
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