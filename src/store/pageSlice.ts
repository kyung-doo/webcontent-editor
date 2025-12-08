import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Page {
  pageId: string;
  name: string;
  rootElementId: string; // 이 페이지가 보여줄 최상위 요소의 ID
}

interface PageState {
  pages: Page[];
  activePageId: string;
}

const initialState: PageState = {
  pages: [
    // 초기 페이지: elementSlice의 초기값인 'root' 요소를 바라봅니다.
    { pageId: "page-1", name: "Page 1", rootElementId: "root" },
  ],
  activePageId: "page-1",
};

const pageSlice = createSlice({
  name: "page",
  initialState,
  reducers: {
    addPage: (state, action: PayloadAction<Page>) => {
      state.pages.push(action.payload);
    },
    deletePage: (state, action: PayloadAction<string>) => {
      const pageId = action.payload;
      state.pages = state.pages.filter((p) => p.pageId !== pageId);
      // 활성 페이지가 삭제되면 첫 번째 페이지로 이동
      if (state.activePageId === pageId && state.pages.length > 0) {
        state.activePageId = state.pages[0].pageId;
      }
    },
    setActivePage: (state, action: PayloadAction<string>) => {
      state.activePageId = action.payload;
    },
    updatePageName: (
      state,
      action: PayloadAction<{ pageId: string; name: string }>
    ) => {
      const page = state.pages.find((p) => p.pageId === action.payload.pageId);
      if (page) {
        page.name = action.payload.name;
      }
    },
    setPages: (state, action: PayloadAction<Page[]>) => {
      state.pages = action.payload;
    },
  },
});

export const { addPage, deletePage, setActivePage, updatePageName, setPages } =
  pageSlice.actions;
export default pageSlice.reducer;
