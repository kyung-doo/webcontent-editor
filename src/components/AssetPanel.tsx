import { useEffect, useState } from 'react';
import { usePannelToggle } from '../hooks/usePannelToggle';

// --- 아이콘 컴포넌트들 ---

const FolderIcon = () => (
  <svg className="w-10 h-10 text-yellow-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

// JS/TS 파일 아이콘
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
    {/* 파일 종이 모양 */}
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    
    {/* J 글자 */}
    <path d="M10 13v4.5a1.5 1.5 0 0 1-3 0" />
    
    {/* S 글자 (심플하게) */}
    <path d="M14 13c1.5 0 2 1 2 1.5S15 16 14 16s-2 .5-2 1.5 1 2 2 2" />
  </svg>
);

// 👇 [추가] 기본 파일 아이콘 (그 외 나머지 파일용)
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

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
  
  const { isOpen, toggle } = usePannelToggle(true);

  const loadAssets = async (path: string) => {
    if (window.electronAPI) {
      try {
        const files = await window.electronAPI.getAssets(path);
        setAssets(files);
        setCurrentPath(path);
      } catch (error) {
        console.error("에셋 로드 실패:", error);
      }
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

  // 이미지 확장자 목록
  const imageExtensions = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico'];
  // 스크립트 확장자 목록
  const scriptExtensions = ['js', 'jsx', 'ts', 'tsx', 'json'];

  return (
    <div 
      className={`
        border-t border-gray-300 bg-white flex flex-col z-20 transition-all duration-300 ease-in-out
        ${isOpen ? 'h-48' : 'h-9'} 
      `}
    >
      {/* 헤더 영역 */}
      <div 
        onClick={toggle}
        className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none"
      >
        <div className="flex items-center gap-2">
          <ChevronUpIcon className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
          
          <span className="text-xs font-bold uppercase text-gray-500">Assets</span>
          
          {isOpen && (
            <button 
              onClick={handleRefresh}
              className="p-1 hover:bg-gray-200 rounded ml-1 transition-colors group" 
              title="Refresh Folder"
            >
              <RefreshIcon className={`w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {isOpen && currentPath && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleGoBack(); }} 
              className="p-1 hover:bg-gray-200 rounded ml-1 transition-colors" 
              title="Go up"
            >
              <BackIcon />
            </button>
          )}
          
          {isOpen && (
            <span className="text-xs text-gray-400 font-mono ml-1 truncate max-w-[300px]">
              /public/assets/{currentPath}
            </span>
          )}
        </div>

        {!isOpen && <span className="text-xs text-gray-400">Click to expand</span>}
      </div>

      {/* 콘텐츠 영역 */}
      <div className={`flex-1 overflow-x-auto p-4 ${!isOpen && 'hidden'}`}>
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
            // 파일 확장자 추출 (소문자로 변환)
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
                // 이미지일 때만 드래그 허용
                draggable={isImage && !file.isFolder} 
                onDragStart={(e) => {
                  if (isImage && !file.isFolder) {
                    e.dataTransfer.setData('imageSrc', `/assets/${file.path}`);
                  }
                }}
              >
                {/* 👇 아이콘/썸네일 표시 로직 세분화 */}
                {(() => {
                  // 1. 폴더
                  if (file.isFolder) return <FolderIcon />;
                  
                  // 2. 스크립트 파일
                  if (isScript) return <JsIcon />;

                  // 3. 이미지 파일
                  if (isImage) {
                    return (
                      <img 
                        src={`/assets/${file.path}`} 
                        alt={file.name} 
                        className="h-16 w-16 object-contain p-1" 
                        style={{ pointerEvents: 'none' }}
                        // 이미지 로드 실패 시 기본 파일 아이콘으로 대체 (선택 사항)
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          // 형제 요소로 FileIcon을 보여주는 건 복잡하니 일단 숨김 처리
                        }}
                      />
                    );
                  }

                  // 4. 그 외 나머지 모든 파일 (기본 아이콘)
                  return <FileIcon />;
                })()}

                <div className="w-full px-1 text-center mt-1">
                  <p className="text-[10px] text-gray-600 truncate w-full select-none" title={file.name}>
                    {file.name}
                  </p>
                </div>

                {/* 이미지일 때만 툴팁 표시 */}
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