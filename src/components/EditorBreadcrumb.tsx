import React from 'react';

interface EditorBreadcrumbProps {
  activeId: string;
  elements: any[];
  onNavigate: (id: string) => void;
}

export default function EditorBreadcrumb({ activeId, elements, onNavigate }: EditorBreadcrumbProps) {
  const path = [];
  let currentId = activeId;
  let safety = 0;
  
  // 부모 역추적
  while(currentId && safety < 100) {
    const el = elements.find((e: any) => e.elementId === currentId);
    if (!el) break;
    path.unshift(el);
    currentId = el.parentId;
    safety++;
  }
  
  // Root 누락 방지
  if (path.length > 0 && path[0].elementId !== 'root') {
     const root = elements.find((e: any) => e.elementId === 'root');
     if(root) path.unshift(root);
  }
  if (path.length === 0 && activeId === 'root') {
     const root = elements.find((e: any) => e.elementId === 'root');
     if(root) path.push(root);
  }

  if (path.length === 0) return null;

  return (
    <div className="absolute top-12 left-12 z-50 flex items-center gap-2 bg-white px-3 py-1.5 rounded shadow-sm border border-gray-300 text-xs font-medium backdrop-blur-sm">
      {path.map((el, idx) => (
        <React.Fragment key={el.elementId}>
          {idx > 0 && <span className="text-gray-400">›</span>}
          <button 
            onClick={() => onNavigate(el.elementId)}
            className={`hover:text-blue-600 flex items-center gap-1 ${el.elementId === activeId ? 'text-gray-900 font-bold cursor-default' : 'text-gray-500'}`}
            disabled={el.elementId === activeId}
          >
            {el.elementId === 'root' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            )}
            {el.id || (el.elementId === 'root' ? 'Scene 1' : 'Symbol')}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}