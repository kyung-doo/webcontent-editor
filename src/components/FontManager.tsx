import { useEffect, useState } from "react";
import { Type, X, Globe, RefreshCw, Trash2, Plus, Check } from "lucide-react";
import { useFontActions, useFontState } from "../context/FontContext";

export interface FontItem {
  id: string;
  type: "local" | "cdn";
  name: string;
  family: string;
  source: string;
  format?: string;
  category?: string;
  url?: string;
}

interface FontManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FontManager({ isOpen, onClose }: FontManagerProps) {
  // Context Hook 사용
  const { fonts, activeFont } = useFontState();
  const { addFont, removeFont, setActiveFont } = useFontActions();

  const [activeTab, setActiveTab] = useState<'local' | 'cdn'>('local');
  const [localFiles, setLocalFiles] = useState<any[]>([
    { fileName: 'arial.ttf', fontFamily: 'Arial', path: 'local/arial.ttf', format: 'truetype' },
    { fileName: 'times.ttf', fontFamily: 'Times New Roman', path: 'local/times.ttf', format: 'truetype' },
    { fileName: 'courier.ttf', fontFamily: 'Courier New', path: 'local/courier.ttf', format: 'truetype' },
    { fileName: 'malgun.ttf', fontFamily: 'Malgun Gothic', path: 'local/malgun.ttf', format: 'truetype' }
  ]);
  
  // [수정] 웹 폰트 후보 목록 (스토어에 등록되기 전/후의 목록 관리용)
  const [cdnCandidates, setCdnCandidates] = useState<FontItem[]>([]);

  const [cdnUrl, setCdnUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewText, setPreviewText] = useState('다람쥐 헌 쳇바퀴에 타고파. 12345');
  const [errorMsg, setErrorMsg] = useState('');

  // 초기 로드 시 스토어에 있는 웹 폰트들을 후보 목록에 동기화
  useEffect(() => {
    const storeCdnFonts = fonts.filter((f: any) => f.type === 'cdn');
    setCdnCandidates(prev => {
        const combined = [...prev];
        storeCdnFonts.forEach((sf: any) => {
            if (!combined.some(c => c.name === sf.name)) {
                combined.push(sf);
            }
        });
        return combined;
    });
  }, [fonts]);

  // 로컬 폰트 스캔
  const refreshLocalFonts = async () => {
    setIsLoading(true);
    if ((window as any).electronAPI?.getFonts) {
      try {
        const files = await (window as any).electronAPI.getFonts();
        setLocalFiles(files);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) refreshLocalFonts();
  }, [isOpen]);

  const handleAddCdn = async () => {
    if (!cdnUrl) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      let cssContent = '';
      if ((window as any).electronAPI?.fetchUrl) {
        cssContent = await (window as any).electronAPI.fetchUrl(cdnUrl);
      } else {
        const res = await fetch(cdnUrl);
        cssContent = await res.text();
      }

      // [수정] 여러 개의 font-family를 찾기 위해 전역 검색 로직으로 변경
      const fontFamilies = new Set<string>();
      const regex = /(?:font-family|font):\s*['"]?([^'";]+)['"]?/g;
      let match;

      while ((match = regex.exec(cssContent)) !== null) {
        if (match[1]) {
          fontFamilies.add(match[1].trim());
        }
      }

      if (fontFamilies.size > 0) {
        const newFonts: FontItem[] = [];
        let addedCount = 0;

        fontFamilies.forEach(fontFamily => {
           // 후보 목록 및 스토어 중복 체크
           const isDuplicateCandidate = cdnCandidates.some(f => f.name === fontFamily);
           const isDuplicateStore = fonts.some((f: any) => f.name === fontFamily);

           if (!isDuplicateCandidate && !isDuplicateStore) {
             newFonts.push({
                id: `cdn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 고유 ID 생성
                type: 'cdn',
                name: fontFamily,
                family: fontFamily,
                source: cdnUrl,
                url: cdnUrl
             });
             addedCount++;
           }
        });

        if (addedCount > 0) {
            setCdnCandidates(prev => [...prev, ...newFonts]);
            setCdnUrl('');
        } else {
            setErrorMsg('이미 등록된 폰트들이거나 새로운 폰트가 없습니다.');
        }
      } else {
        setErrorMsg('폰트 패밀리 이름을 찾을 수 없습니다.');
      }
    } catch (e) {
      setErrorMsg('URL 로드 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 로컬 폰트: 사용하기/사용취소
  const toggleLocalFont = (file: any, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const exists = fonts.find((f: any) => f.name === file.fontFamily);
    
    if (exists) {
      removeFont(exists.id);
    } else {
      const newFont: FontItem = {
        id: `local-${file.fileName}-${Date.now()}`,
        type: 'local',
        name: file.fontFamily,
        family: file.fontFamily,
        source: file.path,
        format: file.format
      };
      addFont(newFont);
    }
  };

  // 웹 폰트: 사용하기/사용취소 (로컬과 동일 로직)
  const toggleCdnFont = (font: FontItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = fonts.find((f: any) => f.name === font.name);

    if (exists) {
        removeFont(exists.id);
    } else {
        addFont(font);
    }
  };

  // 웹 폰트: 완전 삭제 (목록에서 제거)
  const deleteCdnFont = (fontId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // 1. 후보 목록에서 제거
      setCdnCandidates(prev => prev.filter(f => f.id !== fontId));
      // 2. 사용 중이라면 스토어에서도 제거
      const exists = fonts.find((f: any) => f.id === fontId);
      if (exists) {
          removeFont(fontId);
      }
  };

  // 리스트 아이템 클릭 시 활성 폰트 변경 (미리보기용)
  const handleSelectFont = (fontName: string) => {
    setActiveFont(fontName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[600px] h-[700px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Type className="text-blue-600" /> Font Manager
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button onClick={() => setActiveTab('local')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'local' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Type size={16} /> 로컬 폰트
          </button>
          <button onClick={() => setActiveTab('cdn')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cdn' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Globe size={16} /> 웹 폰트
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600">시스템/로컬 폰트 폴더 스캔</p>
                <button onClick={refreshLocalFonts} disabled={isLoading} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded text-xs hover:bg-blue-50">
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> 스캔
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {localFiles.map((file) => {
                  const isAdded = fonts.some((f: any) => f.type === 'local' && f.name === file.fontFamily);
                  const isCurrent = activeFont === file.fontFamily;
                  
                  return (
                    <div 
                      key={file.fileName} 
                      className={`flex items-center justify-between p-3 bg-white rounded border ${isCurrent ? 'border-blue-500 ring-1' : 'border-gray-200'} hover:border-blue-300 cursor-pointer`}
                      onClick={() => isAdded && handleSelectFont(file.fontFamily)}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-700 text-sm truncate">{file.fontFamily}</p>
                          {isCurrent && <span className="flex-shrink-0 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">사용 중</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{file.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                          onClick={(e) => toggleLocalFont(file, e)} 
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${isAdded ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {isAdded ? '사용 취소' : '사용하기'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {activeTab === 'cdn' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs font-bold text-gray-600 mb-2">Google Fonts URL</label>
                <div className="flex gap-2">
                  <input type="text" value={cdnUrl} onChange={(e) => setCdnUrl(e.target.value)} placeholder="https://fonts.googleapis.com..." className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleAddCdn} disabled={isLoading || !cdnUrl} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} 추가
                  </button>
                </div>
                {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Added Fonts (CDN Only)</h3>
                
                {cdnCandidates.map((font: FontItem) => {
                    const isUsed = fonts.some((f: any) => f.name === font.name);
                    const isCurrent = activeFont === font.name;
                    return (
                      <div 
                        key={font.id} 
                        className={`flex items-center justify-between p-3 bg-white rounded border ${isCurrent ? 'border-blue-500 ring-1' : 'border-gray-200'} hover:border-blue-300 cursor-pointer`}
                        onClick={() => isUsed && handleSelectFont(font.name)}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                            <div className="flex items-center gap-2">
                                <Globe size={16} className="text-purple-600 flex-shrink-0" />
                                <p className="font-bold text-gray-700 text-sm truncate">{font.name}</p>
                                {isCurrent && <span className="flex-shrink-0 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">사용 중</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">{font.url}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                           <button 
                             onClick={(e) => toggleCdnFont(font, e)} 
                             className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${isUsed ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                           >
                             {isUsed ? '사용 취소' : '사용하기'}
                           </button>

                           <button 
                             onClick={(e) => deleteCdnFont(font.id, e)} 
                             className="p-2 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                             title="목록에서 삭제"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    );
                })}

                {cdnCandidates.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">등록된 웹 폰트가 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Preview */}
        <div className="bg-white border-t border-gray-200 p-4">
          <label className="text-xs font-bold text-gray-500 mb-2 block">Preview ({activeFont})</label>
          <input type="text" value={previewText} onChange={(e) => setPreviewText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-4" />
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {fonts.map((font: any) => (
              <div key={font.id} className="flex items-center gap-3 p-1">
                 <span className="text-xs text-gray-400 w-24 truncate text-right">{font.name}</span>
                 <p className="text-lg text-gray-800 truncate" style={{ fontFamily: font.family }}>{previewText}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}