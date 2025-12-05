import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  updateCanvasSettings,
  selectElement,
  selectMultipleElements,
} from "../store/canvasSlice";
import {
  setElementsPositions,
  resizeElements,
  setElementAnchor,
  addElements,
  deleteElements,
  EditorElement,
} from "../store/elementSlice";
import {
  ELEMENT_MIN_SIZE,
  DRAG_THRESHOLD,
  SELECTION_MIN_SIZE,
} from "../constants";
import { cloneElementsHierarchy } from "../utils/canvasUtils";

export default function useCanvasInteraction(
  stateRef: React.MutableRefObject<any>,
  containerRef: React.RefObject<HTMLDivElement>,
  paperRef: React.RefObject<HTMLDivElement>,
  selectionBounds: { x: number; y: number; w: number; h: number } | null,
  dispatch: any,
  selectedIds: string[],
  elements: EditorElement[]
) {
  // UI States
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [groupAnchor, setGroupAnchor] = useState({ x: 0.5, y: 0.5 });
  const currentAnchor = useMemo(() => {
    if (selectedIds.length === 1) {
      const el = elements.find((e) => e.elementId === selectedIds[0]);
      return { x: el?.props.anchorX ?? 0.5, y: el?.props.anchorY ?? 0.5 };
    }
    return groupAnchor;
  }, [selectedIds, elements, groupAnchor]);

  // 선택 변경 시 그룹 앵커 초기화
  useEffect(() => {
    setGroupAnchor({ x: 0.5, y: 0.5 });
  }, [stateRef.current.selectedIds]);

  // Refs
  const dragRef = useRef({
    isDragging: false,
    isPanning: false,
    isResizing: false,
    isSelecting: false,
    isMovingAnchor: false,
    justSelected: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    didMove: false,
    isCloning: false,
    isSpacePressed: false,
    clonedIds: [] as string[],
    originalIds: [] as string[],
    activeMovingIds: [] as string[],
    currentDelta: { dx: 0, dy: 0 },
  });

  const originalPositionsRef = useRef<{
    [id: string]: { left: number; top: number };
  }>({});
  const resizeDataRef = useRef<any>(null);
  const selectionBoxRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // --- Handlers ---

  const handleAnchorUpdate = useCallback(
    (x: number, y: number) => {
      const { selectedIds } = stateRef.current;
      if (selectedIds.length === 1)
        dispatch(setElementAnchor({ id: selectedIds[0], x, y }));
      else if (selectedIds.length > 1) setGroupAnchor({ x, y });
    },
    [dispatch, stateRef]
  );

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    const { selectedIds, elements, canvasSettings } = stateRef.current;
    if (selectedIds.length === 0 || !paperRef.current) return;

    const zoom = canvasSettings.zoom;
    const paperRect = paperRef.current.getBoundingClientRect();

    // Bounds (단일 선택 fallback 포함)
    let groupRect = selectionBounds || { x: 0, y: 0, w: 0, h: 0 };
    if (selectedIds.length === 1 && !selectionBounds) {
      const node = document.querySelector(`[data-id="${selectedIds[0]}"]`);
      if (node) {
        const r = node.getBoundingClientRect();
        groupRect = {
          x: (r.left - paperRect.left) / zoom,
          y: (r.top - paperRect.top) / zoom,
          w: r.width / zoom,
          h: r.height / zoom,
        };
      }
    }

    // Anchor Absolute Pos
    const groupScreenX = paperRect.left + groupRect.x * zoom;
    const groupScreenY = paperRect.top + groupRect.y * zoom;
    const anchorScreenX = groupScreenX + groupRect.w * zoom * currentAnchor.x;
    const anchorScreenY = groupScreenY + groupRect.h * zoom * currentAnchor.y;
    const localAnchorX = groupRect.x + groupRect.w * currentAnchor.x;
    const localAnchorY = groupRect.y + groupRect.h * currentAnchor.y;

    // Limit
    let limitWidth = ELEMENT_MIN_SIZE,
      limitHeight = ELEMENT_MIN_SIZE;
    if (selectedIds.length === 1) {
      const node = document.querySelector(`[data-id="${selectedIds[0]}"]`);
      if (node) {
        const s = window.getComputedStyle(node);
        limitWidth = Math.max(
          ELEMENT_MIN_SIZE,
          parseFloat(s.paddingLeft) +
            parseFloat(s.paddingRight) +
            parseFloat(s.borderLeftWidth) +
            parseFloat(s.borderRightWidth)
        );
        limitHeight = Math.max(
          ELEMENT_MIN_SIZE,
          parseFloat(s.paddingTop) +
            parseFloat(s.paddingBottom) +
            parseFloat(s.borderTopWidth) +
            parseFloat(s.borderBottomWidth)
        );
      }
    }

    const snapshot: any[] = [];
    selectedIds.forEach((id: string) => {
      const el = elements.find((e: any) => e.elementId === id);
      const node = document.querySelector(`[data-id="${id}"]`);
      if (el && node) {
        const r = node.getBoundingClientRect();
        const lx = (r.left - paperRect.left) / zoom;
        const ly = (r.top - paperRect.top) / zoom;
        snapshot.push({
          id,
          x: lx,
          y: ly,
          w: r.width / zoom,
          h: r.height / zoom,
          fontSize: parseFloat(el.props.fontSize) || 16,
          distX: lx - localAnchorX,
          distY: ly - localAnchorY,
        });
      }
    });

    dragRef.current.isResizing = true;
    resizeDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      groupStartLeft: groupRect.x,
      groupStartTop: groupRect.y,
      groupStartWidth: groupRect.w,
      groupStartHeight: groupRect.h,
      anchorX: currentAnchor.x,
      anchorY: currentAnchor.y,
      anchorScreenX,
      anchorScreenY,
      limitWidth,
      limitHeight,
      direction,
      snapshot,
      localAnchorX,
      localAnchorY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    const { currentTool, selectedIds, canvasSettings, elements } =
      stateRef.current;

    if (
      e.button === 1 ||
      (drag.isSpacePressed && e.button === 0) ||
      currentTool === "hand"
    ) {
      e.preventDefault();
      drag.isPanning = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startPanX = canvasSettings.scrollX;
      drag.startPanY = canvasSettings.scrollY;
      return;
    }
    if (e.button === 0 && !drag.isSpacePressed) {
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.isDragging = false;
      drag.didMove = false;
      drag.currentDelta = { dx: 0, dy: 0 };
      drag.isCloning = false;
      drag.clonedIds = [];
      drag.activeMovingIds = [];
      drag.justSelected = false; // 초기화

      const targetEl = (e.target as HTMLElement).closest("[data-id]");
      if (targetEl) {
        const id = targetEl.getAttribute("data-id")!;

        // 1. 선택되지 않은 요소를 클릭한 경우 (새로운 선택)
        if (!selectedIds.includes(id)) {
          drag.justSelected = true;
          const isMulti = e.shiftKey || e.ctrlKey;
          dispatch(selectElement({ id, multiple: isMulti }));
          const newSelection = isMulti ? [...selectedIds, id] : [id];
          drag.originalIds = newSelection;
          drag.activeMovingIds = newSelection;
        }
        // 2. 이미 선택된 요소를 클릭한 경우
        else {
          drag.justSelected = false; // 이미 선택된 상태
          drag.isDragging = true;
          drag.originalIds = [...selectedIds];
          drag.activeMovingIds = [...selectedIds];
        }

        const positions: any = {};
        const targetIds = !selectedIds.includes(id)
          ? e.shiftKey || e.ctrlKey
            ? [...selectedIds, id]
            : [id]
          : selectedIds;
        targetIds.forEach((sid: string) => {
          const el = elements.find((e: any) => e.elementId === sid);
          if (el)
            positions[sid] = {
              left: parseFloat(el.props.left || 0),
              top: parseFloat(el.props.top || 0),
            };
        });
        originalPositionsRef.current = positions;
      } else {
        if (!e.shiftKey) dispatch(selectElement(null));
        drag.isSelecting = true;
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const box = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            w: 0,
            h: 0,
          };
          setSelectionBox(box);
          selectionBoxRef.current = box;
        }
      }
    }
  };

  // Global Mouse Logic
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const { canvasSettings, elements, activeContainerId } = stateRef.current;
      const zoom = canvasSettings.zoom;

      if (drag.isPanning) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        dispatch(
          updateCanvasSettings({
            scrollX: drag.startPanX + dx,
            scrollY: drag.startPanY + dy,
          })
        );
        return;
      }

      if (drag.isResizing && resizeDataRef.current) {
        const {
          startX,
          startY,
          groupStartWidth,
          groupStartHeight,
          anchorScreenX,
          anchorScreenY,
          limitWidth,
          limitHeight,
          snapshot,
          direction,
          localAnchorX,
          localAnchorY,
        } = resizeDataRef.current;
        let scaleX = 1;
        let scaleY = 1;
        if (direction.includes("e") || direction.includes("w")) {
          const startDistX = startX - anchorScreenX;
          const curDistX = e.clientX - anchorScreenX;
          if (Math.abs(startDistX) > 1) scaleX = curDistX / startDistX;
        }
        if (direction.includes("n") || direction.includes("s")) {
          const startDistY = startY - anchorScreenY;
          const curDistY = e.clientY - anchorScreenY;
          if (Math.abs(startDistY) > 1) scaleY = curDistY / startDistY;
        }
        if (e.shiftKey) {
          if (Math.abs(scaleX - 1) > Math.abs(scaleY - 1)) scaleY = scaleX;
          else scaleX = scaleY;
        }
        if (Math.abs(groupStartWidth * scaleX) < limitWidth)
          scaleX = (limitWidth / groupStartWidth) * Math.sign(scaleX);
        if (Math.abs(groupStartHeight * scaleY) < limitHeight)
          scaleY = (limitHeight / groupStartHeight) * Math.sign(scaleY);

        const updates = snapshot.map((item: any) => ({
          id: item.id,
          left: localAnchorX + item.distX * scaleX,
          top: localAnchorY + item.distY * scaleY,
          width: item.w * scaleX,
          height: item.h * scaleY,
          fontSize: item.fontSize ? item.fontSize * scaleY : undefined,
          initialWidth: item.w,
          initialHeight: item.h, // 100% Fix
        }));
        dispatch(resizeElements(updates));
        return;
      }

      if (drag.activeMovingIds.length > 0 || drag.isDragging) {
        const dist = Math.sqrt(
          Math.pow(e.clientX - drag.startX, 2) +
            Math.pow(e.clientY - drag.startY, 2)
        );
        if (dist > DRAG_THRESHOLD) {
          drag.isDragging = true;
          drag.didMove = true;
          drag.justSelected = false; // 드래그 임계치 넘으면 justSelected 해제
        }

        if (drag.isDragging) {
          let dx = (e.clientX - drag.startX) / zoom;
          let dy = (e.clientY - drag.startY) / zoom;
          if (e.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) dy = 0;
            else dx = 0;
          }
          const moveX = dx - drag.currentDelta.dx;
          const moveY = dy - drag.currentDelta.dy;

          if (e.altKey && !drag.isCloning) {
            drag.isCloning = true;
            const resetMoves = drag.originalIds
              .map((id) => {
                const pos = originalPositionsRef.current[id];
                return pos
                  ? { id, left: `${pos.left}px`, top: `${pos.top}px` }
                  : null;
              })
              .filter(Boolean);

            dispatch(setElementsPositions(resetMoves as any));

            const targets = elements.filter((el: any) =>
              drag.originalIds.includes(el.elementId)
            );
            const { newElements, idMap } = cloneElementsHierarchy(
              targets,
              drag.originalIds,
              activeContainerId,
              { x: 0, y: 0 }
            );
            dispatch(addElements(newElements));

            const newIds = drag.originalIds.map((oid) => idMap[oid]);
            drag.clonedIds = newIds;
            drag.activeMovingIds = newIds;
            dispatch(selectMultipleElements(newIds));
            newIds.forEach((nid, i) => {
              const oid = drag.originalIds[i];
              if (originalPositionsRef.current[oid])
                originalPositionsRef.current[nid] =
                  originalPositionsRef.current[oid];
            });
          } else if (!e.altKey && drag.isCloning) {
            drag.isCloning = false;
            dispatch(deleteElements(drag.clonedIds));
            drag.clonedIds = [];
            drag.activeMovingIds = drag.originalIds;
            dispatch(selectMultipleElements(drag.originalIds));
          }

          const updates = drag.activeMovingIds
            .map((id) => {
              const startPos = originalPositionsRef.current[id];
              if (startPos)
                return {
                  id,
                  left: `${startPos.left + dx}px`,
                  top: `${startPos.top + dy}px`,
                };
              return null;
            })
            .filter(Boolean);
          if (updates.length > 0)
            dispatch(setElementsPositions(updates as any));
          drag.currentDelta = { dx, dy };
        }
      }

      if (drag.isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const sx = drag.startX - rect.left;
        const sy = drag.startY - rect.top;
        const box = {
          x: Math.min(sx, cx),
          y: Math.min(sy, cy),
          w: Math.abs(cx - sx),
          h: Math.abs(cy - sy),
        };
        setSelectionBox(box);
        selectionBoxRef.current = box;
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      drag.isPanning = false;
      drag.isResizing = false;
      drag.isMovingAnchor = false;

      const wasDragging = drag.isDragging;

      // 1. 로직 처리 먼저 실행 (상태 초기화 전)
      if (wasDragging) {
        drag.isCloning = false;
      } else {
        // 드래그가 아니었을 때 (단순 클릭)
        if (!drag.didMove) {
          const targetEl = (
            document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
          )?.closest("[data-id]");
          const id = targetEl?.getAttribute("data-id");
          const { selectedIds } = stateRef.current;

          // justSelected가 아닐 때만(이미 선택되어 있던 것을 클릭했을 때만) 동작
          // 새로 선택한 경우(justSelected=true)는 handleMouseDown에서 이미 처리됨
          // ⭐ [수정] 이 시점에 justSelected는 아직 초기화되지 않았으므로 정상적으로 True임
          if (
            id &&
            id !== selectedIds[0] &&
            selectedIds.includes(id) &&
            !drag.justSelected
          ) {
            const isMulti = e.shiftKey || e.ctrlKey;
            dispatch(selectElement({ id, multiple: isMulti }));
          }
        }
      }

      // 2. ⭐ [수정] 상태 초기화는 로직 처리 후에 수행
      drag.isDragging = false;
      drag.activeMovingIds = [];
      drag.clonedIds = [];
      drag.justSelected = false; // 여기서 초기화해야 위 로직에서 체크 가능
      drag.currentDelta = { dx: 0, dy: 0 };

      if (drag.isSelecting) {
        drag.isSelecting = false;
        if (
          selectionBoxRef.current &&
          selectionBoxRef.current.w > SELECTION_MIN_SIZE &&
          containerRef.current
        ) {
          const selected: string[] = [];
          const containerRect = containerRef.current.getBoundingClientRect();
          const checkIntersection = (rect: DOMRect) => {
            const elX = rect.left - containerRect.left;
            const elY = rect.top - containerRect.top;
            const box = selectionBoxRef.current!;
            return (
              box.x < elX + rect.width &&
              box.x + box.w > elX &&
              box.y < elY + rect.height &&
              box.y + box.h > elY
            );
          };
          const { elements, activeContainerId } = stateRef.current;
          const activeContainer = elements.find(
            (el: any) => el.elementId === activeContainerId
          );
          activeContainer?.children.forEach((childId: string) => {
            const rootNode = document.querySelector(
              `[data-id="${childId}"]`
            ) as HTMLElement;
            if (rootNode) {
              let isHit = checkIntersection(rootNode.getBoundingClientRect());
              if (!isHit) {
                const descendants = rootNode.querySelectorAll("[data-id]");
                descendants.forEach((d) => {
                  if (
                    checkIntersection(
                      (d as HTMLElement).getBoundingClientRect()
                    )
                  )
                    isHit = true;
                });
              }
              if (!isHit) {
                const hitArea = rootNode.querySelector(
                  ".group-hit-area"
                ) as HTMLElement;
                if (
                  hitArea &&
                  checkIntersection(hitArea.getBoundingClientRect())
                )
                  isHit = true;
              }
              if (isHit) selected.push(childId);
            }
          });
          if (selected.length > 0) dispatch(selectMultipleElements(selected));
        }
        setSelectionBox(null);
        selectionBoxRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [dispatch]);

  return {
    selectionBox,
    groupAnchor,
    dragRef, // 키보드 훅에서 사용
    handleMouseDown,
    handleResizeStart,
    handleAnchorUpdate,
    currentAnchor,
  };
}
