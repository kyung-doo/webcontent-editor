import React, {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useMemo
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
  noOpacity?: boolean;
}

export default function RuntimeElement({
  elementId,
  mode,
  isInsideActive = false,
  noOpacity = false
}: RuntimeElementProps) {
  const dispatch = useDispatch();
  const domRef = useRef<HTMLDivElement>(null);

  // Redux 상태 구독
  const element = useSelector((state: RootState) =>
    state.elements.elements.find((el) => el.elementId === elementId)
  );
  const allElements = useSelector(
    (state: RootState) => state.elements.elements
  );
  const { activeContainerId, canvasSettings, selectedIds, currentTool } = useSelector(
    (state: RootState) => state.canvas
  );

  // 상태 파생 변수
  const isPreview = mode === "preview";
  const isActiveContainer = elementId === activeContainerId;
  const isDirectChild = element?.parentId === activeContainerId;

  // 조상/부모 체크 (HitArea 및 이벤트 제어용)
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
  
  // 편집 모드에서의 인터랙션 가능 여부
  const canInteract = !isPreview && isDirectChild && !isActiveContainer && !isDimmed;
  
  // 자식 컨테이너의 포인터 이벤트 제어 (스타일은 CSS로 가지만, 구조적 제어는 필요)
  const childrenPointerEvents = isPreview ? "auto" : isActiveContainer ? "auto" : "none";
  const shouldHideVisuals = !isPreview && (isActiveContainer || isAncestor);

  // --------------------------------------------------------------------------
  // 1. Hit Area 계산 (그룹 선택용)
  // --------------------------------------------------------------------------
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
      // 글로벌 스타일이 적용된 후 측정되므로 DOM Rect가 정확함
      const parentRect = domRef.current!.getBoundingClientRect();
      const zoom = canvasSettings.zoom || 1;
      let minX = 0;
      let minY = 0;
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
      
      const P = 0; // Padding
      setHitAreaRect({
        left: minX - P,
        top: minY - P,
        width: maxX - minX + P * 2,
        height: maxY - minY + P * 2,
      });
    };
    
    measureGroup();
    // 스타일 변경/리플로우 후 재계산을 위한 타이머
    const timer = setTimeout(measureGroup, 100);
    return () => clearTimeout(timer);
  }, [element, allElements, isPreview, activeContainerId, canvasSettings.zoom]);

  // --------------------------------------------------------------------------
  // 2. Script Engine (스크립트 실행기)
  // --------------------------------------------------------------------------
  const latestDataRef = useRef({
    props: element?.props,
    scriptValues: element?.scriptValues,
  });

  useEffect(() => {
    if (element) {
      latestDataRef.current = {
        props: element.props,
        scriptValues: element.scriptValues,
      };
    }
  }, [element?.props, element?.scriptValues]);

  const requestRef = useRef<number>();
  const modulesRef = useRef<any[]>([]);

  useEffect(() => {
    // 프리뷰 모드이면서 스크립트가 있을 때만 실행
    if (!element || !isPreview || !element.scripts || !domRef.current) return;
    
    let isCleanedUp = false;

    const runScripts = async () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      modulesRef.current = [];
      const loadedList: any[] = [];
      const processed = new Set<string>();

      // (A) 스크립트 로드
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
        } catch (e) {
          console.error(`Script load error for ${element.elementId}:`, e);
        }
      }

      if (isCleanedUp) return;
      modulesRef.current = loadedList;

      // (B) onStart 실행
      modulesRef.current.forEach(({ instance, defaultFields, path }) => {
        if (instance.onStart) {
          const currentVals = latestDataRef.current.scriptValues?.[path] || {};
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
          } catch (e) {
            console.error(`onStart error in ${element.elementId}:`, e);
          }
        }
      });

      // (C) onUpdate 루프 실행
      let lastTime = performance.now();
      const loop = (time: number) => {
        if (isCleanedUp) return;
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;

        modulesRef.current.forEach(({ instance, defaultFields, path }) => {
          if (instance.onUpdate && domRef.current) {
            const currentVals = latestDataRef.current.scriptValues?.[path] || {};
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
            } catch (e) {
              console.error(`onUpdate error in ${element.elementId}:`, e);
            }
          }
        });
        requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
    };

    runScripts();

    // (D) Cleanup (onDestroy)
    return () => {
      isCleanedUp = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      modulesRef.current.forEach(({ instance }) => {
        if (instance.onDestroy) {
          try {
            instance.onDestroy(domRef.current, latestDataRef.current.props, {});
          } catch (e) {
            console.error(`onDestroy error in ${element.elementId}:`, e);
          }
        }
      });
      modulesRef.current = [];
    };
  }, [JSON.stringify(element?.scripts), isPreview]);

  // --------------------------------------------------------------------------
  // 3. Event Handlers
  // --------------------------------------------------------------------------
  const handleClick = (e: React.MouseEvent) => {
    // 편집 모드일 때의 클릭 처리는 Canvas 레벨에서 중앙 관리하므로 여기선 생략
    // 필요 시 e.stopPropagation() 등을 사용
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // 박스 더블 클릭 시 컨테이너 진입
    if (!isPreview && element?.type === "Box" && canInteract) {
      e.stopPropagation();
      dispatch(enterContainer(element.elementId));
    }
  };

  if (!element) return null;

  // --------------------------------------------------------------------------
  // 4. Rendering
  // --------------------------------------------------------------------------
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
      style={{opacity: isDimmed ? noOpacity ? 1 : 0.3 : 1}}
    >
      {/* 내용물 렌더링 (Image, Text 등) */}
      {!shouldHideVisuals && (
        <>
          {element.type === "Image" && (
            <img
              src={element.props.src}
              className="w-full h-full pointer-events-none object-contain"
              alt="element"
            />
          )}
          {element.type === "Text" && (
            <span
              style={{
                fontSize: element.props.fontSize,
                color: element.props.color,
                // 필요한 경우 여기에 추가 스타일 적용 (단, 기본은 부모 상속)
              }}
            >
              {element.props.text}
            </span>
          )}
        </>
      )}

      {/* 박스(컨테이너) 자식 렌더링 */}
      {element.type === "Box" && (
        <>
          <div
            style={{
              display: "contents", // 레이아웃 흐름을 위해 유지
              pointerEvents: childrenPointerEvents as any,
            }}
          >
            {element.children?.map((childId: string) => (
              <RuntimeElement
                key={childId}
                elementId={childId}
                mode={mode}
                isInsideActive={isPreview ? true : isFocused}
                noOpacity={isDimmed}
              />
            ))}
          </div>

          {/* Hit Area (투명 클릭 영역) */}
          {!isPreview && !isActiveContainer && canInteract && hitAreaRect && (
            <div
              className="absolute group-hit-area pointer-events-auto"
              style={{
                zIndex: -1, // 자식 뒤로
                left: hitAreaRect.left,
                top: hitAreaRect.top,
                width: hitAreaRect.width,
                height: hitAreaRect.height,
              }}
            />
          )}

          {/* 컨테이너 활성화 시 가이드라인 (선택적) */}
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

      {/* 테두리(Hover Border)는 CanvasSelectionBorder에서 처리하므로 제거됨 */}
    </div>
  );
}