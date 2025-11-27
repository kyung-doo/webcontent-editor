import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Ruler from "@scena/react-ruler";
import { RootState } from '../store/store';
import { selectElement, addElement, updateCanvasSettings } from '../store/editorSlice';
import RuntimeElement from './RuntimeElement'; 
import { MIN_ZOOM, MAX_ZOOM, RULER_THICKNESS } from '../constants';


export default function Canvas() {
  const { elements, selectedId, canvasSettings } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();

  // Refs
  const rulerHorz = useRef<Ruler>(null);
  const rulerVert = useRef<Ruler>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const horzContainerRef = useRef<HTMLDivElement>(null);
  const vertContainerRef = useRef<HTMLDivElement>(null);
  
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // --- 1. [초기화] 캔버스를 화면 중앙에 배치 ---
  useEffect(() => {
    // 스크롤이 0,0 (초기값)이고 컨테이너가 준비되었을 때 실행
    if (containerRef.current && canvasSettings.scrollX === 0 && canvasSettings.scrollY === 0) {
      const { clientWidth, clientHeight } = containerRef.current;
      
      // (뷰포트 크기 - 캔버스 크기) / 2 = 중앙 정렬 좌표
      const centerX = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const centerY = (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;

      // 초기 위치 설정
      dispatch(updateCanvasSettings({ scrollX: centerX, scrollY: centerY }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회만 실행 (혹은 containerRef가 준비된 직후)


  // --- 2. [핵심] 피벗(기준점) 줌 기능 ---
  const zoomWithPivot = useCallback((delta: number, pivotX?: number, pivotY?: number) => {
    if (!containerRef.current) return;

    // 1. 한계 도달 시 중단 (상수 사용)
    if (delta > 0 && canvasSettings.zoom >= MAX_ZOOM) return;
    if (delta < 0 && canvasSettings.zoom <= MIN_ZOOM) return;

    const oldZoom = canvasSettings.zoom;
    // 2. 값 계산 시에도 상수 사용 (안전장치)
    const newZoom = Math.max(MIN_ZOOM, Math.min(oldZoom + delta, MAX_ZOOM));
    
    const scaleRatio = newZoom / oldZoom;

    const rect = containerRef.current.getBoundingClientRect();
    const pX = pivotX !== undefined ? pivotX : rect.width / 2;
    const pY = pivotY !== undefined ? pivotY : rect.height / 2;

    const newScrollX = pX - (pX - canvasSettings.scrollX) * scaleRatio;
    const newScrollY = pY - (pY - canvasSettings.scrollY) * scaleRatio;

    dispatch(updateCanvasSettings({ 
      zoom: newZoom, 
      scrollX: newScrollX, 
      scrollY: newScrollY 
    }));

    setTimeout(() => {
      rulerHorz.current?.resize();
      rulerVert.current?.resize();
    }, 0);

  }, [canvasSettings, dispatch]);


  // --- 3. 휠 핸들러 (마우스 커서 중심 줌) ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      // 마우스 위치 계산 (컨테이너 기준 상대 좌표)
      const rect = containerRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 마우스 위치를 Pivot으로 줌 실행
      zoomWithPivot(e.deltaY > 0 ? -0.1 : 0.1, mouseX, mouseY);
    } else {
      // 일반 휠: 패닝
      dispatch(updateCanvasSettings({
        scrollX: canvasSettings.scrollX - e.deltaX,
        scrollY: canvasSettings.scrollY - e.deltaY
      }));
    }
  };

  // --- 4. 버튼 핸들러 (화면 중앙 중심 줌) ---
  // (아래 JSX에서 호출할 때 인자 없이 호출하면 자동으로 중앙 기준이 됨)


  // --- ResizeObserver (룰러 깨짐 방지) ---
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      rulerHorz.current?.resize();
      rulerVert.current?.resize();
    });
    if (horzContainerRef.current) resizeObserver.observe(horzContainerRef.current);
    if (vertContainerRef.current) resizeObserver.observe(vertContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // --- 스페이스바 감지 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); 
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- 드래그(Pan) ---
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
    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      dispatch(updateCanvasSettings({
        scrollX: startScroll.x + dx,
        scrollY: startScroll.y + dy
      }));
    };
    const handleWindowMouseUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, startPan, startScroll, dispatch]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const dist = Math.sqrt(Math.pow(e.clientX - dragStartPosRef.current.x, 2) + Math.pow(e.clientY - dragStartPosRef.current.y, 2));
    if (dist > 5) return;
    if (!isSpacePressed) dispatch(selectElement(null));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData('imageSrc');
    if (imageSrc) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const dropX = (e.clientX - rect.left - RULER_THICKNESS - canvasSettings.scrollX) / canvasSettings.zoom;
        const dropY = (e.clientY - rect.top - RULER_THICKNESS - canvasSettings.scrollY) / canvasSettings.zoom;

        const newElement = {
            id: Date.now().toString(),
            type: 'Image' as const,
            props: { 
                src: imageSrc, width: '200px', height: 'auto', backgroundColor: 'transparent',
                left: `${dropX}px`, top: `${dropY}px`
            },
            scripts: []
        };
        dispatch(addElement(newElement));
    }
  };

  const cursorStyle = isPanning ? 'cursor-grabbing' : (isSpacePressed ? 'cursor-grab' : 'cursor-default');

  return (
    <main className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      
      {/* 줌 컨트롤 (우측 하단) */}
      <div className="absolute top-10 right-5 z-50 flex gap-2 bg-white p-2 rounded shadow-md border border-gray-200">
        {/* 버튼 클릭 시에는 인자 없이 호출 -> 중앙 기준 줌 */}
        <button onClick={() => zoomWithPivot(-0.1)} className="px-2 py-1 hover:bg-gray-100 rounded">-</button>
        <span className="px-2 py-1 text-sm font-mono w-12 text-center">{Math.round(canvasSettings.zoom * 100)}%</span>
        <button onClick={() => zoomWithPivot(0.1)} className="px-2 py-1 hover:bg-gray-100 rounded">+</button>
        
        {/* 리셋: 화면 중앙으로 다시 맞추기 */}
        <button onClick={() => {
             if (!containerRef.current) return;
             const { clientWidth, clientHeight } = containerRef.current;
             const centerX = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
             const centerY = (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;
             dispatch(updateCanvasSettings({ zoom: 1, scrollX: centerX, scrollY: centerY }));
        }} className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded ml-2">Reset</button>
      </div>

      {/* --- 상단 룰러 --- */}
      <div className="flex w-full z-40 bg-white border-b border-gray-300 flex-none" style={{ height: RULER_THICKNESS }}>
        <div className="bg-gray-50 border-r border-gray-300 flex-none z-50 flex items-center justify-center text-[10px] text-gray-500 font-bold" style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }}>px</div>
        <div className="flex-1 relative overflow-hidden" ref={horzContainerRef}>
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
            style={{ fontFamily: 'sans-serif', fontSize: '10px', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        {/* --- 좌측 룰러 --- */}
        <div className="bg-white border-r border-gray-300 z-40 relative flex-none overflow-hidden" style={{ width: RULER_THICKNESS }} ref={vertContainerRef}>
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
            style={{ fontFamily: 'sans-serif', fontSize: '10px', width: '100%', height: '100%' }}
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
                className="absolute origin-top-left bg-white shadow-2xl"
                style={{
                    width: `${canvasSettings.width}px`,
                    height: `${canvasSettings.height}px`,
                    backgroundColor: canvasSettings.backgroundColor,
                    transform: `translate(${canvasSettings.scrollX}px, ${canvasSettings.scrollY}px) scale(${canvasSettings.zoom})`,
                }}
                onClick={(e) => {
                  // 1. 드래그인지 클릭인지 거리 계산
                  const dist = Math.sqrt(
                    Math.pow(e.clientX - dragStartPosRef.current.x, 2) + 
                    Math.pow(e.clientY - dragStartPosRef.current.y, 2)
                  );
                  
                  // 2. 5px 이상 움직였으면 드래그로 간주하고 무시
                  if (dist > 5) return; 

                  // 3. 스페이스바(패닝) 모드가 아니라면 -> 선택 해제!
                  if (!isSpacePressed) {
                      dispatch(selectElement(null)); // 👈 여기서 선택 해제 실행
                      // 상위(회색 배경)로 이벤트가 또 올라가지 않게 막음 (중복 실행 방지)
                      e.stopPropagation(); 
                  }
                }}
            >
                {elements.map((el) => (
                    <RuntimeElement 
                        key={el.id} 
                        element={el} 
                        selectedId={selectedId} 
                        mode="edit" 
                    />
                ))}
            </div>
        </div>
      </div>
    </main>
  );
}