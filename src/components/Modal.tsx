import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  title: string;
  body: ReactNode;
  onConfirm?: () => void;
  showCancel?: boolean;
  onHide: () => void; // Provider에서 전달받는 닫기 함수
}

// 모달 UI 컴포넌트
const ModalUI: React.FC<ModalProps> = ({ title, body, onConfirm, onHide, showCancel }) => {
  
  const handleConfirm = () => {
    onConfirm?.(); // 확인 함수 실행
    onHide(); // 모달 닫기
  };

  return (
    // 1. 오버레이 (화면 전체 덮기)
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center transition-opacity" onClick={onHide}>
      
      {/* 2. 모달 박스 (오버레이 클릭 시 닫히지 않게 막음) */}
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4 border-b pb-2 text-gray-800">{title}</h3>
        
        {/* 내용 */}
        <div className="text-gray-600 mb-6 text-sm">{body}</div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-3 pt-2">
          {showCancel && (
            <button 
              onClick={onHide} 
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleConfirm} 
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {onConfirm ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Portals를 사용하여 렌더링
const Modal: React.FC<ModalProps> = (props) => {
  // document.body가 준비되었는지 확인 (Electron 환경 대응)
  const portalRoot = document.body; 
  if (!portalRoot) return null;

  return ReactDOM.createPortal(
    <ModalUI {...props} />,
    portalRoot
  );
};

export default Modal;