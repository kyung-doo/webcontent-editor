import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { ELEMENT_MIN_SIZE } from "../constants";
import { objectToCssString } from "../utils/styleUtils";
import { RootState } from "../store/store";

const getSelectorInfo = (element: any) => {
  const internalId = element.elementId;
  if (!internalId) return null;
  let customId = element.props?.id;

  // props.id가 없지만 root 레벨에 id가 있고, 내부 식별자와 다르면 사용자 ID로 간주
  if (!customId && element.id && element.id !== internalId) {
    customId = element.id;
  }

  const finalSelector =
    customId && String(customId).trim().length > 0
      ? `#${String(customId).trim()}`
      : `[data-id="${internalId}"]`;

  return { internalId, finalSelector };
};

export default function CanvasGlobalStyle() {
  // [수정] elements 구조 변경(객체)에 따른 Selector 수정
  // elementsMap: { "root": {...}, "box1": {...} } 형태의 객체
  const elementsMap = useSelector((state: RootState) => state.elements.elements);

  const { activeContainerId, mode } = useSelector((state: any) => state.canvas);
  const { pages, activePageId } = useSelector((state: any) => state.page);

  const activePage = pages
    ? pages.find((p: any) => p.pageId === activePageId)
    : null;
  const currentRootId = activePage?.rootElementId || "root";

  const isPreview = mode === "preview";
  const isRootMode = activeContainerId === currentRootId;

  // [수정] 객체(Map)를 순회 가능한 배열로 변환 (Memoization)
  const elementsList = useMemo(() => {
    return elementsMap ? Object.values(elementsMap) : [];
  }, [elementsMap]);

  const elementsCss = useMemo(() => {
    if (!elementsList || elementsList.length === 0) return "";

    // [수정] 부모 경로 추적
    // elementsMap이 이미 객체이므로 .get() 대신 대괄호 접근 [] 사용 (O(1))
    const getFullSelector = (
      element: any,
      depth: number = 0
    ): string | null => {
      // 무한 루프 방지
      if (depth > 20) return null;

      const info = getSelectorInfo(element);
      if (!info) return null;

      // 1. 현재 페이지 Root의 직계 자식인 경우 -> 유효함 (Base Case)
      if (element.parentId === currentRootId) {
        return `#${activePageId} > ${info.finalSelector}`;
      }

      // 2. 부모가 있는 경우 -> 재귀적으로 부모가 현재 Root에 연결되어 있는지 확인
      if (element.parentId) {
        // [수정] Map 객체 직접 접근으로 변경
        const parent = elementsMap[element.parentId];

        if (parent) {
          const parentSelector = getFullSelector(parent, depth + 1);

          // 부모가 유효한 경로를 가지고 있다면 결합
          if (parentSelector) {
            return `${parentSelector} > ${info.finalSelector}`;
          }
        }
      }

      // 3. 연결되지 않은 요소 (다른 페이지 등) -> null 반환
      return null;
    };

    return elementsList
      .filter(
        (element: any) =>
          element.elementId && element.elementId !== currentRootId
      )
      .map((element: any) => {
        const { internalId } = getSelectorInfo(element) || {};
        if (!internalId) return "";

        // 전체 계층 경로 생성
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
    elementsList,
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
