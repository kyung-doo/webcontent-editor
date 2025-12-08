import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../store/store';
import RuntimeElement from '../components/RuntimeElement';
import { clearScriptCache } from '../utils/scriptManager';
import CanvasGlobalStyle from '../components/CanvasGlobalStyle';

export default function Preview() {
  
  const elementsMap = useSelector((state: RootState) => state.elements.elements);
  const elements = useMemo(() => elementsMap ? Object.values(elementsMap) : [], [elementsMap]);
  
  const pageState = useSelector((state: RootState) => state.page);
  const pages = pageState?.pages || [];
  const activePageId = pageState?.activePageId;

  // URL 쿼리 파라미터 읽기
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryPageId = searchParams.get('pageId');

  // 렌더링할 페이지 ID 결정
  const targetPageId = queryPageId || activePageId;

  // 페이지 및 Root ID 찾기
  const activePage = pages.find((p: any) => p.pageId === targetPageId);
  const currentRootId = activePage?.rootElementId;

  // Root Element 찾기 (elements가 빈 배열이면 undefined가 됨)
  const rootElement = elements.find((el: any) => el.elementId === currentRootId);

  useEffect(() => {
    // 디버깅용 로그: 데이터가 잘 들어오는지 확인하세요.
    console.log(`🚀 Preview Status:`, { 
      targetPageId, 
      currentRootId, 
      elementsCount: elements.length, 
      rootElementFound: !!rootElement 
    });
    clearScriptCache();
  }, [targetPageId, currentRootId, elements.length]);

  // [수정] 데이터 로딩 중이거나 요소를 찾지 못했을 때의 처리
  if (!rootElement || !targetPageId) {
    return null;
  }

  return (
    <>
      <CanvasGlobalStyle />
      <div className="w-screen h-screen bg-white overflow-hidden relative">
        <div 
          id={targetPageId} 
          className="w-full h-full relative"
          style={{
            // [안전성 수정] props가 없을 경우를 대비해 옵셔널 체이닝 사용
            backgroundColor: rootElement.props?.backgroundColor || '#ffffff',
            overflow: rootElement.props?.overflow || 'hidden',
          }}
        >
          {rootElement.children?.map((childId: string) => (
              <RuntimeElement 
                key={childId} 
                elementId={childId} 
                mode="preview" 
              />
          ))}
        </div>
      </div>
    </>
  );
}