# KKS Commission Mundy

Agricultural Commission Management Desktop Application — v2.1.0

## Overview

KKS Commission Mundy is a Windows desktop app (Electron + React) for managing agricultural commission transactions. It tracks clients, vendors, vegetables, and generates bills with automatic commission and chit cost calculations.

**v2.1 changes from v2.0:**
- **Tamil language support** — switch the entire UI to Tamil via Configuration tab
- **Tamil phonetic input** — type English phonetics (e.g. `thakkali`) and see Tamil Unicode live (தக்காளி)
- **Dropdown values translated** — unit type options and all table values shown in Tamil when Tamil mode is active
- **Bill print translated** — print receipts in Tamil when Tamil mode is active
- **App logo customisation** — upload a custom PNG/JPG logo via Configuration; replaces the sidebar icon
- **Clear All Data** — wipe all transaction/client/vendor/vegetable data with automatic timestamped backup

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
│   │   ├── Reports.jsx        # Client & vendor bill reports
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

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- No Python or build tools required (sql.js is pure WebAssembly)

### Install

```bash
npm install
```

### Development

```bash
npm run electron:dev
```

---

## Building for Distribution

```bash
# 1. Build the React frontend
npm run build

# 2. Create a clean pack folder (outside project dir to avoid sandbox issues)
mkdir E:\KKS_pack_temp\node_modules
xcopy /E /I dist     E:\KKS_pack_temp\dist
xcopy /E /I electron E:\KKS_pack_temp\electron
xcopy /E /I public   E:\KKS_pack_temp\public
copy index.html      E:\KKS_pack_temp\
copy package.json    E:\KKS_pack_temp\
xcopy /E /I node_modules\sql.js E:\KKS_pack_temp\node_modules\sql.js
xcopy /E /I node_modules\uuid   E:\KKS_pack_temp\node_modules\uuid

# 3. Pack into asar
npx asar pack E:\KKS_pack_temp "KKS-Commission-Mundy-v2-Windows\64-bit\resources\app.asar"
copy "KKS-Commission-Mundy-v2-Windows\64-bit\resources\app.asar" ^
     "KKS-Commission-Mundy-v2-Windows\32-bit\resources\app.asar"
```

The Electron binaries (`.exe`, DLLs, etc.) are already in the `64-bit/` and `32-bit/` folders — only `app.asar` changes with each build.

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
| `Clients` | Client master (id, name, phone, address) |
| `Vendors` | Vendor master (id, name, phone, address) |
| `Transactions` | Bill header (bill number, client, date, totals) |
| `TransactionItems` | Bill line items (vegetable, vendor, qty, rate, price) |

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
| **Billing** | Create transactions — select client, add vegetable/vendor line items, auto-calculate commission and chit costs |
| **Vegetables** | Manage vegetable master list with unit types |
| **Clients** | Manage client master list |
| **Vendors** | Manage vendor master list |
| **Reports** | Filter client bills or vendor bills by date; printable receipts |
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
