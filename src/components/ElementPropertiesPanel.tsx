import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
  updateElementProps,
  updateElementAttributes,
  EditorElement,
} from "../store/elementSlice";
import ComponentInspector from "./ComponentInspector";
import { CSS_PROPERTIES, PROPERTY_VALUES } from "../constants";
import AutocompleteInput from "./AutocompleteInput";
import {
  Plus,
  Trash2,
  Smartphone,
  Tablet,
  Monitor,
  X,
  ChevronDown,
  AlertCircle,
  Hash,
  Edit2,
} from "lucide-react";
import { useModal } from "../context/ModalContext";

// --- Utility Functions ---
const toKebabCase = (str: string) =>
  str.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
const toCamelCase = (str: string) =>
  str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

// --- Internal Props Filter ---
const internalProps = [
  "className",
  "src",
  "text",
  "scripts",
  "scriptValues",
  "id",
  "elementId",
  "children",
  "parentId",
  "anchorX",
  "anchorY",
  "isLocked",
  "isVisible",
  "isExpanded",
  "type",
  "name",
];

// --- StyleRow Component ---
interface StyleRowProps {
  propKey: string;
  propValue: string;
  onCommit: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: (key: string) => void;
  isNew?: boolean;
}

function StyleRow({
  propKey,
  propValue,
  onCommit,
  onDelete,
  isNew,
}: StyleRowProps) {
  const [key, setKey] = useState(propKey);
  const [val, setVal] = useState(propValue);

  useEffect(() => {
    setKey(propKey);
    setVal(propValue);
  }, [propKey, propValue]);

  const commitChange = () => {
    if (key && val) {
      if (key !== propKey || val !== propValue) {
        onCommit(propKey, key, val);
        if (isNew) {
          setKey("");
          setVal("");
        }
      }
    }
  };

  const handleValueEnter = () => {
    if (key && val) {
      onCommit(propKey, key, val);
      if (isNew) {
        setKey("");
        setVal("");
      }
    }
  };

  return (
    <div className="flex items-start group text-xs hover:bg-gray-50 -ml-2 pl-2 rounded py-0.5 relative">
      <div className="w-[110px] shrink-0 mr-1 pt-0.5">
        <AutocompleteInput
          value={key}
          onChange={setKey}
          onBlur={commitChange}
          options={CSS_PROPERTIES}
          placeholder={isNew ? "property" : ""}
          className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none font-mono ${
            isNew ? "text-gray-400 italic" : "text-blue-700"
          }`}
        />
      </div>
      <span className="text-gray-400 mr-1 mt-0.5 select-none">:</span>
      <div className="flex-1 min-w-0 pt-0.5">
        <AutocompleteInput
          value={val}
          onChange={setVal}
          onBlur={commitChange}
          onEnter={handleValueEnter}
          options={PROPERTY_VALUES[toCamelCase(key)] || []}
          placeholder=""
          className="w-full text-gray-800 font-mono"
        />
      </div>
      <span className="text-gray-400 ml-1 mt-0.5 select-none">;</span>
      {!isNew && (
        <button
          onClick={() => onDelete(propKey)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 absolute right-0 top-0.5 bg-white/80 px-1"
          title="Remove property"
        >
          ×
        </button>
      )}
    </div>
  );
}

// --- StyleSection Component ---
interface StyleSectionProps {
  title: React.ReactNode;
  initialLabel?: string;
  styles: Record<string, any>;
  path: string[];
  onUpdate: (newStyles: Record<string, any>, path: string[]) => void;
  onDeleteSection?: () => void;
  onRename?: (newName: string) => void;
}

function StyleSection({
  title,
  initialLabel,
  styles,
  path,
  onUpdate,
  onDeleteSection,
  onRename,
}: StyleSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialLabel || "");

  const handleCommitStyle = (
    oldKey: string,
    newKey: string,
    newValue: string
  ) => {
    const camelNew = toCamelCase(newKey.trim());
    const camelOld = oldKey ? toCamelCase(oldKey.trim()) : "";
    const updates: any = {};
    if (camelOld && camelOld !== camelNew) updates[camelOld] = undefined;
    updates[camelNew] = newValue;
    onUpdate(updates, path);
  };

  const handleDeleteStyle = (key: string) => {
    const camelKey = toCamelCase(key);
    onUpdate({ [camelKey]: undefined }, path);
  };

  const handleSaveRename = () => {
    if (onRename && editValue.trim() && editValue.trim() !== initialLabel) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="mb-6 relative group/section">
      <div className="flex items-center justify-between mb-1 border-b border-gray-100 pb-1 h-7">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
              className="text-xs border rounded px-1 py-0.5 w-full focus:outline-blue-500 font-mono"
              autoFocus
            />
          </div>
        ) : (
          <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
            {title}
            {onRename && (
              <button
                onClick={() => {
                  setEditValue(initialLabel || "");
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover/section:opacity-100 text-gray-400 hover:text-blue-500 p-0.5 rounded transition-opacity"
                title="Rename selector"
              >
                <Edit2 size={10} />
              </button>
            )}
          </div>
        )}

        {!isEditing && onDeleteSection && (
          <button
            onClick={onDeleteSection}
            className="opacity-0 group-hover/section:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded transition-opacity"
            title="Delete this selector block"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="pl-2 border-l-2 border-gray-100 group-hover/section:border-blue-200 transition-colors">
        {Object.entries(styles).map(([key, value]) => {
          if (
            internalProps.includes(key) ||
            key.startsWith("@media") ||
            (typeof value === "object" && value !== null)
          )
            return null;

          const displayLabel = toKebabCase(key);

          return (
            <StyleRow
              key={`${path.join("-")}-${key}`}
              propKey={displayLabel}
              propValue={value as string}
              onCommit={handleCommitStyle}
              onDelete={handleDeleteStyle}
            />
          );
        })}

        {/* New Property Input */}
        <div className="border-t border-gray-100 border-dashed pt-1 mt-1">
          <StyleRow
            key={`${path.join("-")}-new`}
            propKey=""
            propValue=""
            onCommit={handleCommitStyle}
            onDelete={() => {}}
            isNew={true}
          />
        </div>
        <div className="text-[9px] text-gray-400 mt-1">{"}"}</div>
      </div>
    </div>
  );
}

// --- Main Component ---
interface ElementPropertiesPanelProps {
  selectedElement: EditorElement;
}

export default function ElementPropertiesPanel({
  selectedElement,
}: ElementPropertiesPanelProps) {
  const dispatch = useDispatch();
  const selectedElementId = selectedElement.elementId;
  const { showModal } = useModal();

  // Canvas Settings (Breakpoints)
  const breakpoints =
    useSelector(
      (state: RootState) => state.canvas.canvasSettings.breakpoints
    ) || [];

  // Local States
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [scriptSchemas, setScriptSchemas] = useState<{
    [scriptName: string]: any;
  }>({});
  const [localId, setLocalId] = useState("");
  const [localClass, setLocalClass] = useState("");

  // Context Management
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string>("base");

  // Selector Addition State
  const [isAddingSelector, setIsAddingSelector] = useState(false);
  const [newSelectorInput, setNewSelectorInput] = useState("");

  // ID/Class Sync
  useEffect(() => {
    if (selectedElement) {
      setLocalId(selectedElement.id || "");
      setLocalClass(selectedElement.className || "");
    }
  }, [
    selectedElement.elementId,
    selectedElement.id,
    selectedElement.className,
  ]);

  // Scripts Refresh Logic
  const refreshAll = useCallback(async () => {
    // @ts-ignore
    if (!window.electronAPI) return;
    // @ts-ignore
    const latestScripts = await window.electronAPI.getScripts();
    setAvailableScripts(latestScripts);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // --- Handlers: Update Styles ---
  const updateStyleAtPath = (
    newStyles: Record<string, any>,
    path: string[]
  ) => {
    if (path.length === 0) {
      dispatch(updateElementProps({ id: selectedElementId, props: newStyles }));
      return;
    }

    const rootKey = path[0];
    const rootValue = { ...(selectedElement.props[rootKey] || {}) };

    if (path.length === 1) {
      const updatedVariant = { ...rootValue, ...newStyles };
      Object.keys(newStyles).forEach((k) => {
        if (newStyles[k] === undefined) delete updatedVariant[k];
      });
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [rootKey]: updatedVariant },
        })
      );
    } else if (path.length === 2) {
      const subKey = path[1];
      const subValue = { ...(rootValue[subKey] || {}) };
      const updatedSubVariant = { ...subValue, ...newStyles };
      Object.keys(newStyles).forEach((k) => {
        if (newStyles[k] === undefined) delete updatedSubVariant[k];
      });
      rootValue[subKey] = updatedSubVariant;
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [rootKey]: rootValue },
        })
      );
    }
  };

  // --- Handlers: Selector Management ---
  const handleAddSelector = () => {
    if (!newSelectorInput.trim()) return;

    const newSelector = newSelectorInput.trim();

    // 현재 Context(Breakpoint)에 빈 객체로 Selector 생성
    let pathToAdd = [];
    if (selectedBreakpoint !== "base") pathToAdd.push(selectedBreakpoint);
    pathToAdd.push(newSelector);

    // Create entry in Redux
    updateStyleAtPath({}, pathToAdd);

    setNewSelectorInput("");
    setIsAddingSelector(false);
  };

  const handleRenameSelector = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const validNewName = newName.trim();

    // Check collision in current context
    const contextStyles =
      selectedBreakpoint === "base"
        ? selectedElement.props
        : selectedElement.props[selectedBreakpoint] || {};

    if (contextStyles[validNewName]) {
      // Simple alert or modal could be used here
      console.warn("Selector name already exists");
      return;
    }

    // Move properties from old key to new key
    if (selectedBreakpoint === "base") {
      const oldStyles = selectedElement.props[oldName];
      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: {
            [oldName]: undefined, // Delete old
            [validNewName]: oldStyles, // Add new
          },
        })
      );
    } else {
      const bpKey = selectedBreakpoint;
      const bpObj = { ...(selectedElement.props[bpKey] || {}) };

      // Move styles
      bpObj[validNewName] = bpObj[oldName];
      delete bpObj[oldName];

      dispatch(
        updateElementProps({
          id: selectedElementId,
          props: { [bpKey]: bpObj },
        })
      );
    }
  };

  const handleDeleteSelector = (selectorName: string) => {
    showModal({
      title: "Delete Selector",
      body: (
        <span>
          Are you sure you want to delete styles for <b>{selectorName}</b> in
          this breakpoint?
        </span>
      ),
      showCancel: true,
      onConfirm: () => {
        let parentPath = [];
        if (selectedBreakpoint !== "base") parentPath.push(selectedBreakpoint);

        if (parentPath.length === 0) {
          // Root에서 삭제
          dispatch(
            updateElementProps({
              id: selectedElementId,
              props: { [selectorName]: undefined },
            })
          );
        } else {
          // Breakpoint 내부에서 삭제
          const bpKey = parentPath[0];
          const bpObj = { ...selectedElement.props[bpKey] };
          delete bpObj[selectorName];
          dispatch(
            updateElementProps({
              id: selectedElementId,
              props: { [bpKey]: bpObj },
            })
          );
        }
      },
    });
  };

  // --- Handlers: Attribute ---
  const commitAttribute = (name: string, value: string) => {
    if (selectedElementId) {
      if (
        (name === "id" && value !== selectedElement.id) ||
        (name === "className" && value !== (selectedElement.className || ""))
      ) {
        dispatch(
          updateElementAttributes({ id: selectedElementId, name, value })
        );
      }
    }
  };

  // --- Data Preparation for Rendering ---
  const rootProps =
    selectedBreakpoint === "base"
      ? selectedElement.props
      : selectedElement.props[selectedBreakpoint] || {};

  // 1. Base Styles (Context Root)
  const baseStyles = rootProps; // Contains styles + nested selectors

  // 2. Selectors (Context Children)
  const selectors = Object.keys(baseStyles).filter((key) => {
    if (internalProps.includes(key)) return false;
    if (key.startsWith("@media")) return false;
    const val = baseStyles[key];
    return typeof val === "object" && val !== null;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 1. Header & Attributes */}
      <div className="p-4 border-b shrink-0">
        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
          Properties
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold w-8">ID</span>
            <input
              type="text"
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              onBlur={() => commitAttribute("id", localId)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="flex-1 min-w-0 border-b border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono py-1"
              placeholder="id"
            />
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-gray-500 font-bold w-8 mt-1.5">
              CLASS
            </span>
            <div className="flex-1 min-w-0">
              <AutocompleteInput
                value={localClass}
                onChange={setLocalClass}
                onBlur={() => commitAttribute("className", localClass)}
                options={[]}
                className="w-full bg-transparent border-b border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none text-xs text-gray-700 font-mono py-1"
                placeholder="class names"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Breakpoint Context Selection */}
      <div className="px-4 py-2 shrink-0">
        <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">
          Styles
        </h3>
        <div className="relative">
          <select
            value={selectedBreakpoint}
            onChange={(e) => setSelectedBreakpoint(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs border rounded appearance-none focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
          >
            <option value="base">Default (All Devices)</option>
            {breakpoints.map((bp) => (
              <option key={bp.id} value={`@media (max-width: ${bp.width}px)`}>
                {bp.name} (≤ {bp.width}px)
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-gray-500">
            {selectedBreakpoint === "base" ? (
              <Monitor size={14} />
            ) : (
              <Smartphone size={14} />
            )}
          </div>
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-400">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 3. Style Sections (Flat View) */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        {/* Text Content Editor (Only for Text Type) */}
        {selectedElement.type === "Text" && (
          <div className="mb-6 space-y-1">
            <span className="text-xs font-bold text-gray-600">Content</span>
            <textarea
              rows={2}
              value={selectedElement.props.text || ""}
              onChange={(e) =>
                dispatch(
                  updateElementProps({
                    id: selectedElementId!,
                    props: { text: e.target.value },
                  })
                )
              }
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none resize-none font-mono"
            />
          </div>
        )}

        {/* --- SECTION 1: Base Styles --- */}
        <StyleSection
          title={
            <span className="text-gray-800">
              Base Styles
            </span>
          }
          styles={baseStyles}
          path={selectedBreakpoint === "base" ? [] : [selectedBreakpoint]}
          onUpdate={updateStyleAtPath}
        />

        {/* --- SECTION 2: Selector Styles --- */}
        {selectors.map((sel) => (
          <StyleSection
            key={sel}
            title={<span className="text-purple-700 font-mono">{sel}</span>}
            initialLabel={sel}
            styles={baseStyles[sel]}
            path={
              selectedBreakpoint === "base" ? [sel] : [selectedBreakpoint, sel]
            }
            onUpdate={updateStyleAtPath}
            onDeleteSection={() => handleDeleteSelector(sel)}
            onRename={(newName) => handleRenameSelector(sel, newName)}
          />
        ))}

        {/* --- SECTION 3: Add Selector --- */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {isAddingSelector ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="text"
                value={newSelectorInput}
                onChange={(e) => setNewSelectorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSelector()}
                placeholder=":hover, .active"
                className="flex-1 border rounded px-2 py-1 text-xs focus:outline-blue-500 font-mono"
                autoFocus
              />
              <button
                onClick={handleAddSelector}
                className="bg-blue-500 text-white px-2 rounded text-xs hover:bg-blue-600"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingSelector(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSelector(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={12} /> Add Selector / State
            </button>
          )}
        </div>

        {/* Component Inspector */}
        <div className="pt-4">
          <ComponentInspector
            selectedElement={selectedElement}
            availableScripts={availableScripts}
            scriptSchemas={scriptSchemas}
          />
        </div>
      </div>
    </div>
  );
}
