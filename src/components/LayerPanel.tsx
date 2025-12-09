import React, { memo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { selectElement, selectMultipleElements } from "../store/canvasSlice";
import {
  toggleVisibility,
  toggleLock,
  toggleExpanded,
  reorderElement,
} from "../store/elementSlice";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Box,
  Type,
  Image as ImageIcon,
  Layout,
} from "lucide-react";

// 요소 타입별 아이콘 매핑
const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "Box":
      return <Box size={14} className="text-blue-500" />;
    case "Text":
      return <Type size={14} className="text-gray-500" />;
    case "Image":
      return <ImageIcon size={14} className="text-green-500" />;
    default:
      return <Layout size={14} />;
  }
};

type DropPosition = "before" | "after" | "inside";

// 재귀적으로 렌더링되는 개별 레이어 아이템
const LayerItem = memo(
  ({ elementId, depth = 0 }: { elementId: string; depth?: number }) => {
    const dispatch = useDispatch();
    const element = useSelector(
      (state: RootState) => state.elements.elements[elementId]
    );
    const selectedIds = useSelector(
      (state: RootState) => state.canvas.selectedIds
    );

    // 드래그 상태 관리
    const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    if (!element) return null;

    const isSelected = selectedIds.includes(elementId);
    const isVisible = element.isVisible !== false;
    const isLocked = element.isLocked === true;
    const isExpanded = element.isExpanded !== false;
    const hasChildren = element.children && element.children.length > 0;
    const isContainer = element.type === "Box"; // 자식을 가질 수 있는 타입

    // --- 핸들러 ---

    const handleSelect = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(
        selectElement({ id: elementId, multiple: e.metaKey || e.ctrlKey })
      );
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(toggleExpanded(elementId));
    };

    const handleToggleVisible = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(toggleVisibility(elementId));
    };

    const handleToggleLock = (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(toggleLock(elementId));
      if (isSelected) {
        const newSelectedIds = selectedIds.filter(
          (id: string) => id !== elementId
        );
        if (newSelectedIds.length === 0) {
          dispatch(selectElement(null));
        } else {
          dispatch(selectMultipleElements(newSelectedIds));
        }
      }
    };

    // --- Drag & Drop 로직 ---

    const handleDragStart = (e: React.DragEvent) => {
      if (isLocked) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      // 드래그되는 요소의 ID를 전송
      e.dataTransfer.setData("application/react-dnd-id", elementId);
      e.dataTransfer.effectAllowed = "move";

      // 드래그 이미지 설정
      const dragPreview = document.createElement("div");
      dragPreview.innerText = element.props.name || element.type;
      dragPreview.style.position = "absolute";
      dragPreview.style.top = "-1000px";
      dragPreview.style.background = "white";
      dragPreview.style.padding = "4px";
      dragPreview.style.border = "1px solid gray";
      document.body.appendChild(dragPreview);
      e.dataTransfer.setDragImage(dragPreview, 0, 0);
      setTimeout(() => document.body.removeChild(dragPreview), 0);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!itemRef.current) return;

      const rect = itemRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // 영역 계산: 상단 25%, 하단 25%, 중간 50%
      if (y < height * 0.25) {
        setDropPosition("before");
      } else if (y > height * 0.75) {
        setDropPosition("after");
      } else {
        // 컨테이너인 경우에만 'inside' 허용, 아니면 하단으로
        if (isContainer) {
          setDropPosition("inside");
        } else {
          setDropPosition("after");
        }
      }
    };

    const handleDragLeave = () => {
      setDropPosition(null);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropPosition(null);

      const sourceId = e.dataTransfer.getData("application/react-dnd-id");
      if (!sourceId) return;

      let finalTargetId = elementId;
      let finalPosition = dropPosition;
      let isUnnesting = false;

      // [핵심] 왼쪽으로 드래그 시 부모 밖으로 빼내기 (Unnesting Logic)
      // 조건: 'after'로 드롭하면서, 마우스가 현재 depth 들여쓰기보다 왼쪽으로 치우쳤을 때
      // 혹은 자기 자신 위라도 왼쪽으로 치우쳤다면 Unnesting 시도
      if (
        (dropPosition === "after" || sourceId === elementId) &&
        element.parentId &&
        itemRef.current
      ) {
        const rect = itemRef.current.getBoundingClientRect();
        // 현재 아이템의 들여쓰기 시작점 (depth * 12 + 4)
        const currentIndentation = depth * 12 + 4;
        const mouseX = e.clientX - rect.left;

        // 마우스가 아이콘(들여쓰기) 근처보다 왼쪽이면 (범위를 +10px로 넓혀서 감지 쉽게 함)
        // "이 요소의 뒤"가 아니라 "이 요소 부모의 뒤"로 이동하겠다는 의도로 해석
        if (mouseX < currentIndentation + 10) {
          finalTargetId = element.parentId; // 타겟을 부모로 변경
          finalPosition = "after"; // 부모의 뒤로 이동 (결과적으로 그룹 탈출)
          isUnnesting = true;
        }
      }

      // 자기 자신에게 드롭하는 경우, Unnesting이 아니면 무시
      if (sourceId === elementId && !isUnnesting) return;

      if (finalPosition) {
        dispatch(
          reorderElement({
            sourceId,
            targetId: finalTargetId,
            position: finalPosition,
          })
        );

        // 만약 Inside로 드롭했고 현재 닫혀있다면 열어주기
        if (finalPosition === "inside" && !isExpanded) {
          dispatch(toggleExpanded(elementId));
        }
      }
    };

    // --- 이름 표시 로직 ---
    const displayName = element.props.name || element.type;
    const displayId = element.id ? `#${element.id}` : null;
    const rawClass = element.className;
    const displayClass = rawClass
      ? `.${rawClass.trim().replace(/\s+/g, ".")}`
      : null;

    // --- 스타일 계산 ---
    // 드래그 오버 시 시각적 피드백
    let borderStyles = "border-transparent";
    let bgStyles = "";

    if (dropPosition === "before") {
      borderStyles = "border-t-2 border-t-blue-500 border-b-transparent";
    } else if (dropPosition === "after") {
      borderStyles = "border-b-2 border-b-blue-500 border-t-transparent";
    } else if (dropPosition === "inside") {
      bgStyles = "bg-blue-50";
      borderStyles = "border-blue-300 border-2 border-dashed"; // Inside는 점선 테두리로 명확히 구분
    }

    return (
      <div
        ref={itemRef}
        className={`relative transition-all ${bgStyles}`}
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드롭 인디케이터 (테두리로 표현) */}
        <div
          className={`absolute inset-0 pointer-events-none ${borderStyles} z-10`}
        />

        <div
          className={`
          flex items-center h-8 pr-2 text-sm select-none hover:bg-gray-50 transition-colors group
          ${
            isSelected
              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
              : "text-gray-700"
          }
          ${dropPosition === "inside" ? "bg-blue-50" : ""}
        `}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={handleSelect}
        >
          {/* 확장/축소 화살표 */}
          <div
            className="w-5 h-5 flex items-center justify-center cursor-pointer mr-0.5 shrink-0"
            onClick={handleToggleExpand}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )
            ) : (
              <div className="w-3" />
            )}
          </div>

          {/* 타입 아이콘 */}
          <div className="mr-2 opacity-70 shrink-0">
            <TypeIcon type={element.type} />
          </div>

          {/* 이름 + ID + Class 표시 */}
          <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
            <span className="font-medium truncate text-xs">{displayName}</span>
            {displayId && (
              <span
                className="text-gray-400 font-normal text-[10px] shrink-0 max-w-[50px] truncate"
                title={displayId}
              >
                {displayId}
              </span>
            )}
            {displayClass && (
              <span
                className="text-blue-400 font-normal text-[10px] shrink-0 max-w-[60px] truncate"
                title={displayClass}
              >
                {displayClass}
              </span>
            )}
          </div>

          {/* 액션 아이콘들 */}
          <div
            className={`flex items-center gap-1 shrink-0 ml-2 ${
              isSelected || isLocked || !isVisible
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <button
              onClick={handleToggleLock}
              className={`p-1 rounded hover:bg-gray-200 ${
                isLocked ? "text-orange-500" : "text-gray-400"
              }`}
              title={isLocked ? "Unlock" : "Lock"}
            >
              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>

            <button
              onClick={handleToggleVisible}
              className={`p-1 rounded hover:bg-gray-200 ${
                !isVisible ? "text-gray-400" : "text-gray-600"
              }`}
              title={isVisible ? "Hide" : "Show"}
            >
              {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
        </div>

        {/* 자식 렌더링 */}
        {hasChildren && isExpanded && (
          <div>
            {element.children.map((childId) => (
              <LayerItem key={childId} elementId={childId} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
);

export default function LayerPanel() {
  const { activePageId, pages } = useSelector((state: RootState) => state.page);
  const elements = useSelector((state: RootState) => state.elements.elements);

  const activePage = pages?.find((p: any) => p.pageId === activePageId);
  const rootId = activePage?.rootElementId;

  if (!rootId)
    return (
      <div className="p-4 text-xs text-gray-400 text-center">
        No Active Page
      </div>
    );

  const rootElement = elements[rootId];
  if (!rootElement)
    return (
      <div className="p-4 text-xs text-gray-400 text-center">
        Root Element Not Found
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wide">
        <Layout size={14} /> Layers
      </div>
      <div className="flex-1 overflow-y-auto">
        {rootElement.children && rootElement.children.length > 0 ? (
          rootElement.children.map((childId) => (
            <LayerItem key={childId} elementId={childId} depth={0} />
          ))
        ) : (
          <div className="p-4 text-xs text-gray-400 text-center">
            Empty Layer
          </div>
        )}
      </div>
    </div>
  );
}
