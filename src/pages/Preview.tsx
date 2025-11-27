import { useEffect, useState } from 'react';
import RuntimeElement from '../components/RuntimeElement';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { clearScriptCache } from '../utils/scriptManager';


export default function Preview() {
  
  const { elements, canvasSettings } = useSelector((state: RootState) => state.editor);

  useEffect(() => {
    clearScriptCache();
  }, []);

  return (
    <div 
        className="w-screen h-screen overflow-hidden relative" 
        style={{backgroundColor: canvasSettings.backgroundColor}}
    >
      {elements.map((el) => (
        <RuntimeElement 
          key={el.id} 
          element={el} 
          mode="preview"
        />
      ))}
    </div>
  );
}