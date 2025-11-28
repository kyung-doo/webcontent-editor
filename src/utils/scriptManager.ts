// src/utils/scriptManager.ts

const scriptCache: Record<string, any> = {};

// forceReload가 true면 캐시를 무시하고 새로 다운로드
export const loadScript = async (scriptPath: string, forceReload = false) => {
  
  // 1. 강제 리로드가 아니고, 캐시에 있으면 -> 캐시 반환
  if (!forceReload && scriptCache[scriptPath]) {
    return scriptCache[scriptPath];
  }

  try {
    // 2. 강제 리로드면 타임스탬프를 붙임 (브라우저 캐시 회피용)
    const timestamp = forceReload ? `?t=${Date.now()}` : '';
    
    // import 실행
    const module = await import(/* @vite-ignore */ `/assets/${scriptPath}${timestamp}`);
    
    // 3. 새 모듈을 캐시에 덮어씌움
    scriptCache[scriptPath] = module;
    return module;

  } catch (err) {
    console.error(`[ScriptManager] 로드 실패: ${scriptPath}`, err);
    return null;
  }
};

// 모든 캐시 비우기 (Preview 시작할 때 호출용)
export const clearScriptCache = () => {
  for (const key in scriptCache) {
    delete scriptCache[key];
  }
};
