import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- Types & Interfaces ---
// FontManager 컴포넌트와 호환되도록 인터페이스 확장
export interface Font {
  id: string; // FontManager는 id를 string으로 사용 (예: "cdn-1234")
  name: string;
  family: string; // 실제 CSS 적용을 위한 font-family 이름
  type?: 'local' | 'cdn';
  category?: string;
  url?: string;
  source?: string;
  format?: string;
}

export interface FontState {
  fonts: Font[];
  activeFont: string;
  previewFont: string;
  searchTerm: string;
}

const initialState: FontState = {
  fonts: [], // 초기값은 비워두거나 기본 폰트 설정
  activeFont: 'Inter',
  previewFont: 'Inter',
  searchTerm: '',
};

// --- Redux Toolkit Slice ---

export const fontSlice = createSlice({
  name: 'font',
  initialState,
  reducers: {
    setActiveFont: (state, action: PayloadAction<string>) => {
      state.activeFont = action.payload;
      state.previewFont = action.payload; // 활성화 시 프리뷰도 동기화
    },
    setPreviewFont: (state, action: PayloadAction<string>) => {
      state.previewFont = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },

    setFonts: (state, action: PayloadAction<Font[]>) => {
      state.fonts = [...action.payload];
    },
    
    // [추가] 폰트 목록에 새 폰트 추가
    addFont: (state, action: PayloadAction<Font>) => {
      // 중복 방지 (이름 기준)
      const exists = state.fonts.find(f => f.name === action.payload.name);
      if (!exists) {
        state.fonts.push(action.payload);
      }
    },

    // [추가] 폰트 목록에서 제거
    removeFont: (state, action: PayloadAction<string>) => {
      const fontId = action.payload;
      // 만약 현재 사용 중인 폰트를 삭제한다면, 기본 폰트로 되돌림
      const targetFont = state.fonts.find(f => f.id === fontId);
      if (targetFont && state.activeFont === targetFont.name) {
        state.activeFont = 'Inter';
        state.previewFont = 'Inter';
      }
      
      state.fonts = state.fonts.filter(font => font.id !== fontId);
    },
  },
});

// Actions Export
export const { 
  setActiveFont, 
  setPreviewFont, 
  setSearchTerm, 
  addFont, 
  removeFont,
  setFonts
} = fontSlice.actions;

export default fontSlice.reducer;