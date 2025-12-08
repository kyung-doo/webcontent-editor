import React, { useState } from "react";
import { Layers, FileText, ChevronDown, ChevronUp } from "lucide-react";
import AssetPanel from "./AssetPanel"; // 기존 AssetPanel import
import PagePanel from "./PagePanel"; // 새로 만든 PagePanel import

type Tab = "assets" | "pages";

export default function BottomPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("assets");
  const [isExpanded, setIsExpanded] = useState(true); // 펼침 상태 관리

  // 탭 항목 정의
  const tabs = [
    { id: "assets", icon: Layers, label: "에셋" },
    { id: "pages", icon: FileText, label: "페이지" },
  ];

  return (
    <div
      className={`flex flex-col bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 relative transition-all duration-300 ease-in-out
            ${isExpanded ? "h-64" : "h-[45px]"}`} // 접혔을 때는 탭 헤더 높이만큼만 유지
    >
      {/* 탭 네비게이션 & 토글 버튼 */}
      <div className="flex justify-between border-b border-gray-100 bg-white flex-shrink-0 h-[45px]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab);
                if (!isExpanded) setIsExpanded(true); // 탭 클릭 시 자동으로 펼침
              }}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-semibold transition-all relative outline-none
                                ${
                                  activeTab === tab.id
                                    ? "text-blue-600"
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {/* 활성 탭 인디케이터 (펼쳐져 있을 때만 표시) */}
              {activeTab === tab.id && isExpanded && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* 펼침/닫기 토글 버튼 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title={isExpanded ? "패널 접기" : "패널 펼치기"}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* 패널 내용 영역 */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden relative animate-in fade-in slide-in-from-bottom-2 duration-200">
          {activeTab === "assets" && <AssetPanel />}
          {activeTab === "pages" && <PagePanel />}
        </div>
      )}
    </div>
  );
}
