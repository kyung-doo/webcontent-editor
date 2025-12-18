import React, { useEffect, ReactNode } from "react";
import { useSelector, useDispatch, TypedUseSelectorHook } from "react-redux";
import { RootState } from "../store/store";
import {
  setActiveFont,
  setPreviewFont,
  setSearchTerm,
  addFont,
  removeFont,
} from "../store/fontSlice";

const useAppDispatch = () => useDispatch();
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useFontState() {
  // Context가 아니라 Redux Store의 state.font를 직접 바라봅니다.
  return useAppSelector((state) => state.font);
}

// 액션 실행용 훅
export function useFontActions() {
  const dispatch = useAppDispatch();
  // Dispatch를 통해 fontSlice의 리듀서들을 실행합니다.
  return {
    setActiveFont: (name: string) => dispatch(setActiveFont(name)),
    setPreviewFont: (name: string) => dispatch(setPreviewFont(name)),
    setSearchTerm: (term: string) => dispatch(setSearchTerm(term)),
    addFont: (font: any) => dispatch(addFont(font)),
    removeFont: (id: string) => dispatch(removeFont(id)),
  };
}

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  // Redux Store에서 폰트 목록과 현재 폰트를 가져옵니다.
  const { fonts, activeFont } = useFontState();

  useEffect(() => {
    // 1. 현재 활성 폰트가 로컬인지 CDN인지 확인
    const currentFont = fonts.find((f: any) => f.name === activeFont);
    const isLocalFont = currentFont?.type === "local";

    const activeLinkId = "active-font-loader";
    let activeLink = document.getElementById(activeLinkId) as HTMLLinkElement;

    // 로컬 폰트라면 활성 폰트용 구글 링크는 불필요하므로 제거
    if (isLocalFont) {
      if (activeLink) activeLink.remove();
    } else {
      // CDN 폰트이거나 기본 폰트(Inter 등)인 경우 Google Fonts 요청
      if (!activeLink) {
        activeLink = document.createElement("link");
        activeLink.id = activeLinkId;
        activeLink.rel = "stylesheet";
        document.head.appendChild(activeLink);
      }
      // Google Fonts URL 포맷에 맞게 공백을 +로 변환
      activeLink.href = `https://fonts.googleapis.com/css2?family=${activeFont.replace(
        / /g,
        "+"
      )}:wght@400;700&display=swap`;
    }

    // 2. [추가] 로컬 폰트 등록 (@font-face 스타일 태그 관리)
    // 로컬 폰트들은 파일 경로(source)를 기반으로 @font-face를 선언해줘야 브라우저가 인식함
    const localStyleId = "local-font-faces";
    let localStyle = document.getElementById(localStyleId) as HTMLStyleElement;

    const localFonts = fonts.filter((f: any) => f.type === "local" && f.source);

    if (localFonts.length > 0) {
      if (!localStyle) {
        localStyle = document.createElement("style");
        localStyle.id = localStyleId;
        document.head.appendChild(localStyle);
      }

      // 모든 로컬 폰트에 대해 @font-face 규칙 생성
      const fontFaceRules = localFonts
        .map(
          (f: any) => `
            @font-face {
                font-family: '${f.family || f.name}';
                src: url('${f.source}') format('${f.format || "truetype"}');
                font-weight: normal;
                font-style: normal;
            }
        `
        )
        .join("\n");

      localStyle.textContent = fontFaceRules;
    } else {
      if (localStyle) localStyle.remove();
    }

    // 3. 등록된 CDN 폰트들 로드 (미리보기용)
    // 기존 동적 로더 제거 후 재생성
    const listLinkId = "dynamic-font-list-loader";
    const existingListLink = document.getElementById(listLinkId);
    if (existingListLink) existingListLink.remove();

    if (fonts && fonts.length > 0) {
      // 로컬 폰트는 제외하고 CDN 폰트만 필터링하여 로드
      const cdnFonts = fonts.filter((f: any) => f.type === "cdn" || f.url);
      if (cdnFonts.length > 0) {
        const fontFamilies = cdnFonts
          .map((f: any) => f.name.replace(/ /g, "+"))
          .join("|");
        const link = document.createElement("link");
        link.id = listLinkId;
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies.replace(
          /\|/g,
          "&family="
        )}:wght@400;700&display=swap`;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    }
  }, [fonts, activeFont]);

  return <>{children}</>;
}
