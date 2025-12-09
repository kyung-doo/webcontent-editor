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
  const elementsMap = useSelector(
    (state: RootState) => state.elements.elements
  );
  // [수정] 캔버스 설정을 가져와서 현재 너비를 확인합니다.
  const { activeContainerId, mode, canvasSettings } = useSelector(
    (state: RootState) => state.canvas
  );
  const { pages, activePageId } = useSelector((state: any) => state.page);

  const activePage = pages
    ? pages.find((p: any) => p.pageId === activePageId)
    : null;
  const currentRootId = activePage?.rootElementId || "root";

  const isPreview = mode === "preview";
  const isRootMode = activeContainerId === currentRootId;

  // 현재 캔버스 너비 (에디터 상의 가상 뷰포트 너비)
  const currentCanvasWidth = canvasSettings?.width || 1920;

  const elementsList = useMemo(() => {
    return elementsMap ? Object.values(elementsMap) : [];
  }, [elementsMap]);

  const elementsCss = useMemo(() => {
    if (!elementsList || elementsList.length === 0) return "";

    const getFullSelector = (element: any, depth: number = 0): string | null => {
      if (depth > 20) return null;

      const info = getSelectorInfo(element);
      if (!info) return null;

      if (element.parentId === currentRootId) {
        return `#${activePageId} ${info.finalSelector}`;
      }

      if (element.parentId) {
        const parent = elementsMap[element.parentId];
        if (parent) {
          const parentSelector = getFullSelector(parent, depth + 1);
          if (parentSelector) {
            return `${parentSelector} ${info.finalSelector}`;
          }
        }
      }

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

        const finalSelector = getFullSelector(element);
        if (!finalSelector) return "";

        // --- 상호작용 로직 ---
        const isActiveContainer = internalId === activeContainerId;
        const isDirectChild = element.parentId === activeContainerId;

        let pointerEvents = "none";
        if (isPreview) {
          pointerEvents = "auto";
        } else if (isRootMode) {
          if (element.parentId === currentRootId) pointerEvents = "auto";
        } else {
          if (isDirectChild) pointerEvents = "auto";
          if (isActiveContainer) pointerEvents = "none";
        }

        // --- Props 분리 ---
        const baseProps: any = {};
        const variantStyles: { key: string; style: any }[] = [];

        if (element.props) {
          Object.entries(element.props).forEach(([key, value]) => {
            if (typeof value === "object" && value !== null) {
              variantStyles.push({ key, style: value });
            } else {
              baseProps[key] = value;
            }
          });
        }

        // 1. 기본 스타일 생성
        const baseStyle: React.CSSProperties = {
          position: "",
          left: baseProps.left ?? element.x,
          top: baseProps.top ?? element.y,
          width: baseProps.width ?? element.width ?? "",
          height: baseProps.height ?? element.height ?? "",
          backgroundColor:
            baseProps.backgroundColor ?? element.backgroundColor ?? "",

          minWidth:
            element.type === "Image" ? "" : `${ELEMENT_MIN_SIZE}px`,
          minHeight:
            element.type === "Image" ? "" : `${ELEMENT_MIN_SIZE}px`,

          ...baseProps,

          pointerEvents: pointerEvents as any,
          zIndex: isActiveContainer ? 100 : baseProps.zIndex || "",
        };

        let cssOutput = `${finalSelector} { ${objectToCssString(baseStyle)} }\n`;

        // 2. 변형 스타일 생성 (Media Query 에뮬레이션 포함)
        variantStyles.forEach(({ key, style }) => {
          const variantCssBody = objectToCssString(style);

          if (key.startsWith("@media")) {
            // [핵심 로직 수정]
            // 에디터 환경에서는 실제 브라우저 너비가 아니라 CanvasSettings의 너비를 기준으로
            // 미디어 쿼리를 '시뮬레이션' 해야 합니다.
            
            // 예: "@media (max-width: 768px)" -> 768 추출
            const match = key.match(/max-width:\s*(\d+)px/);
            if (match) {
              const maxWidth = parseInt(match[1], 10);
              
              // 현재 캔버스 너비가 미디어 쿼리 조건보다 작거나 같으면 스타일 적용
              if (currentCanvasWidth <= maxWidth) {
                 cssOutput += `${finalSelector} { ${variantCssBody} }\n`;
              }
            } else {
              // 복잡한 쿼리는 그대로 출력
              cssOutput += `${key} { ${finalSelector} { ${variantCssBody} } }\n`;
            }
          } else {
            
            let fullSelector = "";
            if (key.includes("&")) {
              fullSelector = key.replace(/&/g, finalSelector);
            } else {
              fullSelector = `${finalSelector}${key}`;
            }

            cssOutput += `${fullSelector} { ${variantCssBody} }\n`;
          }
        });

        return cssOutput;
      })
      .filter((css: string) => css !== "")
      .join("\n");
  }, [
    elementsList,
    elementsMap,
    activeContainerId,
    isPreview,
    isRootMode,
    currentRootId,
    activePageId,
    currentCanvasWidth, // [중요] 캔버스 너비가 바뀌면 스타일을 다시 계산
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