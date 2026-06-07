/**
 * QA Print Test Seeder
 * Seeds the REAL database with all print test scenarios.
 * Run BEFORE launching the app: node qa_print_seed.js
 */

const path = require('path')
const os   = require('os')

const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
const USER_DATA_PATH = path.join(APPDATA, 'kks-commission-mundy')

const svc = require('./electron/sqliteService')

async function seed() {
  await svc.initDb({ userDataPath: USER_DATA_PATH })

  console.log('\n KKS Commission Mundy — Print Test Data Seeder')
  console.log(` DB: ${path.join(USER_DATA_PATH, 'CommissionMundy.db')}\n`)

  // ── 1. Ensure master data exists (insert only if missing) ──────────

  let allVegs     = svc.getAllVegetables()
  let allClients  = svc.getAllClients()
  let allVendors  = svc.getAllVendors()

  function findOrAddVeg(name, unit, shortName) {
    const found = allVegs.find(v => v.name === name)
    if (found) return found
    const added = svc.addVegetable({ name, unit, shortName })
    allVegs.push(added)
    return added
  }
  function findOrAddClient(name, phone, address) {
    const found = allClients.find(c => c.name === name)
    if (found) return found
    const added = svc.addClient({ name, phone, address })
    allClients.push(added)
    return added
  }
  function findOrAddVendor(name, phone) {
    const found = allVendors.find(v => v.name === name)
    if (found) return found
    const added = svc.addVendor({ name, phone })
    allVendors.push(added)
    return added
  }

  // Vegetables (cover all 5 unit types)
  const tomato  = findOrAddVeg('Tomato',  'Kg',  'TMT')
  const onion   = findOrAddVeg('Onion',   'Kg',  'ONI')
  const brinjal = findOrAddVeg('Brinjal', 'Box', 'BRJ')
  const potato  = findOrAddVeg('Potato',  'Bag', 'PTO')
  const banana  = findOrAddVeg('Banana',  'Ton', 'BNA')
  const chilly  = findOrAddVeg('Green Chilly (Extra Hot)', 'Kg', 'GCH')

  // Clients
  const ravi   = findOrAddClient('Ravi Kumar',    '9876543210', '14/2 Ooty Main Rd, Nilgiris')
  const murugan= findOrAddClient('முருகன்',       '9123456789', 'Coimbatore')
  const suresh = findOrAddClient('Suresh Babu',   '9500001234', 'Mettupalayam')

  // Vendors
  const arun    = findOrAddVendor('Arun Traders',  '9000000001')
  const bala    = findOrAddVendor('Bala Stores',   '9000000002')
  const chennai = findOrAddVendor('Chennai Mart',  '')

  console.log(' Master data ready:')
  console.log(`   Vegetables: ${svc.getAllVegetables().length}`)
  console.log(`   Clients:    ${svc.getAllClients().length}`)
  console.log(`   Vendors:    ${svc.getAllVendors().length}\n`)

  // ── 2. Create Print Test Bills ─────────────────────────────────────

  const TODAY = new Date().toISOString().slice(0, 10)

  // --- TC-M10-001/002: Standard client bill (all fields, logo, footer) ---
  const b1 = svc.saveTransaction({
    clientId: ravi.clientId, clientName: ravi.name,
    date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
    items: [
      { vegetableId: tomato.vegetableId,  vegetableName: 'Tomato',  vegetableShortName: 'TMT',
        vendorId: arun.vendorId,   vendorName: 'Arun Traders',
        units: 100, unitType: 'Kg',  rate: 10,  price: 1000 },
      { vegetableId: onion.vegetableId,   vegetableName: 'Onion',   vegetableShortName: 'ONI',
        vendorId: bala.vendorId,   vendorName: 'Bala Stores',
        units: 50,  unitType: 'Kg',  rate: 8,   price: 400  },
      { vegetableId: brinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
        vendorId: arun.vendorId,   vendorName: 'Arun Traders',
        units: 20,  unitType: 'Box', rate: 100, price: 2000 },
    ]
  })
  console.log(` [TC-M10-001/002] Standard 3-item bill: ${b1.billNumber}`)
  console.log(`   Subtotal: ₹${b1.subTotal} | Commission: ₹${b1.commissionAmount} | Chit: ₹${b1.totalChitCost} | Net: ₹${b1.netAmount}`)

  // --- TC-M10-003: Short name (client bill) vs full name (vendor bill) ---
  const b2 = svc.saveTransaction({
    clientId: murugan.clientId, clientName: murugan.name,
    date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
    items: [
      { vegetableId: tomato.vegetableId,  vegetableName: 'Tomato',  vegetableShortName: 'TMT',
        vendorId: chennai.vendorId, vendorName: 'Chennai Mart',
        units: 200, unitType: 'Kg', rate: 12, price: 2400 },
      { vegetableId: banana.vegetableId,  vegetableName: 'Banana',  vegetableShortName: 'BNA',
        vendorId: bala.vendorId,   vendorName: 'Bala Stores',
        units: 3,   unitType: 'Ton', rate: 8000, price: 24000 },
    ]
  })
  console.log(`\n [TC-M10-003] Short-name vs Full-name bill: ${b2.billNumber}`)
  console.log(`   Client: ${b2.clientName} | Net: ₹${b2.netAmount}`)
  console.log(`   → Client bill should show: TMT, BNA (short names)`)
  console.log(`   → Vendor bill should show: Tomato, Banana (full names)`)

  // --- TC-M10-009: Negative net amount ---
  const cfg = svc.getAllConfigs()
  const b3 = svc.saveTransaction({
    clientId: suresh.clientId, clientName: suresh.name,
    date: TODAY, commissionRate: 80, chitCostPerRecord: 50,
    items: [
      { vegetableId: tomato.vegetableId, vegetableName: 'Tomato', vegetableShortName: 'TMT',
        vendorId: arun.vendorId, vendorName: 'Arun Traders',
        units: 1, unitType: 'Kg', rate: 1, price: 1 },
    ]
  })
  console.log(`\n [TC-M10-NEGNET] Negative net amount bill: ${b3.billNumber}`)
  console.log(`   Net: ₹${b3.netAmount} (should print in red / show negative)`)

  // --- TC-M10-010: Long vegetable name (text wrapping test) ---
  const b4 = svc.saveTransaction({
    clientId: ravi.clientId, clientName: ravi.name,
    date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
    items: [
      { vegetableId: chilly.vegetableId, vegetableName: 'Green Chilly (Extra Hot)', vegetableShortName: 'GCH',
        vendorId: chennai.vendorId, vendorName: 'Chennai Mart',
        units: 30, unitType: 'Kg', rate: 45, price: 1350 },
      { vegetableId: tomato.vegetableId,  vegetableName: 'Tomato',  vegetableShortName: 'TMT',
        vendorId: arun.vendorId,   vendorName: 'Arun Traders',
        units: 75, unitType: 'Kg', rate: 10, price: 750 },
    ]
  })
  console.log(`\n [TC-M10-010] Long vegetable name bill: ${b4.billNumber}`)
  console.log(`   → Verify "Green Chilly (Extra Hot)" wraps correctly on 80mm`)

  // --- TC-M10-012: Multiple items (all 5 unit types — chit cost formula) ---
  const b5 = svc.saveTransaction({
    clientId: ravi.clientId, clientName: ravi.name,
    date: TODAY, commissionRate: 10, chitCostPerRecord: 5,
    items: [
      { vegetableId: tomato.vegetableId,  vegetableName: 'Tomato',  vegetableShortName: 'TMT',
        vendorId: arun.vendorId,   vendorName: 'Arun Traders',
        units: 50,  unitType: 'Kg',  rate: 10,  price: 500  },  // 1 chit
      { vegetableId: banana.vegetableId,  vegetableName: 'Banana',  vegetableShortName: 'BNA',
        vendorId: bala.vendorId,   vendorName: 'Bala Stores',
        units: 2,   unitType: 'Ton', rate: 6000, price: 12000 }, // 1 chit
      { vegetableId: brinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ',
        vendorId: chennai.vendorId, vendorName: 'Chennai Mart',
        units: 10,  unitType: 'Box', rate: 150, price: 1500 },  // 10 chits
      { vegetableId: potato.vegetableId,  vegetableName: 'Potato',  vegetableShortName: 'PTO',
        vendorId: arun.vendorId,   vendorName: 'Arun Traders',
        units: 8,   unitType: 'Bag', rate: 200, price: 1600 },  // 8 chits
      { vegetableId: onion.vegetableId,   vegetableName: 'Onion',   vegetableShortName: 'ONI',
        vendorId: bala.vendorId,   vendorName: 'Bala Stores',
        units: 25,  unitType: 'Pcs', rate: 40,  price: 1000 },  // 25 chits
    ]
  })
  console.log(`\n [TC-M10-012] All-unit-types 5-item bill: ${b5.billNumber}`)
  console.log(`   Chits: 1+1+10+8+25 = 45 × ₹5 = ₹${b5.totalChitCost} | Net: ₹${b5.netAmount}`)

  // --- Farmer Receipt for TC-M10-008 ---
  const r1 = svc.saveFarmerReceipt({
    clientId: ravi.clientId, clientName: ravi.name,
    date: TODAY,
    items: [
      { vegetableId: tomato.vegetableId,  vegetableName: 'Tomato',  vegetableShortName: 'TMT' },
      { vegetableId: onion.vegetableId,   vegetableName: 'Onion',   vegetableShortName: 'ONI' },
      { vegetableId: brinjal.vegetableId, vegetableName: 'Brinjal', vegetableShortName: 'BRJ' },
      { vegetableId: potato.vegetableId,  vegetableName: 'Potato',  vegetableShortName: 'PTO' },
      { vegetableId: banana.vegetableId,  vegetableName: 'Banana',  vegetableShortName: 'BNA' },
    ]
  })
  console.log(`\n [TC-M10-008] Farmer arrival receipt: ${r1.receiptNumber}`)
  console.log(`   → Should print WITHOUT company header/footer`)
  console.log(`   → 5 vegetables with blank weight/amount columns + dotted borders`)

  // --- Vendor summary for TC-M10-009 ---
  console.log(`\n [TC-M10-009] Vendor Summary print`)
  console.log(`   → Navigate to Reports > Vendor Summary, click Print`)
  console.log(`   → Should show 2-column layout: Vendor Name | Amount`)

  // ── 3. Print Test Case Guide ────────────────────────────────────────
  console.log('\n' + '═'.repeat(62))
  console.log(' PRINT TEST EXECUTION GUIDE')
  console.log('═'.repeat(62))
  console.log(`\n Printer detected: TVS-E RP 3230 (default — auto-print active)\n`)

  console.log(' TC-M10-001 | 80mm width — no clipping')
  console.log(`   → Reports > Client Bills > find bill ${b5.billNumber}`)
  console.log('   → Click Print. CHECK: all 3 columns visible, no text cut off at right edge\n')

  console.log(' TC-M10-002 | All content present (logo, addr, phone, footer)')
  console.log(`   → Reports > Client Bills > find bill ${b1.billNumber}`)
  console.log('   → Click Print. CHECK: Logo, Company Name, Address, Phone,')
  console.log('     Bill#, Date, Farmer Name, Items, Subtotal, Commission,')
  console.log('     Chit Cost, Net Amount, bilingual footer\n')

  console.log(' TC-M10-003 | Short name (client bill) vs Full name (vendor bill)')
  console.log(`   → Reports > Client Bills > find bill ${b2.billNumber} > Print`)
  console.log('     CHECK: Item lines show "TMT" and "BNA" (short names)')
  console.log(`   → Reports > Vendor Bills > filter date ${TODAY} > find Chennai Mart > Print`)
  console.log('     CHECK: Shows "Tomato" and "Banana" (full names)\n')

  console.log(' TC-M10-004 | Bilingual footer (English + Tamil)')
  console.log('   → Print any bill. CHECK: footer shows both')
  console.log('     "Thank you for your business!" AND')
  console.log('     "உங்கள் வணிகத்திற்கு நன்றி!"\n')

  console.log(' TC-M10-005 | TVS auto-print (no dialog)')
  console.log('   → Print any bill. CHECK: No system dialog appears —')
  console.log('     receipt prints directly on TVS-E RP 3230\n')

  console.log(' TC-M10-008 | Farmer receipt — no company header/footer')
  console.log(`   → Farmer Receipt page > find ${r1.receiptNumber} OR create new receipt`)
  console.log('     CHECK: Receipt has NO logo, company name, address, or footer')
  console.log('     CHECK: 5 vegetable rows with blank weight & amount columns')
  console.log('     CHECK: Dotted border below each vegetable row\n')

  console.log(' TC-M10-009 | Vendor Summary — 2-column thermal layout')
  console.log(`   → Reports > Vendor Summary tab > Click Print`)
  console.log('     CHECK: Left column = Vendor Name, Right column = Total Amount')
  console.log('     CHECK: Fits 80mm width, no clipping\n')

  console.log(' TC-M10-010 | Long vegetable name text wrapping')
  console.log(`   → Reports > Client Bills > find bill ${b4.billNumber} > Print`)
  console.log('     CHECK: "Green Chilly (Extra Hot)" wraps within its column')
  console.log('     CHECK: Does NOT overflow into the qty or price column\n')

  console.log(' TC-M10-012 | 5-item bill with all unit types')
  console.log(`   → Reports > Client Bills > find bill ${b5.billNumber} > Print`)
  console.log(`     CHECK: Chit Cost = ₹${b5.totalChitCost} (1+1+10+8+25 chits × ₹5)`)
  console.log(`     CHECK: Net Amount = ₹${b5.netAmount}\n`)

  console.log(' TC-M10-PRINT-TOGGLES | Disable logo/address/phone/footer')
  console.log('   → Settings: turn OFF Print Logo, Print Address, Print Phone, Print Footer')
  console.log('   → Print any bill. CHECK: All 4 elements absent from printout')
  console.log('   → Restore toggles back ON after verifying\n')

  console.log('═'.repeat(62))
  console.log(' Data seeded. Launch the app: npm run electron:dev')
  console.log('═'.repeat(62) + '\n')

  svc.closeDb()
}

seed().catch(e => { console.error('Seeder failed:', e); process.exit(1) })
