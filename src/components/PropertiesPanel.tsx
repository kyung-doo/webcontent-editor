import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateSelectedElement } from '../store/editorSlice';
import { usePannelToggle } from '../hooks/usePannelToggle';

export default function PropertiesPanel() {
  const { elements, selectedId } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();

  const { isOpen, toggle } = usePannelToggle(true);

  // 선택된 요소 찾기
  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <aside 
      className={`
        relative border-l border-gray-300 bg-white shadow-sm z-20 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72 p-5' : 'w-0 p-0 border-none'}
      `}
    >
      {/* 토글 버튼 (왼쪽에 붙음) */}
      <button
        onClick={toggle}
        className="absolute -left-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
      >
        {/* 오른쪽 화살표 아이콘 */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 내부 콘텐츠 wrapper */}
      <div className={`size-full overflow-hidden ${!isOpen && 'hidden'}`}>
        
        {/* 예시: */}
        {!selectedElement ? (
           <div className="flex flex-col items-center justify-center text-center size-full">
             <div className="mb-2 text-2xl">👆</div>
             <p className="text-sm text-gray-400 whitespace-nowrap">요소를 선택해주세요.</p>
           </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2 whitespace-nowrap">Properties</h3>
            {/* ... 기존 속성 입력 필드들 ... */}
            <div className="bg-blue-50 p-3 rounded border border-blue-100">
              <span className="text-xs text-blue-500 font-bold block">SELECTED ID</span>
              <span className="text-xs text-gray-600 font-mono truncate">{selectedElement.id}</span>
            </div>
             
             {/* Background Color 등 기존 코드 유지 */}
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Background Color</label>
                <div className="flex items-center gap-2">
                    <input 
                    type="color" 
                    value={selectedElement.props.backgroundColor || '#ffffff'}
                    className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
                    onChange={(e) => dispatch(updateSelectedElement({ backgroundColor: e.target.value }))}
                    />
                </div>
            </div>
            
             {/* 텍스트 속성 등 기존 코드 유지 */}
             {selectedElement.type === 'Text' && (
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Text Content</label>
                 <input 
                    type="text"
                    value={selectedElement.props.text || ''}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    onChange={(e) => dispatch(updateSelectedElement({ text: e.target.value }))}
                 />
               </div>
             )}
          </div>
        )}
      </div>
    </aside>
  );
}