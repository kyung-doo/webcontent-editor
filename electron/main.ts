import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import installExtension, { REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { mainStore } from './store';

// ----------------------------------------------------------------------
// 1. 전역 변수 & 유틸리티
// ----------------------------------------------------------------------

// 윈도우 객체를 전역에 두어 가비지 컬렉션(삭제) 방지
let mainWindow: BrowserWindow | null = null;
let previewWindow: BrowserWindow | null = null;

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

// 재귀적으로 파일을 찾는 헬퍼 함수
const getAllFiles = (dirPath: string, arrayOfFiles: string[] = [], rootPath: string) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles, rootPath);
    } else if (file.endsWith('.js')) {
      // 절대 경로 -> 상대 경로 변환
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      arrayOfFiles.push(relativePath);
    }
  });

  return arrayOfFiles;
};

// ----------------------------------------------------------------------
// 2. 창 생성 관련 함수 (Window Factory)
// ----------------------------------------------------------------------

// 메인 에디터 창 생성
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: "Visual Builder",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
  });

  if (isDev) {
    console.log('🚧 Loading Development URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools(); // 개발자 도구 열기
  } else {
    mainWindow.loadURL(path.join(__dirname, '../dist/index.html'));
  }

  // 외부 링크 클릭 시 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// [수정] 프리뷰(플레이 모드) 창 생성 - pageId 인자 추가
function createPreviewWindow(width: number, height: number, pageId?: string) {
  if (previewWindow) {
    previewWindow.focus(); // 이미 있으면 포커스만

    return;
  }

  previewWindow = new BrowserWindow({
    width: width,
    height: height,
    title: "Preview Mode", // 제목 설정
    autoHideMenuBar: true, // 메뉴바 숨김
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
  });

  // [수정] URL 뒤에 쿼리 파라미터(?pageId=...) 추가 로직
  // HashRouter를 사용하므로 #/preview 뒤에 쿼리가 붙어야 함 -> #/preview?pageId=page-1
  const hashPath = pageId ? `#/preview?pageId=${pageId}` : `#/preview`;

  const previewURL = isDev
    ? `${process.env.VITE_DEV_SERVER_URL}${hashPath}`
    : `file://${path.join(__dirname, '../dist/index.html')}${hashPath}`;

  console.log('Opening Preview URL:', previewURL); // 디버깅용 로그

  previewWindow.loadURL(previewURL);

  previewWindow.on('closed', () => { previewWindow = null; });
}

// ----------------------------------------------------------------------
// 3. IPC 통신 핸들러 등록 (Setup Handlers)
// ----------------------------------------------------------------------

function registerIpcHandlers() {

  // 1. Renderer에서 액션이 오면 -> Main Store에 Dispatch
  ipcMain.on('dispatch-main', (event, action) => {
    mainStore.dispatch(action);
  });

  // 2. 초기 상태 요청이 오면 -> 현재 Main Store 상태 반환
  ipcMain.handle('get-initial-state', () => {
    return mainStore.getState();
  });
  
  // 에셋(이미지) 폴더 읽기
  ipcMain.handle('get-assets', async (event, subPath = '') => {
    const rootPath = isDev 
      ? path.join(process.cwd(), 'public/assets') 
      : path.join(process.cwd(), 'resources/public/assets');
    
    const targetPath = path.join(rootPath, subPath);

    try {
      if (!fs.existsSync(targetPath)) return [];
      const dirents = fs.readdirSync(targetPath, { withFileTypes: true });
      
      return dirents.map(dirent => ({
        name: dirent.name,
        isFolder: dirent.isDirectory(),
        path: path.join(subPath, dirent.name).replace(/\\/g, '/')
      })).sort((a, b) => (Number(b.isFolder) - Number(a.isFolder)));
    } catch (e) {
      console.error(e); return [];
    }
  });

  // 스크립트(컴포넌트) 파일 전체 검색
  ipcMain.handle('get-scripts', async () => {
    const assetsRoot = isDev 
      ? path.join(process.cwd(), 'public/assets') 
      : path.join(process.cwd(), 'resources/public/assets');
    
    try {
      if (!fs.existsSync(assetsRoot)) return [];
      return getAllFiles(assetsRoot, [], assetsRoot);
    } catch (e) {
      console.error(e); return [];
    }
  });

  // [수정] 프리뷰 창 열기 요청 처리 - pageId 인자 수신 및 전달
  ipcMain.on('open-preview', (event, width: number, height: number, pageId: string) => {
    console.log('Preview request received:', { width, height, pageId });
    createPreviewWindow(width, height, pageId);
  });

  // 프로젝트 저장 (예시)
  ipcMain.on('save-project', (event, data) => {
    console.log('Project Data Received:', data);
    // 여기에 fs.writeFileSync 로직 추가 가능
  });
}

// ----------------------------------------------------------------------
// 4. 앱 생명주기 (App Lifecycle)
// ----------------------------------------------------------------------

app.whenReady().then(async () => {
  
  // A. 개발자 도구 확장 프로그램 설치 (Dev 모드일 때만)
  if (isDev) {
    try {
      await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS], {
        loadExtensionOptions: { allowFileAccess: true },
        forceDownload: true,
      });
      console.log('DevTools Extensions Installed.');
    } catch (e) {
      console.error('DevTools Installation Failed:', e);
    }
  }

  // B. IPC 핸들러 등록
  registerIpcHandlers();

  // C. 메인 윈도우 생성
  createMainWindow();

  // macOS에서 Dock 아이콘 클릭 시 창이 없으면 재생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});