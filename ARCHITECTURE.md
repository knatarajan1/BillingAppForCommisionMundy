# KKS Commission Mundy — Architecture

**Version:** 2.1.8 | **Stack:** Electron 28 · React 18 · SQLite (sql.js WASM) · Tailwind CSS 3 · Vite 5

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
        │   └── ClientBillPrint  (logo shown if print_logo_in_bill=1)
        │
        ├── Vegetables.jsx ──► MasterPage ──► TamilInput (name, unit)
        ├── Clients.jsx    ──► MasterPage ──► TamilInput (name, phone, address)
        ├── Vendors.jsx    ──► MasterPage ──► TamilInput (name, phone, address)
        │
        ├── Reports.jsx
        │   ├── Translated unit labels in tables
        │   ├── ClientBillPrint / VendorBillPrint / VendorSummaryPrint
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
| `transactions:getClientBills` | sqliteService | Bills filtered by client/date |
| `transactions:getVendorBills`   | sqliteService | Vendor items grouped by vendor/date |
| `transactions:getVendorSummary` | sqliteService | SUM(price) per vendor, HAVING > 0, optional date range |
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
        commission_rate, chit_cost_per_record, bill_prefix,
        currency_symbol, theme_color, app_language,
        custom_logo_data, print_logo_in_bill

Vegetables     (vegetable_id PK, name, unit, created_at)
Clients        (client_id PK, name, phone, address, created_at)
Vendors        (vendor_id PK, name, phone, address, created_at)

Transactions   (transaction_id PK, bill_number, client_id, client_name, date,
                sub_total, commission_rate, commission_amount,
                chit_cost_per_record, item_count, total_chit_cost, net_amount,
                created_at)

TransactionItems (item_id PK, transaction_id FK, bill_number,
                  vegetable_id, vegetable_name, vendor_id, vendor_name,
                  units, unit_type, rate, price, date)

Indexes: idx_txn_date, idx_txn_client, idx_item_txn, idx_item_vendor, idx_item_date
```

---

## Distribution Package

```
KKS-Commission-Mundy-v2-Windows/
├── 64-bit/
│   ├── KKS Commission Mundy.exe   ← Electron 28 x64
│   └── resources/app.asar         ← ~18.7 MB packed bundle
└── 32-bit/
    ├── KKS Commission Mundy.exe   ← Electron 28 ia32
    └── resources/app.asar         ← identical JS (arch-independent)

app.asar contents:
  dist/               Vite build (JS bundle + CSS + HTML)
  electron/           main.js · preload.js · sqliteService.js
  node_modules/sql.js WASM SQLite engine
  node_modules/uuid   UUID generation
  public/icon.ico
  package.json · index.html
```

---

## Thermal Receipt Print (80mm / TVS RP 3230)

```
Electron print: webContents.print({ silent:false, printBackground:true })
  → no pageSize/margins needed; @page { size:80mm auto } handles the canvas width.

Print isolation (BillPrint.jsx → PrintModal):
  createPortal(<div id="print-area">, document.body)
  → makes #print-area a DIRECT <body> child so CSS can target it independently.
  CSS: body > *:not(#print-area) { display:none } hides the React app tree (#root)
  without suppressing #print-area — avoids the Chromium print-pipeline blank-output
  bug that occurs when position:fixed children inherit display:none from a parent.

CSS:
  @page { size: 80mm auto; margin: 0; }   ← margins moved into #print-area padding
  #print-area { width: 80mm; padding: 2mm 4mm; box-sizing: border-box; position: fixed; }
  Content area: 72mm wide (80mm − 4mm left padding − 4mm right padding)
  table { table-layout: fixed }            ← prevents any column overflowing 72mm

Receipt layout (.rcp class):
  [LOGO 40px]  Company Name          ← flex-direction: row; logo top-left
               Address / Phone
  ─────────────────── (dashed border-top)
  Bill: BILL-0001     Date: 2026-05-30
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
