import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

// 캔버스에 들어갈 요소의 타입 정의
export interface EditorElement {
  id: string;
  elementId?: string;
  type: 'Box' | 'Text' | 'Image';
  props: {
    backgroundColor?: string;
    text?: string;
    [key: string]: any;
  };
  scripts?: string[];
  scriptValues?: { 
    [scriptName: string]: { [fieldName: string]: any } 
  };
  className?: string;
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
        // 전달된 payload의 키-값을 순회
        Object.entries(action.payload).forEach(([key, value]) => {
          // 값이 undefined나 null이면 -> 속성 삭제 (Delete Style)
          if (value === undefined || value === null) {
            delete element.props[key];
          } else {
            // 값이 있으면 -> 업데이트 (Update Style)
            element.props[key] = value;
          }
        });
      }
    },

    updateElementAttributes: (state, action: PayloadAction<{ id: string, name: string, value: string }>) => {
      const el = state.elements.find(e => e.id === action.payload.id);
      if (el) {
        const { name, value } = action.payload;
        if (name === 'id') {
          el.elementId = value; // elementId 필드에 저장
        } else if (name === 'className') {
          el.className = value;
        }
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

    // 스크립트 변수값 업데이트 리듀서
    updateScriptValue: (state, action: PayloadAction<{ id: string, scriptName: string, fieldName: string, value: any }>) => {
      const el = state.elements.find(e => e.id === action.payload.id);
      if (el) {
        // 최상위 scriptValues 객체가 없으면 초기화
        if (!el.scriptValues) {
          el.scriptValues = {};
        }
        
        // 해당 스크립트의 컨테이너가 없으면 초기화 (Reset 후의 상태)
        if (!el.scriptValues[action.payload.scriptName]) {
          el.scriptValues[action.payload.scriptName] = {};
        }
        
        // 이제 안전하게 값을 쓸 수 있습니다.
        el.scriptValues[action.payload.scriptName][action.payload.fieldName] = action.payload.value;
      }
    },

    // 특정 스크립트의 값들을 초기화
    resetScriptValues: (state, action: PayloadAction<{ id: string, scriptName: string }>) => {
      const el = state.elements.find(e => e.id === action.payload.id);
      if (el && el.scriptValues && el.scriptValues[action.payload.scriptName]) {
        // 해당 스크립트의 저장된 값을 삭제 -> 렌더링 시 스크립트의 'default' 값을 쓰게 됨
        el.scriptValues[action.payload.scriptName] = {};
      }
    },

    // 캔버스 설정 변경 리듀서
    updateCanvasSettings: (state, action: PayloadAction<Partial<CanvasSettings>>) => {
      if (action.payload.zoom) {
        action.payload.zoom = Math.max(MIN_ZOOM, Math.min(action.payload.zoom, MAX_ZOOM));
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
  updateElementAttributes,
  addScriptToElement,
  removeScriptFromElement,
  resetScriptValues,
  updateCanvasSettings,
  setInitialState,
  updateScriptValue
} = editorSlice.actions;

export default editorSlice.reducer;