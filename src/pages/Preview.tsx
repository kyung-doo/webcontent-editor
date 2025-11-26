import { useEffect, useState } from 'react';
import RuntimeElement from '../components/RuntimeElement';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';


export default function Preview() {
  
  const { elements, canvasSettings } = useSelector((state: RootState) => state.editor);

  return (
    <div 
        className="w-screen h-screen overflow-hidden relative" 
        style={{backgroundColor: canvasSettings.backgroundColor}}
    >
      {elements.map((el) => (
        <RuntimeElement 
          key={el.id} 
          element={el} 
          mode="preview" // 👈 여기가 핵심! 스크립트가 실행됨
        />
      ))}
    </div>
  );
}