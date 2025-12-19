const scriptCache: Record<string, any> = {};

/**
 * 스크립트를 동적으로 로드하는 유틸리티
 * @param scriptPath - assets 폴더 내의 상대 경로 (예: 'components/my-script.js')
 * @param forceReload - true일 경우 캐시를 무시하고 새로 로드
 */
export const loadScript = async (scriptPath: string, forceReload = false) => {
  
  // 1. 강제 리로드가 아니고, 메모리 캐시에 이미 존재하면 즉시 반환
  if (!forceReload && scriptCache[scriptPath]) {
    return scriptCache[scriptPath];
  }

  try {
    
    const baseUrl = await window.electronAPI.getAssetsBaseUrl();
    console.log('baseUrl: ', baseUrl)
    // 3. 캐시 회피용 타임스탬프 설정
    const timestamp = forceReload ? `?t=${Date.now()}` : '';
    
    // 4. 절대 경로 URL 생성
    // baseUrl이 'file:///...' 형태이므로 URL 생성자를 사용해 경로를 안전하게 병합합니다.
    const scriptUrl = new URL(scriptPath, baseUrl + '/').href + timestamp;

    console.log(`[ScriptManager] 로드 시도: ${scriptUrl}`);

    // 5. 동적 임포트 실행
    // Vite 빌드 시 에러 방지를 위해 /* @vite-ignore */ 주석을 유지합니다.
    const module = await import(/* @vite-ignore */ scriptUrl);
    
    // 6. 캐시 업데이트 및 모듈 반환
    scriptCache[scriptPath] = module;
    return module;

  } catch (err) {
    console.error(`[ScriptManager] 로드 실패: ${scriptPath}`, err);
    return null;
  }
};

/**
 * 모든 스크립트 캐시를 비웁니다.
 * 프리뷰를 새로 시작하거나 전체 리로드가 필요할 때 사용합니다.
 */
export const clearScriptCache = () => {
  for (const key in scriptCache) {
    delete scriptCache[key];
  }
  console.log('[ScriptManager] 캐시가 비워졌습니다.');
};