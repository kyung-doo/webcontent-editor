import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { selectElement } from '../store/editorSlice';


export default function Canvas() {
  const { elements, selectedId } = useSelector((state: RootState) => state.editor);
  const dispatch = useDispatch();

  return (
    <main 
      className="flex-1 bg-gray-100 p-10 overflow-auto flex justify-center"
      onClick={() => dispatch(selectElement(null))} // 빈 공간 클릭 시 선택 해제
    >
      <div 
        className="relative h-[800px] w-[800px] bg-white shadow-lg ring-1 ring-gray-200 rounded-sm"
        onClick={(e) => e.stopPropagation()} // 캔버스 클릭 시 선택 해제 방지
      >
        {elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none">
            <p>왼쪽에서 요소를 추가해보세요</p>
          </div>
        )}
        
        {elements.map((el) => (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation(); // 부모로 클릭 이벤트 전파 방지
              dispatch(selectElement(el.id));
            }}
            className={`
              absolute cursor-pointer transition-all
              ${selectedId === el.id ? 'ring-2 ring-blue-500 z-10' : 'hover:ring-1 hover:ring-blue-300'}
            `}
            style={{
              position: 'relative', 
              margin: '10px',
              padding: '20px',
              backgroundColor: el.props.backgroundColor || 'transparent',
              minWidth: '100px',
              minHeight: '50px',
              border: el.type === 'Box' ? '1px dashed #cbd5e1' : 'none',
              ...el.props // Redux에 저장된 스타일 적용
            }}
          >
            {el.type === 'Text' ? (
              <span className="text-gray-800" style={{ fontSize: el.props.fontSize, color: el.props.color }}>
                {el.props.text}
              </span>
            ) : (
              <span className="text-xs text-slate-400 select-none">Box</span>
            )}
            
            {/* 선택 시 라벨 표시 */}
            {selectedId === el.id && (
              <div className="absolute -top-6 left-0 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-t">
                {el.type}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}