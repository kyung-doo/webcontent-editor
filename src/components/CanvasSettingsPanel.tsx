import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { updateCanvasSettings } from "../store/canvasSlice";
import {
  Monitor,
  Tablet,
  Smartphone,
  Square,
  Settings2,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";

export default function CanvasSettingsPanel() {
  const dispatch = useDispatch();
  const { canvasSettings } = useSelector((state: RootState) => state.canvas);

  // Redux 상태에서 가져오기 (없을 경우 빈 배열 처리)
  const breakpoints = canvasSettings.breakpoints || [];
  
  const [isEditing, setIsEditing] = useState(false);

  const handlePresetClick = (width: number, height: number) => {
    dispatch(updateCanvasSettings({ width, height }));
  };

  const getIcon = (width: number) => {
    if (width >= 1200) return <Monitor size={16} />;
    if (width >= 600) return <Tablet size={16} />;
    return <Smartphone size={16} />;
  };

  // --- 편집 핸들러 (Redux Dispatch) ---
  const handleAddBreakpoint = () => {
    const newBreakpoints = [
      ...breakpoints,
      {
        id: `custom-${Date.now()}`,
        name: "New Point",
        width: 360,
        height: 640,
      },
    ];
    dispatch(updateCanvasSettings({ breakpoints: newBreakpoints }));
  };

  const handleDeleteBreakpoint = (id: string) => {
    const newBreakpoints = breakpoints.filter((bp) => bp.id !== id);
    dispatch(updateCanvasSettings({ breakpoints: newBreakpoints }));
  };

  const handleUpdateBreakpoint = (
    id: string,
    field: "name" | "width" | "height",
    value: string | number
  ) => {
    const newBreakpoints = breakpoints.map((bp) =>
      bp.id === id ? { ...bp, [field]: value } : bp
    );
    dispatch(updateCanvasSettings({ breakpoints: newBreakpoints }));
  };

  return (
    <div className="space-y-6 p-5">
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 border-b pb-2">
        Canvas Settings
      </h3>

      {/* 브레이크포인트 (Presets) 섹션 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Breakpoints
          </label>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              isEditing ? "text-blue-600 bg-blue-50" : "text-gray-400"
            }`}
            title={isEditing ? "Finish Editing" : "Edit Breakpoints"}
          >
            {isEditing ? <Check size={14} /> : <Settings2 size={14} />}
          </button>
        </div>

        {isEditing ? (
          // --- 편집 모드 ---
          <div className="space-y-2 border rounded-md p-2 bg-gray-50 max-h-60 overflow-y-auto">
            {breakpoints.map((bp) => (
              <div key={bp.id} className="flex items-center gap-1">
                <div className="text-gray-400 shrink-0">{getIcon(bp.width)}</div>
                <input
                  type="text"
                  value={bp.name}
                  onChange={(e) =>
                    handleUpdateBreakpoint(bp.id, "name", e.target.value)
                  }
                  className="w-16 text-xs border rounded px-1 py-1 focus:outline-blue-500"
                  placeholder="Name"
                />
                <input
                  type="number"
                  value={bp.width}
                  onChange={(e) =>
                    handleUpdateBreakpoint(
                      bp.id,
                      "width",
                      Number(e.target.value)
                    )
                  }
                  className="w-14 text-xs border rounded px-1 py-1 focus:outline-blue-500 text-right"
                  placeholder="W"
                />
                <span className="text-gray-400 text-[10px]">x</span>
                <input
                  type="number"
                  value={bp.height}
                  onChange={(e) =>
                    handleUpdateBreakpoint(
                      bp.id,
                      "height",
                      Number(e.target.value)
                    )
                  }
                  className="w-14 text-xs border rounded px-1 py-1 focus:outline-blue-500 text-right"
                  placeholder="H"
                />
                <button
                  onClick={() => handleDeleteBreakpoint(bp.id)}
                  className="ml-auto text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddBreakpoint}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 mt-2"
            >
              <Plus size={12} /> Add Breakpoint
            </button>
          </div>
        ) : (
          // --- 일반 보기 모드 ---
          <div className="grid grid-cols-3 gap-2">
            {breakpoints.map((bp) => {
              const isActive =
                canvasSettings.width === bp.width &&
                canvasSettings.height === bp.height;

              return (
                <button
                  key={bp.id}
                  onClick={() => handlePresetClick(bp.width, bp.height)}
                  className={`
                    flex flex-col items-center justify-center gap-1 p-2 rounded border transition-colors relative group
                    ${
                      isActive
                        ? "bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                    }
                  `}
                  title={`${bp.name} (${bp.width}x${bp.height})`}
                >
                  {getIcon(bp.width)}
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {bp.name}
                  </span>
                  <span className="text-[9px] opacity-70">
                    {bp.width}px
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Width (px)
          </label>
          <input
            type="number"
            value={canvasSettings.width}
            onChange={(e) =>
              dispatch(updateCanvasSettings({ width: Number(e.target.value) }))
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Height (px)
          </label>
          <input
            type="number"
            value={canvasSettings.height}
            onChange={(e) =>
              dispatch(updateCanvasSettings({ height: Number(e.target.value) }))
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Background</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={canvasSettings.backgroundColor}
            onChange={(e) =>
              dispatch(
                updateCanvasSettings({ backgroundColor: e.target.value })
              )
            }
            className="h-9 w-14 cursor-pointer rounded border border-gray-300 p-0.5"
          />
          <span className="text-xs text-gray-500 uppercase font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
            {canvasSettings.backgroundColor}
          </span>
        </div>
      </div>
    </div>
  );
}