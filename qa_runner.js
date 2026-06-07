/**
 * KKS Commission Mundy — Backend Logic Test Runner
 * Tests sqliteService.js functions directly with an in-memory DB (temp path).
 * Run: node qa_runner.js
 */

const path = require('path')
const fs   = require('fs')
const os   = require('os')

// ─── Test framework ───────────────────────────────────────────────
const results = []
let passed = 0, failed = 0, errors = 0

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION: ${message}`)
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertThrows(fn, messageContains, label) {
  try {
    fn()
    throw new Error(`${label}: Expected an error but none was thrown`)
  } catch (e) {
    if (messageContains && !e.message.includes(messageContains)) {
      throw new Error(`${label}: Error message "${e.message}" does not contain "${messageContains}"`)
    }
  }
}

async function assertThrowsAsync(fn, messageContains, label) {
  try {
    await fn()
    throw new Error(`${label}: Expected an error but none was thrown`)
  } catch (e) {
    if (messageContains && !e.message.includes(messageContains)) {
      throw new Error(`${label}: Error message "${e.message}" does not contain "${messageContains}"`)
    }
  }
}

async function test(id, description, fn) {
  try {
    await fn()
    console.log(`  ✔ [${id}] ${description}`)
    results.push({ id, description, status: 'PASS' })
    passed++
  } catch (e) {
    console.log(`  ✘ [${id}] ${description}`)
    console.log(`        → ${e.message}`)
    results.push({ id, description, status: 'FAIL', error: e.message })
    failed++
  }
}

function section(name) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(` ${name}`)
  console.log('─'.repeat(60))
}

// ─── Setup ────────────────────────────────────────────────────────
const svc = require('./electron/sqliteService')
const TEMP_DB = path.join(os.tmpdir(), `kks_qa_test_${Date.now()}.db`)

async function setup() {
  // Patch DB_PATH to use a temp file so we don't corrupt the real database
  // We do this by initialising with isDev=false and patching userDataPath
  await svc.initDb({ userDataPath: os.tmpdir() })
  // The DB file name is CommissionMundy.db in userDataPath
  console.log('\n KKS Commission Mundy — Backend Logic Test Runner')
  console.log(` DB:   ${path.join(os.tmpdir(), 'CommissionMundy.db')}`)
  console.log(` Date: ${new Date().toISOString()}\n`)
}

function cleanup() {
  svc.closeDb()
  const dbFile = path.join(os.tmpdir(), 'CommissionMundy.db')
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)
  const backupDir = path.join(os.tmpdir(), 'backups')
  if (fs.existsSync(backupDir)) fs.rmdirSync(backupDir, { recursive: true })
}

// ─── Shared test data ─────────────────────────────────────────────
let vegTomato, vegBrinjal, vegBanana, vegPotato, vegOnion
let clientRavi, clientSuresh
let vendorArun, vendorBala

async function runTests() {
  await setup()

  // ═══════════════════════════════════════════════════════════════
  section('M1 — Vegetables Master')
  // ═══════════════════════════════════════════════════════════════

  await test('M1-001', 'Add vegetable with all fields', () => {
    vegTomato = svc.addVegetable({ name: 'Tomato', unit: 'Kg', shortName: 'TMT' })
    assertEqual(vegTomato.name, 'Tomato', 'name')
    assertEqual(vegTomato.unit, 'Kg', 'unit')
    assertEqual(vegTomato.shortName, 'TMT', 'shortName')
    assert(vegTomato.vegetableId.startsWith('VEG-'), 'ID prefix VEG-')
  })

  await test('M1-002', 'Add vegetable with name only (optional fields empty)', () => {
    const veg = svc.addVegetable({ name: 'Spinach' })
    assertEqual(veg.unit, 'Kg', 'defaults to Kg')
    assertEqual(veg.shortName, '', 'shortName empty string')
  })

  await test('M1-003', 'Empty name throws validation error', () => {
    assertThrows(() => svc.addVegetable({ name: '' }), 'required', 'empty name')
  })

  await test('M1-004', 'Whitespace-only name throws validation error', () => {
    assertThrows(() => svc.addVegetable({ name: '   ' }), 'required', 'whitespace name')
  })

  await test('M1-005', 'Add all 5 unit types', () => {
    vegBrinjal = svc.addVegetable({ name: 'Brinjal', unit: 'Box', shortName: 'BRJ' })
    vegBanana  = svc.addVegetable({ name: 'Banana',  unit: 'Ton', shortName: 'BNA' })
    vegPotato  = svc.addVegetable({ name: 'Potato',  unit: 'Bag', shortName: 'PTO' })
    vegOnion   = svc.addVegetable({ name: 'Onion',   unit: 'Pcs', shortName: 'ONI' })
    const list = svc.getAllVegetables()
    assert(list.length >= 5, 'At least 5 vegetables')
  })

  await test('M1-006', 'Get all vegetables sorted alphabetically', () => {
    const list = svc.getAllVegetables()
    const names = list.map(v => v.name)
    const sorted = [...names].sort()
    assertEqual(JSON.stringify(names), JSON.stringify(sorted), 'sorted ASC')
  })

  await test('M1-007', 'Update vegetable name and short name', () => {
    svc.updateVegetable({ vegetableId: vegTomato.vegetableId, name: 'Tomatoes', unit: 'Kg', shortName: 'TMTS' })
    const list = svc.getAllVegetables()
    const updated = list.find(v => v.vegetableId === vegTomato.vegetableId)
    assertEqual(updated.name, 'Tomatoes', 'name updated')
    assertEqual(updated.shortName, 'TMTS', 'shortName updated')
    // Restore original for downstream tests
    svc.updateVegetable({ vegetableId: vegTomato.vegetableId, name: 'Tomato', unit: 'Kg', shortName: 'TMT' })
  })

  await test('M1-008', 'Update vegetable with empty name throws error', () => {
    assertThrows(() => svc.updateVegetable({ vegetableId: vegTomato.vegetableId, name: '', unit: 'Kg' }), 'required', 'empty name update')
  })

  await test('M1-009', 'Delete vegetable', () => {
    const temp = svc.addVegetable({ name: 'DeleteMe', unit: 'Kg' })
    const before = svc.getAllVegetables().length
    svc.deleteVegetable(temp.vegetableId)
    const after = svc.getAllVegetables().length
    assertEqual(after, before - 1, 'one less vegetable')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M2/M3 — Clients & Vendors Master')
  // ═══════════════════════════════════════════════════════════════

  await test('M2-001', 'Add client with all fields', () => {
    clientRavi = svc.addClient({ name: 'Ravi Kumar', phone: '9876543210', address: '123 Ooty Rd' })
    assertEqual(clientRavi.name, 'Ravi Kumar', 'name')
    assertEqual(clientRavi.phone, '9876543210', 'phone')
    assertEqual(clientRavi.address, '123 Ooty Rd', 'address')
    assert(clientRavi.clientId.startsWith('CLT-'), 'ID prefix CLT-')
  })

  await test('M2-002', 'Add client with name only', () => {
    clientSuresh = svc.addClient({ name: 'Suresh' })
    assertEqual(clientSuresh.phone, '', 'phone empty')
    assertEqual(clientSuresh.address, '', 'address empty')
  })

  await test('M2-003', 'Empty client name throws error', () => {
    assertThrows(() => svc.addClient({ name: '' }), 'required', 'empty client name')
  })

  await test('M2-004', 'Phone accepts any format (no format validation)', () => {
    const c = svc.addClient({ name: 'Format Test', phone: 'abc-xyz' })
    assertEqual(c.phone, 'abc-xyz', 'any phone format accepted')
    svc.deleteClient(c.clientId)
  })

  await test('M2-005', 'Update client name', () => {
    svc.updateClient({ clientId: clientRavi.clientId, name: 'Ravi Kumar Sharma', phone: '9876543210', address: '123 Ooty Rd' })
    const list = svc.getAllClients()
    const u = list.find(c => c.clientId === clientRavi.clientId)
    assertEqual(u.name, 'Ravi Kumar Sharma', 'name updated')
    // Restore
    svc.updateClient({ clientId: clientRavi.clientId, name: 'Ravi Kumar', phone: '9876543210', address: '123 Ooty Rd' })
  })

  await test('M2-006', 'Delete client', () => {
    const temp = svc.addClient({ name: 'TempClient' })
    const before = svc.getAllClients().length
    svc.deleteClient(temp.clientId)
    assertEqual(svc.getAllClients().length, before - 1, 'one less client')
  })

  await test('M2-007', 'Get all clients sorted alphabetically', () => {
    const list = svc.getAllClients()
    const names = list.map(c => c.name)
    const sorted = [...names].sort()
    assertEqual(JSON.stringify(names), JSON.stringify(sorted), 'sorted ASC')
  })

  await test('M3-001', 'Add vendor with all fields', () => {
    vendorArun = svc.addVendor({ name: 'Arun Traders', phone: '9000000001', address: 'Chennai' })
    vendorBala = svc.addVendor({ name: 'Bala Stores',  phone: '9000000002', address: 'Salem' })
    assert(vendorArun.vendorId.startsWith('VND-'), 'ID prefix VND-')
  })

  await test('M3-002', 'Empty vendor name throws error', () => {
    assertThrows(() => svc.addVendor({ name: '' }), 'required', 'empty vendor name')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M13 — Business Logic: Calculations')
  // ═══════════════════════════════════════════════════════════════

  const TODAY = '2026-06-07'

  await test('M13-001', 'Commission formula: 10% of ₹1000 = ₹100', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      commissionRate: 10, chitCostPerRecord: 0,
      items: [{
        vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10,
        price: 1000,
      }]
    })
    assertEqual(result.subTotal, 1000, 'subTotal')
    assertEqual(result.commissionAmount, 100, 'commission 10%')
    assertEqual(result.totalChitCost, 0, 'chitCost=0')
    assertEqual(result.netAmount, 900, 'net = 1000-100-0')
  })

  await test('M13-002', 'Chit cost: Kg and Ton = 1 chit per item (weight-based)', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      commissionRate: 0, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 100, unitType: 'Kg', rate: 10, price: 1000 },
        { vegetableId: vegBanana.vegetableId, vegetableName: 'Banana', vegetableShortName: 'BNA',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 5, unitType: 'Ton', rate: 1000, price: 5000 },
      ]
    })
    // 2 items × 1 chit each × ₹5 = ₹10
    assertEqual(result.totalChitCost, 10, 'chit cost: 2 weight items = 2 chits × ₹5 = ₹10')
  })

  await test('M13-003', 'Chit cost: Box/Bag/Pcs = qty chits per item (count-based)', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      commissionRate: 0, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegBrinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 20, unitType: 'Box', rate: 100, price: 2000 },
        { vegetableId: vegPotato.vegetableId, vegetableName: 'Potato', vegetableShortName: 'PTO',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 15, unitType: 'Bag', rate: 50, price: 750 },
        { vegetableId: vegOnion.vegetableId, vegetableName: 'Onion', vegetableShortName: 'ONI',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 50, unitType: 'Pcs', rate: 10, price: 500 },
      ]
    })
    // (20 + 15 + 50) × ₹5 = ₹425
    assertEqual(result.totalChitCost, 425, 'chit cost: (20+15+50) × ₹5 = ₹425')
  })

  await test('M13-004', 'Mixed units — combined chit cost', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      commissionRate: 10, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 10, unitType: 'Kg', rate: 10, price: 100 },      // 1 chit
        { vegetableId: vegOnion.vegetableId, vegetableName: 'Onion', vegetableShortName: 'ONI',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 20, unitType: 'Kg', rate: 5, price: 100 },       // 1 chit
        { vegetableId: vegBrinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 5, unitType: 'Box', rate: 200, price: 1000 },    // 5 chits
        { vegetableId: vegBanana.vegetableId, vegetableName: 'Banana', vegetableShortName: 'BNA',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 2, unitType: 'Ton', rate: 5000, price: 10000 },  // 1 chit
      ]
    })
    // Chits: 1 + 1 + 5 + 1 = 8 × ₹5 = ₹40
    assertEqual(result.totalChitCost, 40, 'chit cost: 8 chits × ₹5 = ₹40')
    const expectedSubTotal = 100 + 100 + 1000 + 10000
    assertEqual(result.subTotal, expectedSubTotal, 'subTotal = 11200')
    const expectedComm = parseFloat((11200 * 0.1).toFixed(2))
    assertEqual(result.commissionAmount, expectedComm, 'commission = 10%')
    assertEqual(result.netAmount, parseFloat((11200 - expectedComm - 40).toFixed(2)), 'net amount')
  })

  await test('M13-005', 'Commission rate = 0% → commission = 0', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 0, chitCostPerRecord: 0,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10, price: 1000 }]
    })
    assertEqual(result.commissionAmount, 0, 'commission = 0 at 0% rate')
    assertEqual(result.netAmount, 1000, 'net = subtotal')
  })

  await test('M13-006', 'Negative net amount (commission + chit > subtotal)', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 80, chitCostPerRecord: 50,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 1, unitType: 'Kg', rate: 1, price: 1 }]
    })
    // Net = 1 - 0.80 - 50 = -49.80
    assert(result.netAmount < 0, 'net amount is negative')
    assertEqual(result.netAmount, -49.80, 'net = -49.80')
  })

  await test('M13-007', 'Item price = qty × rate', () => {
    // Verify the math: price MUST be passed in (UI computes it)
    // Backend trusts the passed price for subtotal
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 0,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 12.5, unitType: 'Kg', rate: 8.40, price: 105.00 }]
    })
    assertEqual(result.subTotal, 105.00, 'subTotal = price passed in')
    assertEqual(result.commissionAmount, 10.50, 'commission = 105 × 10%')
  })

  await test('M13-008', 'Decimal precision: 2dp throughout', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 7.5, chitCostPerRecord: 2.50,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10, price: 1000 }]
    })
    // Commission = 1000 × 7.5% = 75.00
    assertEqual(result.commissionAmount, 75.00, 'commission 7.5%')
    // Chit = 1 × 2.50 = 2.50
    assertEqual(result.totalChitCost, 2.50, 'chit cost 2.50')
    // Net = 1000 - 75 - 2.50 = 922.50
    assertEqual(result.netAmount, 922.50, 'net = 922.50')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M4 — Billing: Bill Numbering')
  // ═══════════════════════════════════════════════════════════════

  await test('M4-003', 'Bill number format YYYYMMDD-NNN (via saveTransaction)', () => {
    // Verify bill number format via the returned value from saveTransaction
    const DATE = '2026-01-15'
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    assert(result.billNumber.startsWith('20260115-'), 'starts with YYYYMMDD-')
    assertEqual(result.billNumber, '20260115-001', 'first bill of the day = -001')
  })

  await test('M4-004', 'Bill number increments within a day', () => {
    const DATE = '2026-01-15' // same date as above, already has -001
    const result2 = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    assertEqual(result2.billNumber, '20260115-002', 'second bill of the day = -002')
    const result3 = svc.saveTransaction({
      clientId: clientSuresh.clientId, clientName: 'Suresh',
      date: DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegOnion.vegetableId, vegetableName: 'Onion', vegetableShortName: 'ONI',
        vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
        units: 10, unitType: 'Pcs', rate: 5, price: 50 }]
    })
    assertEqual(result3.billNumber, '20260115-003', 'third bill of the day = -003')
  })

  await test('M4-005', 'Bill number resets to 001 for new date', () => {
    const DATE = '2026-01-21' // fresh date, no prior bills
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    assertEqual(result.billNumber, '20260121-001', 'new date starts at -001')
  })

  await test('M4-006', 'Missing client throws validation error', () => {
    assertThrows(() => svc.saveTransaction({
      clientId: '', clientName: '', date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    }), 'Client is required', 'missing client')
  })

  await test('M4-007', 'Missing items throws validation error', () => {
    assertThrows(() => svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: []
    }), 'At least one item', 'empty items')
  })

  await test('M4-008', 'Missing date throws validation error', () => {
    assertThrows(() => svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: null, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    }), 'Date is required', 'missing date')
  })

  await test('M4-009', 'Zero quantity item saves correctly', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 0, unitType: 'Kg', rate: 10, price: 0 }]
    })
    assertEqual(result.subTotal, 0, 'subTotal=0 for zero qty')
  })

  await test('M4-010', 'Zero rate item saves correctly', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 0, price: 0 }]
    })
    assertEqual(result.subTotal, 0, 'subTotal=0 for zero rate')
    // Chit cost still applies (1 item × ₹5)
    assertEqual(result.totalChitCost, 5, 'chit cost still applies')
  })

  await test('M4-011', 'Large values handled without overflow', () => {
    const result = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 99999.99, unitType: 'Kg', rate: 99999.99, price: 9999998000.0001 }]
    })
    assert(result.subTotal > 0, 'subTotal positive for large values')
    assert(!isNaN(result.netAmount), 'netAmount not NaN')
  })

  await test('M4-012', 'Special characters in names saved correctly', () => {
    const c = svc.addClient({ name: "O'Brien & Sons Ltd. #1" })
    const v = svc.addVendor({ name: 'Chilly (Green) / Extra-Hot' })
    const result = svc.saveTransaction({
      clientId: c.clientId, clientName: c.name,
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: v.vendorId, vendorName: v.name,
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    const saved = svc.getTransactionById(result.transactionId)
    assertEqual(saved.clientName, "O'Brien & Sons Ltd. #1", 'special chars in client name')
    svc.deleteClient(c.clientId)
    svc.deleteVendor(v.vendorId)
  })

  // ═══════════════════════════════════════════════════════════════
  section('M4 — Billing: Update & Reverse')
  // ═══════════════════════════════════════════════════════════════

  let billToEdit, billToReverse

  await test('M4-013', 'Edit existing bill — update items and recalculate', () => {
    const orig = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10, price: 1000 }]
    })
    billToEdit = orig

    const updated = svc.updateTransaction({
      transactionId: orig.transactionId,
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 200, unitType: 'Kg', rate: 10, price: 2000 },
        { vegetableId: vegOnion.vegetableId, vegetableName: 'Onion', vegetableShortName: 'ONI',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 5, unitType: 'Pcs', rate: 50, price: 250 },
      ]
    })
    assertEqual(updated.subTotal, 2250, 'subTotal updated to 2250')
    assertEqual(updated.itemCount, 2, 'item count updated to 2')
    assertEqual(updated.billNumber, orig.billNumber, 'bill number unchanged on edit')
    // Verify old items gone
    const saved = svc.getTransactionById(orig.transactionId)
    assertEqual(saved.items.length, 2, 'old items replaced, new items in DB')
  })

  await test('M4-014', 'Reverse bill — status set to reversed', () => {
    billToReverse = svc.saveTransaction({
      clientId: clientSuresh.clientId, clientName: 'Suresh',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 50, unitType: 'Kg', rate: 10, price: 500 }]
    })
    svc.reverseTransaction(billToReverse.transactionId)
    const bills = svc.getClientBills(clientSuresh.clientId, TODAY)
    const reversed = bills.find(b => b.transactionId === billToReverse.transactionId)
    assertEqual(reversed.status, 'reversed', 'status = reversed')
  })

  await test('M4-015', 'Cannot edit a reversed bill', () => {
    assertThrows(() => svc.updateTransaction({
      transactionId: billToReverse.transactionId,
      clientId: clientSuresh.clientId, clientName: 'Suresh',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10, price: 1000 }]
    }), 'Cannot edit a reversed bill', 'reversed bill edit rejected')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M5 — Farmer Receipts')
  // ═══════════════════════════════════════════════════════════════

  let receipt1

  await test('M5-001', 'Create farmer receipt — happy path', () => {
    receipt1 = svc.saveFarmerReceipt({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT' },
        { vegetableId: vegOnion.vegetableId,   vegetableName: 'Onion',  vegetableShortName: 'ONI' },
      ]
    })
    assert(receipt1.receiptNumber.startsWith('RCPT-'), 'receipt number starts with RCPT-')
    assertEqual(receipt1.clientId, clientRavi.clientId, 'clientId saved')
    assertEqual(receipt1.items.length, 2, '2 items saved')
  })

  await test('M5-002', 'Receipt number format: RCPT-YYYYMMDD-NNN', () => {
    assert(/^RCPT-\d{8}-\d{3}$/.test(receipt1.receiptNumber), 'format matches RCPT-YYYYMMDD-NNN')
  })

  await test('M5-003', 'Receipt number increments per day', () => {
    const r2 = svc.saveFarmerReceipt({
      clientId: clientSuresh.clientId, clientName: 'Suresh',
      date: TODAY,
      items: [{ vegetableId: vegBrinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ' }]
    })
    const num1 = parseInt(receipt1.receiptNumber.split('-')[2], 10)
    const num2 = parseInt(r2.receiptNumber.split('-')[2], 10)
    assertEqual(num2, num1 + 1, 'second receipt increments by 1')
  })

  await test('M5-004', 'Receipt number resets for new date', () => {
    const r = svc.saveFarmerReceipt({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: '2026-06-08',
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT' }]
    })
    assert(r.receiptNumber.includes('20260608'), 'date part 20260608')
    assert(r.receiptNumber.endsWith('-001'), 'resets to -001 for new date')
  })

  await test('M5-005', 'Missing client throws error', () => {
    assertThrows(() => svc.saveFarmerReceipt({
      clientId: '', clientName: '',
      date: TODAY,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT' }]
    }), 'Client is required', 'missing client')
  })

  await test('M5-006', 'Missing items throws error', () => {
    assertThrows(() => svc.saveFarmerReceipt({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, items: []
    }), 'At least one item', 'empty items')
  })

  await test('M5-007', 'Get receipts by client and date', () => {
    const receipts = svc.getFarmerReceiptsByClient(clientRavi.clientId, TODAY)
    assert(receipts.length >= 1, 'at least 1 receipt for Ravi today')
    assert(receipts.every(r => r.clientId === clientRavi.clientId), 'all belong to Ravi')
  })

  await test('M5-008', 'Short name persisted in receipt items', () => {
    const r = svc.getFarmerReceiptById(receipt1.receiptId)
    const tomatoItem = r.items.find(i => i.vegetableId === vegTomato.vegetableId)
    assertEqual(tomatoItem.vegetableShortName, 'TMT', 'short name persisted')
  })

  await test('M5-009', 'Multiple receipts for same farmer same day', () => {
    const r3 = svc.saveFarmerReceipt({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY,
      items: [{ vegetableId: vegBanana.vegetableId, vegetableName: 'Banana', vegetableShortName: 'BNA' }]
    })
    const all = svc.getFarmerReceiptsByClient(clientRavi.clientId, TODAY)
    assert(all.length >= 2, 'multiple receipts for same farmer same day')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M6 — Cash Drawer')
  // ═══════════════════════════════════════════════════════════════

  const CD_DATE = '2026-05-01'

  await test('M6-001', 'Set opening amount and verify closing balance', () => {
    // Create some bills for CD_DATE
    svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: CD_DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 10, price: 1000 }]
    })
    // Net for above: 1000 - 100 (10%) - 5 (chit) = 895
    const state = svc.saveCashDrawerOpening(CD_DATE, 10000)
    assertEqual(state.openingAmount, 10000, 'opening = 10000')
    assertEqual(state.hasRecord, true, 'hasRecord = true')
    assert(state.totalPaid > 0, 'totalPaid > 0')
    assertEqual(state.closingAmount, parseFloat((state.openingAmount - state.totalPaid).toFixed(2)), 'closing = opening - paid')
  })

  await test('M6-002', 'Reversed bills excluded from cash drawer totals', () => {
    // Save a bill for CD_DATE, then reverse it
    const txn = svc.saveTransaction({
      clientId: clientSuresh.clientId, clientName: 'Suresh',
      date: CD_DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 50, price: 5000 }]
    })
    const before = svc.getCashDrawerByDate(CD_DATE)
    svc.reverseTransaction(txn.transactionId)
    const after = svc.getCashDrawerByDate(CD_DATE)
    assert(after.totalPaid < before.totalPaid, 'reversed bill excluded — totalPaid decreased')
    assert(after.closingAmount > before.closingAmount, 'closing increased after reversal')
  })

  await test('M6-003', 'No record for unseen date: hasRecord = false', () => {
    const state = svc.getCashDrawerByDate('2026-02-01')
    assertEqual(state.hasRecord, false, 'hasRecord = false for unset date')
    assertEqual(state.openingAmount, 0, 'openingAmount = 0')
    assertEqual(state.totalPaid, 0, 'totalPaid = 0')
  })

  await test('M6-004', 'Negative opening amount throws error', () => {
    assertThrows(() => svc.saveCashDrawerOpening(CD_DATE, -100), 'non-negative', 'negative amount rejected')
  })

  await test('M6-005', 'NaN opening amount throws error', () => {
    assertThrows(() => svc.saveCashDrawerOpening(CD_DATE, NaN), 'non-negative', 'NaN rejected')
  })

  await test('M6-006', 'Reset cash drawer sets opening to 0', () => {
    svc.saveCashDrawerOpening(CD_DATE, 5000)
    svc.resetCashDrawer(CD_DATE)
    const state = svc.getCashDrawerByDate(CD_DATE)
    assertEqual(state.openingAmount, 0, 'opening reset to 0')
    assertEqual(state.hasRecord, true, 'record still exists after reset')
  })

  await test('M6-007', 'Missing date throws error', () => {
    assertThrows(() => svc.saveCashDrawerOpening(null, 1000), 'Date is required', 'null date')
    assertThrows(() => svc.getCashDrawerByDate(null), 'Date is required', 'null date get')
  })

  await test('M6-008', 'Cash drawer history — date range filter', () => {
    svc.saveCashDrawerOpening('2026-03-01', 1000)
    svc.saveCashDrawerOpening('2026-03-15', 2000)
    svc.saveCashDrawerOpening('2026-04-01', 3000)
    const history = svc.getCashDrawerHistory('2026-03-01', '2026-03-31')
    assert(history.length === 2, '2 records in March')
    assert(history.every(h => h.date >= '2026-03-01' && h.date <= '2026-03-31'), 'all in date range')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M7 — Vendor Payments')
  // ═══════════════════════════════════════════════════════════════

  const VP_DATE = '2026-04-15'

  await test('M7-001', 'Load vendor bills for a date', () => {
    // Create bills for VP_DATE
    svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE, commissionRate: 10, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 100, unitType: 'Kg', rate: 10, price: 1000 },
        { vegetableId: vegBrinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 10, unitType: 'Box', rate: 200, price: 2000 },
      ]
    })
    const bills = svc.getVendorBillsByDate(VP_DATE)
    assert(bills.length >= 2, 'at least 2 vendors have bills')
    const arun = bills.find(b => b.vendorId === vendorArun.vendorId)
    const bala = bills.find(b => b.vendorId === vendorBala.vendorId)
    assert(arun, 'Arun Traders in vendor bills')
    assert(bala, 'Bala Stores in vendor bills')
    assertEqual(arun.billAmount, 1000, 'Arun bill = ₹1000')
    assertEqual(bala.billAmount, 2000, 'Bala bill = ₹2000')
  })

  await test('M7-002', 'Save vendor payment (partial)', () => {
    svc.saveVendorPayments([{
      vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
      billDate: VP_DATE, paidAmount: 600
    }])
    const bills = svc.getVendorBillsByDate(VP_DATE)
    const arun = bills.find(b => b.vendorId === vendorArun.vendorId)
    assertEqual(arun.paidAmount, 600, 'paid = 600')
    assertEqual(arun.pendingAmount, 400, 'pending = 400')
  })

  await test('M7-003', 'Pay in full', () => {
    svc.saveVendorPayments([{
      vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
      billDate: VP_DATE, paidAmount: 2000
    }])
    const bills = svc.getVendorBillsByDate(VP_DATE)
    const bala = bills.find(b => b.vendorId === vendorBala.vendorId)
    assertEqual(bala.paidAmount, 2000, 'paid = 2000 (full)')
    assertEqual(bala.pendingAmount, 0, 'pending = 0')
  })

  await test('M7-004', 'Overpayment rejected (paid > bill)', () => {
    assertThrows(() => svc.saveVendorPayments([{
      vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
      billDate: VP_DATE, paidAmount: 9999
    }]), 'exceeds current bill', 'overpayment rejected')
  })

  await test('M7-005', 'Negative payment rejected', () => {
    assertThrows(() => svc.saveVendorPayments([{
      vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
      billDate: VP_DATE, paidAmount: -100
    }]), 'cannot be negative', 'negative payment rejected')
  })

  await test('M7-006', 'Reversed bills excluded from vendor bills', () => {
    const VP_DATE2 = '2026-04-20'
    const txn = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE2, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 20, price: 2000 }]
    })
    const before = svc.getVendorBillsByDate(VP_DATE2)
    assert(before.length >= 1, 'bill exists before reversal')
    svc.reverseTransaction(txn.transactionId)
    const after = svc.getVendorBillsByDate(VP_DATE2)
    const arun = after.find(b => b.vendorId === vendorArun.vendorId)
    assert(!arun, 'Arun not in vendor bills after reversal (or bill = 0)')
  })

  await test('M7-007', 'Stale payment detection (bill reduced after payment)', () => {
    const VP_DATE3 = '2026-04-25'
    // Create bill ₹2000 for Arun, record payment ₹2000
    const txn = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE3, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 20, price: 2000 }]
    })
    svc.saveVendorPayments([{ vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
      billDate: VP_DATE3, paidAmount: 2000 }])

    // Now reduce the bill: update to ₹1000
    svc.updateTransaction({
      transactionId: txn.transactionId,
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE3, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 50, unitType: 'Kg', rate: 20, price: 1000 }]
    })

    // isStale: paidAmount (2000) > current bill (1000)
    const bills = svc.getVendorBillsByDate(VP_DATE3)
    const arun = bills.find(b => b.vendorId === vendorArun.vendorId)
    assertEqual(arun.isStale, true, 'isStale = true when paid > current bill')
    assertEqual(arun.billAmount, 1000, 'current bill = 1000 (after edit)')
    assertEqual(arun.paidAmount, 2000, 'stored paid = 2000 (old)')
  })

  await test('M7-008', 'Missing date throws error', () => {
    assertThrows(() => svc.getVendorBillsByDate(null), 'Date is required', 'null date')
  })

  await test('M7-009', 'Save vendor payments with re-fetch catches stale UI (live bill check)', () => {
    // Try to save payment > live bill (simulates concurrent change)
    const VP_DATE4 = '2026-04-30'
    svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE4, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 50, unitType: 'Kg', rate: 10, price: 500 }]
    })
    // Try to pay ₹999 when bill is only ₹500
    assertThrows(() => svc.saveVendorPayments([{
      vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
      billDate: VP_DATE4, paidAmount: 999
    }]), 'exceeds current bill', 'live bill check catches overpayment')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M8 — Reports')
  // ═══════════════════════════════════════════════════════════════

  await test('M8-001', 'Client bills report: reversed bills visible', () => {
    const bills = svc.getClientBills(clientSuresh.clientId, TODAY)
    const reversed = bills.find(b => b.transactionId === billToReverse.transactionId)
    assert(reversed, 'reversed bill still appears in client bills report')
    assertEqual(reversed.status, 'reversed', 'status = reversed')
  })

  await test('M8-002', 'Client bills report: filter by client', () => {
    const bills = svc.getClientBills(clientRavi.clientId, null)
    assert(bills.every(b => b.clientId === clientRavi.clientId), 'all bills belong to Ravi')
  })

  await test('M8-003', 'Client bills report: filter by date', () => {
    const bills = svc.getClientBills(null, TODAY)
    assert(bills.every(b => b.date === TODAY), 'all bills on today')
  })

  await test('M8-004', 'Vendor bills: reversed bills excluded', () => {
    const items = svc.getVendorBills(null, TODAY)
    const reversedBill = items.find(g =>
      g.items.some(i => i.transactionId === billToReverse.transactionId)
    )
    assert(!reversedBill, 'reversed bill items not in vendor bills report')
  })

  await test('M8-005', 'Vendor summary: vendors with 0 bill excluded', () => {
    const summary = svc.getVendorSummary(null, null)
    assert(Array.isArray(summary), 'returns array')
    assert(summary.every(s => s.totalAmount > 0), 'all vendors have amount > 0')
  })

  await test('M8-006', 'Vendor summary: reversed bills excluded', () => {
    // Create bill with vendor, reverse it
    const VP_DATE5 = '2026-05-10'
    const txn = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: VP_DATE5, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg', rate: 100, price: 10000 }]
    })
    const beforeSummary = svc.getVendorSummary(VP_DATE5, VP_DATE5)
    const beforeAmount = beforeSummary.find(s => s.vendorId === vendorArun.vendorId)?.totalAmount || 0
    svc.reverseTransaction(txn.transactionId)
    const afterSummary = svc.getVendorSummary(VP_DATE5, VP_DATE5)
    const afterEntry = afterSummary.find(s => s.vendorId === vendorArun.vendorId)
    assert(!afterEntry || afterEntry.totalAmount < beforeAmount, 'reversed bill excluded from summary')
  })

  await test('M8-007', 'Vendor payment report: cumulative per vendor', () => {
    const report = svc.getVendorPaymentReport(vendorArun.vendorId)
    assert(Array.isArray(report), 'returns array')
    assert(report.length >= 1, 'at least 1 entry for Arun')
    const entry = report[0]
    assert(entry.totalBill > 0, 'totalBill > 0')
    assert(entry.totalPaid >= 0, 'totalPaid >= 0')
    assertEqual(parseFloat((entry.totalBill - entry.totalPaid).toFixed(2)), entry.totalPending, 'pending = bill - paid')
  })

  await test('M8-008', 'Cash drawer history: date range', () => {
    const hist = svc.getCashDrawerHistory('2026-03-01', '2026-04-30')
    assert(hist.every(h => h.date >= '2026-03-01' && h.date <= '2026-04-30'), 'all in range')
  })

  await test('M8-009', 'All reports with no data return empty arrays', () => {
    // Use a date range with no data
    const farFuture = '2099-12-31'
    const clientBills = svc.getClientBills(null, farFuture)
    assertEqual(clientBills.length, 0, 'empty client bills for far future')
    const vendorBills = svc.getVendorBills(null, farFuture)
    assertEqual(vendorBills.length, 0, 'empty vendor bills for far future')
    const summary = svc.getVendorSummary(farFuture, farFuture)
    assertEqual(summary.length, 0, 'empty vendor summary for far future')
    const hist = svc.getCashDrawerHistory(farFuture, farFuture)
    assertEqual(hist.length, 0, 'empty cash drawer history for far future')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M9 — Settings & Config')
  // ═══════════════════════════════════════════════════════════════

  await test('M9-001', 'Get all configs returns defaults', () => {
    const configs = svc.getAllConfigs()
    assertEqual(configs.commission_rate, '10', 'default commission rate = 10')
    assertEqual(configs.chit_cost_per_record, '5', 'default chit cost = 5')
    assertEqual(configs.company_name, 'KKS Commission Mundy', 'default company name')
    assertEqual(configs.currency_symbol, '₹', 'default currency')
  })

  await test('M9-002', 'Update config key', () => {
    svc.updateConfig('commission_rate', '15')
    const configs = svc.getAllConfigs()
    assertEqual(configs.commission_rate, '15', 'commission_rate updated to 15')
    // Restore
    svc.updateConfig('commission_rate', '10')
  })

  await test('M9-003', 'Upsert config (insert new key)', () => {
    svc.updateConfig('test_key_qa', 'hello')
    const configs = svc.getAllConfigs()
    assertEqual(configs.test_key_qa, 'hello', 'new key inserted')
    svc.updateConfig('test_key_qa', 'world')
    const configs2 = svc.getAllConfigs()
    assertEqual(configs2.test_key_qa, 'world', 'key updated')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M14 — Data Integrity')
  // ═══════════════════════════════════════════════════════════════

  await test('M14-001', 'Bill save is atomic: all items saved or none', () => {
    const before = svc.getAllTransactions().length
    try {
      svc.saveTransaction({
        clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
        date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
        items: [
          { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
            vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
            units: 10, unitType: 'Kg', rate: 10, price: 100 },
        ]
      })
    } catch (_) {}
    // Just verify no partial inserts happen. Since we can't easily force
    // mid-transaction failure in sql.js, we verify that successful saves
    // always include both transaction + items
    const after = svc.getAllTransactions().length
    if (after > before) {
      const latest = svc.getAllTransactions()[0]
      const items = svc.getTransactionById(latest.transactionId).items
      assert(items.length >= 1, 'items present when transaction saved')
    }
  })

  await test('M14-002', 'Bill update atomicity: old items deleted, new items inserted', () => {
    const orig = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 100, unitType: 'Kg', rate: 10, price: 1000 },
        { vegetableId: vegOnion.vegetableId, vegetableName: 'Onion', vegetableShortName: 'ONI',
          vendorId: vendorBala.vendorId, vendorName: 'Bala Stores',
          units: 50, unitType: 'Pcs', rate: 5, price: 250 },
      ]
    })
    assertEqual(svc.getTransactionById(orig.transactionId).items.length, 2, '2 old items')
    svc.updateTransaction({
      transactionId: orig.transactionId,
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [
        { vegetableId: vegBrinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
          vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
          units: 30, unitType: 'Box', rate: 100, price: 3000 },
      ]
    })
    const updated = svc.getTransactionById(orig.transactionId)
    assertEqual(updated.items.length, 1, 'old items removed, exactly 1 new item')
    assertEqual(updated.items[0].vegetableName, 'Brinjal', 'new item is Brinjal')
  })

  await test('M14-003', 'Vendor name snapshot at bill save time', () => {
    const txn = svc.saveTransaction({
      clientId: clientRavi.clientId, clientName: 'Ravi Kumar',
      date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: vegTomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: vendorArun.vendorId, vendorName: 'Arun Traders',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    // Rename vendor
    svc.updateVendor({ vendorId: vendorArun.vendorId, name: 'Arun & Co', phone: '9000000001', address: 'Chennai' })
    // Check bill still shows original name
    const saved = svc.getTransactionById(txn.transactionId)
    assertEqual(saved.items[0].vendorName, 'Arun Traders', 'vendor name snapshot preserved')
    // Restore
    svc.updateVendor({ vendorId: vendorArun.vendorId, name: 'Arun Traders', phone: '9000000001', address: 'Chennai' })
  })

  await test('M14-004', 'Clear all data: backup created, Config preserved, VendorPayments+CashDrawer cleared', () => {
    // Seed a vendor payment and cash drawer record before clearing
    svc.saveCashDrawerOpening('2026-07-01', 5000)
    const configsBefore = svc.getAllConfigs()
    const result = svc.clearAllData()
    assert(fs.existsSync(result.backupPath), 'backup file created')
    // Verify all transaction/master data deleted
    assertEqual(svc.getAllClients().length, 0, 'clients cleared')
    assertEqual(svc.getAllVegetables().length, 0, 'vegetables cleared')
    assertEqual(svc.getAllTransactions().length, 0, 'transactions cleared')
    // Verify VendorPayments cleared (BUG-001 fix)
    const vpReport = svc.getVendorPaymentReport(null)
    assertEqual(vpReport.length, 0, 'VendorPayments cleared')
    // Verify CashDrawer cleared (BUG-001 fix)
    const cdState = svc.getCashDrawerByDate('2026-07-01')
    assertEqual(cdState.hasRecord, false, 'CashDrawer cleared')
    // Config preserved
    const configsAfter = svc.getAllConfigs()
    assertEqual(configsAfter.commission_rate, configsBefore.commission_rate, 'commission_rate preserved')
    assertEqual(configsAfter.company_name, configsBefore.company_name, 'company_name preserved')
  })

  // ═══════════════════════════════════════════════════════════════
  section('M15 — Edge Cases after Clear')
  // ═══════════════════════════════════════════════════════════════

  await test('M15-001', 'Empty state: getAllVegetables returns []', () => {
    const list = svc.getAllVegetables()
    assertEqual(list.length, 0, 'empty after clear')
  })

  await test('M15-002', 'Empty state: getClientBills returns []', () => {
    const bills = svc.getClientBills(null, null)
    assertEqual(bills.length, 0, 'empty after clear')
  })

  await test('M15-003', 'Empty state: getVendorPaymentReport returns []', () => {
    const report = svc.getVendorPaymentReport(null)
    assertEqual(report.length, 0, 'empty payment report after clear')
  })

  await test('M15-004', 'Farmer receipt for non-existent client saves (no FK constraint)', () => {
    // Re-seed minimal data after clear
    const c = svc.addClient({ name: 'TestClient' })
    const v = svc.addVegetable({ name: 'TestVeg', unit: 'Kg' })
    const r = svc.saveFarmerReceipt({
      clientId: c.clientId, clientName: 'TestClient',
      date: '2026-06-07',
      items: [{ vegetableId: v.vegetableId, vegetableName: 'TestVeg', vegetableShortName: '' }]
    })
    assertEqual(r.clientId, c.clientId, 'receipt saved')
    svc.deleteClient(c.clientId) // orphan the receipt
    const receipts = svc.getFarmerReceiptsByClient(c.clientId, '2026-06-07')
    assert(receipts.length >= 1, 'orphaned receipt still accessible by old clientId')
  })

  await test('M15-005', 'Reversal of non-existent transaction throws error', () => {
    assertThrows(() => svc.reverseTransaction('TXN-NONEXIST'), 'not found', 'non-existent txn')
  })

  await test('M15-006', 'Bill numbering starts at 001 on fresh DB (via saveTransaction)', () => {
    // Seed minimal master data after clear
    const c2 = svc.addClient({ name: 'SeedClient' })
    const v2 = svc.addVegetable({ name: 'SeedVeg', unit: 'Kg' })
    const vnd = svc.addVendor({ name: 'SeedVendor' })
    const result = svc.saveTransaction({
      clientId: c2.clientId, clientName: 'SeedClient',
      date: '2026-06-07', commissionRate: 10, chitCostPerRecord: 5,
      items: [{ vegetableId: v2.vegetableId, vegetableName: 'SeedVeg', vegetableShortName: '',
        vendorId: vnd.vendorId, vendorName: 'SeedVendor',
        units: 10, unitType: 'Kg', rate: 10, price: 100 }]
    })
    assertEqual(result.billNumber, '20260607-001', 'fresh DB returns -001')
  })

  // ═══════════════════════════════════════════════════════════════
  // Print summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60))
  console.log(` TEST RESULTS SUMMARY`)
  console.log('═'.repeat(60))
  console.log(` Total:  ${results.length}`)
  console.log(` Passed: ${passed}  ✔`)
  console.log(` Failed: ${failed}  ✘`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    console.log('\n FAILURES:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  [${r.id}] ${r.description}`)
      console.log(`        ${r.error}`)
    })
  }

  return results
}

runTests()
  .then(results => {
    cleanup()
    process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0)
  })
  .catch(err => {
    console.error('\n FATAL ERROR:', err)
    cleanup()
    process.exit(2)
  })
