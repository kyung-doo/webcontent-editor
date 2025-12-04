import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  updateCanvasSettings,
  selectElement,
  selectMultipleElements,
  setActiveContainer,
  setTool,
  copyToClipboard,
} from "../store/canvasSlice";
import {
  addElement,
  deleteElements,
  groupElements,
  ungroupElements,
  addElements,
  EditorElement,
  setElementsPositions,
  resizeElements,
  setElementAnchor,
} from "../store/elementSlice";

import RuntimeElement from "./RuntimeElement";
import {
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
  // 1. Redux State
  const { elements } = useSelector((state: RootState) => state.elements);
  const {
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    clipboard,
  } = useSelector((state: RootState) => state.canvas);
  const dispatch = useDispatch();

  // ⭐ Refs for Event Listeners (최신 상태 참조용)
  const elementsRef = useRef(elements);
  const selectedIdsRef = useRef(selectedIds);
  const activeContainerIdRef = useRef(activeContainerId); // ⭐ 추가됨
  const canvasSettingsRef = useRef(canvasSettings);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    activeContainerIdRef.current = activeContainerId;
  }, [activeContainerId]); // ⭐ 동기화
  useEffect(() => {
    canvasSettingsRef.current = canvasSettings;
  }, [canvasSettings]);

  // 2. Active Context
  const rootElement = elements.find((el) => el.elementId === "root");
  const activeContainer = elements.find(
    (el) => el.elementId === activeContainerId
  );

  // 3. DOM Refs
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

  // Resize & Anchor Refs
  const isResizingRef = useRef(false);
  const isMovingAnchorRef = useRef(false);
  const resizeStartDataRef = useRef<{
    startX: number;
    startY: number;
    groupStartLeft: number;
    groupStartTop: number;
    groupStartWidth: number;
    groupStartHeight: number;
    anchorX: number;
    anchorY: number;
    anchorScreenX: number;
    anchorScreenY: number;
    limitWidth: number;
    limitHeight: number;
    direction: string;
    snapshot: {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fontSize?: number;
      distX: number;
      distY: number;
    }[];
  } | null>(null);

  const selectionBoxRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // 4. States
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<{
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

  const [groupAnchor, setGroupAnchor] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => {
    setGroupAnchor({ x: 0.5, y: 0.5 });
  }, [selectedIds]);

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
        parentId: parentId,
        children: [],
        props: { ...el.props, left: newLeft, top: newTop },
      };
      newElements.push(newEl);
      if (el.children) {
        el.children.forEach((childId) => {
          const child = elementsRef.current.find(
            (e) => e.elementId === childId
          );
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

  // Bounds Calculation
  useLayoutEffect(() => {
    if (selectedIds.length === 0 || !paperRef.current) {
      setSelectionBounds(null);
      return;
    }
    const zoom = canvasSettings.zoom;
    const paperRect = paperRef.current.getBoundingClientRect();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasValid = false;
    const expandByNode = (node: Element) => {
      const r = node.getBoundingClientRect();
      const lx = (r.left - paperRect.left) / zoom;
      const ly = (r.top - paperRect.top) / zoom;
      const lw = r.width / zoom;
      const lh = r.height / zoom;
      minX = Math.min(minX, lx);
      minY = Math.min(minY, ly);
      maxX = Math.max(maxX, lx + lw);
      maxY = Math.max(maxY, ly + lh);
      hasValid = true;
    };
    selectedIds.forEach((id) => {
      const node = document.querySelector(`[data-id="${id}"]`);
      if (node) {
        expandByNode(node);
        const descendants = node.querySelectorAll("[data-id]");
        descendants.forEach((child) => expandByNode(child));
      }
    });
    if (hasValid)
      setSelectionBounds({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
    else setSelectionBounds(null);
  }, [selectedIds, elements, canvasSettings.zoom]);

  // Anchor
  const currentAnchor = useMemo(() => {
    if (selectedIds.length === 1) {
      const el = elements.find((e) => e.elementId === selectedIds[0]);
      return { x: el?.props.anchorX ?? 0.5, y: el?.props.anchorY ?? 0.5 };
    }
    return groupAnchor;
  }, [selectedIds, elements, groupAnchor]);

  const handleAnchorUpdate = useCallback(
    (x: number, y: number) => {
      if (selectedIdsRef.current.length === 1) {
        dispatch(setElementAnchor({ id: selectedIdsRef.current[0], x, y }));
      } else if (selectedIdsRef.current.length > 1) {
        setGroupAnchor({ x, y });
      }
    },
    [dispatch]
  );

  // Resize Start
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedIds.length === 0 || !paperRef.current) return;
    const zoom = canvasSettings.zoom;
    const paperRect = paperRef.current.getBoundingClientRect();

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

    const anchorX = currentAnchor.x;
    const anchorY = currentAnchor.y;
    let limitWidth = ELEMENT_MIN_SIZE,
      limitHeight = ELEMENT_MIN_SIZE;

    if (selectedIds.length === 1) {
      const node = document.querySelector(`[data-id="${selectedIds[0]}"]`);
      if (node) {
        const style = window.getComputedStyle(node);
        limitWidth = Math.max(
          ELEMENT_MIN_SIZE,
          parseFloat(style.paddingLeft) +
            parseFloat(style.paddingRight) +
            parseFloat(style.borderLeftWidth) +
            parseFloat(style.borderRightWidth)
        );
        limitHeight = Math.max(
          ELEMENT_MIN_SIZE,
          parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom) +
            parseFloat(style.borderTopWidth) +
            parseFloat(style.borderBottomWidth)
        );
      }
    }

    const groupScreenX = paperRect.left + groupRect.x * zoom;
    const groupScreenY = paperRect.top + groupRect.y * zoom;
    const anchorScreenX = groupScreenX + groupRect.w * zoom * anchorX;
    const anchorScreenY = groupScreenY + groupRect.h * zoom * anchorY;
    const localAnchorX = groupRect.x + groupRect.w * anchorX;
    const localAnchorY = groupRect.y + groupRect.h * anchorY;

    const snapshot: any[] = [];
    selectedIds.forEach((id) => {
      const el = elements.find((item) => item.elementId === id);
      const node = document.querySelector(`[data-id="${id}"]`);
      if (el && node) {
        const r = node.getBoundingClientRect();
        const lx = (r.left - paperRect.left) / zoom;
        const ly = (r.top - paperRect.top) / zoom;
        const lw = r.width / zoom;
        const lh = r.height / zoom;
        snapshot.push({
          id,
          x: lx,
          y: ly,
          w: lw,
          h: lh,
          fontSize: parseFloat(el.props.fontSize) || 16,
          distX: lx - localAnchorX,
          distY: ly - localAnchorY,
        });
      }
    });

    isResizingRef.current = true;
    resizeStartDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      groupStartLeft: groupRect.x,
      groupStartTop: groupRect.y,
      groupStartWidth: groupRect.w,
      groupStartHeight: groupRect.h,
      anchorX,
      anchorY,
      anchorScreenX,
      anchorScreenY,
      limitWidth,
      limitHeight,
      direction,
      snapshot,
    };
  };

  // Mouse Down
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
          const targetIds = !selectedIds.includes(id)
            ? [...selectedIds, id]
            : selectedIds;
          targetIds.forEach((sid) => {
            const el = elementsRef.current.find(
              (item) => item.elementId === sid
            );
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

      // Resize
      if (
        isResizingRef.current &&
        resizeStartDataRef.current &&
        resizeStartDataRef.current.snapshot
      ) {
        const {
          startX,
          startY,
          groupStartWidth,
          groupStartHeight,
          groupStartLeft,
          groupStartTop,
          anchorX,
          anchorY,
          anchorScreenX,
          anchorScreenY,
          limitWidth,
          limitHeight,
          snapshot,
          direction,
        } = resizeStartDataRef.current;
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
        if (groupStartWidth * scaleX < limitWidth)
          scaleX = (limitWidth / groupStartWidth) * Math.sign(scaleX);
        if (groupStartHeight * scaleY < limitHeight)
          scaleY = (limitHeight / groupStartHeight) * Math.sign(scaleY);

        const anchorLocalX = groupStartLeft + groupStartWidth * anchorX;
        const anchorLocalY = groupStartTop + groupStartHeight * anchorY;
        const updates = snapshot.map((item) => {
          const newW = item.w * scaleX;
          const newH = item.h * scaleY;
          const newFontSize = item.fontSize
            ? item.fontSize * scaleY
            : undefined;
          const newX = anchorLocalX + item.distX * scaleX;
          const newY = anchorLocalY + item.distY * scaleY;
          return {
            id: item.id,
            left: newX,
            top: newY,
            width: newW,
            height: newH,
            fontSize: newFontSize,
            initialWidth: item.w,
            initialHeight: item.h,
          };
        });
        dispatch(resizeElements(updates));
        return;
      }

      // Anchor Move
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

      // Move
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
      if (isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const sx = dragStartRef.current.x - rect.left;
        const sy = dragStartRef.current.y - rect.top;
        setSelectionBox({
          x: Math.min(sx, cx),
          y: Math.min(sy, cy),
          w: Math.abs(cx - sx),
          h: Math.abs(cy - sy),
        });
        selectionBoxRef.current = {
          x: Math.min(sx, cx),
          y: Math.min(sy, cy),
          w: Math.abs(cx - sx),
          h: Math.abs(cy - sy),
        };
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (isPanning) setIsPanning(false);
      if (isResizingRef.current) {
        isResizingRef.current = false;
        resizeStartDataRef.current = null;
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
            selectedIdsRef.current.includes(id)
          ) {
            const isMulti = e.shiftKey || e.ctrlKey;
            dispatch(selectElement({ id, multiple: isMulti }));
          }
        }
        currentMoveDeltaRef.current = { dx: 0, dy: 0 };
      }

      // ⭐ [수정] activeContainerIdRef 사용 (Ref로 최신 ID 참조)
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
          const currentActive = elementsRef.current.find(
            (el) => el.elementId === activeContainerIdRef.current
          );
          currentActive?.children.forEach((childId) => {
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
  }, [isPanning, isSelecting, dispatch, canvasSettings.zoom, elements]); // Refs 사용으로 의존성 최소화

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
        {selectedIds.length > 0 && (
          <SelectionGroupBorder bounds={selectionBounds} />
        )}
        {currentTool === "scale" &&
          selectedIds.length > 0 &&
          selectionBounds && (
            <TransformLayer
              selectedBox={selectionBounds}
              anchor={currentAnchor}
              onResizeStart={handleResizeStart}
              onAnchorUpdate={handleAnchorUpdate}
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
