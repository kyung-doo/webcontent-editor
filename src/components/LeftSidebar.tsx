import React from 'react';
import ToolsBar from './ToolsBar';
import ElementBar from './ElementBar';

export default function LeftSidebar() {
  return (
    <div className="flex h-full relative z-50">
      {/* 1. 도구 모음 (고정) */}
      <ToolsBar />
      
      {/* 2. 요소 패널 (접이식) */}
      <ElementBar />
    </div>
  );
}