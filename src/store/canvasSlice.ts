import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasSettings } from '../types/store';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

interface CanvasState {
  canvasSettings: CanvasSettings;
  selectedElementId: string | null;
  activeContainerId: string;
}

const initialState: CanvasState = {
  canvasSettings: { width: 1024, height: 800, backgroundColor: '#f0f0f0', zoom: 1, scrollX: 0, scrollY: 0 },
  selectedElementId: null,
  activeContainerId: 'root',
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    updateCanvasSettings: (state, action: PayloadAction<Partial<CanvasSettings>>) => {
      if (action.payload.zoom) {
        action.payload.zoom = Math.max(MIN_ZOOM, Math.min(action.payload.zoom, MAX_ZOOM));
      }
      state.canvasSettings = { ...state.canvasSettings, ...action.payload };
    },

    selectElement: (state, action: PayloadAction<string | null>) => {
      state.selectedElementId = action.payload;
    },

    // ⭐ [수정] 컨테이너 진입 시 리셋 로직 제거
    enterContainer: (state, action: PayloadAction<string>) => {
      state.activeContainerId = action.payload;
      state.selectedElementId = null;
      
      // ❌ 삭제: 여기서 0,0으로 초기화하던 코드를 지웁니다.
      // state.canvasSettings.scrollX = 0;
      // state.canvasSettings.scrollY = 0;
      // state.canvasSettings.zoom = 1;
      
      // 대신, 좌표 이동은 컴포넌트(RuntimeElement)에서 계산해서 updateCanvasSettings로 넘겨줍니다.
    },

    setActiveContainer: (state, action: PayloadAction<string>) => {
      state.activeContainerId = action.payload;
      state.selectedElementId = null;
    },

    setCanvasState: (state, action: PayloadAction<CanvasState>) => {
      state.canvasSettings = action.payload.canvasSettings;
      state.activeContainerId = action.payload.activeContainerId || 'root';
      state.selectedElementId = null;
    }
  },
});

export const { 
  updateCanvasSettings, selectElement, enterContainer, setActiveContainer, setCanvasState 
} = canvasSlice.actions;

export default canvasSlice.reducer;