import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../store/store';
import RuntimeElement from '../components/RuntimeElement';
import { clearScriptCache } from '../utils/scriptManager';
import CanvasGlobalStyle from '../components/CanvasGlobalStyle';
import { FontProvider, useFontState } from "../context/FontContext";

function PreviewContent() {
  const elementsMap = useSelector((state: RootState) => state.elements.elements);
  const elements = useMemo(() => elementsMap ? Object.values(elementsMap) : [], [elementsMap]);
  
  const pageState = useSelector((state: RootState) => state.page);
  const pages = pageState?.pages || [];
  const activePageId = pageState?.activePageId;

  // FontContext에서 현재 활성화된 폰트 가져오기
  const { activeFont } = useFontState();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryPageId = searchParams.get('pageId');

  const targetPageId = queryPageId || activePageId;

  const activePage = pages.find((p: any) => p.pageId === targetPageId);
  const currentRootId = activePage?.rootElementId;

  const rootElement = elements.find((el: any) => el.elementId === currentRootId);

  useEffect(() => {
    console.log(`🚀 Preview Status:`, { 
      targetPageId, 
      currentRootId, 
      elementsCount: elements.length, 
      rootElementFound: !!rootElement 
    });
    clearScriptCache();
  }, [targetPageId, currentRootId, elements.length]);

  if (!rootElement || !targetPageId) {
    return <div className="flex items-center justify-center h-screen">Loading Preview...</div>;
  }

  return (
    <>
      <CanvasGlobalStyle mode="preview" />
      <div className="w-screen h-screen bg-white overflow-hidden relative">
        <div 
          id={targetPageId} 
          className="w-full h-full relative"
          style={{
            backgroundColor: rootElement.props?.backgroundColor || '#ffffff',
            overflow: rootElement.props?.overflow || 'hidden',
            // [핵심] 전역 폰트 적용: activeFont가 변경되면 전체 폰트가 변경됩니다.
            fontFamily: activeFont 
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

// 메인 내보내기 컴포넌트 (Provider 래퍼)
export default function Preview() {
  return (
    <FontProvider>
      <PreviewContent />
    </FontProvider>
  );
}