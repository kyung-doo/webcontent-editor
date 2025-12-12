import { EditorElement } from "../store/elementSlice";

// CamelCase 키를 Kebab-case로 변환 (예: backgroundColor -> background-color)
export const camelToKebab = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};
export const toKebabCase = (str: string) =>
  str.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);

export const toCamelCase = (str: string) =>
  str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());


// 스타일 객체를 CSS 문자열로 변환
export const objectToCssString = (styleObj: React.CSSProperties) => {
  return Object.entries(styleObj)
    .map(([key, value]) => {
      if (value === undefined || value === null || value === '') return '';
      // pointerEvents 같은 특수 케이스 처리 필요 시 추가
      return `${camelToKebab(key)}: ${value};`;
    })
    .join(' ');
};

// 요소의 CSS 선택자 생성 (ID > Class > Data-ID 우선순위)
export const getElementCssSelector = (element: EditorElement) => {
  // 1. ID가 있으면 최우선 사용 (#id)
  if (element.id && element.id.trim() !== "") {
    return `#${element.id}`;
  }
  // 2. Class가 있으면 사용 (.class)
  // (주의: 첫 번째 클래스만 사용하여 타겟팅)
  if (element.className && element.className.trim() !== "") {
    const firstClass = element.className.split(" ")[0];
    return `.${firstClass}`;
  }
  // 3. 둘 다 없으면 고유한 data-id 사용 ([data-id="..."])
  return `[data-id="${element.elementId}"]`;
};

