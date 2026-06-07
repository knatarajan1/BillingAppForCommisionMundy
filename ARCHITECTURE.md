# KKS Commission Mundy — Architecture

**Version:** 2.5.5 | **Stack:** Electron 28 · React 18 · SQLite (sql.js WASM) · Tailwind CSS 3 · Vite 5

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Electron Shell                              │
│                                                                      │
│   ┌──────────────────────┐   IPC    ┌──────────────────────────┐   │
│   │    Main Process      │◄────────►│    Renderer Process      │   │
│   │    (Node.js)         │          │    (React 18 + Vite 5)   │   │
│   │                      │          │                          │   │
│   │  electron/main.js    │          │  src/App.jsx             │   │
│   │  ├─ createWindow()   │          │  ├─ pages/               │   │
│   │  ├─ IPC handlers     │          │  ├─ components/          │   │
│   │  └─ dialog API       │          │  └─ lib/                 │   │
│   │                      │          └──────────────────────────┘   │
│   │  electron/           │                                          │
│   │  sqliteService.js    │   ┌──────────────────────────────────┐  │
│   │  ├─ initDb()         │   │  SQLite (sql.js WASM)            │  │
│   │  ├─ CRUD ops         │──►│  %APPDATA%/kks-commission-mundy/ │  │
│   │  ├─ clearAllData()   │   │  CommissionMundy.db              │  │
│   │  └─ getDbPath()      │   │  backups/CommissionMundy_*.db    │  │
│   │                      │   └──────────────────────────────────┘  │
│   │  electron/preload.js │                                          │
│   │  └─ contextBridge    │                                          │
│   └──────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
App.jsx
│  Loads config (language, logo, theme) → wraps in <LanguageProvider>
│
└── Layout.jsx
    ├── Sidebar.jsx          (logo + translated nav labels from LanguageContext)
    └── <Outlet>
        ├── Billing.jsx
        │   ├── SmartSelect  (client / vegetable / vendor)
        │   │   └── TamilInput  (inline add forms)
        │   ├── Unit select  (translated via units.js)
        │   ├── Receipt banner  (auto-loads items from FarmerReceipts when client selected)
        │   └── ClientBillPrint  (logo shown if print_logo_in_bill=1)
        │
        ├── FarmerReceipt.jsx       (NEW v2.3)
        │   ├── Select farmer + date
        │   ├── Add items: vegetable name only (weight/amount filled by auctioneer)
        │   ├── Save → RCPT-YYYYMMDD-NNN receipt number (resets to 001 daily)
        │   ├── FarmerReceiptPrint  (4-col: S.No | Vegetable | Weight-blank | Amount-blank)
        │   └── Date receipt list (click any to reprint)
        │
        ├── Vegetables.jsx ──► MasterPage ──► TamilInput (name, unit)
        ├── Clients.jsx    ──► MasterPage ──► TamilInput (name, phone, address)
        ├── Vendors.jsx    ──► MasterPage ──► TamilInput (name, phone, address)
        │
        ├── CashDrawer.jsx          (NEW v2.2, hardened v2.2.1)
        │   ├── Date picker → load CashDrawer record
        │   ├── Summary cards ONLY when hasRecord=true (no zero-data shown for unsaved dates)
        │   ├── Opening amount input + Save (Enter key supported)
        │   ├── Reset button (red, only shown when record exists) → sets opening to ₹0
        │   └── Info banner for dates with no opening amount saved
        │
        ├── VendorPayments.jsx      (NEW v2.2, edge-cases v2.2.1)
        │   ├── Date picker → load vendor bills from TransactionItems
        │   ├── Unsaved-changes guard: confirmation before switching date
        │   ├── isStale banner: when stored paid > current bill (bill was reduced)
        │   ├── Per-row: inline validation, rounding on blur, "Pay in full" shortcut
        │   ├── All-settled success banner
        │   └── Save blocked when any row has a validation error
        │
        ├── Reports.jsx
        │   ├── Tabs: Farmer Bills | Vendor Bills | Vendor Summary
        │   │         Cash Drawer (NEW) | Vendor Payments (NEW)
        │   ├── Translated unit labels in tables
        │   ├── ClientBillPrint / VendorBillPrint / VendorSummaryPrint
        │   ├── CashDrawerReport: date range → daily opening/paid/closing
        │   ├── VendorPaymentReport: vendor filter → cumulative pending
        │   └── (logo shown if print_logo_in_bill=1)
        │
        └── Settings.jsx
            ├── Language selector (en / ta)
            ├── App Logo (upload, reset, print-logo toggle)
            ├── Theme colour
            ├── Company details (TamilInput fields)
            ├── Billing settings (number inputs, no transliteration)
            └── Danger Zone (Clear All Data + auto backup)
```

---

## IPC Channel Map

| Channel | Handler | Description |
|---------|---------|-------------|
| `config:getAll` | `db.getAllConfigs()` | Load all settings as key-value map |
| `config:update` | `db.updateConfig()` | UPSERT a single config key |
| `vegetables:getAll/add/update/delete` | sqliteService | Vegetable CRUD |
| `clients:getAll/add/update/delete` | sqliteService | Farmer CRUD |
| `vendors:getAll/add/update/delete` | sqliteService | Vendor CRUD |
| `transactions:save` | `db.saveTransaction()` | Atomic bill save (BEGIN/COMMIT) |
| `transactions:update` | `db.updateTransaction()` | Edit existing bill: delete+reinsert items, recalculate totals |
| `transactions:reverse` | `db.reverseTransaction()` | Set status='reversed'; bill excluded from all summaries |
| `transactions:getClientBills` | sqliteService | Bills filtered by client/date (all statuses returned) |
| `transactions:getVendorBills`   | sqliteService | Vendor items grouped by vendor/date (reversed excluded) |
| `transactions:getVendorSummary` | sqliteService | SUM(price) per vendor, HAVING > 0, optional date range (reversed excluded) |
| `cashDrawer:getByDate` | `db.getCashDrawerByDate()` | Opening + computed closing for a date |
| `cashDrawer:saveOpening` | `db.saveCashDrawerOpening()` | Insert/update opening amount for a date |
| `cashDrawer:reset` | `db.resetCashDrawer()` | Set opening_amount=0 for a date |
| `cashDrawer:getHistory` | `db.getCashDrawerHistory()` | All cash drawer records for a date range |
| `vendorPayments:getByDate` | `db.getVendorBillsByDate()` | Vendor bills from TransactionItems + existing payments; returns `isStale` flag when stored paid > current bill |
| `vendorPayments:save` | `db.saveVendorPayments()` | Bulk upsert; re-fetches live bill from TransactionItems; rejects if paid > live bill |
| `vendorPayments:report` | `db.getVendorPaymentReport()` | Cumulative bill (from TransactionItems) / paid (from VendorPayments) / pending per vendor — includes vendors with no payment record yet |
| `vendorPayments:detail` | `db.getVendorPaymentDetail()` | Per-date detail for a vendor — bill from TransactionItems, paid from VendorPayments LEFT JOIN |
| `farmerReceipts:save` | `db.saveFarmerReceipt()` | Atomic save of receipt + items; auto-generates RCPT-YYYYMMDD-NNN number (resets daily) |
| `farmerReceipts:getByDate` | `db.getFarmerReceiptsByDate()` | All receipts (with items) for a date |
| `farmerReceipts:getByClient` | `db.getFarmerReceiptsByClient()` | Receipts for a client, optionally filtered by date |
| `farmerReceipts:getById` | `db.getFarmerReceiptById()` | Single receipt with items |
| `db:clearData` | `db.clearAllData()` | Backup DB then DELETE FROM all data tables |
| `db:getPath` | `db.getDbPath()` | Return DB file path for diagnostics |
| `app:pickLogo` | `dialog.showOpenDialog()` | File picker → returns base64 data URL |
| `print:bill` | `mainWindow.print()` | Trigger browser print dialog |

---

## Language & Transliteration

```
LanguageContext  (React Context — lives at App root)
├── lang / setLang     'en' | 'ta'
├── t(key)             looks up translations[lang][key]
├── logo / setLogo     base64 data URL | null
└── Consumed by: Sidebar, all pages, MasterPage, BillPrint, TamilInput

TamilInput.jsx  (drop-in <input>/<textarea> replacement)
│
├── English mode  (lang ≠ 'ta' or type ∈ {number, tel, date})
│       → transparent pass-through, zero overhead
│
└── Tamil mode  (lang = 'ta', text fields only)
        state: baseTamil + engBuffer
        onKeyDown  → builds engBuffer, emits transliterate(engBuffer)
        Backspace  → removes last English char from engBuffer
                     OR removes last Tamil grapheme from baseTamil
        Space/Enter → commits engBuffer to baseTamil
        Selection  → Backspace/Delete removes selected range
        Ctrl+X     → browser copies; rAF deletes the selection
        onPaste    → appends plain text to baseTamil (no transliteration)
        Direct Tamil OS keyboard → chars pass through as-is (type 'O')

transliterate.js  (phonetic engine)
Tokenise → [C, V, O] tokens using greedy longest-match
Render   → C+V → (consonant+mark), C alone → (consonant+்), V alone → standalone

Consonant map highlights:
  N→ண  T→ட  L→ள  R→ற  S→ஸ   (uppercase, case-sensitive)
  ng→ங  zh→ழ  sh→ஷ  th→த  ch→ச  rr→ற  ll→ள  nn→ண  tt→ட  ksh→க்ஷ
  j→ஜ  h→ஹ  (Grantha/Vada Mozhi)

Vowel map: a→அ  aa→ஆ  i→இ  ii/ee→ஈ  u→உ  uu/oo→ஊ  e→எ  ae→ஏ
           ai→ஐ  o→ஒ  oa→ஓ  au→ஔ
```

---

## Database Schema

```sql
Config (key PK, value, label, updated_at)
  Keys: company_name, company_address, company_phone,
        commission_rate, chit_cost_per_record, bill_prefix (retired — no longer used for number generation),
        currency_symbol, theme_color, app_language,
        custom_logo_data, print_logo_in_bill

Vegetables     (vegetable_id PK, name, unit, created_at)
Clients        (client_id PK, name, phone, address, created_at)
Vendors        (vendor_id PK, name, phone, address, created_at)

-- NEW in v2.3 --

FarmerReceipts (receipt_id PK, receipt_number UNIQUE, client_id, client_name,
                date, created_at)
  receipt_number format: RCPT-YYYYMMDD-NNN  e.g. RCPT-20260531-001 (resets to 001 each day)

FarmerReceiptItems (item_id PK, receipt_id FK, receipt_number,
                    vegetable_id, vegetable_name, created_at)
  No weight/price columns — weight and amount are filled manually by the auctioneer on the printed slip
  Migration v2.3.1: units and unit_type columns dropped from existing databases on startup

Indexes: idx_freceipt_client, idx_freceipt_date, idx_frecitem_receipt

Transactions   (transaction_id PK, bill_number TEXT — format YYYYMMDD-NNN e.g. 20260531-001 resets daily, client_id, client_name, date,
                sub_total, commission_rate, commission_amount,
                chit_cost_per_record, item_count, total_chit_cost, net_amount,
                created_at,
                status TEXT DEFAULT 'active')  ← NEW v2.4.0; values: 'active' | 'reversed'
  Migration v2.4.0: ALTER TABLE ADD COLUMN status (PRAGMA table_info check guards against double-add)

TransactionItems (item_id PK, transaction_id FK, bill_number,
                  vegetable_id, vegetable_name, vendor_id, vendor_name,
                  units, unit_type, rate, price, date)

-- NEW in v2.2 --

CashDrawer     (drawer_id PK, date UNIQUE, opening_amount,
                created_at, updated_at)
  closing_amount is computed: opening_amount − SUM(Transactions.net_amount WHERE date=date)

VendorPayments (payment_id PK, vendor_id, vendor_name, bill_date,
                bill_amount, paid_amount,
                created_at, updated_at,
                UNIQUE(vendor_id, bill_date))
  pending_amount is computed: bill_amount − paid_amount

Indexes: idx_txn_date, idx_txn_client, idx_item_txn, idx_item_vendor, idx_item_date,
         idx_cash_date, idx_vpay_vendor, idx_vpay_date
```

---

## Distribution Package

```
KKS-Commission-Mundy-v2-Windows/
├── 64-bit/
│   ├── KKS Commission Mundy.exe   ← Electron 28 x64; PE resources stamped by scripts/stamp-exe.js
│   └── resources/app.asar         ← packed bundle (dist/ + electron/ + sql.js + uuid)
└── 32-bit/
    ├── KKS Commission Mundy.exe   ← Electron 28 ia32; PE resources stamped by scripts/stamp-exe.js
    └── resources/app.asar         ← identical JS (arch-independent)

app.asar contents:
  dist/               Vite build (JS bundle + CSS + HTML)
  electron/           main.js · preload.js · sqliteService.js
  node_modules/sql.js WASM SQLite engine
  node_modules/uuid   UUID generation
  public/icon.ico
  package.json · index.html

Exe version stamping (scripts/stamp-exe.js):
  Uses rcedit (devDependency) to write PE version resources into both exe files.
  Fields set: ProductVersion, FileVersion, ProductName, FileDescription,
              CompanyName, LegalCopyright, Comments (build date).
  Run: npm run stamp   (after packing the asar)
```

---

## Thermal Receipt Print (80mm / TVS RP 3230)

```
Electron print: webContents.print({ silent, printBackground, pageSize, margins })
  pageSize: { width: 80000, height: 600000 } (microns = 80mm × 600mm) — REQUIRED.
  Without this, silent print renders at the window viewport width (~1366px) instead of 80mm,
  clipping all right-side flex/table content off the 80mm paper.
  margins: { marginType: 'none' } — visual margins handled by #print-area padding.

Print isolation (BillPrint.jsx → PrintModal):
  createPortal(<div id="print-area">, document.body)
  → makes #print-area a DIRECT <body> child so CSS can target it independently.
  CSS: body > *:not(#print-area) { display:none } hides the React app tree (#root)
  without suppressing #print-area — avoids the Chromium print-pipeline blank-output
  bug that occurs when position:fixed children inherit display:none from a parent.

CSS:
  @page { size: 80mm auto; margin: 0; }   ← margins moved into #print-area padding
  #print-area { width: 80mm; padding: 2mm 10mm 2mm 4mm; box-sizing: border-box; position: fixed; }
  Content area: 66mm wide (80mm − 4mm left − 10mm right)
  Right edge at 70mm — 2mm inside the TVS RP 3230 physical printable boundary (~72mm from left)
  Evidence: v2.4.2 used 5mm right padding (content to 75mm); physical print clipped ~3mm from right on all right-aligned values
  table { table-layout: fixed }            ← prevents any column overflowing 72mm

Receipt layout (.rcp class):
  [LOGO 28px]  Company Name          ← flex-direction: row; logo top-left
               Address / Phone
  ─────────────────── (dashed border-top)
  Bill: 20260530-001     Date: 2026-05-30
  Farmer: Name
  ─────────────────── (dashed border-top)
  Vegetable name   | 5 Kg   | ₹50.00   ← 3-col (no headers): 48% | 22% | 30%
                   | @₹10  |          ← rate sub-line in qty column
  ─────────────────── (dashed border-top)
  Subtotal:              ₹80.00
  Commission:          − ₹ 8.00
  Chit Cost:           − ₹10.00
  ════════════════════ (solid border-top)
  NET PAYABLE:           ₹62.00
  ════════════════════
       Thank you for your business!
       உங்கள் வணிகத்திற்கு நன்றி!
       Visit Again! | மீண்டும் வாருங்கள்!   ← bilingual always, regardless of UI language

Font: Arial / Latha / Noto Sans Tamil (NO monospace — Tamil chars break in Courier New)
Separators: CSS border-top (NOT ─────.repeat(72) — overflows narrow paper)
Logo: top-left via flex-direction:row; controlled by print_logo_in_bill config (default: 1)
```

### Config keys affecting print

| Key | Default | Effect |
|-----|---------|--------|
| `print_logo_in_bill` | `'1'` | Show custom logo at top-left of receipt when a logo is uploaded |
| `company_name` | `'KKS Commission Mundy'` | Printed beside logo |
| `company_address` | `''` | Printed below company name (omitted if empty) |
| `company_phone` | `''` | Printed below address (omitted if empty) |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| sql.js (WASM SQLite) | No native compilation — no Python/MSVC required on target machines |
| Logo stored as base64 in Config | No file-path issues inside asar; fully portable across machines |
| `baseTamil + engBuffer` dual-state | Backspace removes one English char at a time; direct Tamil OS keyboard input passes through unchanged |
| Atomic bill save | `BEGIN/COMMIT/ROLLBACK` prevents partial writes on crash or power loss |
| UPSERT for config | `INSERT … ON CONFLICT DO UPDATE` — config updates are idempotent |
| Only runtime node_modules in asar | Keeps asar at ~18.7 MB; devDependencies (Vite, electron-builder) excluded |
| Greedy longest-match transliteration | Multi-char patterns (`ng`, `sh`, `ksh`) matched before single chars; no ambiguity |
| SmartSelect passes full object as 3rd arg to `onChange` | Prevents stale-closure bugs when a new entity is added inline: the full object (including `unit` for vegetables) is available immediately without waiting for React state to re-render after `setVegetables()` |
| Chit cost formula: count-based units use qty | For Kg/Ton items: 1 chit per line; for Box/Bag/Pcs: qty × chit rate. Both `saveTransaction` and `updateTransaction` use `calcChitCost()` helper. Billing.jsx preview uses the same formula. |
| Reversed bills via status column, not DELETE | Keeps audit trail; soft-delete pattern. All summaries (vendor, cash drawer, totals) JOIN Transactions and filter `status != 'reversed'`. `getClientBills` returns all including reversed so UI can show them with badge. |
| TVS printer auto-selection | `getPrintersAsync()` scans for a printer name containing 'tvs' (case-insensitive). If found: `silent:true + deviceName`; else falls back to system dialog. Print IPC returns `{ok, error}` so UI can auto-close on success. |

---

## Changelog

### v2.5.5 — Farmer receipt: remove column header row

**Changes:**
- Removed the `<thead>` block (Vegetable / Weight / Price labels) from `FarmerReceiptPrint`.
- Column widths (55% / 22% / 23%) preserved via a `<colgroup>` so the body layout is unchanged.

**No DB changes.**

---

### v2.5.4 — Farmer receipt table body font size +2pt

**Changes:**
- Added `rcp--farmer-receipt` CSS class scoped to `FarmerReceiptPrint` only.
- Table column-header row: 8px → 10px (screen inline style); print override: 11pt via `.rcp--farmer-receipt table`.
- Table item rows: 9px → 11px (screen inline style); same print override covers body rows.
- Meta rows (receipt#, date, client name) are `rcp-kv` elements and unchanged at 9pt.
- Applied in both screen preview (inline styles + screen class) and `@media print` (class override at 11pt).

**No DB changes.**

---

### v2.5.3 — Vendor bill qty column alignment fix

**Changes:**
- Added `rcp--vendor-bill` CSS class scoped to `VendorBillPrint` only.
- Qty column widened 22% → 28% and switched to `text-align: center` — the stacked qty+unit / `@ rate` now reads clearly in a centered column between the left-aligned vegetable name and right-aligned price.
- Vegetable name column adjusted 48% → 42%; price column unchanged at 30%.
- Applied in both screen (preview modal) and `@media print` CSS so preview and printed output match.
- ClientBillPrint (`.rcp--short`) and FarmerReceiptPrint (inline `th` widths) are unaffected.

**No DB changes.**

---

### v2.5.2 — Larger print font for vendor bill and farmer receipt

**Changes:**
- Increased all print font sizes by +2pt for **VendorBillPrint** and **FarmerReceiptPrint** (use base `.rcp` class): base 7pt→9pt, co-name 8pt→10pt, all body/meta/row/table 7pt→9pt, col-hdr/item-sub 6pt→8pt, net payable 9pt→11pt, footer 7pt→9pt.
- **ClientBillPrint** unchanged — it uses `.rcp--short` which overrides with the same 9pt/10pt tier, and its column widths remain (38%/26%/36%).

**No DB changes.**

---

### v2.5.1 — Hardcode vegetable name per bill type (remove config toggle)

**Changes:**
1. **Farmer bill (Client Bill) always prints short name** — `ClientBillPrint` now always uses `vegetableShortName` (falling back to `vegetableName` if no short name set). The `rcp--short` CSS class is permanently applied for this bill type.
2. **Vendor bill and Farmer receipt always print full name** — `VendorBillPrint` and `FarmerReceiptPrint` now always render `vegetableName`. The `rcp--short` class is not applied to these prints.
3. **"Vegetable name format" setting removed** — The Full/Short toggle in Settings → Print Options is gone. The `print_vegetable_name` Config key is deleted from existing databases on first run.

**DB changes:**
- `Config` — `print_vegetable_name` row removed via migration on startup.

---

### v2.5.0 — Print toggles (address/phone/footer), vegetable short name

**New features:**
1. **Print options in Settings** — Three new toggles under a "Print Options" card in Settings:
   - *Print company address* (default on) — shows/hides address line on all bill and receipt headers
   - *Print company phone* (default on) — shows/hides phone line on all bill and receipt headers
   - *Print footer message* (default on) — shows/hides "Thank you / Visit Again" on all printed bills
2. **Vegetable short name** — New "Short Name" field on every Vegetable (optional, e.g. "TMT" for Tomato). Displayed as a column in the Vegetables list. Inline-add form in Billing and FarmerReceipt also includes the short name field.
3. **Short name stored in transaction history** — `vegetable_short_name` persisted on `TransactionItems` and `FarmerReceiptItems` at bill-save time so reprinted historical bills use the name that was current when the bill was recorded.

**DB changes:**
- `Vegetables` — added `short_name TEXT NOT NULL DEFAULT ''`
- `TransactionItems` — added `vegetable_short_name TEXT NOT NULL DEFAULT ''`
- `FarmerReceiptItems` — added `vegetable_short_name TEXT NOT NULL DEFAULT ''`
- `Config` — 3 new default rows: `print_address_in_bill`, `print_phone_in_bill`, `print_footer_in_bill`

---

### v2.4.3 — Right-side truncation root fix, compact body fonts, farmer receipt S.No removed

**Bug fixes / improvements:**
1. **Right-side truncation permanently fixed** — Physical evidence (v2.4.2 photo): content right-edge was at 75mm on an 80mm page; printer physically clips ~3mm from the right, so printable area ends at ~72mm. Right padding increased from 5mm to **10mm** → content area is now 66mm wide, right edge at 70mm (2mm clear of the physical print boundary). All right-aligned values (bill number, date, vendor name, phone, prices, totals) now print in full.
2. **Compact body fonts** — All print font sizes reduced 1pt: base 9pt→7pt; co-name 9pt→8pt; co-sub/kv/meta/row/table 8pt→7pt; net payable 10pt→9pt. Receipt height approximately 30% shorter.
3. **Farmer receipt: S.No column removed** — The serial number column (8% width) is removed from FarmerReceiptPrint. Vegetable name column width increased from 47% to 55%, giving more room for the vegetable name and the blank dotted vendor-name writing line.

**No DB changes.**

---

### v2.4.2 — Receipt print truncation & header compactness

**Bug fixes / improvements:**
1. **Right-side clipping fixed** — Added `.rcp-kv { font-size: 8pt !important }` and `.rcp-co-sub { font-size: 8pt !important }` print overrides (both were missing — their screen CSS values bypassed all inherited print rules, making vendor name, phone, and date render too wide). Also increased `#print-area` right padding from `4mm` to `5mm` to keep right-aligned values safely within the printer's physical printable area.
2. **Decimal values no longer truncated** — The price column content (`₹200.00`, `₹430.00`) was being cut to `₹200.` and `₹430.` due to overflow into the printer's non-printable right margin. Fixed by the right-padding increase above combined with overall font-size reduction.
3. **Smaller, more compact header** — Logo reduced from 40px → 28px; company name font-size screen 14px → 12px, print 11pt → 9pt; all body print fonts reduced one step (9pt → 8pt base, 11pt → 10pt net-payable). Header gap 8px → 4px. Receipt is visibly shorter.

**No DB changes.**

---

### v2.4.1 — Print fix, farmer receipt vendor space, Tamil search

**Bug fixes / improvements:**
1. **Silent print pageSize (critical)** — `webContents.print()` now always includes `pageSize: { width: 80000, height: 600000 }` and `margins: { marginType: 'none' }`. Without `pageSize`, silent TVS prints rendered at window width (1366px), clipping vendor names, qty, prices, and all right-side flex values off the 80mm paper.
2. **Farmer receipt vendor-name space** — Added a dotted writing line (8px gap + 1px dotted border) below each vegetable name in FarmerReceiptPrint. The auctioneer can now write the vendor name in that space on the printed slip.
3. **SmartSelect Tamil search** — The dropdown search input now uses `TamilInput` instead of `<input>`, enabling Tamil phonetic typing to filter options in Tamil UI mode.

---

### v2.4.0 — Edit/Reverse bills, TVS auto-print, qty-based chit cost, SmartSelect combobox

**Features:**
1. **Edit & Reverse bills** — Reports › Client Bills now has Edit (pencil) and Reverse buttons per bill. Edit opens a full modal pre-filled with existing items; on save it calls `transactions:update` (atomic delete+reinsert items) and auto-prints the updated bill. Reverse sets `status='reversed'`; reversed bills are shown with a red REVERSED badge and excluded from all summaries/totals (vendor bills, vendor summary, cash drawer, vendor payments).
2. **TVS auto-select print** — `print:bill` IPC scans `getPrintersAsync()` for a printer containing 'tvs' in the name. If found: prints silently without dialog. Falls back to system dialog otherwise. Print modal auto-closes on success.
3. **Qty-based chit cost** — For Kg/Ton items: 1 chit per line. For count-based (Box/Bag/Pcs): chit count = quantity. New `calcChitCost()` helper in sqliteService used by both `saveTransaction` and `updateTransaction`. Billing.jsx preview updated accordingly.
4. **SmartSelect searchable combobox** — All dropdowns (client, vegetable, vendor) replaced with a searchable combobox: click to open, type to filter, keyboard navigate (↑↓ Enter Esc), inline Add New form at bottom.
5. **Farmer receipt stripped** — FarmerReceiptPrint no longer shows company header or footer. Only receipt number, date, farmer name, and 4-col item table.
6. **Vendor name in client bill** — ClientBillPrint items table changed from 3-col to 4-col (Vegetable | Vendor | Qty+Rate | Price).

**DB changes:** `ALTER TABLE Transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'active'` (migration v2.4.0, guarded by PRAGMA table_info check).

---

### v2.3.2 — Inline-add stale-closure fix
**Bug:** Adding a vegetable (or vendor/client) via the SmartSelect inline form resulted in an empty vegetable name on the FarmerReceipt and wrong unit type in Billing for the very first record of that entity. Root cause was a React stale-closure: `loadAll()` calls `setVegetables()` which schedules a re-render, but the `vegetables` array in the current closure is still the old one when `onChange` fires immediately after.

**Fix (no DB changes):**
- `SmartSelect.jsx` — `onChange` now receives a 3rd argument: the full entity object (`opt` for existing selections, `added` for inline-adds, `dup` for duplicate matches). This gives all consumers direct access to any field without a state lookup.
- `FarmerReceipt.jsx` — `setVegetable(idx, id, name)` now uses the `name` parameter passed from SmartSelect directly, removing the stale `vegetables.find()` call entirely.
- `Billing.jsx` — vegetable `onChange` now reads `unitType` from `obj.unit` (3rd arg) instead of `vegetables.find()`, fixing incorrect unit type for newly-added vegetables.
