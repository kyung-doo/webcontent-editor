import React, { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { selectElement, enterContainer } from '../store/canvasSlice';
import { loadScript } from '../utils/scriptManager';

interface RuntimeElementProps {
  elementId: string;
  mode: 'edit' | 'preview';
  isInsideActive?: boolean;
}

export default function RuntimeElement({ elementId, mode, isInsideActive = false }: RuntimeElementProps) {
  const dispatch = useDispatch();
  const domRef = useRef<HTMLDivElement>(null);

  const element = useSelector((state: RootState) => 
    state.elements.elements.find(el => el.elementId === elementId)
  );
  const allElements = useSelector((state: RootState) => state.elements.elements);
  const { selectedElementId, activeContainerId } = useSelector((state: RootState) => state.canvas);

  const isSelected = selectedElementId === elementId;
  const isActiveContainer = elementId === activeContainerId;
  const isPreview = mode === 'preview';

  // --- 상태 로직 ---
  const isDirectChild = element?.parentId === activeContainerId;

  const isAncestor = useMemo(() => {
    if (activeContainerId === 'root') return false;
    let current = allElements.find(el => el.elementId === activeContainerId);
    while (current && current.parentId) {
      if (current.parentId === elementId) return true;
      current = allElements.find(el => el.elementId === current.parentId);
    }
    return false;
  }, [elementId, activeContainerId, allElements]);

  const isFocused = isActiveContainer || isInsideActive;
  const isRootMode = activeContainerId === 'root';
  
  // ⭐ [수정 1] 딤드(Dimmed)는 아예 안 보이게 (Opacity 0)
  const isDimmed = !isPreview && !isRootMode && !isFocused && !isAncestor;

  // ⭐ [수정 2] 조상(Ancestor)이거나 활성(Active)이면 껍데기를 숨겨야 함
  // (Active는 내부 진입 상태, Ancestor는 그 상위 부모들)
  const shouldHideVisuals = !isPreview && (isActiveContainer || isAncestor);

  const canInteract = mode === 'edit' && isDirectChild && !isActiveContainer && !isDimmed;
  const pointerEvents = isPreview ? 'auto' : (canInteract ? 'auto' : 'none');
  const childrenPointerEvents = isPreview ? 'auto' : (isActiveContainer ? 'auto' : 'none');


  // --- Hit Area 계산 (기존 유지) ---
  const [hitAreaRect, setHitAreaRect] = useState<{left:number, top:number, width:number, height:number} | null>(null);
  useLayoutEffect(() => {
    if (isPreview || !element || element.type !== 'Box' || element.children.length === 0 || !domRef.current) {
        setHitAreaRect(null);
        return;
    }
    const measureGroup = () => {
        const parentRect = domRef.current!.getBoundingClientRect();
        let minX = 0; let minY = 0;
        let maxX = parseFloat(element.props.width) || 50;
        let maxY = parseFloat(element.props.height) || 50;
        let hasValidChild = false;
        element.children.forEach(childId => {
            const childNode = document.querySelector(`[data-id="${childId}"]`);
            if (childNode) {
                hasValidChild = true;
                const childRect = childNode.getBoundingClientRect();
                const relLeft = childRect.left - parentRect.left;
                const relTop = childRect.top - parentRect.top;
                const relRight = relLeft + childRect.width;
                const relBottom = relTop + childRect.height;
                minX = Math.min(minX, relLeft);
                minY = Math.min(minY, relTop);
                maxX = Math.max(maxX, relRight);
                maxY = Math.max(maxY, relBottom);
            }
        });
        if (!hasValidChild) return;
        const PADDING = 4;
        setHitAreaRect({ left: minX - PADDING, top: minY - PADDING, width: (maxX - minX) + PADDING*2, height: (maxY - minY) + PADDING*2 });
    };
    measureGroup();
    const timer = setTimeout(measureGroup, 50);
    return () => clearTimeout(timer);
  }, [element, allElements, isPreview, activeContainerId]);


  // --- 스크립트 엔진 (기존 유지) ---
  const latestDataRef = useRef({ props: element?.props, scriptValues: element?.scriptValues });
  useEffect(() => { if(element) latestDataRef.current = { props: element.props, scriptValues: element.scriptValues }; }, [element?.props, element?.scriptValues]);
  const requestRef = useRef<number>(); const modulesRef = useRef<any[]>([]);
  useEffect(() => { 
      if (!element || !isPreview || !element.scripts || !domRef.current) return;
      // ... (스크립트 실행 로직) ...
      return () => { /* cleanup */ };
  }, [JSON.stringify(element?.scripts), isPreview]);


  // --- 핸들러 ---
  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview && canInteract) {
        e.stopPropagation();
        dispatch(selectElement(element!.elementId));
    }
  };
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isPreview && element?.type === 'Box' && canInteract) {
      e.stopPropagation();
      dispatch(enterContainer(element.elementId));
    }
  };

  if (!element) return null;

  // --------------------------------------------------------------------------
  // 🎨 렌더링 스타일
  // --------------------------------------------------------------------------
  const finalStyle: React.CSSProperties = {
    left: element.props.left, 
    top: element.props.top,
    width: element.props.width || 'auto',
    height: element.props.height || 'auto',
    padding: element.type === 'Image' ? 0 : '20px',
    backgroundColor: element.props.backgroundColor || 'transparent',
    minWidth: element.type === 'Image' ? 'auto' : '50px',
    minHeight: element.type === 'Image' ? 'auto' : '50px',
    ...element.props,
    
    // ⭐ [수정] Dimmed(관련 없는 요소)는 아예 안 보이게 처리 (opacity: 0)
    opacity: isDimmed ? 0 : 1, 
    
    // filter는 제거 (안 보이니까 필요 없음)
    pointerEvents: pointerEvents as any,
    zIndex: isActiveContainer ? 100 : (element.props.zIndex || 'auto')
  };

  // ⭐ [수정] 조상(Ancestor)이거나 활성(Active) 컨테이너면 껍데기 숨김
  // (자식은 보여야 하므로 display:none은 안됨. 시각적 속성만 투명하게)
  if (shouldHideVisuals) {
      finalStyle.backgroundColor = 'transparent';
      finalStyle.border = 'none';
      finalStyle.boxShadow = 'none';
      finalStyle.outline = 'none';
      finalStyle.backgroundImage = 'none';
  }

  const showGroupBorder = !isPreview && isSelected && !isActiveContainer && element.type === 'Box' && element.children.length > 0;
  const showNormalBorder = !isPreview && isSelected && !isActiveContainer && !showGroupBorder;
  const labelText = element.id || (showGroupBorder ? 'Group' : element.type);

  return (
    <div
      ref={domRef}
      id={element.id}
      data-id={element.elementId}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`absolute transition-all duration-300
        ${!isPreview && canInteract && !isDimmed ? 'cursor-pointer' : ''} 
        ${element.className || ''} 
      `}
      style={finalStyle}
    >
      {/* ⭐ [수정] 조상/활성 상태일 때는 텍스트/이미지 내용물도 숨김 (자식 Box만 렌더링) */}
      {!shouldHideVisuals && (
        <>
          {element.type === 'Image' && <img src={element.props.src} className="w-full h-full pointer-events-none object-contain" />}
          {element.type === 'Text' && <span style={{ fontSize: element.props.fontSize, color: element.props.color }}>{element.props.text}</span>}
        </>
      )}
      
      {/* Box Children */}
      {element.type === 'Box' && (
        <>
          {/* Hit Area */}
          {!isPreview && !isActiveContainer && canInteract && hitAreaRect && (
              <div className="absolute z-0 pointer-events-auto" style={{ left: hitAreaRect.left, top: hitAreaRect.top, width: hitAreaRect.width, height: hitAreaRect.height }} />
          )}

          <div style={{ display: 'contents', pointerEvents: childrenPointerEvents as any }}>
            {element.children?.map((childId: string) => (
                <RuntimeElement 
                  key={childId} 
                  elementId={childId} 
                  mode={mode}
                  isInsideActive={isPreview ? true : isFocused} 
                />
            ))}
          </div>

          {/* Hint */}
          {!isPreview && (!element.children || element.children.length === 0) && !isActiveContainer && !isDimmed && (
             <span className="text-[10px] text-gray-300 pointer-events-none select-none flex items-center justify-center h-full">Box</span>
          )}

          {/* Crosshair */}
          {!isPreview && isActiveContainer && (
             <div className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-visible z-50">
                <div className="absolute top-0 left-[-2000px] right-[-2000px] h-[1px] bg-cyan-500/40" style={{ top: 0 }}></div>
                <div className="absolute left-0 top-[-2000px] bottom-[-2000px] w-[1px] bg-cyan-500/40" style={{ left: 0 }}></div>
                <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm"></div>
             </div>
          )}
        </>
      )}

      {/* Borders */}
      {showGroupBorder && hitAreaRect && (
          <div className="absolute pointer-events-none z-50 border-2 border-blue-500 border-dashed bg-blue-50/5 rounded-sm" style={{ left: hitAreaRect.left, top: hitAreaRect.top, width: hitAreaRect.width, height: hitAreaRect.height }}>
            <div className="absolute top-0 left-0 -translate-y-full bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm">{labelText}</div>
          </div>
      )}
      {showNormalBorder && (
         <div className="absolute inset-0 pointer-events-none z-50 border-2 border-blue-600 border-dashed">
            <div className="absolute top-0 left-0 -translate-y-full bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-t font-medium shadow-sm">{labelText}</div>
         </div>
      )}
      {!isPreview && !isSelected && canInteract && !isDimmed && (
         <div className="absolute border-2 border-blue-300 border-dashed opacity-0 hover:opacity-100 pointer-events-none transition-opacity rounded-sm z-40" style={{ inset: -2 }}></div>
      )}
    </div>
  );
}