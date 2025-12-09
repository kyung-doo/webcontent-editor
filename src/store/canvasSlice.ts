import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MIN_ZOOM, MAX_ZOOM } from "../constants";
import { CanvasSettings, EditorElement } from "../types/store";

interface CanvasState {
  canvasSettings: CanvasSettings;
  selectedIds: string[]; // 배열
  selectedElementId: string | null; // 호환성용
  activeContainerId: string;
  currentTool: "select" | "scale" | "hand";
  clipboard: EditorElement[];
}

const initialState: CanvasState = {
  canvasSettings: {
    width: 800,
    height: 800,
    backgroundColor: "#f0f0f0",
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
    // [추가] 브레이크포인트 상태 관리
    breakpoints: [
      { id: "pc", name: "PC", width: 1920, height: 1080 },
      { id: "tablet", name: "Tablet", width: 1024, height: 768 },
      { id: "mobile", name: "Mobile", width: 375, height: 812 },
    ],
  },
  selectedIds: [],
  selectedElementId: null,
  activeContainerId: "root",
  currentTool: "select",
  clipboard: [],
};

export const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    updateCanvasSettings: (
      state,
      action: PayloadAction<Partial<CanvasSettings>>
    ) => {
      if (action.payload.zoom) {
        action.payload.zoom = Math.max(
          MIN_ZOOM,
          Math.min(action.payload.zoom, MAX_ZOOM)
        );
      }
      state.canvasSettings = { ...state.canvasSettings, ...action.payload };
    },

    // ⭐ [수정] 선택 액션 (객체 형태 지원)
    selectElement: (
      state,
      action: PayloadAction<{ id: string; multiple: boolean } | null>
    ) => {
      if (!action.payload) {
        state.selectedIds = [];
        state.selectedElementId = null;
        return;
      }

      const { id, multiple } = action.payload;

      if (multiple) {
        if (state.selectedIds.includes(id)) {
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        } else {
          state.selectedIds.push(id);
        }
      } else {
        state.selectedIds = [id];
      }
      state.selectedElementId =
        state.selectedIds.length > 0
          ? state.selectedIds[state.selectedIds.length - 1]
          : null;
    },

    selectMultipleElements: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
      state.selectedElementId =
        action.payload.length > 0 ? action.payload[0] : null;
    },

    enterContainer: (state, action: PayloadAction<string>) => {
      state.activeContainerId = action.payload;
      state.selectedIds = [];
      state.selectedElementId = null;
    },

    setActiveContainer: (state, action: PayloadAction<string>) => {
      state.activeContainerId = action.payload;
      state.selectedIds = [];
      state.selectedElementId = null;
    },

    setTool: (state, action: PayloadAction<"select" | "scale" | "hand">) => {
      state.currentTool = action.payload;
    },

    setCanvasState: (state, action: PayloadAction<CanvasState>) => {
      state.canvasSettings = action.payload.canvasSettings;
      state.activeContainerId = action.payload.activeContainerId || "root";
      state.selectedIds = [];
      state.selectedElementId = null;
    },
    copyToClipboard: (state, action: PayloadAction<EditorElement[]>) => {
      state.clipboard = action.payload;
    },
  },
});

export const {
  updateCanvasSettings,
  selectElement,
  selectMultipleElements,
  enterContainer,
  setActiveContainer,
  setTool,
  setCanvasState,
  copyToClipboard,
} = canvasSlice.actions;

export default canvasSlice.reducer;