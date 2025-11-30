import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import Ruler from "@scena/react-ruler";
import { RootState } from "../store/store";
import {
  updateCanvasSettings,
  selectElement,
  selectMultipleElements,
  enterContainer,
  setActiveContainer,
  setTool,
} from "../store/canvasSlice";
import {
  addElement,
  moveElements,
  deleteElements,
  groupElements,
} from "../store/elementSlice";
import RuntimeElement from "./RuntimeElement";
import { MIN_ZOOM, MAX_ZOOM, RULER_THICKNESS } from "../constants";
import EditorBreadcrumb from "./EditorBreadcrumb";
import SelectionGroupBorder from "./SelectionGroupBorder";




export default function Canvas() {
  const { elements } = useSelector((state: RootState) => state.elements);
  const { selectedIds, canvasSettings, activeContainerId, currentTool } =
    useSelector((state: RootState) => state.canvas);
  const dispatch = useDispatch();

  const rootElement = elements.find((el) => el.elementId === "root");
  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  const rulerHorz = useRef<Ruler>(null);
  const rulerVert = useRef<Ruler>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const horzContainerRef = useRef<HTMLDivElement>(null);
  const vertContainerRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingElement = useRef(false);
  const didMouseMoveRef = useRef(false);
  const justSelectedRef = useRef<string | null>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // --- Resize & Init ---
  const handleResize = useCallback(() => {
    rulerHorz.current?.resize();
    rulerVert.current?.resize();
  }, []);
  const centerCanvas = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0) return;
      const cx = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const cy = (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;
      dispatch(updateCanvasSettings({ scrollX: cx, scrollY: cy }));
      setIsInitialized(true);
    }
  }, [canvasSettings.width, canvasSettings.height, dispatch]);
  useEffect(() => {
    if (!isInitialized) setTimeout(centerCanvas, 100);
    const ro = new ResizeObserver(() => {
      handleResize();
      if (!isInitialized) centerCanvas();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    if (horzContainerRef.current) ro.observe(horzContainerRef.current);
    if (vertContainerRef.current) ro.observe(vertContainerRef.current);
    return () => ro.disconnect();
  }, [isInitialized, handleResize, centerCanvas]);

  // --- Key Events ---
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
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        dispatch(deleteElements(selectedIds));
        dispatch(selectElement(null));
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleGroupElements();
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
  }, [selectedIds, elements, activeContainerId, dispatch]);

  // --- Grouping Logic ---
  const handleGroupElements = () => {
    if (selectedIds.length < 1) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const targets = elements.filter((el) => selectedIds.includes(el.elementId));
    if (targets.length === 0) return;
    targets.forEach((el) => {
      const x = parseFloat(el.props.left || 0);
      const y = parseFloat(el.props.top || 0);
      let w = parseFloat(el.props.width) || 50;
      let h = parseFloat(el.props.height) || 50;
      if (el.type === "Text" && !parseFloat(el.props.width)) w = 100;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    const newGroupId = Date.now().toString();
    const newGroup = {
      elementId: newGroupId,
      id: "",
      type: "Box" as const,
      props: {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${maxX - minX}px`,
        height: `${maxY - minY}px`,
        backgroundColor: "transparent",
        position: "absolute",
      },
      scripts: [],
      children: [],
      parentId: activeContainerId,
    };
    dispatch(groupElements({ newGroup, memberIds: selectedIds }));
    dispatch(selectElement({ id: newGroupId, multiple: false }));
  };

  // --- Zoom / Wheel ---
  const handleZoom = (d: number) => {
    const nz = Math.max(MIN_ZOOM, Math.min(canvasSettings.zoom + d, MAX_ZOOM));
    dispatch(updateCanvasSettings({ zoom: nz }));
    setTimeout(handleResize, 0);
  };
  const zoomWithPivot = useCallback(
    (d: number, px?: number, py?: number) => {
      if (!containerRef.current) return;
      if (
        (d > 0 && canvasSettings.zoom >= MAX_ZOOM) ||
        (d < 0 && canvasSettings.zoom <= MIN_ZOOM)
      )
        return;
      const oz = canvasSettings.zoom;
      const nz = Math.max(MIN_ZOOM, Math.min(oz + d, MAX_ZOOM));
      const sr = nz / oz;
      const r = containerRef.current.getBoundingClientRect();
      const pX = px ?? r.width / 2;
      const pY = py ?? r.height / 2;
      const sx = pX - (pX - canvasSettings.scrollX) * sr;
      const sy = pY - (pY - canvasSettings.scrollY) * sr;
      dispatch(updateCanvasSettings({ zoom: nz, scrollX: sx, scrollY: sy }));
    },
    [canvasSettings, dispatch]
  );
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const r = containerRef.current!.getBoundingClientRect();
      zoomWithPivot(
        e.deltaY > 0 ? -0.1 : 0.1,
        e.clientX - r.left,
        e.clientY - r.top
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

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.button === 1 ||
      (isSpacePressed && e.button === 0) ||
      currentTool === "hand"
    ) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setStartScroll({ x: canvasSettings.scrollX, y: canvasSettings.scrollY });
      return;
    }
    if (e.button === 0 && !isSpacePressed) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      didMouseMoveRef.current = false;
      justSelectedRef.current = null;

      const targetEl = (e.target as HTMLElement).closest("[data-id]");
      if (targetEl) {
        const id = targetEl.getAttribute("data-id");
        if (id) {
          if (!selectedIds.includes(id)) {
            const isMulti = e.shiftKey || e.ctrlKey;
            dispatch(selectElement({ id, multiple: isMulti }));
            justSelectedRef.current = id;
            isDraggingElement.current = false;
          } else {
            isDraggingElement.current = true;
          }
        }
      } else {
        if (!e.shiftKey) dispatch(selectElement(null));
        setIsSelecting(true);
        const rect = containerRef.current!.getBoundingClientRect();
        setSelectionBox({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          w: 0,
          h: 0,
        });
      }
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        dispatch(
          updateCanvasSettings({
            scrollX: startScroll.x + dx,
            scrollY: startScroll.y + dy,
          })
        );
        return;
      }
      if (isDraggingElement.current) {
        const dist = Math.sqrt(
          Math.pow(e.clientX - dragStartRef.current.x, 2) +
            Math.pow(e.clientY - dragStartRef.current.y, 2)
        );
        if (dist > 3) didMouseMoveRef.current = true;
        const zoom = canvasSettings.zoom;
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;
        if (dx !== 0 || dy !== 0) {
          dispatch(moveElements({ ids: selectedIds, dx, dy }));
          dragStartRef.current = { x: e.clientX, y: e.clientY };
        }
        return;
      }
      if (isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const startX = dragStartRef.current.x - rect.left;
        const startY = dragStartRef.current.y - rect.top;
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        setSelectionBox({ x, y, w, h });
      }
    };

    const handleWindowMouseUp = () => {
      if (isPanning) setIsPanning(false);
      if (isDraggingElement.current) {
        isDraggingElement.current = false;
        if (!didMouseMoveRef.current) {
          const targetEl = (
            document.elementFromPoint(
              dragStartRef.current.x,
              dragStartRef.current.y
            ) as HTMLElement
          )?.closest("[data-id]");
          const id = targetEl?.getAttribute("data-id");
          if (
            id &&
            id !== justSelectedRef.current &&
            selectedIds.includes(id)
          ) {
            const isMulti = window.event
              ? (window.event as MouseEvent).shiftKey ||
                (window.event as MouseEvent).ctrlKey
              : false;
            dispatch(selectElement({ id, multiple: isMulti }));
          }
        }
      }
      if (isSelecting) {
        setIsSelecting(false);
        if (selectionBox && selectionBox.w > 5 && containerRef.current) {
          const selected: string[] = [];
          const containerRect = containerRef.current.getBoundingClientRect();
          const checkIntersection = (node: Element) => {
            const elRect = node.getBoundingClientRect();
            const elX = elRect.left - containerRect.left;
            const elY = elRect.top - containerRect.top;
            return (
              selectionBox.x < elX + elRect.width &&
              selectionBox.x + selectionBox.w > elX &&
              selectionBox.y < elY + elRect.height &&
              selectionBox.y + selectionBox.h > elY
            );
          };
          activeContainer?.children.forEach((childId) => {
            const rootNode = document.querySelector(`[data-id="${childId}"]`);
            if (rootNode) {
              let isHit = checkIntersection(rootNode);
              // Deep Selection (자식 포함)
              if (!isHit) {
                const descendants = rootNode.querySelectorAll("[data-id]");
                for (const desc of descendants) {
                  if (checkIntersection(desc)) {
                    isHit = true;
                    break;
                  }
                }
              }
              // Hit Area 포함
              if (!isHit) {
                const hitArea = rootNode.querySelector(".group-hit-area");
                if (hitArea && checkIntersection(hitArea)) isHit = true;
              }

              if (isHit) selected.push(childId);
            }
          });
          if (selected.length > 0) dispatch(selectMultipleElements(selected));
        }
        setSelectionBox(null);
      }
    };
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    isPanning,
    isSelecting,
    selectionBox,
    selectedIds,
    canvasSettings,
    activeContainer,
    dispatch,
  ]);

  // ⭐ [추가] 배경 더블 클릭 -> 상위로 이동 (나가기)
  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    // 요소 더블클릭은 RuntimeElement에서 stopPropagation 되므로 여기 도달 안 함
    if (activeContainerId !== "root" && activeContainer) {
      const parentId = activeContainer.parentId || "root";
      dispatch(setActiveContainer(parentId));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const dist = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.x, 2) +
        Math.pow(e.clientY - dragStartRef.current.y, 2)
    );
    if (dist > 5) return;
    if (e.target !== e.currentTarget) return;
    if (!isSpacePressed) dispatch(selectElement(null));
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData("imageSrc");
    if (imageSrc && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const globalX =
        (e.clientX - rect.left - RULER_THICKNESS - canvasSettings.scrollX) /
        canvasSettings.zoom;
      const globalY =
        (e.clientY - rect.top - RULER_THICKNESS - canvasSettings.scrollY) /
        canvasSettings.zoom;
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
        parentId: activeContainerId,
      };
      dispatch(addElement(newElement));
      dispatch(selectElement({ id: newElement.elementId, multiple: false }));
      dispatch(setTool("select"));
    }
  };

  const cursorStyle = isPanning
    ? "cursor-grabbing"
    : isSpacePressed
    ? "cursor-grab"
    : "cursor-default";
    
  if (!rootElement) {
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      <EditorBreadcrumb
        activeId={activeContainerId}
        elements={elements}
        onNavigate={(id: string) => dispatch(setActiveContainer(id))}
      />

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
        <div
          ref={containerRef}
          className={`flex-1 relative bg-gray-200 overflow-hidden ${cursorStyle}`}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleCanvasClick}
        >
          <div
            ref={paperRef}
            className="absolute origin-top-left bg-white shadow-2xl transition-colors duration-300"
            style={{
              width: `${canvasSettings.width}px`,
              height: `${canvasSettings.height}px`,
              backgroundColor: canvasSettings.backgroundColor,
              transform: `translate(${canvasSettings.scrollX}px, ${canvasSettings.scrollY}px) scale(${canvasSettings.zoom})`,
            }}
            onDoubleClick={handleBackgroundDoubleClick}
          >
            {rootElement.children.map((childId: string) => (
              <RuntimeElement
                key={childId}
                elementId={childId}
                mode="edit"
                isInsideActive={activeContainerId === "root"}
              />
            ))}
            {selectedIds.length > 1 && (
              <SelectionGroupBorder
                selectedIds={selectedIds}
                paperRef={paperRef}
                zoom={canvasSettings.zoom}
              />
            )}
          </div>

          {isSelecting && selectionBox && (
            <div
              className="absolute border border-blue-500 bg-blue-500/20 z-[9999] pointer-events-none"
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.w,
                height: selectionBox.h,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
