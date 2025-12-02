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

export const elementSlice = createSlice({
  name: "elements",
  initialState,
  reducers: {
    // 1. Add Single Element
    addElement: (state, action: PayloadAction<EditorElement>) => {
      let parentId = action.payload.parentId;
      let parent = state.elements.find((el) => el.elementId === parentId);

      // Default to root if parent not found
      if (!parent) {
        parentId = "root";
        parent = state.elements.find((el) => el.elementId === "root");
      }

      if (parent) {
        const newElement = { ...action.payload, parentId };
        // Ensure uniqueness
        if (!state.elements.find((e) => e.elementId === newElement.elementId)) {
          state.elements.push(newElement);
          if (!parent.children.includes(newElement.elementId)) {
            parent.children.push(newElement.elementId);
          }
        }
      }
    },

    // 2. Add Multiple Elements (Paste/Clone)
    addElements: (state, action: PayloadAction<EditorElement[]>) => {
      const newElements = action.payload;
      newElements.forEach((el) => {
        // Prevent duplicate elements
        if (!state.elements.find((e) => e.elementId === el.elementId)) {
          state.elements.push(el);

          if (el.parentId) {
            const parent = state.elements.find(
              (p) => p.elementId === el.parentId
            );
            if (parent) {
              if (!parent.children.includes(el.elementId)) {
                parent.children.push(el.elementId);
              }
            }
          }
        }
      });
    },

    // 3. Move Elements (Relative)
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

    // 4. Set Position (Absolute)
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

    // ⭐ 5. Delete Elements
    deleteElements: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = action.payload;
      if (idsToDelete.length === 0) return;

      // Remove references from ALL parents' children arrays
      state.elements.forEach((el) => {
        if (el.children && el.children.length > 0) {
          el.children = el.children.filter(
            (childId) => !idsToDelete.includes(childId)
          );
        }
      });

      // Remove the elements themselves
      state.elements = state.elements.filter(
        (el) => !idsToDelete.includes(el.elementId)
      );
    },

    // ⭐ 6. Group Elements (Fix Duplicate Keys)
    groupElements: (
      state,
      action: PayloadAction<{ newGroup: EditorElement; memberIds: string[] }>
    ) => {
      const { newGroup, memberIds } = action.payload;
      if (memberIds.length === 0) return;

      // A. Detach members from ANY existing parent
      state.elements.forEach((parent) => {
        if (parent.children && parent.children.length > 0) {
          parent.children = parent.children.filter(
            (childId) => !memberIds.includes(childId)
          );
        }
      });

      // B. Add new group
      if (!state.elements.find((e) => e.elementId === newGroup.elementId)) {
        state.elements.push(newGroup);
      }

      // C. Attach group to current parent
      const groupParent = state.elements.find(
        (el) => el.elementId === newGroup.parentId
      );
      if (groupParent) {
        if (!groupParent.children.includes(newGroup.elementId)) {
          groupParent.children.push(newGroup.elementId);
        }
      }

      // D. Move members into group
      const groupLeft = parseFloat(newGroup.props.left);
      const groupTop = parseFloat(newGroup.props.top);

      const addedGroup = state.elements.find(
        (el) => el.elementId === newGroup.elementId
      );

      memberIds.forEach((memberId) => {
        const el = state.elements.find((e) => e.elementId === memberId);
        if (el && addedGroup) {
          el.parentId = newGroup.elementId;

          if (!addedGroup.children.includes(el.elementId)) {
            addedGroup.children.push(el.elementId);
          }

          // Adjust coordinates to be relative to group
          const oldLeft = parseFloat(el.props.left || 0);
          const oldTop = parseFloat(el.props.top || 0);
          el.props.left = `${oldLeft - groupLeft}px`;
          el.props.top = `${oldTop - groupTop}px`;
        }
      });
    },

    // 7. Ungroup Elements
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
            const groupLeft = parseFloat(group.props.left || 0);
            const groupTop = parseFloat(group.props.top || 0);

            group.children.forEach((childId) => {
              const child = state.elements.find(
                (el) => el.elementId === childId
              );
              if (child) {
                child.parentId = parent.elementId;

                const childLeft = parseFloat(child.props.left || 0);
                const childTop = parseFloat(child.props.top || 0);
                child.props.left = `${groupLeft + childLeft}px`;
                child.props.top = `${groupTop + childTop}px`;

                if (!parent.children.includes(childId)) {
                  parent.children.push(childId);
                }
              }
            });
            // Remove group from parent
            parent.children = parent.children.filter((id) => id !== groupId);
            groupsToDelete.push(groupId);
          }
        }
      });

      // Delete group elements
      state.elements = state.elements.filter(
        (el) => !groupsToDelete.includes(el.elementId)
      );
    },

    // Setters
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

    // 요소 크기 및 위치 업데이트 (단일/그룹 본체용)
    resizeElement: (
      state,
      action: PayloadAction<{id: string; left: number; top: number; width: number; height: number; }>
    ) => {
      const { id, left, top, width, height } = action.payload;
      const el = state.elements.find((e) => e.elementId === id);
      if (el) {
        el.props.left = `${left}px`;
        el.props.top = `${top}px`;
        el.props.width = `${width}px`;
        el.props.height = `${height}px`;
      }
    },

    // 앵커 포인트 설정
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

    // 그룹 스케일링 (자식들까지 비율대로 조절)
    scaleGroupChildren: (
      state,
      action: PayloadAction<{ groupId: string; scaleX: number; scaleY: number }>
    ) => {
      const { groupId, scaleX, scaleY } = action.payload;

      // 재귀적으로 자식들 업데이트
      const updateChildren = (parentId: string) => {
        const children = state.elements.filter(
          (el) => el.parentId === parentId
        );

        children.forEach((child) => {
          // 1. 위치 보정 (상대 좌표 * 스케일)
          const oldLeft = parseFloat(child.props.left || 0);
          const oldTop = parseFloat(child.props.top || 0);
          child.props.left = `${oldLeft * scaleX}px`;
          child.props.top = `${oldTop * scaleY}px`;

          // 2. 크기 보정
          const oldWidth = parseFloat(child.props.width || 0);
          const oldHeight = parseFloat(child.props.height || 0);

          // 텍스트/이미지 등 자동 크기가 아닌 경우만
          if (oldWidth) child.props.width = `${oldWidth * scaleX}px`;
          if (oldHeight) child.props.height = `${oldHeight * scaleY}px`;

          // 3. 폰트 사이즈 보정 (단순하게 scaleY 기준 or 평균)
          if (child.type === "Text") {
            const oldFontSize = parseFloat(child.props.fontSize || 16);
            // 텍스트는 보통 높이 비율을 따라감
            child.props.fontSize = `${oldFontSize * scaleY}px`;
          }

          // 4. 재귀 호출 (자식의 자식)
          if (child.type === "Box") {
            updateChildren(child.elementId);
          }
        });
      };

      updateChildren(groupId);
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
  resizeElement, 
  setElementAnchor, 
  scaleGroupChildren
} = elementSlice.actions;

export default elementSlice.reducer;
