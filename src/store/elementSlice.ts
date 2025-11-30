import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EditorElement {
  elementId: string;
  id?: string;
  type: 'Box' | 'Text' | 'Image';
  props: { [key: string]: any };
  scripts?: string[];
  scriptValues?: { [scriptName: string]: { [fieldName: string]: any } };
  className?: string;
  children: string[];
  parentId: string | null;
}

interface ElementState {
  elements: EditorElement[];
}

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

const initialState: ElementState = {
  elements: [rootElement],
};

export const elementSlice = createSlice({
  name: 'elements',
  initialState,
  reducers: {
    // 1. 요소 추가
    addElement: (state, action: PayloadAction<EditorElement>) => {
      let parentId = action.payload.parentId;
      // 부모가 없거나 유효하지 않으면 Root로 강제
      let parent = state.elements.find(el => el.elementId === parentId);
      if (!parent) {
        parentId = 'root';
        parent = state.elements.find(el => el.elementId === 'root');
      }
      
      if (parent) {
        const newElement = { ...action.payload, parentId };
        state.elements.push(newElement);
        parent.children.push(newElement.elementId);
      }
    },
    
    // 2. 요소 이동
    moveElements: (state, action: PayloadAction<{ ids: string[], dx: number, dy: number }>) => {
      const { ids, dx, dy } = action.payload;
      state.elements.forEach(el => {
        if (ids.includes(el.elementId)) {
          const currentLeft = parseFloat(el.props.left || 0);
          const currentTop = parseFloat(el.props.top || 0);
          el.props.left = `${currentLeft + dx}px`;
          el.props.top = `${currentTop + dy}px`;
        }
      });
    },

    // ⭐ [수정] 요소 삭제 (부모와의 연결 고리 확실히 끊기)
    deleteElements: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = action.payload;
      if (idsToDelete.length === 0) return;

      // A. 모든 요소들의 children 배열에서 삭제할 ID를 제거
      // (부모가 누구였든 상관없이 확실하게 끊어냄)
      state.elements.forEach(el => {
        if (el.children && el.children.length > 0) {
          el.children = el.children.filter(childId => !idsToDelete.includes(childId));
        }
      });

      // B. 요소 목록에서 삭제 (자신 제거)
      state.elements = state.elements.filter(el => !idsToDelete.includes(el.elementId));
    },

    // ⭐ [핵심 수정] 그룹화 (중복 키 에러 해결)
    groupElements: (state, action: PayloadAction<{ newGroup: EditorElement, memberIds: string[] }>) => {
      const { newGroup, memberIds } = action.payload;
      if (memberIds.length === 0) return;

      // 1. [준비] 새 그룹을 먼저 State에 등록
      // (아직 자식은 비어있음)
      state.elements.push(newGroup);

      // 2. [연결] 새 그룹을 현재 활성 컨테이너(부모)의 자식으로 등록
      const groupParent = state.elements.find(el => el.elementId === newGroup.parentId);
      if (groupParent) {
        groupParent.children.push(newGroup.elementId);
      }

      // 3. [이동] 멤버들을 하나씩 처리 (기존 부모에서 제거 -> 새 그룹으로 이동)
      const groupLeft = parseFloat(newGroup.props.left);
      const groupTop = parseFloat(newGroup.props.top);

      // Immer를 쓰므로 state.elements를 직접 수정해도 안전함
      // 하지만 forEach 돌면서 splice 하면 인덱스가 꼬일 수 있으므로 주의
      // 여기서는 요소 자체를 수정하므로 괜찮음.

      // 멤버 ID들을 순회하며 처리
      memberIds.forEach(memberId => {
          const member = state.elements.find(el => el.elementId === memberId);
          if (!member) return;

          // A. 기존 부모 찾아서 자식 목록에서 제거
          if (member.parentId) {
              const oldParent = state.elements.find(p => p.elementId === member.parentId);
              if (oldParent) {
                  const idx = oldParent.children.indexOf(memberId);
                  if (idx > -1) {
                      oldParent.children.splice(idx, 1); // 확실하게 제거
                  }
              }
          }

          // B. 멤버의 부모를 새 그룹으로 변경
          member.parentId = newGroup.elementId;

          // C. 좌표 보정 (절대 -> 상대)
          const oldLeft = parseFloat(member.props.left || 0);
          const oldTop = parseFloat(member.props.top || 0);
          member.props.left = `${oldLeft - groupLeft}px`;
          member.props.top = `${oldTop - groupTop}px`;
      });

      // 4. [완료] 새 그룹의 자식 목록 채우기 (한방에)
      // (위 루프에서 push하지 않고, 여기서 한 번에 할당하여 반응성 최적화)
      const addedGroup = state.elements.find(el => el.elementId === newGroup.elementId);
      if (addedGroup) {
          addedGroup.children = [...memberIds];
      }
    },

    setElements: (state, action: PayloadAction<EditorElement[]>) => { state.elements = action.payload; },
    updateElementProps: (state, action: PayloadAction<{ id: string, props: any }>) => {
      const el = state.elements.find(e => e.elementId === action.payload.id);
      if (el) Object.entries(action.payload.props).forEach(([k, v]) => v === undefined ? delete el.props[k] : el.props[k] = v);
    },
    updateElementAttributes: (state, action: PayloadAction<{ id: string, name: string, value: string }>) => {
      const el = state.elements.find(e => e.elementId === action.payload.id);
      if (el) {
        if (action.payload.name === 'id') el.id = action.payload.value;
        if (action.payload.name === 'className') el.className = action.payload.value;
      }
    },
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
  addScriptToElement, removeScriptFromElement, updateScriptValue, resetScriptValues,
  moveElements, deleteElements, groupElements 
} = elementSlice.actions;

export default elementSlice.reducer;