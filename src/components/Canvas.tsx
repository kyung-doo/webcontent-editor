import React from "react";
import { addElement } from "../store/elementSlice";
import {
  setActiveContainer,
  selectElement,
  setTool,
} from "../store/canvasSlice";
import { RULER_THICKNESS, DRAG_THRESHOLD } from "../constants";

// Components
import RuntimeElement from "./RuntimeElement";
import EditorBreadcrumb from "./EditorBreadcrumb";
import SelectionBorder from "./SelectionBorder";
import CanvasControls from "./CanvasControls";
import TransformLayer from "./TransformLayer";

// Hooks (로직 분리)
import useCanvasState from "../hooks/useCanvasState";
import useSelectionBounds from "../hooks/useSelectionBounds";
import useCanvasInteraction from "../hooks/useCanvasInteraction";
import useCanvasShortcuts from "../hooks/useCanvasShortcuts";
import { useSelector } from "react-redux";

export default function Canvas() {
  // 1. Canvas 기본 상태 및 Refs 가져오기
  const {
    elements,
    selectedIds,
    canvasSettings,
    activeContainerId,
    currentTool,
    rootElement,
    activeOffset,
    stateRef, // 최신 상태 Ref (다른 훅에 전달용)
    containerRef, // DOM Ref
    paperRef, // DOM Ref
    dispatch,
    currentRootId, // 💥 [추가] useCanvasState에서 계산된 현재 페이지의 Root ID
  } = useCanvasState();

  const { pages, activePageId } = useSelector((state: any) => state.page);
  const activePageName = pages
    ? pages.find((p: any) => p.pageId === activePageId)?.name
    : "Page";

  // 2. 선택 영역(Bounding Box) 계산
  const selectionBounds = useSelectionBounds(
    selectedIds,
    elements,
    canvasSettings.zoom,
    paperRef
  );

  // 3. 마우스 인터랙션 (이동, 리사이즈, 드래그 선택)
  const {
    selectionBox, // 드래그 선택 박스 영역
    dragRef, // 인터랙션 상태 Ref (단축키 훅과 공유)
    handleMouseDown, // 마우스 다운 핸들러
    handleResizeStart, // 리사이즈 시작 핸들러
    handleAnchorUpdate, // 앵커 변경 핸들러
    currentAnchor,
  } = useCanvasInteraction(
    stateRef,
    containerRef,
    paperRef,
    selectionBounds,
    dispatch,
    selectedIds,
    elements
  );

  // 4. 키보드 단축키 연결 (dragRef를 공유하여 스페이스바 패닝 등 처리)
  useCanvasShortcuts(stateRef, dragRef);

  const selectedCount = selectedIds.length;
  const selectedElement =
    selectedCount === 1
      ? elements.find((el) => el.elementId === selectedIds[0])
      : null;
  const selectedType = selectedElement ? selectedElement.type : undefined;
  const idToDisplay = selectedElement?.id || undefined;

  // 5. 기타 UI 핸들러 (클릭, 더블클릭, 드롭)
  const handleCanvasClick = (e: React.MouseEvent) => {
    // 드래그가 아닌 단순 클릭일 때만 선택 해제
    const dist = Math.sqrt(
      Math.pow(e.clientX - dragRef.current.startX, 2) +
        Math.pow(e.clientY - dragRef.current.startY, 2)
    );

    if (dist > DRAG_THRESHOLD) return;
    if (e.target !== e.currentTarget) return;

    // 스페이스바(패닝) 중이 아닐 때만 해제
    if (!dragRef.current.isSpacePressed) {
      dispatch(selectElement(null));
    }
  };

  const handleBackgroundDoubleClick = (e: React.MouseEvent) => {
    // 💥 [수정] 현재 페이지의 Root가 아니라면 상위 컨테이너로 이동
    if (activeContainerId !== currentRootId) {
      const currentActive = elements.find(
        (el) => el.elementId === activeContainerId
      );
      if (currentActive) {
        // 💥 [수정] 부모가 없거나 Root에 도달하면 currentRootId로 설정
        const parentId = currentActive.parentId || currentRootId;
        dispatch(setActiveContainer(parentId));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageSrc = e.dataTransfer.getData("imageSrc");

    if (imageSrc && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // 줌과 스크롤을 고려하여 캔버스 내부 좌표 계산
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

  // 로딩 처리
  if (!rootElement) {
    return (
      <div className="flex-1 bg-gray-200 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 렌더링
  return (
    <main className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden relative select-none">
      {/* 상단 경로 표시 (Breadcrumb) */}
      <EditorBreadcrumb
        activeId={activeContainerId}
        elements={elements}
        onNavigate={(id) => dispatch(setActiveContainer(id))}
        rootId={currentRootId}
        rootName={activePageName}
      />

      {/* 캔버스 컨트롤 영역 (줌, 패닝, 마우스 이벤트) */}
      <CanvasControls
        containerRef={containerRef}
        paperRef={paperRef}
        onMouseDown={handleMouseDown}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
        onDoubleClick={handleBackgroundDoubleClick}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* 요소 렌더링 - 항상 Edit 모드 */}
        {rootElement.children.map((childId: string) => (
          <RuntimeElement
            key={childId}
            elementId={childId}
            mode="edit"
            // 💥 [수정] 현재 활성 컨테이너가 페이지 Root인지 확인
            isInsideActive={activeContainerId === currentRootId}
          />
        ))}

        {/* 선택 영역 테두리 (파란 점선) */}
        {selectedIds.length > 0 && (
          <SelectionBorder
            bounds={selectionBounds}
            selectedCount={selectedCount}
            selectedType={selectedType}
            elementIdToDisplay={idToDisplay}
          />
        )}

        {/* 변형 핸들 (리사이즈 & 앵커) */}
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

      {/* 드래그 선택 박스 (파란색 반투명 사각형) */}
      {selectionBox && containerRef.current && (
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
