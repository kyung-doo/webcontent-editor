import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { selectElement } from '../store/editorSlice';
import { loadScript } from '../utils/scriptManager.ts';

interface RuntimeElementProps {
  element: any;
  selectedId?: string | null;
  mode: 'edit' | 'preview';
}

export default function RuntimeElement({ element, selectedId, mode }: RuntimeElementProps) {
  const dispatch = useDispatch();
  const domRef = useRef<HTMLDivElement>(null);
  
  // 🟢 생명주기 및 게임 루프 엔진
  useEffect(() => {
    // 에디터 모드이거나 스크립트가 없으면 실행 안 함
    if (mode !== 'preview' || !element.scripts || !domRef.current) return;

    let animationFrameId: number;
    let loadedModules: any[] = [];
    let lastTime = performance.now();

    const runScripts = async () => {
      // 1. 모든 스크립트 로드
      for (const scriptPath of element.scripts) {
        try {
          // Preview 모드면 forceReload = true (최신 코드 반영)
          const shouldReload = (mode === 'preview');
          const module = await loadScript(scriptPath, shouldReload);
          
          if (module) {
            // 필드값 병합 (저장된 값 + 기본값)
            const savedFields = element.scriptValues?.[scriptPath] || {};
            const defaultFields = module.default?.fields || {};
            const finalFields: any = {};
            Object.keys(defaultFields).forEach(key => finalFields[key] = defaultFields[key].default);
            Object.assign(finalFields, savedFields);

            loadedModules.push({ 
              instance: module.default, 
              fields: finalFields 
            });
          }
        } catch (err) {
          console.error(`스크립트 로드 실패 (${scriptPath}):`, err);
        }
      }

      // 2. onStart 실행
      loadedModules.forEach(({ instance, fields }) => {
        if (instance.onStart && domRef.current) {
          try {
            instance.onStart(domRef.current, element.props, fields);
          } catch (e) { console.error('onStart Error:', e); }
        }
      });

      // 3. onUpdate 루프 시작
      const loop = (time: number) => {
        const deltaTime = (time - lastTime) / 1000; // 초 단위 변환
        lastTime = time;

        loadedModules.forEach(({ instance, fields }) => {
          if (instance.onUpdate && domRef.current) {
            try {
              instance.onUpdate(domRef.current, element.props, fields, deltaTime);
            } catch (e) { console.error('onUpdate Error:', e); }
          }
        });

        animationFrameId = requestAnimationFrame(loop);
      };

      animationFrameId = requestAnimationFrame(loop);
    };

    runScripts();

    // 4. onDestroy 실행 (Cleanup)
    return () => {
      cancelAnimationFrame(animationFrameId);
      
      loadedModules.forEach(({ instance, fields }) => {
        if (instance.onDestroy && domRef.current) {
          try {
            instance.onDestroy(domRef.current, element.props, fields);
          } catch (e) { console.error('onDestroy Error:', e); }
        }
      });
    };
  }, [element.scripts, element.scriptValues, mode]); 


  // 🟢 클릭 핸들러 (에디터 전용)
  const handleClick = (e: React.MouseEvent) => {
    // 에디터 모드일 때만 선택 기능 동작
    if (mode === 'edit') {
        e.stopPropagation();
        if (element.id) dispatch(selectElement(element.id));
    }
    // Preview 모드에서는 이벤트를 막지 않음 (사용자 스크립트가 처리)
  };

  return (
    <div
      ref={domRef}
      id={element.elementId}
      onClick={handleClick}
      // Absolute 포지션으로 배치
      className={`
        ${mode === 'edit' ? 'cursor-pointer hover:ring-1 hover:ring-blue-300' : ''} 
        ${mode === 'edit' && selectedId === element.id ? 'ring-2 ring-blue-500 z-10' : ''}
        ${element.className || ''} 
      `}

      style={{
        left: element.props.left, 
        top: element.props.top,
        padding: element.type === 'Image' ? 0 : '20px',
        backgroundColor: element.props.backgroundColor || 'transparent',
        minWidth: element.type === 'Image' ? 'auto' : '50px',
        minHeight: element.type === 'Image' ? 'auto' : '50px',
        ...element.props
      }}
    >
      {element.type === 'Image' ? (
        <img 
            src={element.props.src} 
            alt="element" 
            className="w-full h-full pointer-events-none" 
            style={{ width: element.props.width, height: element.props.height }}
        />
      ) : element.type === 'Text' ? (
        <span style={{ fontSize: element.props.fontSize, color: element.props.color }}>
            {element.props.text}
        </span>
      ) : (
        <span className="text-xs text-gray-400 select-none">Box</span>
      )}
    </div>
  );
}