import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface EditorElement {
  elementId: string;
  id?: string;
  type: "Box" | "Text" | "Image";
  props: { [key: string]: any };
  scripts?: string[];
  scriptValues?: { [scriptName: string]: { [fieldName: string]: any } };
  className?: string;
  children: string[];
  parentId: string | null;
  originalId?: string; // 복제 시 원본 ID 추적용

  isVisible?: boolean; // 레이어 보임 숨김
  isLocked?: boolean; // 레이어 잠금
  isExpanded?: boolean; // 레이어 자식계층 펼침 유무
}

// [변경] 배열 대신 객체(Map) 구조 사용
interface ElementState {
  elements: Record<string, EditorElement>;
}

// 초기 앱 실행 시 기본으로 존재하는 Root 요소
const rootElement: EditorElement = {
  elementId: "root",
  type: "Box",
  props: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    position: "relative",
    overflow: "hidden",
  },
  children: [],
  parentId: null,
  className: "",
  scripts: [],
  scriptValues: {},
  isVisible: true,
  isLocked: false,
  isExpanded: true,
};

// [변경] 초기 상태를 객체 형태로 정의
const initialState: ElementState = {
  elements: {
    root: rootElement,
  },
};

// [최적화] 전체 요소를 뒤지지 않고, 부모의 children ID만 순회
const resizeChildrenRecursively = (
  elementsMap: Record<string, EditorElement>,
  parentId: string,
  scaleX: number,
  scaleY: number
) => {
  const parent = elementsMap[parentId];
  if (!parent) return;

  parent.children.forEach((childId) => {
    const child = elementsMap[childId];
    if (!child) return;

    const oldLeft = parseFloat(child.props.left || 0);
    const oldTop = parseFloat(child.props.top || 0);
    child.props.left = `${oldLeft * scaleX}px`;
    child.props.top = `${oldTop * scaleY}px`;

    const oldWidth = parseFloat(child.props.width || 0);
    const oldHeight = parseFloat(child.props.height || 0);
    if (oldWidth > 0) child.props.width = `${oldWidth * scaleX}px`;
    if (oldHeight > 0) child.props.height = `${oldHeight * scaleY}px`;

    if (child.type === "Text" && child.props.fontSize) {
      const oldFontSize = parseFloat(child.props.fontSize);
      if (oldFontSize > 0) child.props.fontSize = `${oldFontSize * scaleY}px`;
    }

    if (child.children.length > 0) {
      resizeChildrenRecursively(elementsMap, child.elementId, scaleX, scaleY);
    }
  });
};

export const elementSlice = createSlice({
  name: "elements",
  initialState,
  reducers: {
    addElement: (state, action: PayloadAction<EditorElement>) => {
      const newElement = action.payload;
      const parentId = newElement.parentId;

      // 1. 이미 존재하는 ID인지 확인 (O(1))
      if (state.elements[newElement.elementId]) return;

      if (parentId) {
        // 2. 부모 요소 찾기 (O(1))
        const parent = state.elements[parentId];

        if (parent) {
          // 객체에 요소 추가
          state.elements[newElement.elementId] = newElement;
          // 부모의 children 배열에 ID 추가
          if (!parent.children.includes(newElement.elementId)) {
            parent.children.push(newElement.elementId);
          }
        } else {
          console.warn(`[ElementSlice] Parent ${parentId} not found.`);
        }
      } else {
        // 부모가 없는 경우 (Root 등)
        state.elements[newElement.elementId] = newElement;
      }
    },

    moveElements: (
      state,
      action: PayloadAction<{ ids: string[]; dx: number; dy: number }>
    ) => {
      const { ids, dx, dy } = action.payload;
      ids.forEach((id) => {
        const el = state.elements[id]; // O(1) 접근
        if (el) {
          const currentLeft = parseFloat(el.props.left || 0);
          const currentTop = parseFloat(el.props.top || 0);
          el.props.left = `${currentLeft + dx}px`;
          el.props.top = `${currentTop + dy}px`;
        }
      });
    },

    deleteElements: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = action.payload;
      
      idsToDelete.forEach((id) => {
        const el = state.elements[id];
        if (!el) return;

        // 1. 부모의 children 목록에서 제거 (O(1) 접근)
        if (el.parentId) {
          const parent = state.elements[el.parentId];
          if (parent) {
            parent.children = parent.children.filter((cid) => cid !== id);
          }
        }

        // 2. 객체에서 삭제
        delete state.elements[id];
        
        // (선택 사항) 만약 자식 요소들도 재귀적으로 다 지워야 한다면 여기서 처리 가능
        // 현재 구조상으로는 자식들도 idsToDelete에 포함되어 들어오거나, 
        // 화면에서만 안 보이고 데이터는 남을 수 있으므로 가비지 컬렉션 로직이 필요할 수 있음.
      });
    },

    groupElements: (
      state,
      action: PayloadAction<{ newGroup: EditorElement; memberIds: string[] }>
    ) => {
      const { newGroup, memberIds } = action.payload;
      const uniqueMemberIds = [...new Set(memberIds)];
      if (uniqueMemberIds.length === 0) return;

      // 1. 새 그룹 생성
      if (!state.elements[newGroup.elementId]) {
        state.elements[newGroup.elementId] = newGroup;
      }
      const addedGroup = state.elements[newGroup.elementId];

      // 2. 그룹을 부모(Root 등)에 연결
      if (newGroup.parentId) {
        const groupParent = state.elements[newGroup.parentId];
        if (groupParent && !groupParent.children.includes(newGroup.elementId)) {
            groupParent.children.push(newGroup.elementId);
        }
      }

      // 3. 멤버 처리
      const groupLeft = parseFloat(newGroup.props.left);
      const groupTop = parseFloat(newGroup.props.top);

      uniqueMemberIds.forEach((memberId) => {
        const el = state.elements[memberId];
        if (el) {
          // 기존 부모에서 연결 해제
          if (el.parentId) {
            const oldParent = state.elements[el.parentId];
            if (oldParent) {
              oldParent.children = oldParent.children.filter((c) => c !== memberId);
            }
          }

          // 새 그룹에 연결
          el.parentId = newGroup.elementId;
          if (!addedGroup.children.includes(memberId)) {
            addedGroup.children.push(memberId);
          }

          // 좌표 보정
          const oldLeft = parseFloat(el.props.left || 0);
          const oldTop = parseFloat(el.props.top || 0);
          el.props.left = `${oldLeft - groupLeft}px`;
          el.props.top = `${oldTop - groupTop}px`;
        }
      });
    },

    ungroupElements: (state, action: PayloadAction<string[]>) => {
      const groupIds = action.payload;
      
      groupIds.forEach((groupId) => {
        const group = state.elements[groupId];
        if (!group || group.type !== "Box") return;

        const parentId = group.parentId;
        if (!parentId) return; // 부모가 없으면 해제 불가

        const parent = state.elements[parentId];
        if (!parent) return;

        const gL = parseFloat(group.props.left || 0);
        const gT = parseFloat(group.props.top || 0);

        // 그룹의 자식들을 원래 부모로 이동
        // (배열 복사본을 만들어 순회, 원본 수정 방지)
        [...group.children].forEach((childId) => {
          const child = state.elements[childId];
          if (child) {
            child.parentId = parentId;
            const cL = parseFloat(child.props.left || 0);
            const cT = parseFloat(child.props.top || 0);
            
            child.props.left = `${gL + cL}px`;
            child.props.top = `${gT + cT}px`;

            if (!parent.children.includes(childId)) {
              parent.children.push(childId);
            }
          }
        });

        // 그룹 삭제 및 부모에서 제거
        parent.children = parent.children.filter((id) => id !== groupId);
        delete state.elements[groupId];
      });
    },

    addElements: (state, action: PayloadAction<EditorElement[]>) => {
      const newElements = action.payload;
      newElements.forEach((el) => {
        if (!state.elements[el.elementId]) {
          state.elements[el.elementId] = el;
          
          if (el.parentId) {
            const p = state.elements[el.parentId];
            if (p && !p.children.includes(el.elementId)) {
              p.children.push(el.elementId);
            }
          }
        }
      });
    },

    resizeElements: (
      state,
      action: PayloadAction<
        {
          id: string;
          left: number;
          top: number;
          width: number;
          height: number;
          fontSize?: number;
          initialWidth?: number;
          initialHeight?: number;
        }[]
      >
    ) => {
      action.payload.forEach(
        ({
          id,
          left,
          top,
          width,
          height,
          fontSize,
          initialWidth,
          initialHeight,
        }) => {
          const el = state.elements[id]; // O(1)
          if (el) {
            let oldW = parseFloat(el.props.width ?? 0);
            let oldH = parseFloat(el.props.height ?? 0);

            const wStr = String(el.props.width);
            const hStr = String(el.props.height);

            if (wStr.includes("%") || wStr === "auto") {
              oldW = initialWidth || width;
            }
            if (hStr.includes("%") || hStr === "auto") {
              oldH = initialHeight || height;
            }

            const scaleX = oldW !== 0 ? width / oldW : 1;
            const scaleY = oldH !== 0 ? height / oldH : 1;

            el.props.left = `${left}px`;
            el.props.top = `${top}px`;
            el.props.width = `${width}px`;
            el.props.height = `${height}px`;

            if (fontSize !== undefined && el.type === "Text") {
              el.props.fontSize = `${fontSize}px`;
            }

            if (el.children.length > 0) {
              resizeChildrenRecursively(state.elements, id, scaleX, scaleY);
            }
          }
        }
      );
    },

    setElementsPositions: (
      state,
      action: PayloadAction<{ id: string; left: string; top: string }[]>
    ) => {
      action.payload.forEach(({ id, left, top }) => {
        const el = state.elements[id];
        if (el) {
          el.props.left = left;
          el.props.top = top;
        }
      });
    },

    setElementAnchor: (
      state,
      action: PayloadAction<{ id: string; x: number; y: number }>
    ) => {
      const el = state.elements[action.payload.id];
      if (el) {
        el.props.anchorX = action.payload.x;
        el.props.anchorY = action.payload.y;
      }
    },

    // [변경] 배열 입력을 객체로 변환하여 저장
    setElements: (state, action: PayloadAction<EditorElement[]>) => {
      const elementsArray = action.payload;
      state.elements = elementsArray.reduce((acc, el) => {
        acc[el.elementId] = el;
        return acc;
      }, {} as Record<string, EditorElement>);
    },

    updateElementProps: (
      state,
      action: PayloadAction<{ id: string; props: any }>
    ) => {
      const el = state.elements[action.payload.id];
      if (el)
        Object.entries(action.payload.props).forEach(([k, v]) =>
          v === undefined ? delete el.props[k] : (el.props[k] = v)
        );
    },

    updateElementAttributes: (
      state,
      action: PayloadAction<{ id: string; name: string; value: string }>
    ) => {
      const el = state.elements[action.payload.id];
      if (el) {
        if (action.payload.name === "id") el.id = action.payload.value;
        if (action.payload.name === "className")
          el.className = action.payload.value;
      }
    },

    addScriptToElement: (state, action) => {
      const el = state.elements[action.payload.id];
      if (el && !el.scripts?.includes(action.payload.scriptName))
        el.scripts = [...(el.scripts || []), action.payload.scriptName];
    },

    removeScriptFromElement: (state, action) => {
      const el = state.elements[action.payload.id];
      if (el)
        el.scripts = el.scripts?.filter((s) => s !== action.payload.scriptName);
    },

    updateScriptValue: (state, action) => {
      const el = state.elements[action.payload.id];
      if (el) {
        if (!el.scriptValues) el.scriptValues = {};
        if (!el.scriptValues[action.payload.scriptName])
          el.scriptValues[action.payload.scriptName] = {};
        el.scriptValues[action.payload.scriptName][action.payload.fieldName] =
          action.payload.value;
      }
    },

    resetScriptValues: (state, action) => {
      const el = state.elements[action.payload.id];
      if (el && el.scriptValues)
        el.scriptValues[action.payload.scriptName] = {};
    },

    toggleVisibility: (state, action) => {
      const el = state.elements[action.payload];
      if(el) {
        el.isVisible = el.isVisible === undefined ? false : !el.isVisible;
      }
    },

    toggleLock: (state, action) => {
      const el = state.elements[action.payload];
      if(el) {
        el.isLocked = !el.isLocked;
      }
    },

    toggleExpanded: (state, action: PayloadAction<string>) => {
      const el = state.elements[action.payload];
      if (el) {
        el.isExpanded = el.isExpanded === undefined ? true : !el.isExpanded;
      }
    },

    reorderElement: (
      state,
      action: PayloadAction<{
        sourceId: string;
        targetId: string;
        position: "before" | "after" | "inside";
      }>
    ) => {
      const { sourceId, targetId, position } = action.payload;
      const elementId = sourceId;

      // 1. 유효성 검사
      if (elementId === targetId) return;

      // 객체 구조(Map)에 맞게 요소 직접 접근
      const element = state.elements[elementId];
      const target = state.elements[targetId];

      if (!element || !target) return;

      // 순환 참조 방지 (타겟이 이동하려는 요소의 자손인지 확인)
      let current = target;
      while (current.parentId) {
        if (current.parentId === elementId) return;
        // 객체 접근
        current = state.elements[current.parentId];
        if (!current) break;
      }

      // 2. 기존 부모에서 제거
      if (element.parentId) {
        // 객체 접근
        const oldParent = state.elements[element.parentId];
        if (oldParent) {
          oldParent.children = oldParent.children.filter(
            (id) => id !== elementId
          );
        }
      }

      // 3. 새 위치에 추가
      if (position === "inside") {
        // 타겟의 자식으로 추가 (맨 끝)
        target.children.push(elementId);
        element.parentId = targetId;
        target.isExpanded = true; // 이동 시 타겟 그룹 펼치기
      } else {
        // 타겟의 형제로 추가 (위/아래)
        const newParentId = target.parentId;
        if (newParentId) {
          // 객체 접근
          const newParent = state.elements[newParentId];
          if (newParent) {
            const targetIndex = newParent.children.indexOf(targetId);
            if (targetIndex !== -1) {
              const insertIndex =
                position === "after" ? targetIndex + 1 : targetIndex;
              newParent.children.splice(insertIndex, 0, elementId);
              element.parentId = newParentId;
            }
          }
        }
      }
    },

  },
});

export const {
  addElement,
  addElements,
  setElements,
  updateElementProps,
  updateElementAttributes,
  addScriptToElement,
  removeScriptFromElement,
  updateScriptValue,
  resetScriptValues,
  moveElements,
  setElementsPositions,
  deleteElements,
  groupElements,
  ungroupElements,
  resizeElements,
  setElementAnchor,
  toggleVisibility,
  toggleLock,
  toggleExpanded,
  reorderElement
} = elementSlice.actions;

export default elementSlice.reducer;