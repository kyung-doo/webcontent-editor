import { useState } from 'react';
import PropertiesPanel from './PropertiesPanel';
import LayerPanel from './LayerPanel';
import { usePannelToggle } from '../hooks/usePannelToggle';

// --- 아이콘 컴포넌트 ---
const PropsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
);
const LayerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

interface NavButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavButton({ isActive, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex h-12 w-full items-center justify-center transition-colors
        ${isActive ? 'bg-white text-blue-600 border-r-2 border-blue-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
      `}
    >
      {icon}
      
      {/* 툴팁 (왼쪽으로 표시) */}
      <div className="absolute right-full top-1/2 mr-2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
        {label}
        <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 border-4 border-transparent border-l-gray-800" />
      </div>
    </button>
  );
}

export default function RightSidebar() {
  const { isOpen, toggle, open } = usePannelToggle(true);
  const [activeTab, setActiveTab] = useState<'props' | 'layer' | 'settings'>('props');

  // ⭐ [수정됨] 탭 클릭 핸들러
  const handleTabClick = (tab: typeof activeTab) => {
    // 1. 탭 변경
    setActiveTab(tab);
    
    // 2. 만약 패널이 닫혀있다면 열어줍니다. (내용을 보여줘야 하니까)
    // 단, 이미 열려있다면 닫지 않습니다. (토글 기능 제거)
    if (!isOpen) {
      open();
    }
  };

  return (
    <aside 
      className={`
        relative border-l border-gray-300 bg-white shadow-sm z-50 
        flex transition-all duration-300 ease-in-out
        ${isOpen ? 'w-80' : 'w-12'} 
      `}
    >
      {/* 1. 토글 버튼 (왼쪽 가장자리) */}
      <button
        onClick={toggle}
        className="absolute -left-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        // 열렸을 땐 오른쪽(닫기), 닫혔을 땐 왼쪽(열기) 화살표
        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 2. 패널 내용 (왼쪽 영역) */}
      <div className={`flex-1 overflow-hidden bg-white relative ${!isOpen && 'hidden'}`}>
        {activeTab === 'props' && <PropertiesPanel />}
        {activeTab === 'layer' && <LayerPanel />}
        {activeTab === 'settings' && <div className="p-5 text-gray-400 text-sm">Settings Panel</div>}
      </div>

      {/* 3. 탭 네비게이션 (오른쪽 영역, 항상 보임) */}
      <nav className="w-12 flex flex-col border-l border-gray-200 bg-gray-50 shrink-0 z-20 h-full">
        <NavButton 
          isActive={activeTab === 'props'} 
          onClick={() => handleTabClick('props')} 
          icon={<PropsIcon />} 
          label="Properties"
        />
        
        <NavButton 
          isActive={activeTab === 'layer'} 
          onClick={() => handleTabClick('layer')} 
          icon={<LayerIcon />} 
          label="Layers"
        />

        <div className="flex-1"></div>

        <NavButton 
          isActive={activeTab === 'settings'} 
          onClick={() => handleTabClick('settings')} 
          icon={<SettingsIcon />} 
          label="Settings"
        />
      </nav>
      
    </aside>
  );
}