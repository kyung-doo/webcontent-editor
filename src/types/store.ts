export interface CanvasSettings {
  width: number;          // 캔버스 가로 크기 (px)
  height: number;         // 캔버스 세로 크기 (px)
  backgroundColor: string;// 캔버스 배경색 (Hex)
  zoom: number;           // 확대 배율 (1.0 = 100%)
  scrollX: number;        // 가로 스크롤 위치
  scrollY: number;        // 세로 스크롤 위치
}

export interface EditorElement {
  elementId: string;      // 내부 UUID
  id?: string;            // HTML ID
  type: 'Box' | 'Text' | 'Image';
  props: { [key: string]: any };
  scripts?: string[];
  scriptValues?: { [scriptName: string]: { [fieldName: string]: any } };
  className?: string;
  children: string[];
  parentId: string | null;
}