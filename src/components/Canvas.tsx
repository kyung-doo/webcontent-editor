import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import Ruler from "@scena/react-ruler";
import { RootState } from "../store/store";
import {
  updateCanvasSettings,
  selectElement,
  enterContainer,
  setActiveContainer,
} from "../store/canvasSlice";
import { addElement } from "../store/elementSlice";
import RuntimeElement from "./RuntimeElement";
import { MIN_ZOOM, MAX_ZOOM, RULER_THICKNESS } from "../constants";

// 🍞 빵부스러기 네비게이션 (상단 경로 표시)
function Breadcrumb({ activeId, elements, onNavigate }: any) {
  const path = [];
  let currentId = activeId;
  let safety = 0;

  // 부모를 타고 올라가며 경로 생성
  while (currentId && safety < 100) {
    const el = elements.find((e: any) => e.elementId === currentId);
    if (!el) break;
    path.unshift(el);
    currentId = el.parentId;
    safety++;
  }

  if (path.length === 0) return null;

  return (
    <div className="absolute top-12 left-12 z-50 flex items-center gap-2 bg-white px-3 py-1.5 rounded shadow-sm border border-gray-300 text-xs font-medium backdrop-blur-sm">
      {path.map((el, idx) => (
        <React.Fragment key={el.elementId}>
          {idx > 0 && <span className="text-gray-400">›</span>}
          <button
            onClick={() => onNavigate(el.elementId)}
            className={`hover:text-blue-600 flex items-center gap-1 ${
              el.elementId === activeId
                ? "text-gray-900 font-bold cursor-default"
                : "text-gray-500"
            }`}
            disabled={el.elementId === activeId}
          >
            {/* 아이콘: Root는 집, 나머지는 큐브 */}
            {el.elementId === "root" ? (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            )}
            {el.id || (el.elementId === "root" ? "Scene 1" : "Symbol")}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Canvas() {
  const { elements } = useSelector((state: RootState) => state.elements);
  const { selectedElementId, canvasSettings, activeContainerId } = useSelector(
    (state: RootState) => state.canvas
  );
  const dispatch = useDispatch();

  // Root 및 현재 활성 컨테이너 찾기
  const rootElement = elements.find((el) => el.elementId === "root");
  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  // Refs
  const rulerHorz = useRef<Ruler>(null);
  const rulerVert = useRef<Ruler>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const horzContainerRef = useRef<HTMLDivElement>(null);
  const vertContainerRef = useRef<HTMLDivElement>(null);

  // 드래그 vs 클릭 구분용
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // States
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // 초기 중앙 정렬 플래그

  // ⭐ [핵심] 활성 컨테이너의 절대 좌표(Global Offset) 계산
  // (Root에서 현재 박스까지의 left, top을 모두 더함)
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

  // --- 1. 초기화 및 리사이즈 (중앙 정렬 로직) ---
  const handleResize = useCallback(() => {
    rulerHorz.current?.resize();
    rulerVert.current?.resize();
  }, []);

  const centerCanvas = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const centerX =
        (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const centerY =
        (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;

      dispatch(updateCanvasSettings({ scrollX: centerX, scrollY: centerY }));
      setIsInitialized(true);
    }
  }, [canvasSettings.width, canvasSettings.height, dispatch]);

  // ResizeObserver로 DOM 준비 감지
  useEffect(() => {
    if (!isInitialized) setTimeout(centerCanvas, 100); // 마운트 직후 시도

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
      if (!isInitialized) centerCanvas(); // 크기 잡히면 중앙 정렬
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (horzContainerRef.current)
      resizeObserver.observe(horzContainerRef.current);
    if (vertContainerRef.current)
      resizeObserver.observe(vertContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [isInitialized, handleResize, centerCanvas]);

  // --- 2. 키보드 이벤트 (스페이스바) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- 3. 줌 & 휠 핸들러 ---
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(canvasSettings.zoom + delta, MAX_ZOOM)
    );
    dispatch(updateCanvasSettings({ zoom: newZoom }));
    setTimeout(handleResize, 0);
  };

  const zoomWithPivot = useCallback(
    (delta: number, pivotX?: number, pivotY?: number) => {
      if (!containerRef.current) return;
      if (
        (delta > 0 && canvasSettings.zoom >= MAX_ZOOM) ||
        (delta < 0 && canvasSettings.zoom <= MIN_ZOOM)
      )
        return;
      const oldZoom = canvasSettings.zoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(oldZoom + delta, MAX_ZOOM));
      const scaleRatio = newZoom / oldZoom;
      const rect = containerRef.current.getBoundingClientRect();
      const pX = pivotX !== undefined ? pivotX : rect.width / 2;
      const pY = pivotY !== undefined ? pivotY : rect.height / 2;
      const newScrollX = pX - (pX - canvasSettings.scrollX) * scaleRatio;
      const newScrollY = pY - (pY - canvasSettings.scrollY) * scaleRatio;
      dispatch(
        updateCanvasSettings({
          zoom: newZoom,
          scrollX: newScrollX,
          scrollY: newScrollY,
        })
      );
    },
    [canvasSettings, dispatch]
  );

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      zoomWithPivot(
        e.deltaY > 0 ? -0.1 : 0.1,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    } else {
      dispatch(
        updateCanvasSettings({
          scrollX: canvasSettings.scrollX - e.deltaX,
          scrollY: canvasSettings.scrollY - e.deltaY,
        })
      );
    }
  };

  // --- 4. 팬(Pan) 핸들러 ---
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setStartScroll({ x: canvasSettings.scrollX, y: canvasSettings.scrollY });
    }
  };

  useEffect(() => {
    if (!isPanning) return;
    const move = (e: MouseEvent) =>
      dispatch(
        updateCanvasSettings({
          scrollX: startScroll.x + e.clientX - startPan.x,
          scrollY: startScroll.y + e.clientY - startPan.y,
        })
      );
    const up = () => setIsPanning(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [isPanning, startPan, startScroll, dispatch]);

  // --- 5. 클릭 (선택 해제) ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    const dist = Math.sqrt(
      Math.pow(e.clientX - dragStartPosRef.current.x, 2) +
        Math.pow(e.clientY - dragStartPosRef.current.y, 2)
    );
    if (dist > 5) return; // 드래그면 무시
    if (!isSpacePressed) dispatch(selectElement(null));
  };

  // --- 6. 드롭 (좌표 보정) ---
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData("imageSrc");

    if (imageSrc && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      // 1. 전체 캔버스 기준 마우스 좌표
      const globalX =
        (e.clientX - rect.left - RULER_THICKNESS - canvasSettings.scrollX) /
        canvasSettings.zoom;
      const globalY =
        (e.clientY - rect.top - RULER_THICKNESS - canvasSettings.scrollY) /
        canvasSettings.zoom;

      // 2. 활성 컨테이너 오프셋을 빼서 로컬 좌표로 변환
      const localX = globalX - activeOffset.x;
      const localY = globalY - activeOffset.y;

      const newElement = {
        elementId: Date.now().toString(),
        id: "",
        type: "Image" as const,
        props: {
          src: imageSrc,
          width: "200px",
          height: "auto",
          backgroundColor: "transparent",
          left: `${localX}px`,
          top: `${localY}px`,
          position: "absolute",
        },
        scripts: [],
        children: [],
        parentId: activeContainerId, // 현재 활성 컨테이너에 추가
      };
      dispatch(addElement(newElement));
    }
  };

  const cursorStyle = isPanning
    ? "cursor-grabbing"
    : isSpacePressed
    ? "cursor-grab"
    : "cursor-default";

  if (!rootElement)
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center">
        Loading System...
      </div>
    );

  return (
    <main className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      <Breadcrumb
        activeId={activeContainerId}
        elements={elements}
        onNavigate={(id: string) => dispatch(setActiveContainer(id))}
      />

      {/* 줌 컨트롤 */}
      <div className="absolute bottom-5 right-5 z-50 flex gap-2 bg-white p-2 rounded shadow-md border border-gray-200">
        <button
          onClick={() => handleZoom(-0.1)}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          -
        </button>
        <span className="px-2 py-1 text-sm font-mono w-12 text-center">
          {Math.round(canvasSettings.zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(0.1)}
          className="px-2 py-1 hover:bg-gray-100 rounded"
        >
          +
        </button>
        <button
          onClick={centerCanvas}
          className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded ml-2"
        >
          Reset
        </button>
      </div>

      {/* 상단 룰러 */}
      <div
        className="flex w-full z-40 bg-white border-b border-gray-300 flex-none"
        style={{ height: RULER_THICKNESS }}
      >
        <div
          className="bg-gray-50 border-r border-gray-300 flex-none z-50 flex items-center justify-center text-[10px] text-gray-500 font-bold"
          style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }}
        >
          px
        </div>
        <div
          className="flex-1 relative overflow-hidden"
          ref={horzContainerRef}
          style={{ height: RULER_THICKNESS }}
        >
          <Ruler
            ref={rulerHorz}
            type="horizontal"
            unit={50}
            zoom={canvasSettings.zoom}
            // ⭐ 룰러 0점을 활성 컨테이너 시작점으로 이동
            scrollPos={
              -(canvasSettings.scrollX + activeOffset.x) / canvasSettings.zoom
            }
            backgroundColor="#ffffff"
            lineColor="#cbd5e1"
            textColor="#64748b"
            textOffset={[0, 8]}
            style={{
              fontFamily: "sans-serif",
              fontSize: "10px",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        {/* 좌측 룰러 */}
        <div
          className="bg-white border-r border-gray-300 z-40 relative flex-none overflow-hidden"
          style={{ width: RULER_THICKNESS, height: "100%" }}
          ref={vertContainerRef}
        >
          <Ruler
            ref={rulerVert}
            type="vertical"
            unit={50}
            zoom={canvasSettings.zoom}
            scrollPos={
              -(canvasSettings.scrollY + activeOffset.y) / canvasSettings.zoom
            }
            backgroundColor="#ffffff"
            lineColor="#cbd5e1"
            textColor="#64748b"
            textOffset={[8, 0]}
            style={{
              fontFamily: "sans-serif",
              fontSize: "10px",
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        {/* 뷰포트 */}
        <div
          ref={containerRef}
          className={`flex-1 relative bg-gray-200 overflow-hidden ${cursorStyle}`}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleCanvasClick}
        >
          {/* 캔버스 종이 */}
          <div
            className="absolute origin-top-left bg-white shadow-2xl transition-colors duration-300"
            style={{
              width: `${canvasSettings.width}px`,
              height: `${canvasSettings.height}px`,
              backgroundColor: canvasSettings.backgroundColor,
              // ⭐ 캔버스는 이동하지 않음 (제자리 편집)
              transform: `translate(${canvasSettings.scrollX}px, ${canvasSettings.scrollY}px) scale(${canvasSettings.zoom})`,
            }}
            onClick={(e) => {
              const dist = Math.sqrt(
                Math.pow(e.clientX - dragStartPosRef.current.x, 2) +
                  Math.pow(e.clientY - dragStartPosRef.current.y, 2)
              );
              if (dist > 5) return;
              if (!isSpacePressed) {
                dispatch(selectElement(null));
                e.stopPropagation();
              }
            }}
          >
            {/* ⭐ Root부터 그리기 (배경 흐림 효과를 위해) */}
            {rootElement.children.map((childId: string) => (
              <RuntimeElement
                key={childId}
                elementId={childId}
                mode="edit"
                // Root 모드면 모두 활성, 아니면 흐림 로직 적용
                isInsideActive={activeContainerId === "root"}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
