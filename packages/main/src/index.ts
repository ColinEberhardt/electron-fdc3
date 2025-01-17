import { app, BrowserWindow } from 'electron';
import './security-restrictions';
//import { restoreOrCreateWindow } from '/@/mainWindow';
import { Runtime } from './runtime';

let runtime: Runtime | null = null;

export const createWindow = (): Promise<BrowserWindow> => {
  return new Promise((resolve, reject) => {
    const runtime = getRuntime();
    let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    const focusOrRestore = (window: BrowserWindow) => {
      if (window && window.isMinimized()) {
        window.restore();
      }
      if (window) {
        window.focus();
      }
    };

    if (window === undefined) {
      runtime.createView().then(
        (view) => {
          if (view.parent && view.parent.window) {
            window = view.parent.window;
          }
          if (window) {
            focusOrRestore(window);
            resolve(window);
          } else {
            reject('Window could not be created or restored');
          }
        },
        (err) => {
          reject(err);
        },
      );
    } else {
      if (window) {
        focusOrRestore(window);
        resolve(window);
      } else {
        reject('Window could not be created or restored');
      }
    }
  });
};

/**
 * fetch the singleton runtime instance
 */
export const getRuntime = (): Runtime => {
  if (!runtime) {
    runtime = new Runtime();
  }
  return runtime;
};

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', createWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', () => {
  runtime = new Runtime();
  createWindow();
});

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(() => {
    runtime = new Runtime();
    // restoreOrCreateWindow();
    createWindow();
  })
  .catch((e) => console.error('Failed create window:', e));

/**
 * Install Vue.js or some other devtools in development mode only
 */
if (import.meta.env.DEV) {
  app
    .whenReady()
    .then(() => import('electron-devtools-installer'))
    .then(({ default: installExtension, REACT_DEVELOPER_TOOLS }) =>
      installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      }),
    )
    .catch((e) => console.error('Failed install extension:', e));
}

/**
 * Check new app version in production mode only
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e));
}
