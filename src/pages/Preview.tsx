import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import RuntimeElement from '../components/RuntimeElement';
import { clearScriptCache } from '../utils/scriptManager';

export default function Preview() {
  // 분리된 Store 사용 (state.elements)
  const { elements } = useSelector((state: RootState) => state.elements);

  // Root 찾기
  const rootElement = elements.find(el => el.elementId === 'root');

  useEffect(() => {
    console.log("🚀 프리뷰 시작");
    clearScriptCache();
  }, []);

  if (!rootElement) return <div className="w-screen h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="w-screen h-screen bg-white overflow-hidden relative">
      <div className="w-full h-full relative">
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