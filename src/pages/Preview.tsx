import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import RuntimeElement from '../components/RuntimeElement';
import { clearScriptCache } from '../utils/scriptManager';

export default function Preview() {
  // ⭐ 분리된 Store 사용 (state.elements)
  const { elements } = useSelector((state: RootState) => state.elements);

  // ⭐ Root 찾기
  const rootElement = elements.find(el => el.elementId === 'root');

  useEffect(() => {
    console.log("🚀 프리뷰 시작");
    clearScriptCache();
    
    const script = document.createElement('script');
    script.src = "/tailwindcss.js"; 
    document.head.appendChild(script);
    
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  if (!rootElement) return <div className="w-screen h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="w-screen h-screen bg-white overflow-hidden relative">
      {/* ⭐ Root 요소부터 렌더링 시작 */}
      {/* Root는 화면 전체를 덮도록 스타일 강제 지정 가능 */}
      <div className="w-full h-full relative">
         {/* Root 자체를 RuntimeElement로 그려서 배경색 등을 적용할 수도 있고,
            자식들만 그릴 수도 있습니다. 
            에디터와 똑같이 보이려면 Root의 자식들을 그리는 게 안전합니다.
         */}
         {rootElement.children.map((childId: string) => (
            <RuntimeElement 
              key={childId} 
              elementId={childId} 
              mode="preview" 
            />
         ))}
      </div>
    </div>
  );
}