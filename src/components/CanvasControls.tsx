import React, { useRef, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Ruler from "@scena/react-ruler";
import { RootState } from "../store/store";
import { updateCanvasSettings } from "../store/canvasSlice";
import { MIN_ZOOM, MAX_ZOOM, RULER_THICKNESS } from "../constants";

interface CanvasControlsProps {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement>;
  paperRef: React.RefObject<HTMLDivElement>;
  onMouseDown: (e: React.MouseEvent) => void;
  onWheel?: (e: React.WheelEvent) => void; // 부모에서 추가 처리할 경우
  onDrop: (e: React.DragEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export default function CanvasControls({
  children,
  containerRef,
  paperRef,
  onMouseDown,
  onDrop,
  onClick,
  onDoubleClick,
  onDragOver,
}: CanvasControlsProps) {
  const { canvasSettings } = useSelector((state: RootState) => state.canvas);
  const dispatch = useDispatch();

  const rulerHorz = useRef<Ruler>(null);
  const rulerVert = useRef<Ruler>(null);
  const horzContainerRef = useRef<HTMLDivElement>(null);
  const vertContainerRef = useRef<HTMLDivElement>(null);

  // --- Panning State ---
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // --- Resize Observer ---
  useEffect(() => {
    const handleResize = () => {
      rulerHorz.current?.resize();
      rulerVert.current?.resize();
    };
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    if (horzContainerRef.current) ro.observe(horzContainerRef.current);
    if (vertContainerRef.current) ro.observe(vertContainerRef.current);
    return () => ro.disconnect();
  }, [containerRef]);

  // --- Zoom Handlers ---
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(canvasSettings.zoom + delta, MAX_ZOOM)
    );
    dispatch(updateCanvasSettings({ zoom: newZoom }));
    setTimeout(() => {
      rulerHorz.current?.resize();
      rulerVert.current?.resize();
    }, 0);
  };

  const zoomWithPivot = useCallback(
    (delta: number, px: number, py: number) => {
      if (!containerRef.current) return;
      const oldZoom = canvasSettings.zoom;
      const newZoom = Math.max(MIN_ZOOM, Math.min(oldZoom + delta, MAX_ZOOM));
      const scaleRatio = newZoom / oldZoom;

      const newScrollX = px - (px - canvasSettings.scrollX) * scaleRatio;
      const newScrollY = py - (py - canvasSettings.scrollY) * scaleRatio;

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

  // --- Wheel Handler (Zoom/Pan) ---
  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl + Wheel -> Zoom
    if (e.ctrlKey) {
      const rect = containerRef.current!.getBoundingClientRect();
      const pX = e.clientX - rect.left;
      const pY = e.clientY - rect.top;
      zoomWithPivot(e.deltaY > 0 ? -0.1 : 0.1, pX, pY);
    }
    // Wheel -> Scroll Pan
    else {
      dispatch(
        updateCanvasSettings({
          scrollX: canvasSettings.scrollX - e.deltaX,
          scrollY: canvasSettings.scrollY - e.deltaY,
        })
      );
    }
  };

  // --- Space Key Handlers ---
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
		centerCanvas();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Panning Handlers ---
  const handleControlMouseDown = (e: React.MouseEvent) => {
    // Spacebar or Middle Click -> Pan Start
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      e.stopPropagation(); // 부모(Canvas)의 선택 로직 실행 방지
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setStartScroll({ x: canvasSettings.scrollX, y: canvasSettings.scrollY });
    } else {
      // Pass to parent (Select/Drag)
      onMouseDown(e);
    }
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      dispatch(
        updateCanvasSettings({
          scrollX: startScroll.x + dx,
          scrollY: startScroll.y + dy,
        })
      );
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPanning, startPan, startScroll, dispatch]);

  // --- Reset Center ---
  const centerCanvas = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0) return;
      const cx = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const cy = (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;
      dispatch(updateCanvasSettings({ scrollX: cx, scrollY: cy, zoom: 1 }));
    }
  };

  // Cursor Style
  const cursorStyle = isPanning
    ? "cursor-grabbing"
    : isSpacePressed
			? "cursor-grab"
			: "default";

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      {/* Zoom Buttons */}
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

      {/* Rulers */}
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
            scrollPos={-canvasSettings.scrollX / canvasSettings.zoom}
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
            scrollPos={-canvasSettings.scrollY / canvasSettings.zoom}
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

        {/* Viewport */}
        <div
          ref={containerRef}
          className={`flex-1 relative bg-gray-200 overflow-hidden ${cursorStyle}`}
          onMouseDown={handleControlMouseDown} // ⭐ 여기서 패닝/선택 분기
          onWheel={handleWheel}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
        >
          {/* Actual Canvas Paper */}
          <div
            ref={paperRef}
            className="absolute origin-top-left bg-white shadow-2xl transition-colors duration-300"
            style={{
              width: `${canvasSettings.width}px`,
              height: `${canvasSettings.height}px`,
              backgroundColor: canvasSettings.backgroundColor,
              transform: `translate(${canvasSettings.scrollX}px, ${canvasSettings.scrollY}px) scale(${canvasSettings.zoom})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
