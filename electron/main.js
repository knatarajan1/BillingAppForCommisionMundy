const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')
const isDev = process.env.NODE_ENV === 'development'

const db = require('./sqliteService')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
    icon: path.join(__dirname, '../public/icon.ico'),
    backgroundColor: '#f8fafc',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  createWindow()

  try {
    await db.initDb({
      userDataPath: isDev ? null : app.getPath('userData'),
      exePath: app.getPath('exe'),
    })
  } catch (err) {
    console.error('Failed to initialize database:', err)
    dialog.showErrorBox(
      'Database Error',
      `Failed to initialize the database:\n\n${err.message}\n\nThe application may not work correctly.`
    )
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  db.closeDb()
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Helpers ─────────────────────────────────────────────────

function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try {
      return { ok: true, data: fn(...args) }
    } catch (err) {
      console.error(`[${channel}]`, err.message)
      return { ok: false, error: err.message }
    }
  })
}

// ─── Config ──────────────────────────────────────────────────────
handle('config:getAll',  () => db.getAllConfigs())
handle('config:update',  (key, value) => db.updateConfig(key, value))

// ─── Vegetables ──────────────────────────────────────────────────
handle('vegetables:getAll',   () => db.getAllVegetables())
handle('vegetables:add',      (data) => db.addVegetable(data))
handle('vegetables:update',   (data) => db.updateVegetable(data))
handle('vegetables:delete',   (id) => db.deleteVegetable(id))

// ─── Clients ─────────────────────────────────────────────────────
handle('clients:getAll',  () => db.getAllClients())
handle('clients:add',     (data) => db.addClient(data))
handle('clients:update',  (data) => db.updateClient(data))
handle('clients:delete',  (id) => db.deleteClient(id))

// ─── Vendors ─────────────────────────────────────────────────────
handle('vendors:getAll',  () => db.getAllVendors())
handle('vendors:add',     (data) => db.addVendor(data))
handle('vendors:update',  (data) => db.updateVendor(data))
handle('vendors:delete',  (id) => db.deleteVendor(id))

// ─── Transactions ────────────────────────────────────────────────
handle('transactions:save',           (data)            => db.saveTransaction(data))
handle('transactions:getAll',         ()                => db.getAllTransactions())
handle('transactions:getByDate',      (date)            => db.getTransactionsByDate(date))
handle('transactions:getById',        (id)              => db.getTransactionById(id))
handle('transactions:getClientBills',  (clientId, date)          => db.getClientBills(clientId, date))
handle('transactions:getVendorBills',  (vendorId, date)          => db.getVendorBills(vendorId, date))
handle('transactions:getVendorSummary', (fromDate, toDate)       => db.getVendorSummary(fromDate, toDate))

// ─── Database management ─────────────────────────────────────────
handle('db:clearData', () => db.clearAllData())
handle('db:getPath',   () => db.getDbPath())

// ─── Logo picker ─────────────────────────────────────────────────
ipcMain.handle('app:pickLogo', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Logo Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: true, data: null }

    const filePath = result.filePaths[0]
    const ext = path.extname(filePath).toLowerCase().slice(1)
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp', gif: 'image/gif' }
    const mime = mimeMap[ext] || 'image/png'

    const fileBuffer = fs.readFileSync(filePath)
    if (fileBuffer.length > 2 * 1024 * 1024) {
      return { ok: false, error: 'Image is too large (max 2 MB)' }
    }

    const base64 = fileBuffer.toString('base64')
    const dataUrl = `data:${mime};base64,${base64}`
    return { ok: true, data: dataUrl }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ─── Print ───────────────────────────────────────────────────────
ipcMain.handle('print:bill', () => {
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
      if (!success && errorType !== 'cancelled') console.error('Print error:', errorType)
      resolve({ ok: success, error: errorType })
    })
  })
})
