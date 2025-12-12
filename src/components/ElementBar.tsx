import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { addElement } from "../store/elementSlice";
import { selectElement, setTool } from "../store/canvasSlice";
import { usePannelToggle } from "../hooks/usePannelToggle";
import { RootState } from "../store/store";

export default function ElementBar() {
  const dispatch = useDispatch();
  const { isOpen, toggle } = usePannelToggle(true);

  // Canvas 상태
  const { activeContainerId } = useSelector((state: RootState) => state.canvas);

  // 💥 [추가] Page 상태: 현재 페이지의 루트 ID 찾기
  const { pages, activePageId } = useSelector((state: RootState) => state.page);
  const activePage = pages.find((p) => p.pageId === activePageId);
  const currentRootId = activePage?.rootElementId || "root";

  const handleAddElement = (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "Box" | "Text"
  ) => {
    e.currentTarget.blur();
    const randomX = Math.floor(Math.random() * 400);
    const randomY = Math.floor(Math.random() * 400);

    const newElement = {
      elementId: Date.now().toString(),
      id: "",
      type,
      props: {
        backgroundColor: type === "Box" ? "#e2e8f0" : "transparent",
        width: type === "Box" ? "150px" : "auto",
        height: type === "Box" ? "150px" : "auto",
        text: type === "Text" ? "Hello World" : undefined,
        fontSize: "16px",
        color: "#000000",
        position: "absolute",
        left: `${randomX}px`,
        top: `${randomY}px`,
      },
      scripts: [],
      children: [],
      parentId: activeContainerId || currentRootId,
    };

    // 1. 추가
    dispatch(addElement(newElement));

    // 2. 자동 선택
    dispatch(selectElement({ id: newElement.elementId, multiple: false }));

    // 3. 툴 초기화
    dispatch(setTool("select"));
  };

  return (
    <aside
      className={`relative border-r border-gray-300 bg-gray-50 shadow-inner flex flex-col transition-all duration-300 ease-in-out z-40 ${
        isOpen ? "w-50 p-4" : "w-0 p-0 border-none"
      }`}
    >
      <button
        onClick={toggle}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-blue-600 focus:outline-none"
        style={{ transform: isOpen ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div
        className={`flex flex-col gap-3 overflow-hidden ${!isOpen && "hidden"}`}
      >
        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 whitespace-nowrap">
          Elements
        </h3>
        <button
          onClick={(e) => handleAddElement(e, "Box")}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all group whitespace-nowrap active:bg-blue-50 focus:outline-none"
        >
          <div className="h-8 w-8 min-w-[2rem] rounded bg-gray-100 border border-gray-300 group-hover:bg-blue-50 group-hover:border-blue-300"></div>
          <div>
            <span className="block text-sm font-medium text-gray-700">Box</span>
            <span className="text-[10px] text-gray-400">Container</span>
          </div>
        </button>
        <button
          onClick={(e) => handleAddElement(e, "Text")}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all group whitespace-nowrap active:bg-blue-50 focus:outline-none"
        >
          <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded bg-gray-100 border border-gray-300 text-gray-500 font-serif font-bold group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-300">
            T
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700">
              Text
            </span>
            <span className="text-[10px] text-gray-400">Label / Paragraph</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
