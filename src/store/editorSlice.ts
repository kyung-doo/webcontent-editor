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
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
}

const initialState: EditorState = {
  elements: [],
  selectedId: null,
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
  },
});

export const { addElement, selectElement, updateSelectedElement } = editorSlice.actions;
export default editorSlice.reducer;