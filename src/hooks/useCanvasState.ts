import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { updateCanvasSettings } from "../store/canvasSlice";
import { RULER_THICKNESS } from "../constants";

export default function useCanvasState() {
  const dispatch = useDispatch();

  // 1. Redux State
  const { elements } = useSelector((state: RootState) => state.elements);
  const {
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    clipboard,
  } = useSelector((state: RootState) => state.canvas);

  // 2. Refs for Event Listeners (Stale Closure 방지)
  const stateRef = useRef({
    elements,
    selectedIds,
    activeContainerId,
    canvasSettings,
    currentTool,
    clipboard,
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
    };
  }, [
    elements,
    selectedIds,
    activeContainerId,
    canvasSettings,
    currentTool,
    clipboard,
  ]);

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // 3. Context Helpers
  const rootElement = elements.find((el) => el.elementId === "root");
  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  // 4. Offset Calculation
  const activeOffset = useMemo(() => {
    let x = 0,
      y = 0;
    let currentId = activeContainerId;
    let safety = 0;
    while (currentId && currentId !== "root" && safety < 100) {
      const el = elements.find((e) => e.elementId === currentId);
      if (!el) break;
      x += parseFloat(el.props.left || 0);
      y += parseFloat(el.props.top || 0);
      currentId = el.parentId!;
      safety++;
    }
    return { x, y };
  }, [activeContainerId, elements]);

  // 5. Refs for DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // 6. Initialization
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
  };
}
