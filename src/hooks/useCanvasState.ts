import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { updateCanvasSettings } from "../store/canvasSlice";
import { RULER_THICKNESS } from "../constants";

export default function useCanvasState() {
  const dispatch = useDispatch();

  const elementsMap = useSelector((state: RootState) => state.elements.elements);
  const elements = useMemo(() => elementsMap ? Object.values(elementsMap) : [], [elementsMap]);

  const {
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    clipboard,
  } = useSelector((state: RootState) => state.canvas);

  // 💥 [추가] 페이지 정보 가져오기
  const { pages, activePageId } = useSelector((state: RootState) => state.page);

  // 💥 [추가] 현재 활성 페이지의 Root ID 계산
  // (만약 페이지 정보가 없으면 기본값 'root' 사용 - 하위 호환성)
  const activePage = pages.find((p) => p.pageId === activePageId);
  const currentRootId = activePage?.rootElementId || "root-1";

  // 2. Refs for Event Listeners (Stale Closure 방지)
  const stateRef = useRef({
    elements,
    selectedIds,
    activeContainerId,
    canvasSettings,
    currentTool,
    clipboard,
    currentRootId, // 💥 Ref에도 추가
  });

  // 동기화
  useEffect(() => {
    stateRef.current = {
      elements,
      selectedIds,
      activeContainerId,
      canvasSettings,
      currentTool,
      clipboard,
      currentRootId, // 💥 동기화
    };
  }, [
    elements,
    selectedIds,
    activeContainerId,
    canvasSettings,
    currentTool,
    clipboard,
    currentRootId,
  ]);

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // 3. Context Helpers
  // 💥 [수정] "root" 문자열 대신 currentRootId 사용
  const rootElement = elements.find((el) => el.elementId === currentRootId);

  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  // 4. Offset Calculation (활성 컨테이너의 절대 좌표 계산)
  const activeOffset = useMemo(() => {
    let x = 0,
      y = 0;
    let currentId = activeContainerId;
    let safety = 0;

    // 💥 [수정] 루프 종료 조건을 currentRootId로 변경
    // activeContainerId가 currentRootId가 될 때까지 부모를 타고 올라감
    while (currentId && currentId !== currentRootId && safety < 100) {
      const el = elements.find((e) => e.elementId === currentId);
      if (!el) break;
      x += parseFloat(el.props.left || 0);
      y += parseFloat(el.props.top || 0);
      currentId = el.parentId!;
      safety++;
    }
    return { x, y };
  }, [activeContainerId, elements, currentRootId]); // 디펜던시에 currentRootId 추가

  // 5. Refs for DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // 6. Initialization (화면 중앙 정렬)
  const [isInitialized, setIsInitialized] = useState(false);
  const centerCanvas = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0) return;
      const cx = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const centerY =
        (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;
      dispatch(updateCanvasSettings({ scrollX: cx, scrollY: centerY }));
      setIsInitialized(true);
    }
  }, [canvasSettings.width, canvasSettings.height, dispatch]);

  useEffect(() => {
    if (!isInitialized) setTimeout(centerCanvas, 100);
  }, [isInitialized, centerCanvas]);

  return {
    elements,
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    clipboard,
    rootElement,
    activeContainer,
    activeOffset,
    stateRef,
    elementsRef,
    containerRef,
    paperRef,
    dispatch,
    currentRootId, // 필요하다면 밖으로 노출
  };
}
