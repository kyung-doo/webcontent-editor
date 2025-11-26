import React, { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Ruler from "@scena/react-ruler";
import { RootState } from '../store/store';
import { selectElement, addElement, updateCanvasSettings } from '../store/editorSlice';
import RuntimeElement from './RuntimeElement'; 

export default function Canvas() {
  const { elements, selectedId, canvasSettings } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();

  // 📏 룰러 두께 상수 (30px이 가장 안정적)
  const RULER_THICKNESS = 30;

  // Refs
  const rulerHorz = useRef<Ruler>(null);
  const rulerVert = useRef<Ruler>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const horzContainerRef = useRef<HTMLDivElement>(null);
  const vertContainerRef = useRef<HTMLDivElement>(null);
  
  // 👇 클릭 vs 드래그 구분을 위한 위치 저장소
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Local State
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // --- 1. ResizeObserver로 룰러 자동 업데이트 (깨짐 방지) ---
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (rulerHorz.current) rulerHorz.current.resize();
      if (rulerVert.current) rulerVert.current.resize();
    });

    if (horzContainerRef.current) resizeObserver.observe(horzContainerRef.current);
    if (vertContainerRef.current) resizeObserver.observe(vertContainerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // --- 2. 스페이스바 감지 ---
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

  // --- 3. 줌 핸들러 ---
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(canvasSettings.zoom + delta, 3));
    dispatch(updateCanvasSettings({ zoom: newZoom }));
    // 줌 변경 직후 리사이즈 안전장치
    setTimeout(() => {
        rulerHorz.current?.resize();
        rulerVert.current?.resize();
    }, 0);
  };

  // --- 4. 휠 핸들러 ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    } else {
      dispatch(updateCanvasSettings({
        scrollX: canvasSettings.scrollX - e.deltaX,
        scrollY: canvasSettings.scrollY - e.deltaY
      }));
    }
  };

  // --- 5. 드래그(Pan) 시작 ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // 클릭 시작 위치 저장 (나중에 드래그 여부 판단용)
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    // 휠 버튼(1) 또는 (스페이스바 + 좌클릭)
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setStartScroll({ x: canvasSettings.scrollX, y: canvasSettings.scrollY });
    }
  };

  // --- 6. 전역 드래그 이벤트 (부드러운 이동) ---
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

    const handleWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, startPan, startScroll, dispatch]);

  // --- 7. 배경 클릭 핸들러 (드래그 여부 확인 후 선택 해제) ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    // 이동 거리 계산
    const dist = Math.sqrt(
      Math.pow(e.clientX - dragStartPosRef.current.x, 2) + 
      Math.pow(e.clientY - dragStartPosRef.current.y, 2)
    );

    // 5px 이상 움직였으면 "드래그"로 판단하고 무시
    if (dist > 5) return;

    // 드래그가 아니고 스페이스바도 안 눌렀으면 -> 선택 해제
    if (!isSpacePressed) {
      dispatch(selectElement(null));
    }
  };

  // --- 8. 드롭 핸들러 ---
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData('imageSrc');
    
    if (imageSrc) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // 룰러, 스크롤, 줌을 고려한 좌표 계산
        const dropX = (e.clientX - rect.left - RULER_THICKNESS - canvasSettings.scrollX) / canvasSettings.zoom;
        const dropY = (e.clientY - rect.top - RULER_THICKNESS - canvasSettings.scrollY) / canvasSettings.zoom;

        const newElement = {
            id: Date.now().toString(),
            type: 'Image' as const,
            props: { 
                src: imageSrc, 
                width: '200px', height: 'auto', backgroundColor: 'transparent',
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
      
      {/* 줌 컨트롤 */}
      <div className="absolute top-10 right-5 z-50 flex gap-2 bg-white p-2 rounded shadow-md border border-gray-200">
        <button onClick={() => handleZoom(-0.1)} className="px-2 py-1 hover:bg-gray-100 rounded">-</button>
        <span className="px-2 py-1 text-sm font-mono w-12 text-center">{Math.round(canvasSettings.zoom * 100)}%</span>
        <button onClick={() => handleZoom(0.1)} className="px-2 py-1 hover:bg-gray-100 rounded">+</button>
        <button onClick={() => dispatch(updateCanvasSettings({ zoom: 1, scrollX: 0, scrollY: 0 }))} className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded ml-2">Reset</button>
      </div>

      {/* --- 상단 영역 (가로 룰러) --- */}
      <div className="flex w-full z-40 bg-white border-b border-gray-300 flex-none" style={{ height: RULER_THICKNESS }}>
        <div 
            className="bg-gray-50 border-r border-gray-300 flex-none z-50 flex items-center justify-center text-[10px] text-gray-500 font-bold"
            style={{ width: RULER_THICKNESS, height: RULER_THICKNESS }}
        >
          px
        </div>
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
        {/* --- 좌측 영역 (세로 룰러) --- */}
        <div 
            className="bg-white border-r border-gray-300 z-40 relative flex-none overflow-hidden"
            style={{ width: RULER_THICKNESS }}
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
            style={{ fontFamily: 'sans-serif', fontSize: '10px', width: '100%', height: '100%' }}
          />
        </div>

        {/* --- 뷰포트 --- */}
        <div 
            ref={containerRef}
            className={`flex-1 relative bg-gray-200 overflow-hidden ${cursorStyle}`}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            // 👇 클릭 핸들러 연결
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
                // 종이 위를 클릭했을 때도 드래그 여부 체크
                onClick={(e) => {
                    const dist = Math.sqrt(Math.pow(e.clientX - dragStartPosRef.current.x, 2) + Math.pow(e.clientY - dragStartPosRef.current.y, 2));
                    if (dist > 5) return; // 드래그면 무시
                    if (!isSpacePressed) e.stopPropagation(); // 클릭이면 상위(선택해제)로 전파 방지
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