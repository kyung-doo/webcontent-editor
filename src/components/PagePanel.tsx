import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Layout, Copy } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  addPage,
  deletePage,
  setActivePage,
  updatePageName,
  Page,
} from "../store/pageSlice";
import { addElements, deleteElements } from "../store/elementSlice"; // 요소 추가/삭제 액션
import { setActiveContainer } from "../store/canvasSlice"; // 캔버스 화면 전환 액션
import { useModal } from "../context/ModalContext";

let PAGE_COUNT = 1;

// 페이지 파일 아이콘
const PageFileIcon = () => (
  <svg
    className="w-10 h-10 text-indigo-400 mb-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export default function PagePanel() {
  const dispatch = useDispatch();
  const { pages, activePageId } = useSelector((state: RootState) => state.page);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { showModal, hideModal } = useModal();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && activePageId && !editingPageId) {
        const activePage = pages.find((p: any) => p.pageId === activePageId);
        if (activePage) startEditing(activePageId, activePage.name);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePageId, editingPageId, pages]);

  useEffect(() => {
    if (editingPageId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPageId]);

  const startEditing = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditName(currentName);
  };

  const finishEditing = () => {
    if (editingPageId) {
      if (editName.trim()) {
        dispatch(
          updatePageName({ pageId: editingPageId, name: editName.trim() })
        );
      }
      setEditingPageId(null);
      setEditName("");
    }
  };

  const cancelEditing = () => {
    setEditingPageId(null);
    setEditName("");
  };

  const handleAddPage = () => {
    PAGE_COUNT++;
    const newPageId = `page-${PAGE_COUNT}`;
    const newRootId = `root-${PAGE_COUNT}`;

    dispatch(
      addElements([
        {
          elementId: newRootId,
          type: "Box",
          props: {
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          },
          parentId: null,
          children: [],
        },
      ])
    );

    dispatch(
      addPage({
        pageId: newPageId,
        name: `Page ${pages.length + 1}`,
        rootElementId: newRootId,
      })
    );

    // 페이지 추가 후 바로 이동
    dispatch(setActivePage(newPageId));
    dispatch(setActiveContainer(newRootId));
  };

  const handleDeletePage = (pageId: string, rootElementId: string) => {
    const activePage = pages.find((p: Page) => p.pageId === pageId);
    showModal({
      title: '알림',
      body: `${activePage?.name} 페이지를 삭제하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        if (pages.length > 1) {
          dispatch(deletePage(pageId));
          dispatch(deleteElements([rootElementId]));

          if (pageId === activePageId) {
            const remainingPages = pages.filter((p: any) => p.pageId !== pageId);
            const nextPage = remainingPages[0];
            if (nextPage) {
              dispatch(setActivePage(nextPage.pageId));
              dispatch(setActiveContainer(nextPage.rootElementId));
            }
          }
        } else {
          showModal({
            title: '알림',
            body: '최소 하나의 페이지는 존재해야 합니다.'
          });
        }
      }
    });    
  };

  const handleSelectPage = (pageId: string, rootElementId: string) => {
    dispatch(setActivePage(pageId));
    dispatch(setActiveContainer(rootElementId));
  };

  const handleDuplicatePage = (pageId: string) => {
    handleAddPage();
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="flex items-center px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0 gap-3">
        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
          <Layout size={14} /> Pages
        </span>
        <button
          onClick={handleAddPage}
          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:border-blue-400 hover:text-blue-600 transition-all"
        >
          <Plus size={10} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4">
          {pages.map((page: any) => {
            const isActive = page.pageId === activePageId;
            const isEditing = page.pageId === editingPageId;

            return (
              <div
                key={page.pageId}
                onClick={() =>
                  !isEditing &&
                  handleSelectPage(page.pageId, page.rootElementId)
                }
                className={`
                  group relative h-24 w-24 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer rounded border transition-all
                  ${
                    isActive
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
                  }`
                }
              >
                <div className="mt-2">
                  <PageFileIcon />
                </div>
                <div className="w-full px-1 text-center mt-1 h-[15px] flex items-center justify-center">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={(e) => e.key === "Enter" && finishEditing()}
                      className="w-full text-[10px] text-center bg-white border border-blue-400 rounded outline-none px-1 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p
                      className={`text-[10px] truncate w-full select-none ${
                        isActive ? "text-blue-700 font-medium" : "text-gray-600"
                      }`}
                      title={`${page.name} (F2 to rename)`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditing(page.pageId, page.name);
                      }}
                    >
                      {page.name}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePage(page.pageId);
                      }}
                      className="p-1 bg-white/90 rounded-full border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600"
                    >
                      <Copy size={10} />
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(page.pageId, page.rootElementId);
                        }}
                        className="p-1 bg-white/90 rounded-full border border-gray-200 shadow-sm text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
