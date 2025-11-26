import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 캔버스에 들어갈 요소의 타입 정의
export interface EditorElement {
  id: string;
  type: 'Box' | 'Text' | 'Image';
  props: {
    backgroundColor?: string;
    text?: string;
    [key: string]: any;
  };
  scripts?: string[];
}

interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  scrollX: number;
  scrollY: number;
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  canvasSettings: CanvasSettings;
}

const initialState: EditorState = {
  elements: [],
  selectedId: null,
  canvasSettings: {
    width: 1024,
    height: 768,
    backgroundColor: '#ffffff',
    zoom: 1,
    scrollX: 0,
    scrollY: 0
  },
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // 요소 추가
    addElement: (state, action: PayloadAction<EditorElement>) => {
      state.elements.push(action.payload);
    },
    // 요소 선택
    selectElement: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
    },
    // 선택된 요소 속성 변경 (예: 배경색)
    updateSelectedElement: (state, action: PayloadAction<any>) => {
      const element = state.elements.find(el => el.id === state.selectedId);
      if (element) {
        element.props = { ...element.props, ...action.payload };
      }
    },

    // 스크립트 추가 액션
    addScriptToElement: (state, action: PayloadAction<{ id: string, scriptName: string }>) => {
      const element = state.elements.find(el => el.id === action.payload.id);
      if (element) {
        // 이미 있으면 중복 방지
        const currentScripts = element.scripts || [];
        if (!currentScripts.includes(action.payload.scriptName)) {
          element.scripts = [...currentScripts, action.payload.scriptName];
        }
      }
    },

    // 스크립트 제거 액션
    removeScriptFromElement: (state, action: PayloadAction<{ id: string, scriptName: string }>) => {
      const element = state.elements.find(el => el.id === action.payload.id);
      if (element && element.scripts) {
        element.scripts = element.scripts.filter(s => s !== action.payload.scriptName);
      }
    },

    // 캔버스 설정 변경 리듀서
    updateCanvasSettings: (state, action: PayloadAction<Partial<CanvasSettings>>) => {
      if (action.payload.zoom) {
        action.payload.zoom = Math.max(0.4, Math.min(action.payload.zoom, 3));
      }
      state.canvasSettings = { ...state.canvasSettings, ...action.payload };
    },

    setInitialState: (state, action: PayloadAction<EditorState>) => {
      // 받아온 데이터로 내 상태를 덮어씁니다.
      state.elements = action.payload.elements;
      state.canvasSettings = action.payload.canvasSettings;
      // selectedId는 굳이 동기화 안 해도 되지만 필요하면 포함
    },

  },
});

export const { 
  addElement, 
  selectElement, 
  updateSelectedElement,
  addScriptToElement,
  removeScriptFromElement,
  updateCanvasSettings,
  setInitialState
} = editorSlice.actions;

export default editorSlice.reducer;