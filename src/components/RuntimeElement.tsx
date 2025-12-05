import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useLayoutEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { enterContainer } from "../store/canvasSlice";
import { ELEMENT_MIN_SIZE } from "../constants";
import { loadScript } from "../utils/scriptManager";

interface RuntimeElementProps {
  elementId: string;
  mode: "edit" | "preview";
  isInsideActive?: boolean;
}

export default function RuntimeElement({
  elementId,
  mode,
  isInsideActive = false,
}: RuntimeElementProps) {
  const dispatch = useDispatch();
  const domRef = useRef<HTMLDivElement>(null);

  const element = useSelector((state: RootState) =>
    state.elements.elements.find((el) => el.elementId === elementId)
  );
  const allElements = useSelector(
    (state: RootState) => state.elements.elements
  );
  const { selectedIds, activeContainerId, canvasSettings } = useSelector(
    (state: RootState) => state.canvas
  );

  const isActiveContainer = elementId === activeContainerId;
  const isPreview = mode === "preview";
  const isDirectChild = element?.parentId === activeContainerId;

  // Ancestor Check
  const isAncestor = useMemo(() => {
    if (activeContainerId === "root") return false;
    let current = allElements.find((el) => el.elementId === activeContainerId);
    while (current && current.parentId) {
      if (current.parentId === elementId) return true;
      current = allElements.find((el) => el.elementId === current?.parentId);
    }
    return false;
  }, [elementId, activeContainerId, allElements]);

  const isFocused = isActiveContainer || isInsideActive;
  const isRootMode = activeContainerId === "root";
  const isDimmed = !isPreview && !isRootMode && !isFocused && !isAncestor;
  const canInteract =
    mode === "edit" && isDirectChild && !isActiveContainer && !isDimmed;
  const pointerEvents = isPreview ? "auto" : canInteract ? "auto" : "none";
  const childrenPointerEvents = isPreview
    ? "auto"
    : isActiveContainer
    ? "auto"
    : "none";
  const shouldHideVisuals = !isPreview && (isActiveContainer || isAncestor);

  // Hit Area
  const [hitAreaRect, setHitAreaRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (
      isPreview ||
      !element ||
      element.type !== "Box" ||
      element.children.length === 0 ||
      !domRef.current
    ) {
      setHitAreaRect(null);
      return;
    }
    const measureGroup = () => {
      const parentRect = domRef.current!.getBoundingClientRect();
      const zoom = canvasSettings.zoom || 1;
      let minX = 0;
      let minY = 0;
      // 기본 크기 보장 (상수 사용)
      let maxX = parseFloat(element.props.width) || ELEMENT_MIN_SIZE;
      let maxY = parseFloat(element.props.height) || ELEMENT_MIN_SIZE;

      const allDescendants = domRef.current!.querySelectorAll("[data-id]");
      allDescendants.forEach((node) => {
        if (node === domRef.current) return;
        const childRect = node.getBoundingClientRect();
        const relLeft = (childRect.left - parentRect.left) / zoom;
        const relTop = (childRect.top - parentRect.top) / zoom;
        const relRight = relLeft + childRect.width / zoom;
        const relBottom = relTop + childRect.height / zoom;
        minX = Math.min(minX, relLeft);
        minY = Math.min(minY, relTop);
        maxX = Math.max(maxX, relRight);
        maxY = Math.max(maxY, relBottom);
      });
      const P = 0;
      setHitAreaRect({
        left: minX - P,
        top: minY - P,
        width: maxX - minX + P * 2,
        height: maxY - minY + P * 2,
      });
    };
    measureGroup();
    const timer = setTimeout(measureGroup, 100); // 레이아웃 안정화 대기
    return () => clearTimeout(timer);
  }, [element, allElements, isPreview, activeContainerId, canvasSettings.zoom]);

  // --------------------------------------------------------------------------
  // 🟢 스크립트 엔진
  // --------------------------------------------------------------------------
  const latestDataRef = useRef({
    props: element?.props,
    scriptValues: element?.scriptValues,
  });

  useEffect(() => {
    if (element)
      latestDataRef.current = {
        props: element.props,
        scriptValues: element.scriptValues,
      };
  }, [element?.props, element?.scriptValues]);
  
  const requestRef = useRef<number>();
  const modulesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!element || !isPreview || !element.scripts || !domRef.current) return;
    let isCleanedUp = false;
    const runScripts = async () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      modulesRef.current = [];
      const loadedList: any[] = [];
      const processed = new Set<string>();
      for (const scriptPath of element.scripts!) {
        if (isCleanedUp) return;
        if (processed.has(scriptPath)) continue;
        processed.add(scriptPath);
        try {
          const module = await loadScript(scriptPath, true);
          if (module) {
            const ScriptClass = module.default;
            const instance =
              typeof ScriptClass === "function"
                ? new ScriptClass()
                : ScriptClass;
            const defaultFields =
              ScriptClass.fields || ScriptClass.default?.fields || {};
            loadedList.push({ path: scriptPath, instance, defaultFields });
          }
        } catch (e) {}
      }
      if (isCleanedUp) return;
      modulesRef.current = loadedList;
      modulesRef.current.forEach(({ instance, defaultFields, path }) => {
        if (instance.onStart) {
          const currentVals = latestDataRef.current.scriptValues?.[path] || {};
          const finalFields = { ...{}, ...defaultFields };
          const simplifiedDefaults: any = {};
          Object.keys(defaultFields).forEach(
            (k) => (simplifiedDefaults[k] = defaultFields[k].default)
          );
          Object.assign(simplifiedDefaults, currentVals);
          try {
            instance.onStart(
              domRef.current,
              latestDataRef.current.props,
              simplifiedDefaults
            );
          } catch (e) {}
        }
      });
      let lastTime = performance.now();
      const loop = (time: number) => {
        if (isCleanedUp) return;
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;
        modulesRef.current.forEach(({ instance, defaultFields, path }) => {
          if (instance.onUpdate && domRef.current) {
            const currentVals =
              latestDataRef.current.scriptValues?.[path] || {};
            const simplifiedDefaults: any = {};
            Object.keys(defaultFields).forEach(
              (k) => (simplifiedDefaults[k] = defaultFields[k].default)
            );
            Object.assign(simplifiedDefaults, currentVals);
            try {
              instance.onUpdate(
                domRef.current,
                latestDataRef.current.props,
                simplifiedDefaults,
                deltaTime
              );
            } catch (e) {}
          }
        });
        requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
    };
    runScripts();
    return () => {
      isCleanedUp = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      modulesRef.current.forEach(({ instance }) => {
        if (instance.onDestroy)
          try {
            instance.onDestroy(domRef.current, latestDataRef.current.props, {});
          } catch (e) {}
      });
      modulesRef.current = [];
    };
  }, [JSON.stringify(element?.scripts), isPreview]);

  // Event Handlers
  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview && canInteract) {
      // e.stopPropagation(); // 👈 Canvas에서 처리하므로 삭제 권장 (선택 로직 중앙화)
    }
  };
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isPreview && element?.type === "Box" && canInteract) {
      e.stopPropagation();
      dispatch(enterContainer(element.elementId));
    }
  };

  if (!element) return null;

  const finalStyle: React.CSSProperties = {
    left: element.props.left,
    top: element.props.top,
    width: element.props.width || "auto",
    height: element.props.height || "auto",
    backgroundColor: element.props.backgroundColor || "", // 투명도 허용
    minWidth: element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,
    minHeight: element.type === "Image" ? "auto" : `${ELEMENT_MIN_SIZE}px`,
    ...element.props,
    opacity: isDimmed ? 0.3 : 1,
    filter: "none",
    pointerEvents: pointerEvents as any,
    zIndex: isActiveContainer ? 100 : element.props.zIndex || "auto",
  };

  if (shouldHideVisuals) {
    finalStyle.backgroundColor = "transparent";
    finalStyle.border = "none";
    finalStyle.boxShadow = "none";
    finalStyle.outline = "none";
    finalStyle.backgroundImage = "none";
  }

  return (
    <div
      ref={domRef}
      id={element.id}
      data-id={element.elementId}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`absolute ${
        !isPreview && canInteract && !isDimmed ? "cursor-pointer" : ""
      } ${element.className || ""}`}
      style={finalStyle}
    >
      {!shouldHideVisuals && (
        <>
          {element.type === "Image" && (
            <img
              src={element.props.src}
              className="w-full h-full pointer-events-none object-contain"
            />
          )}
          {element.type === "Text" && (
            <span
              style={{
                fontSize: element.props.fontSize,
                color: element.props.color,
              }}
            >
              {element.props.text}
            </span>
          )}
        </>
      )}

      {element.type === "Box" && (
        <>
          <div
            style={{
              display: "contents",
              pointerEvents: childrenPointerEvents as any,
            }}
          >
            {element.children?.map((childId: string) => (
              <RuntimeElement
                key={childId}
                elementId={childId}
                mode={mode}
                isInsideActive={isPreview ? true : isFocused}
              />
            ))}
          </div>

          {/* ⭐ Hit Area: 투명하지만 클릭 가능해야 함 */}
          {/* z-index를 너무 높이지 않아서 자식 클릭을 방해하지 않도록 주의 (필요시 -1 등) */}
          {/* 하지만 그룹 선택이 우선이려면 z-index가 높아야 함. */}
          {/* 여기서는 일단 0으로 두고, 부모가 자식을 감싸는 형태이므로 이벤트 버블링 활용 */}
          {!isPreview && !isActiveContainer && canInteract && hitAreaRect && (
            <div
              className="absolute group-hit-area pointer-events-auto"
              style={{
                zIndex: -1, // ⭐ 자식 뒤로 보냄 (자식 클릭 우선)
                left: hitAreaRect.left,
                top: hitAreaRect.top,
                width: hitAreaRect.width,
                height: hitAreaRect.height,
                // backgroundColor: 'rgba(255, 0, 0, 0.1)' // 디버깅용 (빨간 박스)
              }}
            />
          )}

          {!isPreview &&
            (!element.children || element.children.length === 0) &&
            !isActiveContainer &&
            !isDimmed && (
              <span className="text-[10px] text-gray-300 pointer-events-none select-none flex items-center justify-center h-full">
                Box
              </span>
            )}

          {!isPreview && isActiveContainer && (
            <div className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-visible z-50">
              <div
                className="absolute top-0 left-[-2000px] right-[-2000px] h-[1px] bg-cyan-500/40"
                style={{ top: 0 }}
              ></div>
              <div
                className="absolute left-0 top-[-2000px] bottom-[-2000px] w-[1px] bg-cyan-500/40"
                style={{ left: 0 }}
              ></div>
              <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm"></div>
            </div>
          )}
        </>
      )}

      {/* ⭐ 테두리 렌더링 코드 삭제됨 (Canvas에서 처리) */}
      {!isPreview &&
        !selectedIds.includes(elementId) &&
        canInteract &&
        !isDimmed && (
          <div
            className="absolute border-2 border-blue-300 border-dashed opacity-0 hover:opacity-100 pointer-events-none transition-opacity rounded-sm z-40"
            style={{ inset: -2 }}
          ></div>
        )}
    </div>
  );
}
