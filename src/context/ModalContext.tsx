import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Modal from "../components/Modal";

// 모달 내용 타입 정의
interface ModalContent {
  title: string;
  body: ReactNode;
  onConfirm?: () => void;
  showCancel?: boolean;
}

// Context 타입
interface ModalContextType {
  showModal: (content: ModalContent) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// 모달 상태를 관리하는 Provider
export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalContent | null>(null);

  const showModal = useCallback((content: ModalContent) => {
    setModalState(content);
  }, []);

  const hideModal = useCallback(() => {
    setModalState(null);
  }, []);

  const contextValue = { showModal, hideModal };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {/* 2단계에서 만들 모달 컴포넌트 삽입 */}
      {modalState && <Modal {...modalState} onHide={hideModal} />}
    </ModalContext.Provider>
  );
}

// 훅: 컴포넌트 어디서든 모달을 호출할 수 있게 해줍니다.
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};