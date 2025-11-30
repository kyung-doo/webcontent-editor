import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setTool } from '../store/canvasSlice';

// --- 아이콘 (SVG) ---
const SelectIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

const ScaleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

// --- 도구 버튼 컴포넌트 ---
interface ToolButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ToolButton({ isActive, onClick, icon, label }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex h-10 w-10 items-center justify-center rounded-md transition-colors mb-2
        ${isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
      `}
      title={label}
    >
      {icon}
    </button>
  );
}

export default function ToolsBar() {
  const currentTool = useSelector((state: RootState) => state.canvas.currentTool);
  const dispatch = useDispatch();

  return (
    <div className="w-12 flex flex-col items-center py-4 border-r border-gray-200 bg-white z-50 shrink-0">
      {/* Select Tool */}
      <ToolButton
        isActive={currentTool === 'select'}
        onClick={() => dispatch(setTool('select'))}
        icon={<SelectIcon />}
        label="Select (V)"
      />

      {/* Scale Tool */}
      <ToolButton
        isActive={currentTool === 'scale'}
        onClick={() => dispatch(setTool('scale'))}
        icon={<ScaleIcon />}
        label="Scale (K)"
      />
    </div>
  );
}