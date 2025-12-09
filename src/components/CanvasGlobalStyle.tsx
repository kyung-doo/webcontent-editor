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

// [Helper] 스타일 객체를 단순 속성(cssProps)과 중첩 객체(nestedObj)로 분리
const splitStyleProps = (styleObj: any) => {
  const cssProps: any = {};
  const nestedObj: any = {};

  if (!styleObj || typeof styleObj !== "object") {
    return { cssProps, nestedObj };
  }

  Object.entries(styleObj).forEach(([k, v]) => {
    if (typeof v === "object" && v !== null) {
      nestedObj[k] = v;
    } else {
      cssProps[k] = v;
    }
  });

  return { cssProps, nestedObj };
};

interface CanvasGlobalStyleProps {
  mode: "edit" | "preview";
}

export default function CanvasGlobalStyle({ mode }: CanvasGlobalStyleProps) {
  const elementsMap = useSelector(
    (state: RootState) => state.elements.elements
  );
  const { activeContainerId, canvasSettings } = useSelector(
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

    const getFullSelector = (
      element: any,
      depth: number = 0
    ): string | null => {
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

          minWidth: element.type === "Image" ? "" : `${ELEMENT_MIN_SIZE}px`,
          minHeight: element.type === "Image" ? "" : `${ELEMENT_MIN_SIZE}px`,

          ...baseProps,

          pointerEvents: pointerEvents as any,
          zIndex: isActiveContainer ? 100 : baseProps.zIndex || "",
        };

        let cssOutput = `${finalSelector} { ${objectToCssString(
          baseStyle
        )} }\n`;

        // 2. 변형 스타일 생성 (Media Query 및 Selector 처리)
        variantStyles.forEach(({ key, style }) => {
          // 스타일 객체를 '단순 속성'과 '중첩 객체(:hover 등)'로 분리
          const { cssProps, nestedObj } = splitStyleProps(style);
          const cssPropsString = objectToCssString(cssProps);

          // 중첩된 Selector들에 대한 CSS 문자열 생성 함수
          const generateNestedCss = (parentSelector: string) => {
            let nestedOutput = "";
            Object.entries(nestedObj).forEach(([subKey, subValue]) => {
              // subKey: :hover, .active 등
              const subCssProps = objectToCssString(subValue as any);
              if (!subCssProps) return;

              let fullSubSelector = "";
              if (subKey.includes("&")) {
                fullSubSelector = subKey.replace(/&/g, parentSelector);
              } else {
                fullSubSelector = `${parentSelector}${subKey}`;
              }
              nestedOutput += `${fullSubSelector} { ${subCssProps} }\n`;
            });
            return nestedOutput;
          };

          if (key.startsWith("@media")) {
            // [Preview Mode] 실제 CSS Media Query 출력
            if (isPreview) {
              let innerCss = "";

              // 1) 미디어 쿼리 내의 기본 속성
              if (cssPropsString) {
                innerCss += `${finalSelector} { ${cssPropsString} }\n`;
              }
              // 2) 미디어 쿼리 내의 중첩 Selector (:hover 등)
              innerCss += generateNestedCss(finalSelector);

              if (innerCss.trim()) {
                cssOutput += `${key} { \n${innerCss} }\n`;
              }
            } else {
              // [Editor Mode] CanvasSettings 기반 시뮬레이션 (Flattening)
              const match = key.match(/max-width:\s*(\d+)px/);
              let shouldRender = true;

              if (match) {
                const maxWidth = parseInt(match[1], 10);
                if (currentCanvasWidth > maxWidth) {
                  shouldRender = false;
                }
              }

              if (shouldRender) {
                // 조건을 만족하면 미디어 쿼리 껍데기를 벗기고 내부 스타일만 바로 적용
                if (cssPropsString) {
                  cssOutput += `${finalSelector} { ${cssPropsString} }\n`;
                }
                cssOutput += generateNestedCss(finalSelector);
              }
            }
          } else {
            // 일반 Selector (예: :hover, .active) - Root Level
            let fullSelector = "";
            if (key.includes("&")) {
              fullSelector = key.replace(/&/g, finalSelector);
            } else {
              fullSelector = `${finalSelector}${key}`;
            }

            // 1) Selector 자체의 속성
            if (cssPropsString) {
              cssOutput += `${fullSelector} { ${cssPropsString} }\n`;
            }
            // 2) Selector 내부의 중첩 (잘 없지만 지원)
            cssOutput += generateNestedCss(fullSelector);
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
    currentCanvasWidth,
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
