/// <reference types="vite/client" />

// 1. 에셋 파일/폴더 타입 정의
interface AssetFile {
  name: string;
  isFolder: boolean;
  path: string; // 상대 경로 (예: "images/logo.png")
}

// 2. window 객체 확장
interface Window {
  electronAPI: {
    // --- [파일 시스템] ---
    
    // 프로젝트 저장
    saveProject: (data: any) => void;

    // 이미지/에셋 목록 가져오기 (하위 경로 지원)
    getAssets: (subPath?: string) => Promise<AssetFile[]>;

    // 스크립트(컴포넌트) 파일 목록 가져오기 (재귀 검색)
    getScripts: () => Promise<string[]>;


    // --- [창 관리 (프리뷰)] ---

    // 프리뷰 창 열기
    openPreview: (width: number, height: number) => void;


    // --- [Redux 상태 동기화 (Renderer <-> Main)] ---
    
    // 1. 액션 보내기 (Renderer -> Main)
    dispatch: (action: any) => void;

    // 2. 액션 받기 (Main -> Renderer)
    // 리턴값은 리스너 해제 함수(cleanup function)
    onDispatch: (callback: (action: any) => void) => () => void;

    // 3. 초기 상태 가져오기 (앱 시작 시 동기화)
    getInitialState: () => Promise<any>;
  }
}