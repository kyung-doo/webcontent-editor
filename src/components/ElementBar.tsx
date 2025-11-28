import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { addElement } from "../store/elementSlice";
import { usePannelToggle } from "../hooks/usePannelToggle";
import { RootState } from "../store/store";

export default function ElementBar() {
  const dispatch = useDispatch();
  const { isOpen, toggle } = usePannelToggle(true);

  // ⭐ [중요] Store 분리 후 activeContainerId는 'canvas' 슬라이스에 있습니다.
  const { activeContainerId } = useSelector((state: RootState) => state.canvas);

  const handleAddElement = (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "Box" | "Text"
  ) => {
    e.currentTarget.blur();

    // 랜덤 위치 (겹침 방지)
    const randomX = Math.floor(Math.random() * 400);
    const randomY = Math.floor(Math.random() * 400);

    const newElement = {
      elementId: Date.now().toString(), // 내부 UUID
      id: "", // HTML ID
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
      // ⭐ 현재 보고 있는 컨테이너를 부모로 지정 (없으면 'root'가 들어감)
      parentId: activeContainerId || "root",
    };

    console.log("Adding Element:", newElement); // 디버깅용 로그
    dispatch(addElement(newElement));
  };

  return (
    <aside
      className={`relative border-r border-gray-300 bg-white shadow-sm z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 p-4" : "w-0 p-0 border-none"
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
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 hover:border-blue-400 transition-all group whitespace-nowrap active:bg-blue-50 focus:outline-none"
        >
          <div className="h-8 w-8 min-w-[2rem] rounded bg-gray-200 border border-gray-300 group-hover:bg-blue-100 group-hover:border-blue-300"></div>
          <div>
            <span className="block text-sm font-medium">Box Container</span>
            <span className="text-xs text-gray-400">네모 박스 추가</span>
          </div>
        </button>
        <button
          onClick={(e) => handleAddElement(e, "Text")}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 hover:border-blue-400 transition-all group whitespace-nowrap active:bg-blue-50 focus:outline-none"
        >
          <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded bg-gray-200 border border-gray-300 text-gray-500 font-serif font-bold group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:border-blue-300">
            T
          </div>
          <div>
            <span className="block text-sm font-medium">Text Block</span>
            <span className="text-xs text-gray-400">텍스트 추가</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
