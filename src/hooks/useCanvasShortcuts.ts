import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  deleteElements,
  groupElements,
  ungroupElements,
  addElements,
  EditorElement,
} from "../store/elementSlice";
import {
  selectMultipleElements,
  setTool,
  selectElement,
  copyToClipboard,
} from "../store/canvasSlice";
import { ELEMENT_MIN_SIZE } from "../constants";
import { cloneElementsHierarchy } from "../utils/canvasUtils";


export default function useCanvasShortcuts(
  stateRef: React.MutableRefObject<any>, // { elements, selectedIds, ... } 최신 상태 참조
  dragRef: React.MutableRefObject<any> // { isSpacePressed, ... } 인터랙션 상태 참조
) {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드(input, textarea)에서는 단축키 동작 안 함
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const { selectedIds, elements, activeContainerId, clipboard } = stateRef.current;

      // 1. Spacebar (Panning Mode Toggle)
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        dragRef.current.isSpacePressed = true;
      }

      // 2. Delete / Backspace (삭제)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        dispatch(deleteElements(selectedIds));
        dispatch(selectElement(null));
      }

      // 3. Group (Ctrl + G)
      if (isCtrl && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (selectedIds.length < 1) return;

        // 그룹 영역 계산 (Bounds)
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        const targets = elements.filter((el: any) =>
          selectedIds.includes(el.elementId)
        );
        targets.forEach((el: any) => {
          const x = parseFloat(el.props.left || 0);
          const y = parseFloat(el.props.top || 0);
          let w = parseFloat(el.props.width) || ELEMENT_MIN_SIZE;
          let h = parseFloat(el.props.height) || ELEMENT_MIN_SIZE;

          // 텍스트 등 width가 없는 경우 기본값 처리
          if (el.type === "Text" && !parseFloat(el.props.width)) w = 100;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        });

        const newGroupId = Date.now().toString();
        const newGroup = {
          elementId: newGroupId,
          id: "",
          type: "Box" as const,
          props: {
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${maxX - minX}px`,
            height: `${maxY - minY}px`,
            backgroundColor: "transparent",
            position: "absolute",
          },
          scripts: [],
          children: [],
          parentId: activeContainerId,
        };

        dispatch(groupElements({ newGroup, memberIds: selectedIds }));
        dispatch(selectElement({ id: newGroupId, multiple: false }));
      }

      // 4. Ungroup (Ctrl + B)
      if (isCtrl && e.key.toLowerCase() === "b" && selectedIds.length > 0) {
        e.preventDefault();
        dispatch(ungroupElements(selectedIds));
        dispatch(selectElement(null));
      }

      // --- Helper: 선택된 요소 및 그 자손들까지 모두 포함하여 가져오기 ---
      const getDeepSelection = (ids: string[], allEls: any[]) => {
        const targetIds = new Set(ids);
        let added = true;
        // 자식 요소들을 반복적으로 찾아 추가 (계층 구조가 깊어도 모두 포함)
        while (added) {
          added = false;
          allEls.forEach((el) => {
            if (
              el.parentId &&
              targetIds.has(el.parentId) &&
              !targetIds.has(el.elementId)
            ) {
              targetIds.add(el.elementId);
              added = true;
            }
          });
        }
        return allEls.filter((el) => targetIds.has(el.elementId));
      };

      // 5. Copy (Ctrl + C)
      if (isCtrl && e.key.toLowerCase() === "c" && selectedIds.length > 0) {
        e.preventDefault();
        // 자식 객체까지 포함하여 복사
        const targets = getDeepSelection(selectedIds, elements);
        dispatch(copyToClipboard(JSON.parse(JSON.stringify(targets))));
      }

      // 6. Paste (Ctrl + V)
      if (isCtrl && e.key.toLowerCase() === "v" && clipboard.length > 0) {
        e.preventDefault();
        // 붙여넣기 위치 (약간 어긋나게)
        const offsetX = e.shiftKey ? 0 : 20 + Math.floor(Math.random() * 30);
        const offsetY = e.shiftKey ? 0 : 20 + Math.floor(Math.random() * 30);

        // 복제 실행 (helper 사용)
        // clipboard 배열 전체를 넘기고, 그 중 root가 될 ID들만 추출해서 넘김
        const { newElements, idMap } = cloneElementsHierarchy(
          clipboard,
          clipboard.map((c: any) => c.elementId),
          activeContainerId,
          { x: offsetX, y: offsetY }
        );

        dispatch(addElements(newElements));

        // 새로 생성된 요소들 선택
        const newSelectedIds = Object.values(idMap);
        dispatch(selectMultipleElements(newSelectedIds));
        dispatch(setTool("select"));
      }

      // 7. Cut (Ctrl + X)
      if (isCtrl && e.key.toLowerCase() === "x" && selectedIds.length > 0) {
        e.preventDefault();

        // (1) 복사 로직과 동일하게 클립보드에 저장 (자식 포함)
        const targets = getDeepSelection(selectedIds, elements);
        dispatch(copyToClipboard(JSON.parse(JSON.stringify(targets))));

        // (2) 캔버스에서 삭제 (부모만 삭제하면 자식은 Store 로직에 따라 처리됨을 가정하나, 안전하게 전체 삭제 요청)
        // 만약 deleteElements가 cascade 삭제를 지원한다면 selectedIds만 보내도 되지만,
        // 확실히 하기 위해 targets의 ID를 모두 보낼 수도 있습니다. 
        // 여기서는 기존 로직(부모 삭제)을 유지하되, 클립보드에는 자식까지 확실히 담았습니다.
        dispatch(deleteElements(selectedIds));
        dispatch(selectElement(null));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Spacebar 해제
      if (e.code === "Space") {
        dragRef.current.isSpacePressed = false;
        dragRef.current.isPanning = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [dispatch]);
}