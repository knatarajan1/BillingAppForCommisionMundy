# KKS Commission Mundy

Agricultural Commission Management Desktop Application — v2.5.5

## Overview

KKS Commission Mundy is a Windows desktop app (Electron + React) for managing agricultural commission transactions. It tracks farmers, vendors, vegetables, and generates bills with automatic commission and chit cost calculations.

**v2.3.1 changes:**
- **Daily bill numbering** — Bill numbers now follow `YYYYMMDD-NNN` format (e.g. `20260531-001`) and reset to `001` each calendar day. The old `bill_prefix` setting is retired.
- **Daily receipt numbering** — Farmer Receipt numbers now follow `RCPT-YYYYMMDD-NNN` format and reset to `001` each day.
- **Vendor Payment Report fix** — All vendors with bills now appear in the Vendor Payment Report immediately after billing, even before any payment is recorded.

**v2.3 changes (new features):**
- **Farmer Receipt / Produce Arrival Slip (விவசாயி ரசீது)** — dedicated page to register produce a farmer brings before billing. Enter vegetable + approx qty + unit; generates a numbered receipt (RCPT-0001…) printed with blank rate/price columns for the auctioneer to fill manually.
- **Billing auto-load** — when a farmer is selected in Billing, any pending receipt for that farmer/date appears as a one-click banner to pre-fill the vegetable list (rate & price left blank for the operator to enter).
- **Independent of cash drawer** — receipts have no monetary values; cash drawer is completely unaffected.
- **Clear All Data** now also clears FarmerReceipts and FarmerReceiptItems.

**v2.2 changes (new features):**
- **Cash Drawer Management (பண இருப்பு மேலாண்மை)** — set opening cash amount per day, auto-deducts bills paid, shows live closing balance, reset button with warning, date navigation
- **Vendor Bill Management (வியாபாரி தொகை மேலாண்மை)** — select a date, see all vendor bills, enter paid amount per vendor, track pending amounts cumulatively in database
- **Cash Drawer Report** — new tab in Reports showing daily opening / bills paid / closing balance for any date range
- **Vendor Payment Report** — new tab in Reports showing cumulative bill / paid / pending amounts per vendor

**v2.1 changes from v2.0:**
- **Tamil language support** — switch the entire UI to Tamil via Configuration tab
- **Tamil phonetic input** — type English phonetics (e.g. `thakkali`) and see Tamil Unicode live (தக்காளி)
- **Dropdown values translated** — unit type options and all table values shown in Tamil when Tamil mode is active
- **Bill print translated** — print receipts in Tamil when Tamil mode is active
- **App logo customisation** — upload a custom PNG/JPG logo via Configuration; replaces the sidebar icon
- **Clear All Data** — wipe all transaction/farmer/vendor/vegetable data with automatic timestamped backup

---

## For End Users

No installation, no git, no coding required.

### Prerequisites

- Windows 7 or later (32-bit or 64-bit)
- Nothing else — SQLite, Node.js, and all dependencies are bundled inside the app

### Steps

1. Download and extract `KKS-Commission-Mundy-v2.3.1.zip`
2. Check your Windows type: right-click **This PC** → **Properties** → look for **System type**
3. Open the matching folder:
   - **64-bit Windows** → open `64-bit\` → double-click `KKS Commission Mundy.exe`
   - **32-bit Windows** → open `32-bit\` → double-click `KKS Commission Mundy.exe`
4. If Windows SmartScreen shows a warning → click **More info** → **Run anyway**
   (The exe is unsigned — this is expected and safe)

### Data location

Your database is stored at:
```
C:\Users\<YourName>\AppData\Roaming\kks-commission-mundy\CommissionMundy.db
```

### Backup & Restore

- **Backup:** Copy `CommissionMundy.db` to a USB drive or cloud folder
- **Restore:** Paste it back to the same path before launching the app

---

## For Developers

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (includes npm)
- Git
- Windows (the app targets Win32 only)
- No Python or native build tools needed — sql.js is pure WebAssembly

### Clone and install

```bash
git clone https://github.com/knatarajan1/BillingAppForCommisionMundy.git
cd BillingAppForCommisionMundy
npm install
```

### Run in development mode

```bash
npm run electron:dev
```

Starts Vite dev server on `http://localhost:5173` and launches Electron pointed at it. Hot-reload is active for renderer changes.

### Build a production distributable

```bash
# 1. Package both 64-bit and 32-bit portable EXEs
npm run package:win

# 2. Stamp version info into the EXEs (shows in right-click → Properties → Details)
npm run stamp

# Output is at:
#   KKS-Commission-Mundy-v2-Windows\
#     HOW-TO-RUN.txt
#     64-bit\KKS Commission Mundy.exe
#     32-bit\KKS Commission Mundy.exe
```

Then zip and distribute:

```powershell
Compress-Archive -Path ".\KKS-Commission-Mundy-v2-Windows" -DestinationPath "..\KKS-Commission-Mundy-v2.3.1.zip" -Force
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Shell                         │
│                                                          │
│  ┌───────────────────┐    ┌──────────────────────────┐  │
│  │   Main Process    │    │   Renderer Process       │  │
│  │   (Node.js)       │    │   (React + Vite)         │  │
│  │                   │    │                          │  │
│  │  main.js          │    │  src/                    │  │
│  │  ├ IPC handlers   │◄───┤  ├ pages/               │  │
│  │  └ dialog API     │IPC │  │   ├ Billing.jsx       │  │
│  │                   │    │  │   ├ Vegetables.jsx    │  │
│  │  sqliteService.js │    │  │   ├ Clients.jsx       │  │
│  │  ├ CRUD ops       │    │  │   ├ Vendors.jsx       │  │
│  │  ├ clearAllData() │    │  │   ├ Reports.jsx       │  │
│  │  └ backup logic   │    │  │   └ Settings.jsx      │  │
│  │                   │    │  ├ components/           │  │
│  │  preload.js       │    │  │   ├ TamilInput.jsx    │  │
│  │  └ contextBridge  │───►│  │   ├ SmartSelect.jsx   │  │
│  └───────────────────┘    │  │   ├ MasterPage.jsx    │  │
│                           │  │   ├ BillPrint.jsx     │  │
│                           │  │   └ Sidebar.jsx       │  │
│  ┌───────────────────┐    │  └ lib/                  │  │
│  │   SQLite DB       │    │      ├ LanguageContext.jsx│  │
│  │  (sql.js WASM)    │    │      ├ translations.js   │  │
│  │                   │    │      ├ transliterate.js  │  │
│  │  %APPDATA%/       │    │      ├ units.js          │  │
│  │  CommissionMundy  │    │      └ themes.js         │  │
│  │  .db              │    └──────────────────────────┘  │
│  └───────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 28 |
| Frontend | React 18 + React Router 6 |
| Styling | Tailwind CSS 3 |
| Database | SQLite via sql.js (WebAssembly — no Python/build tools needed) |
| Build | Vite 5 |
| Packaging | asar (npx asar pack) |

---

## Project Structure

```
├── electron/
│   ├── main.js            # Electron main process, IPC handlers
│   ├── preload.js         # Context bridge — exposes API to renderer
│   └── sqliteService.js   # All database logic (SQLite via sql.js)
│                          #   clearAllData() — backup + truncate data tables
│                          #   getDbPath()    — resolve DB file path
├── src/
│   ├── components/
│   │   ├── Layout.jsx         # App shell with sidebar
│   │   ├── Sidebar.jsx        # Navigation — uses LanguageContext for labels + logo
│   │   ├── MasterPage.jsx     # Generic CRUD page (Vegetables / Clients / Vendors)
│   │   ├── TamilInput.jsx     # Smart input: English phonetics → Tamil Unicode live
│   │   ├── SmartSelect.jsx    # Searchable select with inline add form
│   │   ├── BillPrint.jsx      # Print preview modal — labels translated per language
│   │   ├── Modal.jsx          # Dialog wrapper
│   │   ├── PageHeader.jsx     # Page title + actions bar
│   │   └── EmptyState.jsx     # Empty list placeholder
│   ├── pages/
│   │   ├── Billing.jsx        # Create new bill/transaction
│   │   ├── Vegetables.jsx     # Vegetable master list
│   │   ├── Clients.jsx        # Client master list
│   │   ├── Vendors.jsx        # Vendor master list
│   │   ├── CashDrawer.jsx     # Daily cash opening / closing / reset (NEW v2.2)
│   │   ├── VendorPayments.jsx # Vendor bill payment tracking (NEW v2.2)
│   │   ├── Reports.jsx        # Client, vendor, cash drawer & vendor payment reports
│   │   └── Settings.jsx       # Language, logo, theme, company details, danger zone
│   └── lib/
│       ├── LanguageContext.jsx # React context: lang, setLang, t(), logo, setLogo
│       ├── translations.js    # All English + Tamil UI strings
│       ├── transliterate.js   # English-phonetic → Tamil Unicode engine
│       ├── units.js           # Unit option helpers (getUnitOptions, getUnitLabel)
│       └── themes.js          # Brand colour themes
├── public/
│   └── icon.ico
├── KKS-Commission-Mundy-v2-Windows/
│   ├── 64-bit/resources/app.asar   ← 64-bit distributable
│   └── 32-bit/resources/app.asar   ← 32-bit distributable
└── dist/                    # Vite build output (generated)
```

---

## Tamil Language & Transliteration

### Switching to Tamil

Configuration tab → **App Language** → **Tamil (தமிழ்)** → **Save Changes**

The entire UI switches instantly — navigation labels, page titles, buttons, dropdowns, modals, and toast messages.

### Tamil Phonetic Input

When Tamil mode is active, **all text fields** accept English phonetics and convert to Tamil Unicode in real-time:

| Type | Result |
|------|--------|
| `thakkali` | தக்காளி |
| `vengaayam` | வெங்காயம் |
| `PoosaNi` | பூசணி |
| `kathirikkai` | கத்திரிக்காய் |
| `veLLai` | வெள்ளை |

**Phonetic key rules:**

| Sound | Key | Tamil |
|-------|-----|-------|
| Retroflex ண | `N` (capital) | ண |
| Retroflex ட | `T` (capital) | ட |
| Retroflex ள | `L` (capital) | ள |
| Tamil ற | `R` (capital) or `rr` | ற |
| Long ஆ | `aa` | ஆ/ா |
| Long ஊ | `oo` or `uu` | ஊ/ூ |
| Long ஈ | `ee` or `ii` | ஈ/ீ |
| Long ஏ | `ae` | ஏ/ே |
| ழ sound | `zh` | ழ |
| ஷ sound | `sh` | ஷ |
| Dental த | `th` | த |
| Geminate ண | `nn` | ண |
| Geminate ள | `ll` | ள |
| Geminate ற | `rr` | ற |

**Backspace** removes the last typed English letter (re-computing Tamil).  
**Space** commits the current word and starts a new one.

---

## Database

- **Location (production):** `%APPDATA%\kks-commission-mundy\CommissionMundy.db`
- **Location (dev):** `CommissionMundy.db` in project root
- **Engine:** SQLite via [sql.js](https://sql.js.org/) (WebAssembly)

### Schema

| Table | Description |
|-------|-------------|
| `Config` | App settings (company name, commission rate, language, logo, theme…) |
| `Vegetables` | Vegetable master (id, name, unit) |
| `Clients` | Farmer master (id, name, phone, address) |
| `Vendors` | Vendor master (id, name, phone, address) |
| `Transactions` | Bill header (bill number, client, date, totals) |
| `TransactionItems` | Bill line items (vegetable, vendor, qty, rate, price) |
| `CashDrawer` | Daily opening cash amount; closing computed from Transactions (NEW v2.2) |
| `VendorPayments` | Per-vendor per-date payment record: bill_amount, paid_amount, pending (NEW v2.2) |

### Backup & Restore

**Manual backup:** Copy `CommissionMundy.db` to a safe location.  
**Restore:** Paste it back before launching the app.

**In-app backup (Clear Data):** Configuration → Danger Zone → **Clear All Data**.  
Before clearing, a timestamped backup is auto-saved to:
```
%APPDATA%\kks-commission-mundy\backups\CommissionMundy_backup_YYYY-MM-DD_HH-MM-SS.db
```

---

## Modules

| Module | Description |
|--------|-------------|
| **Billing** | Create transactions — select farmer, add vegetable/vendor line items, auto-calculate commission and chit costs |
| **Vegetables** | Manage vegetable master list with unit types |
| **Farmers** | Manage farmer master list |
| **Vendors** | Manage vendor master list |
| **Cash Drawer** | Set opening cash per day; live closing = opening − bills paid; red reset button; navigate any date |
| **Vendor Payments** | Select date, see vendor bills (amount > 0), enter paid amount per vendor, auto-compute pending; saved cumulatively |
| **Reports** | Farmer bills, vendor bills, vendor summary, cash drawer history, vendor payment summary |
| **Configuration** | Language, logo, theme colour, company details, billing parameters, clear data |

---

## Commission Calculation

```
Net Amount = Subtotal − Commission − Chit Costs

where:
  Subtotal   = Σ (quantity × rate) for all items
  Commission = Subtotal × (commission_rate / 100)
  Chit Costs = item_count × chit_cost_per_record
```

---

## Changelog

### v2.2.1
- Fixed: Cash Drawer — summary cards (opening/bills paid/closing) now only appear when an opening amount has actually been saved for that date; unsaved dates show an info prompt only
- Fixed: Cash Drawer — Reset button hidden until a record exists; Save button disabled while input is empty
- Fixed: Vendor Payments — date-change guard prompts to discard unsaved changes before switching
- Fixed: Vendor Payments — `isStale` detection: when stored paid amount exceeds the current bill (bill reduced after payment), row shown in orange with warning; stale input pre-filled at safe maximum (bill amount)
- Fixed: Vendor Payments — per-row inline validation errors (red border + message) instead of global toasts
- Fixed: Vendor Payments — "Pay in full" shortcut button per vendor row
- Fixed: Vendor Payments — `saveVendorPayments` re-fetches live bill from TransactionItems before saving; rejects paid > live bill with a precise error message
- Fixed: Vendor Payments — input rounds to 2 decimal places on blur; save blocked when any row has a validation error
- New: Vendor Payments — all-settled success banner when every vendor on a date is fully paid

### v2.2.0
- New: **Cash Drawer Management** page (`/cash-drawer`) — set opening cash for any date; closing balance = opening − Σ net_amount of bills that day; red Reset button with confirmation
- New: **Vendor Bill Management** page (`/vendor-payments`) — select date, list vendors with bill totals (amount > 0 only), enter paid amount, auto-compute pending; results saved to `VendorPayments` table
- New: **Cash Drawer Report** tab in Reports — date range filter → table of date | opening | bills paid | closing
- New: **Vendor Payment Report** tab in Reports — vendor filter → cumulative bill / paid / pending per vendor
- New DB table: `CashDrawer` (date UNIQUE, opening_amount)
- New DB table: `VendorPayments` (vendor_id + bill_date UNIQUE, bill_amount, paid_amount)
- Updated: Sidebar with two new nav items (Wallet + Banknote icons)
- Updated: Translations — full English + Tamil for all new keys

### v2.1.8
- New: **Vendor Payment Summary** — third tab in Reports showing each vendor's total payable amount (only vendors with amount > 0)
- New: From Date / To Date filter for the vendor summary (date range, both optional)
- New: Printable thermal receipt for the vendor summary (80mm paper, 2-column: vendor name | amount)
- New IPC channel: `transactions:getVendorSummary(fromDate, toDate)`
- No database schema changes — aggregates existing `TransactionItems.price` via `SUM + GROUP BY vendor`

### v2.1.7
- Changed: UI label "Client" renamed to "Farmer" throughout (English and Tamil) — English: Client → Farmer, Tamil: வாடிக்கையாளர் → விவசாயி
- Changed: Vendor Tamil label updated — விற்பனையாளர் → வியாபாரி (English label "Vendor" unchanged)
- No database schema changes — internal table names `Clients` and `Vendors` are unchanged

### v2.1.6
- Removed: dotted `border-top` line above footer in both client and vendor bill receipts
- Fixed: footer language now follows the app language setting — English UI shows "Thank you for your business! / Visit Again!", Tamil UI shows "உங்கள் வணிகத்திற்கு நன்றி! / மீண்டும் வாருங்கள்!" (reverted the always-bilingual approach)
- No database changes

### v2.1.5
- Fixed: blank paper output — `position:fixed` children of `display:none` parents render as empty in Chromium's print pipeline; switched to `createPortal(…, document.body)` so `#print-area` is a direct `<body>` child; CSS rule changed from `body > * { display:none }` to `body > *:not(#print-area) { display:none }` — no `position:fixed` needed
- Fixed: `pageSize`/`marginType` removed from `webContents.print()` — no longer needed with portal approach; `@page { size:80mm auto }` handles the rendering canvas
- Fixed: rate per unit missing from item rows on both client and vendor bills — now shown as `@ ₹X.XX` sub-line below quantity in the qty column
- Changed: column widths adjusted — item 48%, qty 22%, price 30% (was 52%/20%/28%) to give rate sub-line sufficient room
- No database changes — `rate` was already stored in `TransactionItems` and returned by both `getClientBills` and `getVendorBills`

### v2.1.4
- Removed: column headers from items table on both client and vendor bills (cleaner thermal output)
- Removed: vendor name sub-row from client bill items (vegetable only, no sub-line)
- Removed: bill# sub-row from vendor bill items (bill reference kept in database for audit)
- Removed: shop name line from receipt footers (both bills)
- Changed: unit labels shortened for print — Kilogram→Kg, Pieces→Pc (Ton/Box/Bag unchanged); uses new `getShortUnitLabel()` helper in units.js
- Changed: commission label simplified from "Commission (10%):" to "Commission:"
- Changed: chit label simplified from "Chit Cost (2 × ₹5.00):" to "Chit Cost:" (amount unchanged)
- No database schema changes — all removed fields remain stored in TransactionItems

### v2.1.3
- Fixed: receipt columns collapsed to single-word-per-line due to Chromium rendering at screen viewport width (1366 px) instead of 80mm — root cause was `webContents.print()` missing `pageSize`
- Fixed: added `pageSize: { width: 80000, height: 3000000 }` and `marginType: 'none'` to Electron print call so Chromium renders the print canvas at exactly 80mm
- Fixed: `#print-area { width: 80mm; padding: 2mm 4mm; box-sizing: border-box }` — explicit absolute width removes dependency on viewport ICB; padding replaces `@page` margin that was causing margin-zone clipping
- Fixed: `@page { margin: 0 }` — eliminates the content-area vs page-box ambiguity that clipped the rightmost 4mm of values
- Fixed: `table { table-layout: fixed }` in print — prevents any column from overflowing the 72mm content area
- Fixed: `flex-direction: row` explicitly set in print CSS — ensures logo stays left, company name stays right
- Fixed: logo `print-color-adjust: exact` — base64 logo now renders correctly in print output
- Added: bilingual receipt footer — "Thank you for your business! / உங்கள் வணிகத்திற்கு நன்றி!" and "Visit Again! | மீண்டும் வாருங்கள்!" always shown on every receipt regardless of UI language
- Changed: `print_logo_in_bill` default changed from `'0'` to `'1'` — logo prints by default when a logo is uploaded

### v2.1.2
- Fixed: thermal receipt layout for TVS RP 3230 (3-inch / 80mm paper)
  - `@page { size: 80mm auto; }` — prevents right-side truncation
  - Replaced `font-mono` with Arial/Latha (Tamil Unicode rendering was broken)
  - Replaced 72-char separator lines with CSS `border-top` (no overflow)
  - Redesigned items to 3-column table: Item+Vendor | Qty | Price
  - Logo moved to top-left beside company name (was centered and oversized)
- Added: "Visit Again! / மீண்டும் வாருங்கள்!" in both bill receipt footers

### v2.1.1
- Fixed: copy/paste/cut and select-all-then-delete in Tamil text fields
- Fixed: Vada Mozhi Grantha letters — S→ஸ, ksh→க்ஷ, j→ஜ, sh→ஷ, h→ஹ
- Fixed: transliteration only activates when Tamil language is selected
- New: print logo on bill receipts toggle (Configuration → App Logo)
- New: direct OS Tamil keyboard input passes through unchanged

### v2.1.0
- Tamil language support (UI + dropdowns + bill print)
- Tamil phonetic transliteration for all text input fields
- Custom app logo (PNG/JPG/BMP, max 2 MB)
- Clear All Data with automatic timestamped backup
- Fixed: 32-bit app.asar was incorrectly packaged (370 MB → 18.7 MB)

### v2.0.0
- Replaced Excel (.xlsx) database with SQLite (sql.js WebAssembly)
- Redesigned UI — Tailwind CSS, sidebar navigation, toast notifications
- Bug fixes: atomic transactions, correct bill numbering, async print, input validation
