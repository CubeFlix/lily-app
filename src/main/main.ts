/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { stringify as uuidStringify } from "uuid";
import * as fs from "fs";

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow?.webContents.session.clearStorageData();
  console.log('cleared storage data');

  mainWindow.on('close', function() {
    // Try to log out. 
    if (connected && loggedIn) {
      globalClient.requestNoChunks(new Request('logout', globalSession, {}));
    }
    mainWindow?.webContents.session.clearStorageData();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

const { Client, Request, NullAuth, UserAuth, SessionAuth } = require("./client/lily");
var globalClient: typeof Client = null;
var globalSession: typeof SessionAuth = null;
var connected = false;
var loggedIn = false;

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    // Lily IPC API.

    // Connect to the server.
    ipcMain.handle('api-connect', async (event, arg) => {
      globalClient = new Client(arg.address, arg.port, { rejectUnauthorized: !arg.allowUnauthorizedHosts });
      try {
        const resp = await globalClient.requestNoChunks(new Request('info', new NullAuth(), {}));
        if (resp.code != 0) {
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        connected = true;
        return {ok: true, resp: resp};
      } catch (err) {
        return {ok: false, error: err};
      }
    });

    // Disconnect.
    ipcMain.handle('api-disconnect', async (event, arg) => {
      globalClient = null;
      connected = true;
      return {ok: true};
    });

    // Login to the server.
    ipcMain.handle('api-login', async (event, arg) => {
      if (!connected) {return {ok: false, error: "not logged in"}};
      try {
        const resp: any = await globalClient.requestNoChunks(new Request('login', new UserAuth(arg.username, arg.password), {}));
        if (resp.code != 0) {
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        loggedIn = true;
        globalSession = new SessionAuth(arg.username, uuidStringify(resp.data.id.buffer));
        return {ok: true, resp: resp};
      } catch (err) {
        return {ok: false, error: err};
      }
    });

    // Logout of the server.
    ipcMain.handle('api-logout', async (event, arg) => {
      if (!connected) {return {ok: false, error: "not logged in"}};
      loggedIn = false;
      try {
        const resp = await globalClient.requestNoChunks(new Request('logout', globalSession, {}));
        globalSession = null;
        if (resp.code != 0) {
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        return {ok: true, resp: resp};
      } catch (err) {
        globalSession = null;
        return {ok: false, error: err};
      } 
    });

    // Command.
    ipcMain.handle('api-command', async (event, arg) => {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const resp = await globalClient.requestNoChunks(new Request(arg.name, globalSession, arg.args));
        if (resp.code != 0) {
          if (resp.code == 6) {
            globalSession = null;
            loggedIn = false;
            return {ok: false, error: "Session expired."}
          }
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        return {ok: true, resp: resp};
      } catch (err) {
        return {ok: false, error: err};
      }
    });

    ipcMain.handle('api-download', async (event, arg) => {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const resp: any = await globalClient.download(globalSession, arg.drive, arg.path);
        if (resp.code != 0) {
          if (resp.code == 6) {
            globalSession = null;
            loggedIn = false;
            return {ok: false, error: "Session expired."}
          }
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        const file = await dialog.showSaveDialog({
          title: 'Save As',
          buttonLabel: 'Save',
          defaultPath: path.basename(arg.path),
          filters: [
            {name: 'All Files', extensions: ['*']}
          ],
          properties: []
        })
        if (!file.canceled && file.filePath !== undefined) {                
            // Creating and Writing to the sample.txt file
            fs.writeFile(file.filePath.toString(), 
                         resp.content, function (err) {
                if (err) throw err;
            });
        }
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    });

    const downloadPath = async function(drive: string, pathToDownload: string, savePath: string) {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const resp = await globalClient.requestNoChunks(new Request('listdir', globalSession, {drive: drive, path: pathToDownload}));
        if (resp.code != 0) {
          if (resp.code == 6) {
            globalSession = null;
            loggedIn = false;
            return {ok: false, error: "Session expired."}
          }
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        // Download each item individually.
        await resp.data.list.forEach(async (elem: any) => {
          if (elem.isfile) {
            const status = await downloadFile(drive, path.join(pathToDownload, elem.name), path.join(savePath, elem.name));
            if (!status.ok) {
              throw status.error;
            }
          } else {
            fs.mkdirSync(path.join(savePath, elem.name));
            const status = await downloadPath(drive, path.join(pathToDownload, elem.name), path.join(savePath, elem.name));
            if (!status.ok) {
              throw status.error;
            }
          }
        });
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    }

    const downloadFile = async function(drive: string, path: string, savePath: string) {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const resp = await globalClient.download(globalSession, drive, path);
        if (resp.code != 0) {
          if (resp.code == 6) {
            globalSession = null;
            loggedIn = false;
            return {ok: false, error: "Session expired."}
          }
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        fs.writeFile(savePath, 
          resp.content, function (err) {
          if (err) throw err;
        });
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    }

    const uploadFile = async function(drive: string, filePath: string, savePath: string) {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const content = fs.readFileSync(filePath);
        const resp = await globalClient.upload(globalSession, drive, savePath, content);
        if (resp.code != 0) {
          if (resp.code == 6) {
            globalSession = null;
            loggedIn = false;
            return {ok: false, error: "Session expired."}
          }
          return {ok: false, error: resp.code.toString() + " " + resp.str}
        }
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    }

    ipcMain.handle('api-download-path', async (event, arg) => {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const file = await dialog.showOpenDialog({
          title: 'Save Folder',
          buttonLabel: 'Save',
          properties: ['openDirectory']});
        if (!file.canceled && file.filePaths !== undefined && file.filePaths.length == 1) {
            // Creating and Writing to the sample.txt file
            const status = await downloadPath(arg.drive, arg.path, path.join(file.filePaths[0].toString(), path.basename(arg.path)));
            return status;
        }
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    });

    ipcMain.handle('api-upload', async (event, arg) => {
      if (!connected || !loggedIn) {return {ok: false, error: "not logged in"}};
      try {
        const file = await dialog.showOpenDialog({
          title: 'Upload Files',
          buttonLabel: 'Upload',
          properties: ['openFile', 'multiSelections']});
        if (!file.canceled && file.filePaths !== undefined && file.filePaths.length > 0) {
          for (let i = 0; i < file.filePaths.length; i++) {
            let filepath = file.filePaths[i];
            const status = await uploadFile(arg.drive, filepath.toString(), path.join(arg.path, path.basename(filepath.toString())));
            if (!status.ok) {
              throw status.error;
            }
          }
        }
        return {ok: true};
      } catch (err) {
        return {ok: false, error: err};
      }
    });
    
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
