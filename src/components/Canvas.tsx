import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import Ruler from "@scena/react-ruler";
import { RootState } from "../store/store";
import {
  updateCanvasSettings,
  selectElement,
  selectMultipleElements,
  enterContainer,
  setActiveContainer,
  setTool,
  copyToClipboard,
} from "../store/canvasSlice";
import {
  addElement,
  moveElements,
  deleteElements,
  groupElements,
  ungroupElements,
  addElements,
  EditorElement,
  setElementsPositions,
  resizeElement,
  setElementAnchor,
} from "../store/elementSlice";

import RuntimeElement from "./RuntimeElement";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  RULER_THICKNESS,
  ELEMENT_MIN_SIZE,
  DRAG_THRESHOLD,
  SELECTION_MIN_SIZE,
} from "../constants";

// Components
import EditorBreadcrumb from "./EditorBreadcrumb";
import SelectionGroupBorder from "./SelectionGroupBorder";
import CanvasControls from "./CanvasControls";
import TransformLayer from "./TransformLayer";

export default function Canvas() {
  const { elements } = useSelector((state: RootState) => state.elements);
  const {
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    clipboard,
  } = useSelector((state: RootState) => state.canvas);
  const dispatch = useDispatch();

  const rootElement = elements.find((el) => el.elementId === "root");
  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Interaction Refs
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingElement = useRef(false);
  const didMouseMoveRef = useRef(false);
  const justSelectedRef = useRef<string | null>(null);

  const originalPositionsRef = useRef<{
    [id: string]: { left: number; top: number };
  }>({});
  const originalIdsRef = useRef<string[]>([]);
  const clonedIdsRef = useRef<string[]>([]);
  const activeMovingIdsRef = useRef<string[]>([]);
  const isCloningRef = useRef(false);
  const currentMoveDeltaRef = useRef({ dx: 0, dy: 0 });

  // ⭐ Resize & Anchor Refs
  const isResizingRef = useRef(false);
  const isMovingAnchorRef = useRef(false);
  const resizeStartDataRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    anchorX: number;
    anchorY: number; // 0~1 (상대 좌표)
    limitWidth: number;
    limitHeight: number;
    direction: string;
  } | null>(null);

  const selectionBoxRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // States
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [startScroll, setStartScroll] = useState({ x: 0, y: 0 });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Active Offset
  const activeOffset = useMemo(() => {
    let x = 0,
      y = 0;
    let currentId = activeContainerId;
    let safety = 0;
    while (currentId && currentId !== "root" && safety < 100) {
      const el = elements.find((e) => e.elementId === currentId);
      if (!el) break;
      x += parseFloat(el.props.left || 0);
      y += parseFloat(el.props.top || 0);
      currentId = el.parentId!;
      safety++;
    }
    return { x, y };
  }, [activeContainerId, elements]);

  // Init
  const handleResize = useCallback(() => {}, []);
  const centerCanvas = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0) return;
      const cx = (clientWidth - canvasSettings.width - RULER_THICKNESS) / 2;
      const centerY =
        (clientHeight - canvasSettings.height - RULER_THICKNESS) / 2;
      dispatch(updateCanvasSettings({ scrollX: cx, scrollY: centerY }));
      setIsInitialized(true);
    }
  }, [canvasSettings.width, canvasSettings.height, dispatch]);

  useEffect(() => {
    if (!isInitialized) setTimeout(centerCanvas, 100);
  }, [isInitialized, centerCanvas]);

  // Helper: Clone
  const cloneElementsHierarchy = (
    targets: EditorElement[],
    newParentId: string,
    offset: { x: number; y: number }
  ) => {
    const newElements: EditorElement[] = [];
    const targetIds = new Set(targets.map((t) => t.elementId));
    const rootTargets = targets.filter(
      (t) => !t.parentId || !targetIds.has(t.parentId)
    );

    const cloneRecursive = (
      el: EditorElement,
      parentId: string,
      isRoot: boolean
    ): EditorElement => {
      const newId =
        Date.now().toString() + Math.random().toString(36).substr(2, 5);
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
        parentId,
        children: [],
        props: { ...el.props, left: newLeft, top: newTop },
      };
      newElements.push(newEl);
      if (el.children) {
        el.children.forEach((childId) => {
          const child = elements.find((e) => e.elementId === childId);
          if (child) {
            const newChild = cloneRecursive(child, newId, false);
            newEl.children.push(newChild.elementId);
          }
        });
      }
      return newEl;
    };
    rootTargets.forEach((target) => cloneRecursive(target, newParentId, true));
    return newElements;
  };

  // Group Logic
  const handleGroupElements = () => {
    if (selectedIds.length < 1) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const targets = elements.filter((el) => selectedIds.includes(el.elementId));
    if (targets.length === 0) return;
    targets.forEach((el) => {
      const x = parseFloat(el.props.left || 0);
      const y = parseFloat(el.props.top || 0);
      let w = parseFloat(el.props.width) || ELEMENT_MIN_SIZE;
      let h = parseFloat(el.props.height) || ELEMENT_MIN_SIZE;
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
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        dispatch(deleteElements(selectedIds));
        dispatch(selectElement(null));
      }
      if (isCtrl && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleGroupElements();
      }
      if (isCtrl && e.key.toLowerCase() === "b" && selectedIds.length > 0) {
        e.preventDefault();
        const childrenToSelect: string[] = [];
        selectedIds.forEach((groupId) => {
          const group = elements.find((el) => el.elementId === groupId);
          if (group && group.type === "Box" && group.children.length > 0)
            childrenToSelect.push(...group.children);
        });
        dispatch(ungroupElements(selectedIds));
        if (childrenToSelect.length > 0)
          dispatch(selectMultipleElements(childrenToSelect));
        else dispatch(selectElement(null));
      }
      if (isCtrl && e.key.toLowerCase() === "c" && selectedIds.length > 0) {
        e.preventDefault();
        const targets = elements.filter((el) =>
          selectedIds.includes(el.elementId)
        );
        dispatch(copyToClipboard(JSON.parse(JSON.stringify(targets))));
      }
      if (isCtrl && e.key.toLowerCase() === "v" && clipboard.length > 0) {
        e.preventDefault();
        const offsetX = e.shiftKey ? 0 : 20 + Math.floor(Math.random() * 30);
        const offsetY = e.shiftKey ? 0 : 20 + Math.floor(Math.random() * 30);
        const newElements = cloneElementsHierarchy(
          clipboard,
          activeContainerId,
          { x: offsetX, y: offsetY }
        );
        dispatch(addElements(newElements));
        const newSelectedIds = newElements
          .filter((el) => el.parentId === activeContainerId)
          .map((el) => el.elementId);
        dispatch(selectMultipleElements(newSelectedIds));
        dispatch(setTool("select"));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedIds, elements, activeContainerId, dispatch, clipboard]);

  // ----------------------------------------------------------------
  // ⭐ Resize Start
  // ----------------------------------------------------------------
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const node = document.querySelector(`[data-id="${id}"]`);
    if (!node || !paperRef.current) return;

    const rect = node.getBoundingClientRect();
    const paperRect = paperRef.current.getBoundingClientRect();
    const zoom = canvasSettings.zoom;

    // 물리적 최소 크기 계산
    const style = window.getComputedStyle(node);
    const limitWidth = Math.max(
      ELEMENT_MIN_SIZE,
      parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) +
        parseFloat(style.borderRightWidth)
    );
    const limitHeight = Math.max(
      ELEMENT_MIN_SIZE,
      parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth)
    );

    const el = elements.find((item) => item.elementId === id);
    const anchorX = el?.props.anchorX ?? 0.5;
    const anchorY = el?.props.anchorY ?? 0.5;

    isResizingRef.current = true;
    resizeStartDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: (rect.left - paperRect.left) / zoom,
      startTop: (rect.top - paperRect.top) / zoom,
      startWidth: rect.width / zoom,
      startHeight: rect.height / zoom,
      anchorX,
      anchorY,
      limitWidth,
      limitHeight,
      direction,
    };
  };
  const handleAnchorStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isMovingAnchorRef.current = true;
  };

  // ----------------------------------------------------------------
  // 🖱️ Global Mouse Handlers
  // ----------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.button === 1 ||
      (isSpacePressed && e.button === 0) ||
      currentTool === "hand"
    ) {
      e.preventDefault();
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      setStartScroll({ x: canvasSettings.scrollX, y: canvasSettings.scrollY });
      return;
    }
    if (e.button === 0 && !isSpacePressed) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      didMouseMoveRef.current = false;
      justSelectedRef.current = null;
      selectionBoxRef.current = null;
      currentMoveDeltaRef.current = { dx: 0, dy: 0 };
      isCloningRef.current = false;
      clonedIdsRef.current = [];
      activeMovingIdsRef.current = [];

      const targetEl = (e.target as HTMLElement).closest("[data-id]");
      if (targetEl) {
        const id = targetEl.getAttribute("data-id");
        if (id) {
          if (!selectedIds.includes(id)) {
            const isMulti = e.shiftKey || e.ctrlKey;
            dispatch(selectElement({ id, multiple: isMulti }));
            justSelectedRef.current = id;
            isDraggingElement.current = false;
            originalIdsRef.current = isMulti ? [...selectedIds, id] : [id];
            activeMovingIdsRef.current = isMulti ? [...selectedIds, id] : [id];
          } else {
            isDraggingElement.current = true;
            originalIdsRef.current = [...selectedIds];
            activeMovingIdsRef.current = [...selectedIds];
          }
          const positions: any = {};
          const targetIds = !selectedIds.includes(id) ? [id] : selectedIds;
          targetIds.forEach((sid) => {
            const el = elements.find((item) => item.elementId === sid);
            if (el)
              positions[sid] = {
                left: parseFloat(el.props.left || 0),
                top: parseFloat(el.props.top || 0),
              };
          });
          originalPositionsRef.current = positions;
        }
      } else {
        if (!e.shiftKey) dispatch(selectElement(null));
        setIsSelecting(true);
        const rect = containerRef.current!.getBoundingClientRect();
        setSelectionBox({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          w: 0,
          h: 0,
        });
      }
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const zoom = canvasSettings.zoom;
      if (isPanning) {
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        dispatch(
          updateCanvasSettings({
            scrollX: startScroll.x + dx,
            scrollY: startScroll.y + dy,
          })
        );
        return;
      }

      // ⭐ 2. Resize (Anchor Based & Anti-Drift Logic)
      if (
        isResizingRef.current &&
        resizeStartDataRef.current &&
        selectedIds.length === 1
      ) {
        const {
          startX,
          startY,
          startLeft,
          startTop,
          startWidth,
          startHeight,
          direction,
          anchorX,
          anchorY,
          limitWidth,
          limitHeight,
        } = resizeStartDataRef.current;

        // 이동 거리
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        // 1. 현재 핸들 위치를 기준으로 스케일 팩터 계산
        // 공식: (초기거리 + 이동량) / 초기거리 = 배율(Scale)
        // 거리 = 핸들위치 - 앵커위치

        const wAnchorOffset = startWidth * anchorX; // 앵커의 X 상대 위치 (0~Width)
        const hAnchorOffset = startHeight * anchorY; // 앵커의 Y 상대 위치 (0~Height)

        let sX = 1;
        let sY = 1;

        // X축 스케일
        if (direction.includes("e")) {
          const initialDist = startWidth - wAnchorOffset; // 앵커 ~ 우측 핸들 거리
          // 앵커가 우측 끝에 있으면(initialDist ≈ 0) 우측으로 크기 조절 불가 (Scale undefined)
          // 여기선 0.1 이상일 때만 계산
          if (Math.abs(initialDist) > 0.1)
            sX = (initialDist + dx) / initialDist;
        } else if (direction.includes("w")) {
          const initialDist = -wAnchorOffset; // 앵커 ~ 좌측 핸들 거리 (음수)
          if (Math.abs(initialDist) > 0.1)
            sX = (initialDist + dx) / initialDist; // dx는 왼쪽이동 시 음수 -> 거리 증가
        }

        // Y축 스케일
        if (direction.includes("s")) {
          const initialDist = startHeight - hAnchorOffset;
          if (Math.abs(initialDist) > 0.1)
            sY = (initialDist + dy) / initialDist;
        } else if (direction.includes("n")) {
          const initialDist = -hAnchorOffset;
          if (Math.abs(initialDist) > 0.1)
            sY = (initialDist + dy) / initialDist;
        }

        // 2. Shift (정비율)
        if (e.shiftKey) {
          // 변형량이 큰 쪽을 따라감
          if (Math.abs(sX - 1) > Math.abs(sY - 1)) sY = sX;
          else sX = sY;
        }

        // 3. 새 크기 계산
        let newW = startWidth * sX;
        let newH = startHeight * sY;

        // 4. 최소 크기 제한 (Anti-Drift 핵심: 제한된 크기로 Scale 재계산)
        if (newW < limitWidth) {
          newW = limitWidth;
          // 앵커 기준이므로 크기가 제한되면 스케일도 제한됨 -> 위치도 제한됨
        }
        if (newH < limitHeight) {
          newH = limitHeight;
        }

        // 5. 위치 역산 (Anchor Fixed)
        // NewPos = AnchorWorldPos - (NewSize * AnchorRatio)
        // AnchorWorldPos = StartPos + (StartSize * AnchorRatio)
        const anchorWorldX = startLeft + wAnchorOffset;
        const anchorWorldY = startTop + hAnchorOffset;

        const newX = anchorWorldX - newW * anchorX;
        const newY = anchorWorldY - newH * anchorY;

        dispatch(
          resizeElement({
            id: selectedIds[0],
            left: newX,
            top: newY,
            width: newW,
            height: newH,
          })
        );
        return;
      }

      // 3. Anchor Move
      if (isMovingAnchorRef.current && selectedIds.length === 1) {
        const id = selectedIds[0];
        const node = document.querySelector(`[data-id="${id}"]`);
        if (node) {
          const rect = node.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const relY = (e.clientY - rect.top) / rect.height;
          dispatch(
            setElementAnchor({
              id,
              x: Math.min(1, Math.max(0, relX)),
              y: Math.min(1, Math.max(0, relY)),
            })
          );
        }
        return;
      }

      // 4. Move & Clone
      if (isDraggingElement.current) {
        const dist = Math.sqrt(
          Math.pow(e.clientX - dragStartRef.current.x, 2) +
            Math.pow(e.clientY - dragStartRef.current.y, 2)
        );
        if (dist > DRAG_THRESHOLD) didMouseMoveRef.current = true;
        if (didMouseMoveRef.current) {
          let dx = (e.clientX - dragStartRef.current.x) / zoom;
          let dy = (e.clientY - dragStartRef.current.y) / zoom;
          if (e.shiftKey) {
            if (Math.abs(dx) > Math.abs(dy)) dy = 0;
            else dx = 0;
          }
          const moveX = dx - currentMoveDeltaRef.current.dx;
          const moveY = dy - currentMoveDeltaRef.current.dy;
          if (e.altKey && !isCloningRef.current) {
            isCloningRef.current = true;
            const resetMoves = originalIdsRef.current
              .map((id) => {
                const pos = originalPositionsRef.current[id];
                return pos
                  ? { id, left: `${pos.left}px`, top: `${pos.top}px` }
                  : null;
              })
              .filter(Boolean) as any;
            dispatch(setElementsPositions(resetMoves));
            const targets = elements.filter((el) =>
              originalIdsRef.current.includes(el.elementId)
            );
            const clones = cloneElementsHierarchy(targets, activeContainerId, {
              x: 0,
              y: 0,
            });
            dispatch(addElements(clones));
            const newIds = clones
              .filter((el) => el.parentId === activeContainerId)
              .map((el) => el.elementId);
            clonedIdsRef.current = newIds;
            activeMovingIdsRef.current = newIds;
            dispatch(selectMultipleElements(newIds));
            newIds.forEach((nid, i) => {
              const oid = originalIdsRef.current[i];
              if (originalPositionsRef.current[oid])
                originalPositionsRef.current[nid] =
                  originalPositionsRef.current[oid];
            });
          } else if (!e.altKey && isCloningRef.current) {
            isCloningRef.current = false;
            dispatch(deleteElements(clonedIdsRef.current));
            clonedIdsRef.current = [];
            activeMovingIdsRef.current = originalIdsRef.current;
            dispatch(selectMultipleElements(originalIdsRef.current));
          }
          if (moveX !== 0 || moveY !== 0) {
            const updates = activeMovingIdsRef.current
              .map((id) => {
                const startPos = originalPositionsRef.current[id];
                if (startPos) {
                  return {
                    id,
                    left: `${startPos.left + dx}px`,
                    top: `${startPos.top + dy}px`,
                  };
                }
                return null;
              })
              .filter(Boolean) as any;
            if (updates.length > 0) dispatch(setElementsPositions(updates));
            currentMoveDeltaRef.current = { dx, dy };
          }
        }
        return;
      }

      // 5. Drag Select
      if (isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const sx = dragStartRef.current.x - rect.left;
        const sy = dragStartRef.current.y - rect.top;
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
      if (isPanning) setIsPanning(false);
      if (isResizingRef.current) {
        isResizingRef.current = false;
        resizeStartDataRef.current = null;
        return;
      }
      if (isMovingAnchorRef.current) {
        isMovingAnchorRef.current = false;
        return;
      }
      if (isDraggingElement.current) {
        isDraggingElement.current = false;
        isCloningRef.current = false;
        clonedIdsRef.current = [];
        activeMovingIdsRef.current = [];
        if (!didMouseMoveRef.current) {
          const targetEl = (
            document.elementFromPoint(
              dragStartRef.current.x,
              dragStartRef.current.y
            ) as HTMLElement
          )?.closest("[data-id]");
          const id = targetEl?.getAttribute("data-id");
          if (
            id &&
            id !== justSelectedRef.current &&
            selectedIds.includes(id)
          ) {
            const isMulti = e.shiftKey || e.ctrlKey;
            dispatch(selectElement({ id, multiple: isMulti }));
          }
        }
        currentMoveDeltaRef.current = { dx: 0, dy: 0 };
      }
      if (isSelecting) {
        setIsSelecting(false);
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
          activeContainer?.children.forEach((childId) => {
            // ⭐ HTMLElement 캐스팅
            const rootNode = document.querySelector(
              `[data-id="${childId}"]`
            ) as HTMLElement;
            if (rootNode) {
              let isHit = checkIntersection(rootNode.getBoundingClientRect());
              if (!isHit) {
                const descendants = rootNode.querySelectorAll("[data-id]");
                descendants.forEach((node) => {
                  if (
                    checkIntersection(
                      (node as HTMLElement).getBoundingClientRect()
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
  }, [
    isPanning,
    isSelecting,
    selectedIds,
    canvasSettings,
    activeContainer,
    dispatch,
    elements,
  ]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const dist = Math.sqrt(
      Math.pow(e.clientX - dragStartRef.current.x, 2) +
        Math.pow(e.clientY - dragStartRef.current.y, 2)
    );
    if (dist > DRAG_THRESHOLD) return;
    if (e.target !== e.currentTarget) return;
    if (!isSpacePressed) dispatch(selectElement(null));
  };
  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    if (activeContainerId !== "root" && activeContainer) {
      const parentId = activeContainer.parentId || "root";
      dispatch(setActiveContainer(parentId));
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData("imageSrc");
    if (imageSrc && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const globalX =
        (e.clientX - rect.left - RULER_THICKNESS - canvasSettings.scrollX) /
        canvasSettings.zoom;
      const globalY =
        (e.clientY - rect.top - RULER_THICKNESS - canvasSettings.scrollY) /
        canvasSettings.zoom;
      const localX = globalX - activeOffset.x;
      const localY = globalY - activeOffset.y;
      const newElement = {
        elementId: Date.now().toString(),
        id: "",
        type: "Image" as const,
        props: {
          src: imageSrc,
          width: "200px",
          height: "auto",
          backgroundColor: "transparent",
          left: `${localX}px`,
          top: `${localY}px`,
          position: "absolute",
        },
        scripts: [],
        children: [],
        parentId: activeContainerId,
      };
      dispatch(addElement(newElement));
      dispatch(selectElement({ id: newElement.elementId, multiple: false }));
      dispatch(setTool("select"));
    }
  };

  if (!rootElement)
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <main className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      <EditorBreadcrumb
        activeId={activeContainerId}
        elements={elements}
        onNavigate={(id: string) => dispatch(setActiveContainer(id))}
      />
      <CanvasControls
        containerRef={containerRef}
        paperRef={paperRef}
        onMouseDown={handleMouseDown}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
        onDoubleClick={handleBackgroundDoubleClick}
        onDragOver={(e) => e.preventDefault()}
      >
        {rootElement.children.map((childId: string) => (
          <RuntimeElement
            key={childId}
            elementId={childId}
            mode="edit"
            isInsideActive={activeContainerId === "root"}
          />
        ))}
        {selectedIds.length > 1 && (
          <SelectionGroupBorder
            selectedIds={selectedIds}
            paperRef={paperRef}
            zoom={canvasSettings.zoom}
          />
        )}
        {currentTool === "scale" && selectedIds.length === 1 && (
          <TransformLayer
            targetId={selectedIds[0]}
            paperRef={paperRef}
            zoom={canvasSettings.zoom}
            onResizeStart={handleResizeStart}
            onAnchorStart={handleAnchorStart}
          />
        )}
      </CanvasControls>
      {isSelecting && selectionBox && containerRef.current && (
        <div
          className="fixed z-[9999] border border-blue-500 bg-blue-500/20 pointer-events-none"
          style={{
            left:
              containerRef.current.getBoundingClientRect().left +
              selectionBox.x,
            top:
              containerRef.current.getBoundingClientRect().top + selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
          }}
        />
      )}
    </main>
  );
}
