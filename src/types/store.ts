export interface EditorElement {
  elementId: string; // 내부 UUID
  id?: string;       // HTML ID
  type: 'Box' | 'Text' | 'Image';
  props: { [key: string]: any };
  scripts?: string[];
  scriptValues?: { [scriptName: string]: { [fieldName: string]: any } };
  className?: string;
  children: string[];
  parentId: string | null;
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  scrollX: number;
  scrollY: number;
}