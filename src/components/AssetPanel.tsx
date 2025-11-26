import { useEffect, useState } from 'react';

// 간단한 폴더 아이콘 컴포넌트 (SVG)
const FolderIcon = () => (
  <svg className="w-10 h-10 text-yellow-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

// 간단한 뒤로가기 아이콘
const BackIcon = () => (
  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

interface AssetFile {
  name: string;
  isFolder: boolean;
  path: string;
}

export default function AssetPanel() {
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [currentPath, setCurrentPath] = useState(''); // 현재 보고 있는 경로

  // 파일을 불러오는 함수
  const loadAssets = async (path: string) => {
    if (window.electronAPI) {
      const files = await window.electronAPI.getAssets(path);
      setAssets(files);
      setCurrentPath(path);
    }
  };

  // 처음 실행 시 루트 경로 로드
  useEffect(() => {
    loadAssets('');
  }, []);

  // 뒤로 가기 (상위 폴더로 이동)
  const handleGoBack = () => {
    // "images/icons" -> "images" 로 자르기
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadAssets(parentPath);
  };

  return (
    <div className="h-48 border-t border-gray-300 bg-white flex flex-col z-20">
      {/* 헤더: 경로 표시 및 뒤로가기 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-bold uppercase text-gray-500">Assets</span>
        
        {/* 현재 경로가 루트가 아니면 뒤로가기 버튼 표시 */}
        {currentPath && (
          <button onClick={handleGoBack} className="p-1 hover:bg-gray-200 rounded" title="Go up">
            <BackIcon />
          </button>
        )}
        
        <span className="text-xs text-gray-400 font-mono">
           /public/assets/{currentPath}
        </span>
      </div>

      {/* 파일 그리드 */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4">
          
          {assets.length === 0 && (
            <p className="text-sm text-gray-400 p-2">폴더가 비어있습니다.</p>
          )}

          {assets.map((file, index) => (
            <div 
              key={index} 
              className="group relative h-24 w-24 flex-shrink-0 flex flex-col items-center justify-center cursor-pointer rounded border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-all"
              
              // 1. 클릭 이벤트: 폴더면 이동
              onClick={() => {
                if (file.isFolder) {
                  loadAssets(file.path);
                }
              }}
              // 2. 드래그 이벤트: 이미지일 때만 드래그 가능
              draggable={!file.isFolder} 
              onDragStart={(e) => {
                if (!file.isFolder) {
                  // 실제 이미지 경로는 /assets/경로/파일명
                  console.log('????????????')
                  e.dataTransfer.setData('imageSrc', `/assets/${file.path}`);
                }
              }}
            >
              {/* 모양 구분: 폴더 vs 이미지 */}
              {file.isFolder ? (
                <FolderIcon />
              ) : (
                <img 
                  src={`/assets/${file.path}`} 
                  alt={file.name} 
                  className="h-16 w-16 object-contain" 
                />
              )}

              {/* 파일명 표시 */}
              <div className="w-full px-1 text-center">
                <p className="text-[10px] text-gray-600 truncate w-full">
                  {file.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}