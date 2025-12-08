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
}

interface ElementState {
  elements: EditorElement[];
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
};

const initialState: ElementState = {
  elements: [rootElement],
};

// 자식 재귀 리사이즈 헬퍼
const resizeChildrenRecursively = (
  allElements: EditorElement[],
  parentId: string,
  scaleX: number,
  scaleY: number
) => {
  const children = allElements.filter((el) => el.parentId === parentId);
  children.forEach((child) => {
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
      resizeChildrenRecursively(allElements, child.elementId, scaleX, scaleY);
    }
  });
};

export const elementSlice = createSlice({
  name: "elements",
  initialState,
  reducers: {
    addElement: (state, action: PayloadAction<EditorElement>) => {
      const parentId = action.payload.parentId;

      // 1. 부모 요소 찾기
      const parent = state.elements.find((el) => el.elementId === parentId);

      // 💥 [수정] 부모가 없으면 'root'로 보내는 대신, 추가하지 않음 (멀티 페이지 안전성 강화)
      if (parent) {
        const newElement = { ...action.payload, parentId };

        // 중복 ID 방지
        if (!state.elements.find((e) => e.elementId === newElement.elementId)) {
          state.elements.push(newElement);
          if (!parent.children.includes(newElement.elementId)) {
            parent.children.push(newElement.elementId);
          }
        }
      } else if (parentId === null) {
        // 💥 부모가 null인 경우 (예: 새 페이지의 Root 추가) 허용
        state.elements.push(action.payload);
      } else {
        console.warn(
          `[ElementSlice] Parent not found: ${parentId}. Element skipped.`
        );
      }
    },

    moveElements: (
      state,
      action: PayloadAction<{ ids: string[]; dx: number; dy: number }>
    ) => {
      const { ids, dx, dy } = action.payload;
      state.elements.forEach((el) => {
        if (ids.includes(el.elementId)) {
          const currentLeft = parseFloat(el.props.left || 0);
          const currentTop = parseFloat(el.props.top || 0);
          el.props.left = `${currentLeft + dx}px`;
          el.props.top = `${currentTop + dy}px`;
        }
      });
    },

    deleteElements: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = action.payload;
      if (idsToDelete.length === 0) return;

      // 1. 모든 부모의 자식 목록에서 제거
      state.elements.forEach((el) => {
        if (el.children && el.children.length > 0) {
          el.children = el.children.filter(
            (childId) => !idsToDelete.includes(childId)
          );
        }
      });

      // 2. 요소 목록에서 제거
      state.elements = state.elements.filter(
        (el) => !idsToDelete.includes(el.elementId)
      );
    },

    groupElements: (
      state,
      action: PayloadAction<{ newGroup: EditorElement; memberIds: string[] }>
    ) => {
      const { newGroup, memberIds } = action.payload;
      const uniqueMemberIds = [...new Set(memberIds)];
      if (uniqueMemberIds.length === 0) return;

      // 1. [Detach] 기존의 모든 부모에서 멤버 ID 제거
      state.elements.forEach((el) => {
        if (el.children && el.children.length > 0) {
          el.children = el.children.filter(
            (childId) => !uniqueMemberIds.includes(childId)
          );
        }
      });

      // 2. [Create] 새 그룹 추가
      if (!state.elements.find((e) => e.elementId === newGroup.elementId)) {
        state.elements.push(newGroup);
      }

      // 3. [Attach Group] 그룹을 부모에 연결
      const groupParent = state.elements.find(
        (el) => el.elementId === newGroup.parentId
      );
      if (groupParent) {
        if (!groupParent.children.includes(newGroup.elementId)) {
          groupParent.children.push(newGroup.elementId);
        }
      }

      // 4. [Attach Members] 멤버들을 그룹으로 이동
      const groupLeft = parseFloat(newGroup.props.left);
      const groupTop = parseFloat(newGroup.props.top);
      const addedGroup = state.elements.find(
        (el) => el.elementId === newGroup.elementId
      );

      if (addedGroup) {
        uniqueMemberIds.forEach((memberId) => {
          const el = state.elements.find((e) => e.elementId === memberId);
          if (el) {
            el.parentId = newGroup.elementId;
            if (!addedGroup.children.includes(memberId)) {
              addedGroup.children.push(memberId);
            }
            // 좌표 보정 (그룹 내부 상대 좌표로 변환)
            const oldLeft = parseFloat(el.props.left || 0);
            const oldTop = parseFloat(el.props.top || 0);
            el.props.left = `${oldLeft - groupLeft}px`;
            el.props.top = `${oldTop - groupTop}px`;
          }
        });
      }
    },

    ungroupElements: (state, action: PayloadAction<string[]>) => {
      const groupIds = action.payload;
      const groupsToDelete: string[] = [];
      groupIds.forEach((groupId) => {
        const group = state.elements.find((el) => el.elementId === groupId);
        if (group && group.type === "Box") {
          const parent = state.elements.find(
            (el) => el.elementId === group.parentId
          );
          if (parent) {
            const gL = parseFloat(group.props.left || 0);
            const gT = parseFloat(group.props.top || 0);
            group.children.forEach((cid) => {
              const child = state.elements.find((el) => el.elementId === cid);
              if (child) {
                child.parentId = parent.elementId;
                const cL = parseFloat(child.props.left || 0);
                const cT = parseFloat(child.props.top || 0);
                child.props.left = `${gL + cL}px`;
                child.props.top = `${gT + cT}px`;
                if (!parent.children.includes(cid)) parent.children.push(cid);
              }
            });
            parent.children = parent.children.filter((id) => id !== groupId);
            groupsToDelete.push(groupId);
          }
        }
      });
      state.elements = state.elements.filter(
        (el) => !groupsToDelete.includes(el.elementId)
      );
    },

    // 복수 요소 추가 (페이지 추가 시 주로 사용됨)
    addElements: (state, action: PayloadAction<EditorElement[]>) => {
      const newElements = action.payload;
      newElements.forEach((el) => {
        if (!state.elements.find((e) => e.elementId === el.elementId)) {
          state.elements.push(el);
          if (el.parentId) {
            const p = state.elements.find((p) => p.elementId === el.parentId);
            if (p && !p.children.includes(el.elementId))
              p.children.push(el.elementId);
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
          const el = state.elements.find((e) => e.elementId === id);
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
        const el = state.elements.find((e) => e.elementId === id);
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
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el) {
        el.props.anchorX = action.payload.x;
        el.props.anchorY = action.payload.y;
      }
    },

    setElements: (state, action: PayloadAction<EditorElement[]>) => {
      state.elements = action.payload;
    },
    updateElementProps: (
      state,
      action: PayloadAction<{ id: string; props: any }>
    ) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el)
        Object.entries(action.payload.props).forEach(([k, v]) =>
          v === undefined ? delete el.props[k] : (el.props[k] = v)
        );
    },
    updateElementAttributes: (
      state,
      action: PayloadAction<{ id: string; name: string; value: string }>
    ) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el) {
        if (action.payload.name === "id") el.id = action.payload.value;
        if (action.payload.name === "className")
          el.className = action.payload.value;
      }
    },
    addScriptToElement: (state, action) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el && !el.scripts?.includes(action.payload.scriptName))
        el.scripts = [...(el.scripts || []), action.payload.scriptName];
    },
    removeScriptFromElement: (state, action) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el)
        el.scripts = el.scripts?.filter((s) => s !== action.payload.scriptName);
    },
    updateScriptValue: (state, action) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el) {
        if (!el.scriptValues) el.scriptValues = {};
        if (!el.scriptValues[action.payload.scriptName])
          el.scriptValues[action.payload.scriptName] = {};
        el.scriptValues[action.payload.scriptName][action.payload.fieldName] =
          action.payload.value;
      }
    },
    resetScriptValues: (state, action) => {
      const el = state.elements.find((e) => e.elementId === action.payload.id);
      if (el && el.scriptValues)
        el.scriptValues[action.payload.scriptName] = {};
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
} = elementSlice.actions;

export default elementSlice.reducer;
