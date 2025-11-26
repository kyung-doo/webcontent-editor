import { useDispatch } from 'react-redux';
import { addElement } from '../store/editorSlice';
import { usePannelToggle } from '../hooks/usePannelToggle';

// 👇 함수 이름을 ElementBar로 변경했습니다.
export default function ElementBar() {
  const dispatch = useDispatch();

  const { isOpen, toggle } = usePannelToggle(true);

  const handleAddElement = (e: React.MouseEvent<HTMLButtonElement>, type: 'Box' | 'Text') => {
    e.currentTarget.blur();
    const newElement = {
      id: Date.now().toString(),
      type,
      props: type === 'Box' 
        ? { backgroundColor: '#e2e8f0', width: 'auto', height: 'auto' } 
        : { text: '더블 클릭하여 편집', fontSize: '16px', color: '#000000' }
    };
    dispatch(addElement(newElement));
  };

  return (
    <aside 
      className={`
        relative z-50 border-r border-gray-300 bg-white shadow-sm z-20 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 p-4' : 'w-0 p-0 border-none'} 
      `}
    >
      {/* 토글 버튼 (패널 바깥쪽에 붙어있음) */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg) translateX(-13px)' }}
      >
        {/* 왼쪽 화살표 아이콘 */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 내부 콘텐츠 (닫혔을 때 안 보이게 overflow-hidden 처리) */}
      <div className={`flex flex-col gap-3 overflow-hidden ${!isOpen && 'hidden'}`}>
        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 whitespace-nowrap">Elements</h3>
        
        {/* ... (기존 버튼들 코드 그대로 유지) ... */}
        <button 
          onClick={(e) => handleAddElement(e, 'Box')} 
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 hover:border-blue-400 transition-all group whitespace-nowrap"
        >
          <div className="h-8 w-8 min-w-[2rem] rounded bg-gray-200 border border-gray-300 group-hover:bg-blue-100 group-hover:border-blue-300"></div>
          <div>
            <span className="block text-sm font-medium">Box Container</span>
            <span className="text-xs text-gray-400">네모 박스 추가</span>
          </div>
        </button>

        <button 
          onClick={(e) => handleAddElement(e, 'Text')} 
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 hover:border-blue-400 transition-all group whitespace-nowrap"
        >
          <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded bg-gray-200 border border-gray-300 text-gray-500 font-serif font-bold group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:border-blue-300">T</div>
          <div>
            <span className="block text-sm font-medium">Text Block</span>
            <span className="text-xs text-gray-400">텍스트 추가</span>
          </div>
        </button>
      </div>
    </aside>
  );
}