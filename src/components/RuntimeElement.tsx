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
import { loadScript } from "../utils/scriptManager";
import { ELEMENT_MIN_SIZE } from "../constants";

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
  const { selectedIds, selectedElementId, activeContainerId, canvasSettings } =
    useSelector((state: RootState) => state.canvas);

  const isSelected =
    selectedIds.includes(elementId) || selectedElementId === elementId;
  const isMultiSelectionActive = selectedIds.length > 1;
  const isActiveContainer = elementId === activeContainerId;
  const isPreview = mode === "preview";

  const isDirectChild = element?.parentId === activeContainerId;

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
      let maxX = parseFloat(element.props.width) || 50;
      let maxY = parseFloat(element.props.height) || 50;
      const allDescendants = domRef.current!.querySelectorAll("[data-id]");
      let hasValidChild = false;
      allDescendants.forEach((node) => {
        if (node === domRef.current) return;
        hasValidChild = true;
        const childRect = node.getBoundingClientRect();
        const relLeft = (childRect.left - parentRect.left) / zoom;
        const relTop = (childRect.top - parentRect.top) / zoom;
        const relWidth = childRect.width / zoom;
        const relHeight = childRect.height / zoom;
        const relRight = relLeft + relWidth;
        const relBottom = relTop + relHeight;
        minX = Math.min(minX, relLeft);
        minY = Math.min(minY, relTop);
        maxX = Math.max(maxX, relRight);
        maxY = Math.max(maxY, relBottom);
      });
      if (!hasValidChild) return;
      const P = 0;
      setHitAreaRect({
        left: minX - P,
        top: minY - P,
        width: maxX - minX + P * 2,
        height: maxY - minY + P * 2,
      });
    };
    measureGroup();
    const timer = setTimeout(measureGroup, 100);
    return () => clearTimeout(timer);
  }, [element, allElements, isPreview, activeContainerId, canvasSettings.zoom]);

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

  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview && canInteract) {
      e.stopPropagation();
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
    // padding: element.type === "Image" ? 0 : "20px",
    backgroundColor: element.props.backgroundColor || "",
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

  const showGroupBorder =
    !isMultiSelectionActive &&
    !isPreview &&
    isSelected &&
    !isActiveContainer &&
    element.type === "Box" &&
    element.children.length > 0;
  const showNormalBorder =
    !isMultiSelectionActive &&
    !isPreview &&
    isSelected &&
    !isActiveContainer &&
    !showGroupBorder;
  const labelText = element.id || (showGroupBorder ? "Group" : element.type);

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

          {/* ⭐ [복구됨] Hit Area: 자식들보다 위에 배치 (z-20) */}
          {!isPreview && !isActiveContainer && canInteract && hitAreaRect && (
            <div
              className="absolute z-20 pointer-events-auto group-hit-area"
              style={{
                left: hitAreaRect.left,
                top: hitAreaRect.top,
                width: hitAreaRect.width,
                height: hitAreaRect.height,
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

      {showGroupBorder && hitAreaRect && (
        <div
          className="absolute pointer-events-none z-50 border-2 border-blue-500 border-dashed bg-blue-50/5 rounded-sm"
          style={{
            left: hitAreaRect.left,
            top: hitAreaRect.top,
            width: hitAreaRect.width,
            height: hitAreaRect.height,
          }}
        >
          <div className="absolute top-0 left-0 -translate-y-full bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm">
            {labelText}
          </div>
        </div>
      )}
      {showNormalBorder && (
        <div className="absolute inset-0 pointer-events-none z-50 border-2 border-blue-600 border-dashed">
          <div className="absolute top-0 left-0 -translate-y-full bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm">
            {labelText}
          </div>
        </div>
      )}
      {!isPreview && !isSelected && canInteract && !isDimmed && (
        <div
          className="absolute border-2 border-blue-300 border-dashed opacity-0 hover:opacity-100 pointer-events-none transition-opacity rounded-sm z-40"
          style={{ inset: -2 }}
        ></div>
      )}
    </div>
  );
}
