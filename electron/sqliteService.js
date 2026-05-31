const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

// DB path is resolved in initDb() to avoid requiring 'electron' at module load
// time (which would poison Node's module cache before Electron registers its
// built-in interceptor, causing main.js to get the npm path string).
let DB_PATH

let db     // sql.js Database instance
let SQL    // sql.js module

// ─── sql.js helpers ───────────────────────────────────────────────

function run(sql, params = []) {
  db.run(sql, params)
  persist()
}

function runBatch(sql) {
  db.exec(sql)
  persist()
}

function get(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

function all(sql, params = []) {
  const results = []
  const stmt = db.prepare(sql)
  stmt.bind(params)
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function persist() {
  const data = db.export()
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

// ─── Init ─────────────────────────────────────────────────────────

const DEFAULT_CONFIGS = [
  { key: 'commission_rate',      value: '10',                   label: 'Commission Rate (%)' },
  { key: 'chit_cost_per_record', value: '5',                    label: 'Chit Cost Per Record (₹)' },
  { key: 'company_name',         value: 'KKS Commission Mundy', label: 'Company Name' },
  { key: 'company_address',      value: '',                     label: 'Company Address' },
  { key: 'company_phone',        value: '',                     label: 'Company Phone' },
  { key: 'bill_prefix',          value: 'BILL',                 label: 'Bill Number Prefix' },
  { key: 'currency_symbol',      value: '₹',                   label: 'Currency Symbol' },
  { key: 'theme_color',          value: 'green',                label: 'App Theme Colour' },
  { key: 'print_logo_in_bill',  value: '1',                    label: 'Print Logo on Bill' },
]

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS Config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    label      TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS Vegetables (
    vegetable_id TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    unit         TEXT NOT NULL DEFAULT 'Kg',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS Clients (
    client_id  TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    address    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS Vendors (
    vendor_id  TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL DEFAULT '',
    address    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS Transactions (
    transaction_id       TEXT PRIMARY KEY,
    bill_number          TEXT NOT NULL,
    client_id            TEXT NOT NULL,
    client_name          TEXT NOT NULL,
    date                 TEXT NOT NULL,
    sub_total            REAL NOT NULL DEFAULT 0,
    commission_rate      REAL NOT NULL DEFAULT 0,
    commission_amount    REAL NOT NULL DEFAULT 0,
    chit_cost_per_record REAL NOT NULL DEFAULT 0,
    item_count           INTEGER NOT NULL DEFAULT 0,
    total_chit_cost      REAL NOT NULL DEFAULT 0,
    net_amount           REAL NOT NULL DEFAULT 0,
    created_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS TransactionItems (
    item_id        TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    bill_number    TEXT NOT NULL,
    vegetable_id   TEXT NOT NULL,
    vegetable_name TEXT NOT NULL,
    vendor_id      TEXT NOT NULL,
    vendor_name    TEXT NOT NULL,
    units          REAL NOT NULL DEFAULT 0,
    unit_type      TEXT NOT NULL DEFAULT 'Kg',
    rate           REAL NOT NULL DEFAULT 0,
    price          REAL NOT NULL DEFAULT 0,
    date           TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_txn_date      ON Transactions(date);
  CREATE INDEX IF NOT EXISTS idx_txn_client    ON Transactions(client_id);
  CREATE INDEX IF NOT EXISTS idx_item_txn      ON TransactionItems(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_item_vendor   ON TransactionItems(vendor_id);
  CREATE INDEX IF NOT EXISTS idx_item_date     ON TransactionItems(date);
`

// Called from main.js with the resolved paths so this module never needs
// to require('electron') — doing so at module-load time poisons the module
// cache before Electron registers its built-in interceptor.
async function initDb({ userDataPath, exePath } = {}) {
  const isDev = !userDataPath
  DB_PATH = isDev
    ? path.join(__dirname, '../CommissionMundy.db')
    : path.join(userDataPath, 'CommissionMundy.db')

  // Use __dirname to locate wasm — works in dev (real path) and inside asar
  // (Electron patches fs to transparently read asar-relative paths).
  // We read the binary ourselves so sql.js never needs to do path resolution.
  const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')
  const wasmBinary = fs.readFileSync(wasmPath)

  const initSqlJs = require('sql.js')
  SQL = await initSqlJs({ wasmBinary })

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.exec(SCHEMA)

  // Seed default config rows (INSERT OR IGNORE)
  for (const c of DEFAULT_CONFIGS) {
    db.run(
      'INSERT OR IGNORE INTO Config (key, value, label) VALUES (?, ?, ?)',
      [c.key, c.value, c.label]
    )
  }
  persist()
  console.log('SQLite (sql.js) database initialized at:', DB_PATH)
}

function closeDb() {
  if (db) { persist(); db.close() }
}

function getDbPath() {
  return DB_PATH
}

function clearAllData() {
  if (!DB_PATH) throw new Error('Database not initialized')

  // Create backup before clearing
  const backupDir = path.join(path.dirname(DB_PATH), 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const backupPath = path.join(backupDir, `CommissionMundy_backup_${ts}.db`)

  const data = db.export()
  fs.writeFileSync(backupPath, Buffer.from(data))

  // Delete all data except Config
  db.run('BEGIN')
  try {
    db.exec('DELETE FROM TransactionItems')
    db.exec('DELETE FROM Transactions')
    db.exec('DELETE FROM Clients')
    db.exec('DELETE FROM Vendors')
    db.exec('DELETE FROM Vegetables')
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
  persist()

  return { backupPath }
}

// ─── Config ───────────────────────────────────────────────────────

function getAllConfigs() {
  const rows = all('SELECT key, value FROM Config')
  const result = {}
  for (const r of rows) result[r.key] = r.value
  return result
}

function updateConfig(key, value) {
  db.run(
    `INSERT INTO Config (key, value, label, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value), key]
  )
  persist()
  return true
}

// ─── Vegetables ───────────────────────────────────────────────────

function getAllVegetables() {
  return all('SELECT * FROM Vegetables ORDER BY name ASC').map(r => ({
    vegetableId: r.vegetable_id, name: r.name, unit: r.unit, createdAt: r.created_at,
  }))
}

function addVegetable({ name, unit }) {
  if (!name?.trim()) throw new Error('Vegetable name is required')
  const id = 'VEG-' + uuidv4().slice(0, 8).toUpperCase()
  db.run('INSERT INTO Vegetables (vegetable_id, name, unit) VALUES (?, ?, ?)', [id, name.trim(), unit || 'Kg'])
  persist()
  return { vegetableId: id, name: name.trim(), unit: unit || 'Kg' }
}

function updateVegetable({ vegetableId, name, unit }) {
  if (!name?.trim()) throw new Error('Vegetable name is required')
  db.run('UPDATE Vegetables SET name = ?, unit = ? WHERE vegetable_id = ?', [name.trim(), unit || 'Kg', vegetableId])
  persist()
  return true
}

function deleteVegetable(vegetableId) {
  db.run('DELETE FROM Vegetables WHERE vegetable_id = ?', [vegetableId])
  persist()
  return true
}

// ─── Clients ──────────────────────────────────────────────────────

function getAllClients() {
  return all('SELECT * FROM Clients ORDER BY name ASC').map(r => ({
    clientId: r.client_id, name: r.name, phone: r.phone, address: r.address, createdAt: r.created_at,
  }))
}

function addClient({ name, phone, address }) {
  if (!name?.trim()) throw new Error('Client name is required')
  const id = 'CLT-' + uuidv4().slice(0, 8).toUpperCase()
  db.run('INSERT INTO Clients (client_id, name, phone, address) VALUES (?, ?, ?, ?)', [id, name.trim(), phone || '', address || ''])
  persist()
  return { clientId: id, name: name.trim(), phone: phone || '', address: address || '' }
}

function updateClient({ clientId, name, phone, address }) {
  if (!name?.trim()) throw new Error('Client name is required')
  db.run('UPDATE Clients SET name = ?, phone = ?, address = ? WHERE client_id = ?', [name.trim(), phone || '', address || '', clientId])
  persist()
  return true
}

function deleteClient(clientId) {
  db.run('DELETE FROM Clients WHERE client_id = ?', [clientId])
  persist()
  return true
}

// ─── Vendors ──────────────────────────────────────────────────────

function getAllVendors() {
  return all('SELECT * FROM Vendors ORDER BY name ASC').map(r => ({
    vendorId: r.vendor_id, name: r.name, phone: r.phone, address: r.address, createdAt: r.created_at,
  }))
}

function addVendor({ name, phone, address }) {
  if (!name?.trim()) throw new Error('Vendor name is required')
  const id = 'VND-' + uuidv4().slice(0, 8).toUpperCase()
  db.run('INSERT INTO Vendors (vendor_id, name, phone, address) VALUES (?, ?, ?, ?)', [id, name.trim(), phone || '', address || ''])
  persist()
  return { vendorId: id, name: name.trim(), phone: phone || '', address: address || '' }
}

function updateVendor({ vendorId, name, phone, address }) {
  if (!name?.trim()) throw new Error('Vendor name is required')
  db.run('UPDATE Vendors SET name = ?, phone = ?, address = ? WHERE vendor_id = ?', [name.trim(), phone || '', address || '', vendorId])
  persist()
  return true
}

function deleteVendor(vendorId) {
  db.run('DELETE FROM Vendors WHERE vendor_id = ?', [vendorId])
  persist()
  return true
}

// ─── Transactions ─────────────────────────────────────────────────

function getNextBillNumber() {
  const configs = getAllConfigs()
  const prefix = configs['bill_prefix'] || 'BILL'
  // Bug fix: use MAX via SQL rather than scanning all rows in JS
  const row = get(
    `SELECT MAX(CAST(REPLACE(bill_number, ?, '') AS INTEGER)) AS maxNum
     FROM Transactions WHERE bill_number LIKE ?`,
    [prefix + '-', prefix + '-%']
  )
  const maxNum = row && row.maxNum ? parseInt(row.maxNum, 10) : 0
  return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`
}

function saveTransaction(data) {
  const { clientId, clientName, items, commissionRate, chitCostPerRecord, date } = data
  if (!clientId) throw new Error('Client is required')
  if (!items || items.length === 0) throw new Error('At least one item is required')
  if (!date) throw new Error('Date is required')

  const rate     = parseFloat(commissionRate) || 0
  const chitCost = parseFloat(chitCostPerRecord) || 0
  const subTotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0)
  const commissionAmount = parseFloat((subTotal * rate / 100).toFixed(2))
  const itemCount        = items.length
  const totalChitCost    = parseFloat((itemCount * chitCost).toFixed(2))
  const netAmount        = parseFloat((subTotal - commissionAmount - totalChitCost).toFixed(2))

  const billNumber    = getNextBillNumber()
  const transactionId = 'TXN-' + uuidv4().slice(0, 8).toUpperCase()

  // Bug fix: wrap in sql.js transaction for atomicity
  db.run('BEGIN')
  try {
    db.run(
      `INSERT INTO Transactions
        (transaction_id, bill_number, client_id, client_name, date,
         sub_total, commission_rate, commission_amount,
         chit_cost_per_record, item_count, total_chit_cost, net_amount)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [transactionId, billNumber, clientId, clientName, date,
       subTotal, rate, commissionAmount, chitCost, itemCount, totalChitCost, netAmount]
    )
    for (const item of items) {
      db.run(
        `INSERT INTO TransactionItems
          (item_id, transaction_id, bill_number, vegetable_id, vegetable_name,
           vendor_id, vendor_name, units, unit_type, rate, price, date)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          'ITM-' + uuidv4().slice(0, 8).toUpperCase(),
          transactionId, billNumber,
          item.vegetableId, item.vegetableName,
          item.vendorId, item.vendorName,
          parseFloat(item.units) || 0, item.unitType || 'Kg',
          parseFloat(item.rate) || 0, parseFloat(item.price) || 0,
          date,
        ]
      )
    }
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
  persist()

  return {
    transactionId, billNumber, clientId, clientName, items, date,
    subTotal, commissionRate: rate, commissionAmount,
    chitCostPerRecord: chitCost, itemCount, totalChitCost, netAmount,
  }
}

function getAllTransactions() {
  return all('SELECT * FROM Transactions ORDER BY date DESC, created_at DESC').map(mapTxn)
}

function getTransactionsByDate(date) {
  if (!date) return getAllTransactions()
  return all('SELECT * FROM Transactions WHERE date = ? ORDER BY created_at DESC', [date]).map(mapTxn)
}

function getTransactionById(transactionId) {
  const txn = get('SELECT * FROM Transactions WHERE transaction_id = ?', [transactionId])
  if (!txn) return null
  const result = mapTxn(txn)
  result.items = all('SELECT * FROM TransactionItems WHERE transaction_id = ?', [transactionId]).map(mapItem)
  return result
}

function getClientBills(clientId, date) {
  let txns
  if (clientId && date)  txns = all('SELECT * FROM Transactions WHERE client_id = ? AND date = ? ORDER BY created_at DESC', [clientId, date])
  else if (clientId)     txns = all('SELECT * FROM Transactions WHERE client_id = ? ORDER BY date DESC, created_at DESC', [clientId])
  else if (date)         txns = all('SELECT * FROM Transactions WHERE date = ? ORDER BY created_at DESC', [date])
  else                   txns = all('SELECT * FROM Transactions ORDER BY date DESC, created_at DESC')

  return txns.map(txn => ({
    ...mapTxn(txn),
    items: all('SELECT * FROM TransactionItems WHERE transaction_id = ?', [txn.transaction_id]).map(mapItem),
  }))
}

function getVendorBills(vendorId, date) {
  let items
  if (vendorId && date) items = all('SELECT * FROM TransactionItems WHERE vendor_id = ? AND date = ? ORDER BY date DESC', [vendorId, date])
  else if (vendorId)    items = all('SELECT * FROM TransactionItems WHERE vendor_id = ? ORDER BY date DESC', [vendorId])
  else if (date)        items = all('SELECT * FROM TransactionItems WHERE date = ? ORDER BY date DESC', [date])
  else                  items = all('SELECT * FROM TransactionItems ORDER BY date DESC')

  const grouped = {}
  for (const r of items) {
    const key = `${r.vendor_id}_${r.date}`
    if (!grouped[key]) {
      // Fetch vendor phone from Vendors table
      const vRow = get('SELECT phone FROM Vendors WHERE vendor_id = ?', [r.vendor_id])
      grouped[key] = {
        vendorId: r.vendor_id, vendorName: r.vendor_name,
        vendorPhone: vRow ? (vRow.phone || '') : '',
        date: r.date, items: [],
      }
    }
    grouped[key].items.push({
      billNumber: r.bill_number, transactionId: r.transaction_id,
      vegetableName: r.vegetable_name, units: r.units,
      unitType: r.unit_type, rate: r.rate, price: r.price,
    })
  }

  return Object.values(grouped).map(g => ({
    ...g,
    totalAmount: parseFloat(g.items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0).toFixed(2)),
  }))
}

function getVendorSummary(fromDate, toDate) {
  let sql = `
    SELECT ti.vendor_id, ti.vendor_name,
           COALESCE(v.phone, '') AS vendor_phone,
           ROUND(SUM(ti.price), 2) AS total_amount
    FROM TransactionItems ti
    LEFT JOIN Vendors v ON v.vendor_id = ti.vendor_id
    WHERE 1=1`
  const params = []
  if (fromDate) { sql += ' AND ti.date >= ?'; params.push(fromDate) }
  if (toDate)   { sql += ' AND ti.date <= ?'; params.push(toDate) }
  sql += `
    GROUP BY ti.vendor_id, ti.vendor_name
    HAVING SUM(ti.price) > 0
    ORDER BY ti.vendor_name ASC`
  return all(sql, params).map(r => ({
    vendorId: r.vendor_id,
    vendorName: r.vendor_name,
    vendorPhone: r.vendor_phone,
    totalAmount: r.total_amount,
  }))
}

function mapTxn(r) {
  return {
    transactionId: r.transaction_id, billNumber: r.bill_number,
    clientId: r.client_id, clientName: r.client_name, date: r.date,
    subTotal: r.sub_total, commissionRate: r.commission_rate,
    commissionAmount: r.commission_amount, chitCostPerRecord: r.chit_cost_per_record,
    itemCount: r.item_count, totalChitCost: r.total_chit_cost,
    netAmount: r.net_amount, createdAt: r.created_at,
  }
}

function mapItem(r) {
  return {
    itemId: r.item_id, transactionId: r.transaction_id, billNumber: r.bill_number,
    vegetableId: r.vegetable_id, vegetableName: r.vegetable_name,
    vendorId: r.vendor_id, vendorName: r.vendor_name,
    units: r.units, unitType: r.unit_type, rate: r.rate, price: r.price, date: r.date,
  }
}

module.exports = {
  initDb, closeDb, getDbPath, clearAllData,
  getAllConfigs, updateConfig,
  getAllVegetables, addVegetable, updateVegetable, deleteVegetable,
  getAllClients, addClient, updateClient, deleteClient,
  getAllVendors, addVendor, updateVendor, deleteVendor,
  saveTransaction, getAllTransactions, getTransactionsByDate,
  getTransactionById, getClientBills, getVendorBills, getVendorSummary,
}
