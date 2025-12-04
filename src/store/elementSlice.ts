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
}

interface ElementState {
  elements: EditorElement[];
}

const rootElement: EditorElement = {
  elementId: "root",
  id: "root",
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
      let parentId = action.payload.parentId;
      let parent = state.elements.find((el) => el.elementId === parentId);
      if (!parent) {
        parentId = "root";
        parent = state.elements.find((el) => el.elementId === "root");
      }
      if (parent) {
        const newElement = { ...action.payload, parentId };
        // 중복 방지
        if (!state.elements.find((e) => e.elementId === newElement.elementId)) {
          state.elements.push(newElement);
          if (!parent.children.includes(newElement.elementId))
            parent.children.push(newElement.elementId);
        }
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

    // ⭐ [수정] 요소 삭제 (연결 고리 끊기)
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

    // ⭐ [수정] 그룹화 (중복 키 방지 로직 강화)
    groupElements: (
      state,
      action: PayloadAction<{ newGroup: EditorElement; memberIds: string[] }>
    ) => {
      const { newGroup, memberIds } = action.payload;
      // ID 중복 제거
      const uniqueMemberIds = [...new Set(memberIds)];
      if (uniqueMemberIds.length === 0) return;

      // 1. [Detach] 기존의 모든 부모에서 멤버 ID 제거 (고아 상태)
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
            // 중복 체크 후 추가
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

    // ⭐ 리사이즈 (다중 - 배치)
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
          initialHeight?: number; // 👈 Canvas에서 넘겨준 실제 픽셀값
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

            // %나 auto일 경우, 실제 픽셀값(initialWidth)을 기준점으로 삼음
            if (wStr.includes("%") || wStr === "auto") {
              oldW = initialWidth || width; // initialWidth가 없으면 현재 바뀐 width라도 씀
            }
            if (hStr.includes("%") || hStr === "auto") {
              oldH = initialHeight || height;
            }

            // 2. 스케일 계산 (0 나누기 방지)
            const scaleX = oldW !== 0 ? width / oldW : 1;
            const scaleY = oldH !== 0 ? height / oldH : 1;

            // 3. 부모 속성 업데이트
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
