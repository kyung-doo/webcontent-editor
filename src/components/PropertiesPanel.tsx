import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import CanvasSettingsPanel from "./CanvasSettingsPanel";
import ElementPropertiesPanel from "./ElementPropertiesPanel";

export default function PropertiesPanel() {
  const elementsMap = useSelector(
    (state: RootState) => state.elements.elements
  );
  const elements = useMemo(
    () => (elementsMap ? Object.values(elementsMap) : []),
    [elementsMap]
  );

  const { selectedElementId } = useSelector(
    (state: RootState) => state.canvas
  );

  const selectedElement = elements.find(
    (el) => el.elementId === selectedElementId
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-white">
      {!selectedElement ? (
        <CanvasSettingsPanel />
      ) : (
        <ElementPropertiesPanel selectedElement={selectedElement} />
      )}
    </div>
  );
}