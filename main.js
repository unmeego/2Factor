const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./database');

let mainWindow;
let db;

function createWindow() {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  console.log('Loading HTML file...');
  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    mainWindow.focus();
    
    // Abrir DevTools para ver logs
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });
}

app.whenReady().then(() => {
  console.log('App ready, initializing...');
  // Ensure database directory exists
  const userDataPath = app.getPath('userData');
  console.log('User data path:', userDataPath);
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  console.log('Creating database...');
  db = new DatabaseManager();
  createWindow();
  
  if (process.platform === 'darwin') {
    console.log('Showing dock icon');
    app.dock.show();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-accounts', async () => {
  return await db.getAccounts();
});

ipcMain.handle('add-account', async (event, account) => {
  console.log('IPC add-account called with:', account);
  try {
    const result = await db.addAccount(account);
    console.log('Database add result:', result);
    return result;
  } catch (error) {
    console.error('Database add error:', error);
    throw error;
  }
});

ipcMain.handle('delete-account', async (event, id) => {
  return await db.deleteAccount(id);
});