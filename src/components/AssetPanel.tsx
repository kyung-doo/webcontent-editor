import React, { useEffect, useState } from 'react';

const FolderIcon = () => (
  <svg className="w-10 h-10 text-yellow-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

const JsIcon = () => (
  <svg 
    className="w-10 h-10 text-yellow-500 mb-1" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 13v4.5a1.5 1.5 0 0 1-3 0" />
    <path d="M14 13c1.5 0 2 1 2 1.5S15 16 14 16s-2 .5-2 1.5 1 2 2 2" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-10 h-10 text-gray-400 mb-1" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// --- 타입 정의 ---

interface AssetFile {
  name: string;
  isFolder: boolean;
  path: string;
}

// --- 메인 컴포넌트 ---

export default function AssetPanel() {
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // [수정] usePannelToggle 제거됨. 패널은 항상 열려있는 상태로 간주합니다.

  const loadAssets = async (path: string) => {
    if (window.electronAPI) {
      try {
        const files = await window.electronAPI.getAssets(path);
        setAssets(files);
        setCurrentPath(path);
      } catch (error) {
        console.error("에셋 로드 실패:", error);
      }
    } else {
        // Mock Data (브라우저 테스트용)
        console.warn("Electron API not found. Using Mock Data.");
        setAssets([
            { name: "images", isFolder: true, path: "images" },
            { name: "scripts", isFolder: true, path: "scripts" },
            { name: "logo.png", isFolder: false, path: "logo.png" },
            { name: "app.js", isFolder: false, path: "app.js" }
        ]);
    }
  };

  useEffect(() => {
    loadAssets('');
  }, []);

  const handleGoBack = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadAssets(parentPath);
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await loadAssets(currentPath);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDoubleClick = async (file: AssetFile) => {
    // 폴더는 더블클릭이 아닌 기존 onClick 로직(또는 별도 네비게이션)을 따름
    if (file.isFolder) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // 스크립트 파일인 경우
    if (scriptExtensions.includes(ext)) {
      if (window.electronAPI && window.electronAPI.openInVSCode) {
        try {
            await window.electronAPI.openInVSCode(file.path);
        } catch (e) {
            console.error("VS Code 실행 실패:", e);
        }
      } else {
        console.log(`Open VS Code for: ${file.path}`);
      }
    }
  };

  const imageExtensions = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico'];
  const scriptExtensions = ['js', 'jsx', 'ts', 'tsx', 'json'];

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* 헤더 영역 (토글 기능 제거) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* ChevronIcon 제거됨 */}
          
          <span className="text-xs font-bold uppercase text-gray-500">Assets</span>
          
          <button 
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-200 rounded ml-1 transition-colors group" 
            title="Refresh Folder"
          >
            <RefreshIcon className={`w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {currentPath && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleGoBack(); }} 
              className="p-1 hover:bg-gray-200 rounded ml-1 transition-colors" 
              title="Go up"
            >
              <BackIcon />
            </button>
          )}
          
          {/* 현재 경로 표시 (항상 보임) */}
          <span className="text-xs text-gray-400 font-mono ml-1 truncate max-w-[300px]">
            /public/assets/{currentPath}
          </span>
        </div>
      </div>

      {/* 콘텐츠 영역 (항상 보임) */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4">
          
          {assets.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 space-y-2">
              <p className="text-sm select-none">폴더가 비어있습니다.</p>
              <button onClick={handleRefresh} className="text-xs text-blue-500 hover:underline">
                새로고침
              </button>
            </div>
          )}

          {assets.map((file, index) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const isImage = imageExtensions.includes(ext);
            const isScript = scriptExtensions.includes(ext);

            return (
              <div 
                key={index} 
                className="group relative h-24 w-24 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer rounded border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all"
                onClick={() => {
                  if (file.isFolder) loadAssets(file.path);
                }}
                onDoubleClick={() => handleDoubleClick(file)}
                draggable={isImage && !file.isFolder} 
                onDragStart={(e) => {
                  if (isImage && !file.isFolder) {
                    e.dataTransfer.setData('imageSrc', `/assets/${file.path}`);
                  }
                }}
                title={isScript ? "더블 클릭하여 VS Code에서 열기" : file.name}
              >
                {(() => {
                  if (file.isFolder) return <FolderIcon />;
                  if (isScript) return <JsIcon />;
                  if (isImage) {
                    return (
                      <img 
                        src={`/assets/${file.path}`} 
                        alt={file.name} 
                        className="h-16 w-16 object-contain p-1" 
                        style={{ pointerEvents: 'none' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    );
                  }
                  return <FileIcon />;
                })()}

                <div className="w-full px-1 text-center mt-1">
                  <p className="text-[10px] text-gray-600 truncate w-full select-none" title={file.name}>
                    {file.name}
                  </p>
                </div>

                {isImage && !file.isFolder && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 truncate rounded-b">
                    {file.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}