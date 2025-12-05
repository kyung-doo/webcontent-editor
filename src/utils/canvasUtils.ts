// --- Clone Helper (내부 사용) ---

import { EditorElement } from "../types/store";

// 반환 타입을 명확히 하여 호출부 오류 방지
export const cloneElementsHierarchy = (
  allElements: EditorElement[],
  targetIds: string[],
  newParentId: string,
  offset: { x: number; y: number }
) => {
  const newElements: EditorElement[] = [];
  const idMap: { [key: string]: string } = {}; // OldID -> NewID
  const targetSet = new Set(targetIds);

  // 루트만 필터링 (부모가 선택된 자식은 제외)
  const rootTargets = allElements.filter(
    (el) =>
      targetSet.has(el.elementId) &&
      (!el.parentId || !targetSet.has(el.parentId))
  );

  const cloneRecursive = (
    el: EditorElement,
    parentId: string,
    isRoot: boolean
  ): EditorElement => {
    const newId =
      Date.now().toString() + Math.random().toString(36).substr(2, 5);
    // 루트 요소일 경우 idMap에 매핑 정보 저장
    if (isRoot) {
      idMap[el.elementId] = newId;
    }

    let newLeft = el.props.left;
    let newTop = el.props.top;

    if (isRoot) {
      const currentLeft = parseFloat(el.props.left || 0);
      const currentTop = parseFloat(el.props.top || 0);
      newLeft = `${currentLeft + offset.x}px`;
      newTop = `${currentTop + offset.y}px`;
    }

    const newEl: EditorElement = {
      ...el,
      elementId: newId,
      id: "",
      parentId: parentId,
      children: [],
      props: { ...el.props, left: newLeft, top: newTop },
    };
    newElements.push(newEl);

    if (el.children) {
      el.children.forEach((childId) => {
        const child = allElements.find((e) => e.elementId === childId);
        if (child) {
          const newChild = cloneRecursive(child, newId, false);
          newEl.children.push(newChild.elementId);
        }
      });
    }
    return newEl;
  };

  rootTargets.forEach((target) => cloneRecursive(target, newParentId, true));
  return { newElements, idMap }; // 객체 형태로 반환
};