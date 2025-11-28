import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditorElement } from '../types/store';

// 초기 상태 (Root 필수)
const rootElement: EditorElement = {
  elementId: 'root',
  id: 'root',
  type: 'Box',
  props: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#ffffff', 
    position: 'relative',
    overflow: 'hidden' 
  },
  children: [],
  parentId: null,
  className: '',
  scripts: [],
  scriptValues: {}
};

const initialState = {
  elements: [rootElement] as EditorElement[],
};

export const elementSlice = createSlice({
  name: 'elements',
  initialState,
  reducers: {
    // ⭐ [수정] 요소 추가 리듀서 (안전장치 강화)
    addElement: (state, action: PayloadAction<EditorElement>) => {
      // 1. 추가하려는 요소의 부모 ID 확인
      let parentId = action.payload.parentId;
      
      // 2. 부모 요소 찾기
      let parent = state.elements.find(el => el.elementId === parentId);

      // ⚠️ 부모를 못 찾았으면? -> 무조건 Root로 보냄 (비상 대책)
      if (!parent) {
        console.warn(`Parent(${parentId}) not found. Fallback to 'root'.`);
        parentId = 'root';
        parent = state.elements.find(el => el.elementId === 'root');
      }

      if (parent) {
        // 3. 요소 추가
        const newElement = { ...action.payload, parentId };
        state.elements.push(newElement);
        
        // 4. 부모의 자식 목록에 ID 등록
        parent.children.push(newElement.elementId);
      }
    },

    // ... (updateElementProps 등 나머지 리듀서는 기존 유지) ...
    updateElementProps: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el) Object.entries(action.payload.props).forEach(([k, v]) => v === undefined ? delete el.props[k] : el.props[k] = v);
    },
    updateElementAttributes: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el) {
            if (action.payload.name === 'id') el.id = action.payload.value;
            if (action.payload.name === 'className') el.className = action.payload.value;
        }
    },
    // ... (스크립트 관련 리듀서 기존 유지) ...
    setElements: (state, action) => { state.elements = action.payload; },
    addScriptToElement: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el && !el.scripts?.includes(action.payload.scriptName)) el.scripts = [...(el.scripts || []), action.payload.scriptName];
    },
    removeScriptFromElement: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el) el.scripts = el.scripts?.filter(s => s !== action.payload.scriptName);
    },
    updateScriptValue: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el) {
            if (!el.scriptValues) el.scriptValues = {};
            if (!el.scriptValues[action.payload.scriptName]) el.scriptValues[action.payload.scriptName] = {};
            el.scriptValues[action.payload.scriptName][action.payload.fieldName] = action.payload.value;
        }
    },
    resetScriptValues: (state, action) => {
        const el = state.elements.find(e => e.elementId === action.payload.id);
        if (el && el.scriptValues) el.scriptValues[action.payload.scriptName] = {};
    },
  },
});

export const { 
  addElement, setElements, updateElementProps, updateElementAttributes,
  addScriptToElement, removeScriptFromElement, updateScriptValue, resetScriptValues 
} = elementSlice.actions;

export default elementSlice.reducer;