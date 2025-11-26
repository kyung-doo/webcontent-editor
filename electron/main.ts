import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    // win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  // 확장 프로그램 설치 로직 (상세 로그 추가)
  if (isDev) {
    console.log("[DevTools] 확장프로그램 설치중...");
    try {
      const result = await installExtension(
        [REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS],
        {
          loadExtensionOptions: { allowFileAccess: true },
        }
      );
      console.log(`[DevTools] 설치 성공: ${result}`);
    } catch (e) {
      console.error(`[DevTools] 설치 실패:`, e);
    }
  } else {
    console.log("[Main Process] 개발 모드가 아님으로 설치 건너뜀");
  }

  // assets 가져오기
  ipcMain.handle("get-assets", async (event, subPath = "") => {
    // 1. 기본 루트 경로 (public/assets)
    const rootPath = isDev
      ? path.join(process.cwd(), "public/assets")
      : path.join(process.cwd(), "resources/public/assets");

    // 2. 요청받은 하위 경로와 합치기
    const targetPath = path.join(rootPath, subPath);

    try {
      if (!fs.existsSync(targetPath)) return [];

      // 3. 파일 목록 읽기 (withFileTypes: true 옵션이 핵심! 타입 확인 가능)
      const dirents = fs.readdirSync(targetPath, { withFileTypes: true });

      // 4. 필요한 정보만 추려서 반환
      const result = dirents.map((dirent) => {
        return {
          name: dirent.name,
          isFolder: dirent.isDirectory(), // 폴더 여부
          // 웹에서 이미지를 띄우기 위한 상대 경로 (윈도우 역슬래시 \를 /로 변경)
          path: path.join(subPath, dirent.name).replace(/\\/g, "/"),
        };
      });

      // 폴더가 먼저 뜨고, 그 다음 파일이 뜨도록 정렬
      return result.sort((a, b) => Number(b.isFolder) - Number(a.isFolder));
    } catch (error) {
      console.error("Error reading assets:", error);
      return [];
    }
  });

  // 3. 창 띄우기 (이제 설치가 끝난 후 실행됨)
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
