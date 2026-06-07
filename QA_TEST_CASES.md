# KKS Commission Mundy — QA Test Case Document
**Application:** KKS Commission Mundy  
**Version:** 2.5.5  
**Platform:** Windows 11, Electron 28  
**Database:** SQLite (sql.js WASM)  
**Prepared by:** Senior QA Engineer (Claude Sonnet 4.6)  
**Date:** 2026-06-07  

---

## Table of Contents
1. [Test Coverage Summary](#1-test-coverage-summary)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Module M1 — Vegetables Master](#3-module-m1--vegetables-master)
4. [Module M2 — Clients (Farmers) Master](#4-module-m2--clients-farmers-master)
5. [Module M3 — Vendors Master](#5-module-m3--vendors-master)
6. [Module M4 — Billing](#6-module-m4--billing)
7. [Module M5 — Farmer Receipt](#7-module-m5--farmer-receipt)
8. [Module M6 — Cash Drawer](#8-module-m6--cash-drawer)
9. [Module M7 — Vendor Payments](#9-module-m7--vendor-payments)
10. [Module M8 — Reports](#10-module-m8--reports)
11. [Module M9 — Settings & Configuration](#11-module-m9--settings--configuration)
12. [Module M10 — Print Functionality](#12-module-m10--print-functionality)
13. [Module M11 — SmartSelect Component](#13-module-m11--smartselect-component)
14. [Module M12 — Tamil Language & Transliteration](#14-module-m12--tamil-language--transliteration)
15. [Module M13 — Business Logic & Calculations](#15-module-m13--business-logic--calculations)
16. [Module M14 — Data Integrity & Atomicity](#16-module-m14--data-integrity--atomicity)
17. [Module M15 — Edge Cases & Boundary Values](#17-module-m15--edge-cases--boundary-values)
18. [Test Execution Results](#18-test-execution-results)

---

## 1. Test Coverage Summary

| Module | Total TCs | Priority High | Priority Medium | Priority Low |
|--------|-----------|--------------|----------------|-------------|
| M1 Vegetables Master | 12 | 4 | 5 | 3 |
| M2 Clients Master | 10 | 4 | 4 | 2 |
| M3 Vendors Master | 10 | 4 | 4 | 2 |
| M4 Billing | 28 | 14 | 9 | 5 |
| M5 Farmer Receipt | 14 | 6 | 5 | 3 |
| M6 Cash Drawer | 12 | 5 | 5 | 2 |
| M7 Vendor Payments | 16 | 8 | 5 | 3 |
| M8 Reports | 20 | 8 | 8 | 4 |
| M9 Settings | 14 | 5 | 6 | 3 |
| M10 Print | 12 | 6 | 4 | 2 |
| M11 SmartSelect | 10 | 4 | 4 | 2 |
| M12 Tamil | 12 | 5 | 5 | 2 |
| M13 Business Logic | 14 | 8 | 4 | 2 |
| M14 Data Integrity | 10 | 8 | 2 | 0 |
| M15 Edge Cases | 16 | 8 | 6 | 2 |
| **TOTAL** | **200** | **97** | **76** | **37** |

**Coverage Areas:**
- Functional Testing: CRUD operations on all 5 master/transaction entities
- Business Logic: Commission formula, chit cost calculation, net amount
- UI/UX: SmartSelect, TamilInput, navigation, keyboard shortcuts
- Integration: Billing ↔ Receipts ↔ Vendor Payments ↔ Cash Drawer ↔ Reports
- Print: 80mm thermal layout, logo/address toggles, TVS auto-detect
- Data Integrity: Atomic transactions, reversal exclusion, stale detection
- Edge Cases: Boundary values, empty states, error scenarios, concurrent updates

---

## 2. Test Environment Setup

### Prerequisites
- Windows 11 with KKS Commission Mundy v2.5.5 installed
- TVS RP 3230 thermal printer connected (or virtual printer for layout tests)
- Clean database state (use Settings > Clear All Data before regression run)
- Default settings: commission_rate=10%, chit_cost=₹5, currency=₹

### Test Data Setup
**Vegetables (create before billing tests):**
| ID | Name | Short Name | Unit |
|----|------|-----------|------|
| V1 | Tomato | TMT | Kg |
| V2 | Onion | ONI | Kg |
| V3 | Brinjal | BRJ | Box |
| V4 | Potato | PTO | Bag |
| V5 | Banana | BNA | Ton |

**Clients/Farmers:**
| ID | Name | Phone | Address |
|----|------|-------|---------|
| C1 | Ravi Kumar | 9876543210 | Ooty |
| C2 | முருகன் | 9123456789 | Coimbatore |
| C3 | Suresh | — | — |

**Vendors:**
| ID | Name | Phone |
|----|------|-------|
| V1 | Arun Traders | 9000000001 |
| V2 | Bala Stores | 9000000002 |
| V3 | Chennai Mart | — |

---

## 3. Module M1 — Vegetables Master

### TC-M1-001 | Add vegetable with all fields
**Priority:** High | **Type:** Functional  
**Steps:**
1. Navigate to Vegetables page
2. Click "Add" button
3. Enter Name: "Tomato", Short Name: "TMT", Unit: "Kg"
4. Click Save

**Expected:** Record appears in list with Name=Tomato, Short=TMT, Unit=Kilogram (Kg). Toast success shown.

---

### TC-M1-002 | Add vegetable with name only (optional fields empty)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Click Add, enter Name: "Spinach", leave Short Name blank, Unit=default Kg
2. Click Save

**Expected:** Saved successfully. Short name shows "—" in list. Unit defaults to Kg.

---

### TC-M1-003 | Add vegetable with empty name (validation)
**Priority:** High | **Type:** Negative  
**Steps:**
1. Click Add, leave Name empty, enter Short Name: "SPN"
2. Click Save

**Expected:** Validation error shown. Record NOT saved. Form stays open.

---

### TC-M1-004 | Add vegetable with whitespace-only name
**Priority:** High | **Type:** Negative  
**Steps:**
1. Click Add, enter Name: "   " (spaces only)
2. Click Save

**Expected:** Validation rejects. Name is trimmed → empty → error shown.

---

### TC-M1-005 | Edit vegetable name and short name
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Click edit (pencil) on existing vegetable "Tomato"
2. Change Name to "Tomatoes", Short Name to "TMTS"
3. Click Save

**Expected:** List updates to Tomatoes/TMTS. Toast shown. New bills use updated names; old bills retain original (short_name persisted at save time).

---

### TC-M1-006 | Change unit type of vegetable
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Edit vegetable "Brinjal", change Unit from Box to Bag
2. Save

**Expected:** Unit updated. Chit cost formula will change for new bills (Bag = qty-based chits). Old bills unaffected.

---

### TC-M1-007 | Delete vegetable with confirmation
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Click delete (trash) on "Spinach"
2. Confirmation modal appears — click Confirm

**Expected:** Record removed from list. Toast shown.

---

### TC-M1-008 | Cancel delete confirmation
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Click delete on any vegetable
2. Click Cancel in confirmation modal

**Expected:** Record NOT deleted. Modal closed. List unchanged.

---

### TC-M1-009 | Search vegetables by name
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Add 5+ vegetables with different names
2. Type "Tom" in search box

**Expected:** Only Tomato/Tomatoes shown. Others filtered out. Case-insensitive.

---

### TC-M1-010 | Search by short name
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Search for "TMT"

**Expected:** Shows Tomato (short name TMT). Full name search and short name search both work.

---

### TC-M1-011 | All unit types available in dropdown
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Open Add Vegetable modal
2. Open Unit dropdown

**Expected:** Options: Kg, Ton, Box, Bag, Pcs — all 5 present. Default = Kg.

---

### TC-M1-012 | Large number of vegetables (list performance)
**Priority:** Low | **Type:** Performance  
**Steps:**
1. Add 50 vegetables
2. Open Vegetables page

**Expected:** List renders within 2 seconds. Search remains responsive.

---

## 4. Module M2 — Clients (Farmers) Master

### TC-M2-001 | Add client with all fields
**Priority:** High | **Type:** Functional  
**Steps:**
1. Navigate to Clients, click Add
2. Enter Name: "Ravi Kumar", Phone: "9876543210", Address: "123 Main St, Ooty"
3. Click Save

**Expected:** Client saved. All fields shown in list.

---

### TC-M2-002 | Add client with name only
**Priority:** High | **Type:** Functional  
**Steps:**
1. Add client with Name: "Suresh", leave phone and address blank
2. Save

**Expected:** Saved. Phone and address show as blank/—.

---

### TC-M2-003 | Add client with empty name (validation)
**Priority:** High | **Type:** Negative  
**Steps:**
1. Open Add, leave Name blank, enter phone "9999999999"
2. Click Save

**Expected:** Error shown. Not saved.

---

### TC-M2-004 | Phone accepts any format (no format validation)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Add client with Phone: "abc-xyz" (invalid format)
2. Save

**Expected:** Saved (no format validation on phone). UI uses tel input type but doesn't enforce pattern.

---

### TC-M2-005 | Edit client name
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Edit "Ravi Kumar" → change to "Ravi Kumar Sharma"
2. Save

**Expected:** List updated. Existing bills retain original clientName (snapshotted at bill save). New bills use updated name.

---

### TC-M2-006 | Delete client
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Delete "Suresh" with confirmation

**Expected:** Removed from list. Note: orphaned bills still exist in DB with clientId (no cascade delete).

---

### TC-M2-007 | Search clients
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Type "Ravi" in search

**Expected:** Shows Ravi Kumar (Sharma). Case-insensitive filter.

---

### TC-M2-008 | Client name with Tamil characters
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Set UI language to Tamil in Settings
2. Add client with Tamil name via TamilInput: type "murukan" → should show "முருகன்"
3. Save

**Expected:** Client saved with Tamil name. Shows correctly in list.

---

### TC-M2-009 | Cancel add client modal
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Open Add, enter partial data
2. Click Cancel or press Esc

**Expected:** Modal closed. No record saved. Partial data discarded.

---

### TC-M2-010 | Long address field
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Add client with 500-character address
2. Save and verify

**Expected:** Full text saved. Displays (truncated/wrapped in UI as appropriate). No crash.

---

## 5. Module M3 — Vendors Master

### TC-M3-001 through TC-M3-010
**Same structure as M2 (Clients) but for Vendors.**

| TC | Description | Priority |
|----|-------------|----------|
| TC-M3-001 | Add vendor with all fields | High |
| TC-M3-002 | Add vendor with name only | High |
| TC-M3-003 | Empty name validation | High |
| TC-M3-004 | Phone accepts any format | High |
| TC-M3-005 | Edit vendor name | Medium |
| TC-M3-006 | Delete vendor with confirmation | Medium |
| TC-M3-007 | Search vendors by name | Medium |
| TC-M3-008 | Vendor with Tamil name | Medium |
| TC-M3-009 | Cancel add modal | Low |
| TC-M3-010 | Long address field | Low |

**Additional Vendor-specific:**

### TC-M3-010B | Vendor used in active bills — no orphan prevention
**Priority:** Medium | **Type:** Data Integrity  
**Steps:**
1. Create a bill with Vendor "Arun Traders"
2. Delete "Arun Traders" from Vendors master

**Expected:** Delete succeeds (no cascade prevention). Existing bill TransactionItems retain vendorName snapshot. Reports still show vendor name from bill data.

---

## 6. Module M4 — Billing

### TC-M4-001 | Create new bill — happy path (single item)
**Priority:** High | **Type:** Functional — Golden Path  
**Pre-conditions:** Clients, Vendors, Vegetables exist  
**Steps:**
1. Navigate to Billing
2. Select Client: "Ravi Kumar"
3. Set Date: today
4. Add item: Vegetable=Tomato, Vendor=Arun Traders, Qty=100, Unit=Kg, Rate=₹5.00
5. Verify calculated: Subtotal=₹500, Commission=₹50 (10%), Chit=₹5 (1 item × ₹5), Net=₹445
6. Click Save

**Expected:** Bill saved. Bill# format: 20260607-001. Toast "Bill saved". Auto-print triggers.

---

### TC-M4-002 | Create bill with multiple items (mixed unit types)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Select Client, add 3 items:
   - Tomato | Arun | Qty=50 Kg | Rate=10 → Price=₹500 | Chits=1
   - Brinjal | Bala | Qty=20 Box | Rate=100 → Price=₹2000 | Chits=20
   - Banana | Chennai | Qty=2 Ton | Rate=5000 → Price=₹10000 | Chits=1
2. Save

**Expected:**  
- Subtotal = 500+2000+10000 = ₹12,500  
- Commission = 1250 (10%)  
- Chit Cost = (1+20+1)×5 = ₹110  
- Net = 12500−1250−110 = ₹11,140

---

### TC-M4-003 | Bill number increments daily
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create Bill #1 for today — gets 20260607-001
2. Create Bill #2 for today — gets 20260607-002
3. Create Bill for yesterday — gets 20260606-001 (separate sequence)

**Expected:** Each date has its own sequential counter starting at 001.

---

### TC-M4-004 | Bill number resets at new date
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create bills for today up to -003
2. Create bill dated tomorrow

**Expected:** Tomorrow gets YYYYMMDD-001 (reset). Today's counter unchanged.

---

### TC-M4-005 | Save bill with no client selected (validation)
**Priority:** High | **Type:** Negative  
**Steps:**
1. Add item without selecting client
2. Click Save

**Expected:** Error: "Please select a client." Bill not saved.

---

### TC-M4-006 | Save bill with no items (validation)
**Priority:** High | **Type:** Negative  
**Steps:**
1. Select client, leave items empty
2. Click Save

**Expected:** Error: "Please add at least one item." Bill not saved.

---

### TC-M4-007 | Save bill with item missing required fields
**Priority:** High | **Type:** Negative  
**Steps:**
1. Add item row: set Vegetable only, leave Vendor/Qty/Rate blank
2. Click Save

**Expected:** Validation error listing missing fields. Bill not saved.

---

### TC-M4-008 | Add item — vegetable unit auto-populated
**Priority:** High | **Type:** Functional  
**Steps:**
1. Select vegetable "Brinjal" (unit=Box) in item row
2. Observe Unit field

**Expected:** Unit dropdown auto-sets to "Box". Operator can override if needed.

---

### TC-M4-009 | Real-time total recalculation on input change
**Priority:** High | **Type:** Functional  
**Steps:**
1. Add item: Qty=10, Rate=5 → verify Price=50, Subtotal=50
2. Change Qty to 20 → verify Price=100, Subtotal=100
3. Change Rate to 10 → verify Price=200, Subtotal=200
4. Check Commission and Net update too

**Expected:** Every keystroke recalculates all totals instantly. No stale display.

---

### TC-M4-010 | Multiple item rows — add and remove
**Priority:** High | **Type:** Functional  
**Steps:**
1. Add 5 items
2. Remove item #3 (X button)
3. Verify remaining 4 items and totals recalculate

**Expected:** Item removed instantly. Totals recalculate excluding removed item.

---

### TC-M4-011 | Load farmer receipt items into billing
**Priority:** High | **Type:** Integration  
**Steps:**
1. Create farmer receipt for Ravi Kumar, date=today, vegetables: [Tomato, Onion]
2. Go to Billing, select Ravi Kumar, same date
3. Banner appears: "Receipt RCPT-20260607-001 available · Load produce items"
4. Click Load

**Expected:** 2 items added (Tomato, Onion) with unit types pre-filled. Rate/Qty left blank. Banner dismissed.

---

### TC-M4-012 | Receipt banner dismissable
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. As above, when banner appears, click X (dismiss)

**Expected:** Banner disappears. Items NOT loaded. User can still add items manually.

---

### TC-M4-013 | Edit existing bill
**Priority:** High | **Type:** Functional  
**Steps:**
1. Go to Reports > Client Bills
2. Click pencil icon on an existing bill
3. Change qty of first item, add new item, remove an item
4. Click Save

**Expected:** Bill updated. Totals recalculated. Old TransactionItems deleted atomically, new ones inserted. Auto-print triggers. Updated values reflect in all reports.

---

### TC-M4-014 | Reverse bill
**Priority:** High | **Type:** Functional  
**Steps:**
1. In Reports > Client Bills, click Reverse on a bill
2. Confirm reversal dialog

**Expected:** Bill status = 'reversed'. Red REVERSED badge in Client Bills list. Bill excluded from: Vendor Bills, Cash Drawer totals, Vendor Payment totals, Vendor Summary.

---

### TC-M4-015 | Attempt to edit a reversed bill
**Priority:** High | **Type:** Negative  
**Steps:**
1. Try to click edit on a REVERSED bill

**Expected:** Error: cannot edit reversed bill. OR edit button hidden for reversed bills.

---

### TC-M4-016 | Negative net amount (commission + chit > subtotal)
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Set commission_rate=80% in Settings
2. Create bill: Qty=1 Kg, Rate=₹1 → Subtotal=₹1, Commission=₹0.80, Chit=₹5
3. Net = 1 - 0.80 - 5 = -₹4.80

**Expected:** Net displayed in red. Bill saves successfully (negative allowed).

---

### TC-M4-017 | Zero quantity item
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Add item with Qty=0, Rate=10
2. Save

**Expected:** Saves with Price=₹0. Contributes 0 to subtotal.

---

### TC-M4-018 | Zero rate item
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Add item with Qty=100, Rate=0
2. Save

**Expected:** Price=₹0. Bill saves. Chit cost still applies per unit type.

---

### TC-M4-019 | Fractional quantity (decimal qty)
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Add item: Qty=10.5 Kg, Rate=₹20
2. Verify Price = ₹210.00

**Expected:** Decimal qty handled correctly. Rounded to 2dp display.

---

### TC-M4-020 | Same vegetable different vendors (multiple rows)
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Add 2 items: both Tomato but different vendors (Arun and Bala)

**Expected:** Both rows saved. Vendor bills report shows each vendor their respective total.

---

### TC-M4-021 | Very large qty × rate values
**Priority:** Low | **Type:** Boundary  
**Steps:**
1. Add item: Qty=99999.99, Rate=99999.99
2. Save

**Expected:** Price calculates correctly (~₹9,999,800,001). No integer overflow. Displays in UI without truncation.

---

### TC-M4-022 | Commission rate = 0%
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Set commission_rate=0% in Settings
2. Create bill with Subtotal=₹1000

**Expected:** Commission=₹0. Net = Subtotal - 0 - ChitCost.

---

### TC-M4-023 | Commission rate = 100%
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Set commission_rate=100%
2. Create bill: Subtotal=₹500

**Expected:** Commission=₹500. Net = 0 - ChitCost (likely negative).

---

### TC-M4-024 | Chit cost per record = ₹0
**Priority:** Low | **Type:** Boundary  
**Steps:**
1. Set chit_cost=0
2. Create bill with multiple items

**Expected:** ChitCost=₹0. Net = Subtotal - Commission.

---

### TC-M4-025 | Add inline new client via SmartSelect in Billing
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. In Client field, type "New Farmer XYZ"
2. Click "+ Add New" in dropdown
3. Enter name, phone, address in inline form, click Create

**Expected:** Client created AND selected in billing form. No page navigation.

---

### TC-M4-026 | Add inline new vegetable/vendor via SmartSelect in item row
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. In Vegetable field of an item row, type "Guava"
2. Click Add New, fill details, Create

**Expected:** Guava created and selected in row. Unit auto-populates from new record.

---

### TC-M4-027 | Bill date in past/future
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Create bill with date = 30 days ago
2. Create bill with date = 30 days future

**Expected:** Both save successfully. Bill numbers sequenced for those dates. Cash drawer reflects the past/future date's balance.

---

### TC-M4-028 | Chit cost formula — all unit types
**Priority:** High | **Type:** Business Logic  
**Steps:** Create a bill with one item of each unit type (Kg, Ton, Box, Bag, Pcs), qty=3 each.

**Expected:**
| Unit | Qty | Chits |
|------|-----|-------|
| Kg   | 3   | 1 |
| Ton  | 3   | 1 |
| Box  | 3   | 3 |
| Bag  | 3   | 3 |
| Pcs  | 3   | 3 |
Total Chits = 11; ChitCost = 11 × ₹5 = ₹55

---

## 7. Module M5 — Farmer Receipt

### TC-M5-001 | Create farmer receipt — happy path
**Priority:** High | **Type:** Functional  
**Steps:**
1. Navigate to Farmer Receipt
2. Select Client: Ravi Kumar, Date: today
3. Add vegetables: Tomato, Onion (no qty/price)
4. Click Save

**Expected:** Receipt saved. Receipt# = RCPT-20260607-001. Print triggered. Items show vegetable names.

---

### TC-M5-002 | Receipt number format and daily reset
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create 3 receipts for today → RCPT-20260607-001, 002, 003
2. Create receipt for tomorrow

**Expected:** Tomorrow = RCPT-20260608-001. Today's counter unchanged.

---

### TC-M5-003 | Create receipt with no client selected
**Priority:** High | **Type:** Negative  
**Steps:**
1. Leave client blank, add vegetable, click Save

**Expected:** Validation error. Not saved.

---

### TC-M5-004 | Create receipt with no vegetables
**Priority:** High | **Type:** Negative  
**Steps:**
1. Select client, leave items empty, click Save

**Expected:** Error: at least 1 item required. Not saved.

---

### TC-M5-005 | Create receipt with vegetable missing selection
**Priority:** High | **Type:** Negative  
**Steps:**
1. Add item row but leave vegetable not selected
2. Click Save

**Expected:** Validation rejects incomplete item. Not saved.

---

### TC-M5-006 | Multiple receipts for same farmer same day
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create Receipt #1 for Ravi, today, Tomato
2. Create Receipt #2 for Ravi, today, Onion

**Expected:** Both saved with separate RCPT numbers. Both appear in billing banner.

---

### TC-M5-007 | Farmer receipt print layout
**Priority:** Medium | **Type:** Print  
**Steps:**
1. Create receipt with 5 vegetables
2. Click Print

**Expected:** 80mm receipt shows: Receipt#, Date, Farmer Name, vegetable table with blank weight/amount columns. Dotted border below each row. No company header/footer on receipt.

---

### TC-M5-008 | Receipt short name persisted in items
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Vegetable "Tomato" has short_name "TMT"
2. Create receipt with Tomato
3. Check DB: FarmerReceiptItems.vegetable_short_name = "TMT"

**Expected:** Short name persisted at save time (not looked up live).

---

### TC-M5-009 | Add inline new vegetable in receipt
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. In Farmer Receipt, type new vegetable "Guava" and create inline

**Expected:** Guava created, added to receipt item row. No page navigation.

---

### TC-M5-010 | Remove vegetable item from receipt
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Add 3 vegetables, remove the middle one (X button)
2. Save

**Expected:** Only 2 items saved.

---

### TC-M5-011 | Load receipt items into billing (integration)
**Priority:** High | **Type:** Integration  
**Steps:** [Covered also in TC-M4-011]
1. Create receipt with 3 vegetables for Ravi, today
2. Go to Billing, select Ravi, today
3. Click Load in banner

**Expected:** 3 items appear in billing with vegetable name and unit type. Rate/qty blank.

---

### TC-M5-012 | Banner not shown if no receipt for farmer+date combo
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Select client "Suresh" in Billing (no receipts for Suresh)

**Expected:** No banner shown.

---

### TC-M5-013 | Cancel receipt before save
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Fill receipt partially, navigate away without saving

**Expected:** Data discarded. No partial save. No receipt number consumed.

---

### TC-M5-014 | Large number of vegetables in one receipt
**Priority:** Low | **Type:** Performance  
**Steps:**
1. Add 20 vegetable items to one receipt
2. Save and print

**Expected:** Saves correctly. Print generates a longer receipt. No crash.

---

## 8. Module M6 — Cash Drawer

### TC-M6-001 | Set opening amount for today
**Priority:** High | **Type:** Functional  
**Steps:**
1. Navigate to Cash Drawer, date = today
2. Enter opening amount: ₹5000
3. Click Save

**Expected:** Saved. Summary cards appear: Opening=₹5000, Bills Paid=₹X (from active bills today), Closing=5000-X.

---

### TC-M6-002 | Closing balance calculation
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Set opening=₹10,000 for today
2. Create 2 bills today: Net=₹2000, Net=₹3000
3. View Cash Drawer today

**Expected:** Bills Paid = ₹5000. Closing = ₹5000.

---

### TC-M6-003 | Reversed bills excluded from cash drawer
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Opening=₹10,000. Bills: Bill#1 Net=₹2000 (active), Bill#2 Net=₹3000 (reversed)
2. View cash drawer

**Expected:** Bills Paid = ₹2000 only. Reversed bill excluded. Closing = ₹8000.

---

### TC-M6-004 | No summary cards for unset dates
**Priority:** High | **Type:** Functional  
**Steps:**
1. Navigate to Cash Drawer with a date that has no opening amount set

**Expected:** Info banner "No opening amount set for this date." No summary cards shown.

---

### TC-M6-005 | Save button disabled until input entered
**Priority:** High | **Type:** UI  
**Steps:**
1. Navigate to Cash Drawer (no existing record for date)
2. Observe Save button with empty input field

**Expected:** Save button disabled/greyed. Enabled only after non-empty numeric entry.

---

### TC-M6-006 | Reset opening amount
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Set opening=₹5000 for today
2. Click Reset (red button), confirm dialog

**Expected:** Opening amount reset to 0. Cards update: Opening=₹0, Closing=₹0-Bills.

---

### TC-M6-007 | Reset button hidden when no record exists
**Priority:** Medium | **Type:** UI  
**Steps:**
1. Navigate to date with no cash drawer record

**Expected:** Reset button not visible. Only Save button shown.

---

### TC-M6-008 | Date navigation (different dates)
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Set opening for today
2. Switch to yesterday using date picker
3. Switch back to today

**Expected:** Each date loads its own state independently. No bleed between dates.

---

### TC-M6-009 | Opening amount = ₹0 explicit save
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Enter 0 in opening amount field
2. Click Save

**Expected:** Saves. Summary cards show Opening=₹0. Closing = 0 - Bills Paid.

---

### TC-M6-010 | Negative opening amount (validation)
**Priority:** Medium | **Type:** Negative  
**Steps:**
1. Enter -1000 in opening amount
2. Click Save

**Expected:** Validation error. Not saved. (min=0 enforced)

---

### TC-M6-011 | Non-numeric opening amount
**Priority:** Medium | **Type:** Negative  
**Steps:**
1. Enter "abc" in opening amount field
2. Click Save

**Expected:** NaN rejected. Error shown. Not saved.

---

### TC-M6-012 | Cash drawer report date range
**Priority:** Low | **Type:** Integration  
**Steps:**
1. Set opening amounts for 3 different dates
2. View Reports > Cash Drawer Report with date range filter

**Expected:** All 3 dates shown with correct Opening/Bills/Closing. Sorted DESC.

---

## 9. Module M7 — Vendor Payments

### TC-M7-001 | Load vendor bills for a date
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create bills for today with Vendors: Arun (₹2000), Bala (₹3000)
2. Navigate to Vendor Payments, select today

**Expected:** Both vendors listed with Bill Amount. paidAmount blank/₹0. pendingAmount = bill amount.

---

### TC-M7-002 | Enter payment for a vendor
**Priority:** High | **Type:** Functional  
**Steps:**
1. Enter ₹1500 against Arun (bill=₹2000)
2. Click Save

**Expected:** Saved. pendingAmount = ₹500. paidAmount = ₹1500.

---

### TC-M7-003 | Pay in Full button
**Priority:** High | **Type:** Functional  
**Steps:**
1. Click "Pay in Full" button next to Bala (bill=₹3000)
2. Verify input fills with ₹3000

**Expected:** Input pre-filled with exact bill amount. Can Save.

---

### TC-M7-004 | Save all vendors at once (batch save)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Enter payments for all 3 vendors
2. Click Save once

**Expected:** All 3 payments saved atomically. Success toast.

---

### TC-M7-005 | All vendors fully paid — all-settled banner
**Priority:** High | **Type:** Functional  
**Steps:**
1. Pay all vendors in full for the date
2. Click Save

**Expected:** Banner: "All vendor payments settled for this date." Green indicator.

---

### TC-M7-006 | Overpayment rejected (paid > bill)
**Priority:** High | **Type:** Negative  
**Steps:**
1. Enter ₹5000 for Arun (bill=₹2000)
2. Click Save

**Expected:** Validation error: "Amount exceeds bill amount." Not saved. Row shows red border.

---

### TC-M7-007 | Negative payment amount rejected
**Priority:** High | **Type:** Negative  
**Steps:**
1. Enter -500 for any vendor
2. Click Save

**Expected:** Validation error. Not saved.

---

### TC-M7-008 | Non-numeric payment rejected
**Priority:** High | **Type:** Negative  
**Steps:**
1. Enter "abc" in payment field
2. Click Save

**Expected:** Validation error. Not saved.

---

### TC-M7-009 | Stale payment detection (bill reduced after payment)
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Record payment: Arun paid=₹2000 (bill=₹2000)
2. Edit bill and reduce Arun's items so new bill=₹1500
3. Reopen Vendor Payments for that date

**Expected:** Arun row shown in orange warning. isStale=true. Input pre-filled at ₹1500 (capped to safe max). Banner "Bill amount changed after payment recorded."

---

### TC-M7-010 | Unsaved-changes guard on date change
**Priority:** Medium | **Type:** UX  
**Steps:**
1. Enter partial payment data (don't Save)
2. Change date to another day

**Expected:** Confirmation modal: "Discard changes?" with Confirm/Cancel. Changes discarded only if confirmed.

---

### TC-M7-011 | Vendors with ₹0 bill amount not shown
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. A vendor has no bills for selected date

**Expected:** That vendor row absent. Only vendors with bill > 0 shown.

---

### TC-M7-012 | Payment rounds to 2 decimal places on blur
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Enter 1500.999 in payment field, click away (blur)

**Expected:** Input rounds to 1501.00.

---

### TC-M7-013 | Multiple partial payments cumulated across dates
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Pay Arun ₹1000 on date A, ₹1500 on date B
2. View Vendor Payment Report

**Expected:** Report shows cumulative: Total Bill, Total Paid=₹2500, Pending.

---

### TC-M7-014 | Re-fetch live bill on save (concurrent change guard)
**Priority:** Medium | **Type:** Data Integrity  
**Steps:**
1. Open Vendor Payments with Arun bill=₹3000
2. In another window edit bill to reduce Arun to ₹1500
3. Back in Vendor Payments, enter payment=₹2500, click Save

**Expected:** Backend re-fetches live bill (₹1500) during save. Rejects with error: "paid (₹2500) exceeds current bill (₹1500)".

---

### TC-M7-015 | Payment = ₹0 allowed (no payment recorded)
**Priority:** Low | **Type:** Edge Case  
**Steps:**
1. Leave payment blank (0) for a vendor, Save

**Expected:** Saves. paidAmount=0, pendingAmount=bill. No error.

---

### TC-M7-016 | Reversed bill excluded from vendor payments
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Bill with Vendor Arun, Net=₹2000. Reverse the bill.
2. Open Vendor Payments for that date

**Expected:** Arun not listed (or shows ₹0 bill). Reversed bill excluded.

---

## 10. Module M8 — Reports

### TC-M8-001 | Client Bills report — all bills
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create 3 bills for different clients
2. Go to Reports > Client Bills, no filters

**Expected:** All 3 bills listed with Bill#, Client, Date, Net Amount.

---

### TC-M8-002 | Client Bills — filter by client
**Priority:** High | **Type:** Functional  
**Steps:**
1. Filter by Client = "Ravi Kumar"

**Expected:** Only Ravi's bills shown.

---

### TC-M8-003 | Client Bills — filter by date
**Priority:** High | **Type:** Functional  
**Steps:**
1. Filter by specific date

**Expected:** Only bills from that date shown.

---

### TC-M8-004 | Client Bills — reversed bill visible with badge
**Priority:** High | **Type:** Functional  
**Steps:**
1. Reverse a bill
2. View Client Bills report

**Expected:** Reversed bill shown with red REVERSED badge. Still in list (not hidden).

---

### TC-M8-005 | Vendor Bills report — by vendor
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create bills with multiple vendors
2. View Reports > Vendor Bills, filter by date

**Expected:** Each vendor shows their total. Items grouped by vendor. Active bills only.

---

### TC-M8-006 | Vendor Bills — reversed bills excluded
**Priority:** High | **Type:** Functional  
**Steps:**
1. Bill with Arun ₹2000 (active), Bill with Arun ₹1000 (reversed)
2. View Vendor Bills

**Expected:** Arun shows ₹2000 only. Reversed bill excluded.

---

### TC-M8-007 | Vendor Summary report — date range
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create bills spanning 2 weeks
2. View Vendor Summary with from/to date range

**Expected:** Each vendor's total for that range. Zero-amount vendors excluded.

---

### TC-M8-008 | Vendor Payment report — cumulative
**Priority:** High | **Type:** Functional  
**Steps:**
1. Record payments for multiple dates
2. View Vendor Payment Report

**Expected:** Total Bill, Total Paid, Total Pending per vendor (all dates combined).

---

### TC-M8-009 | Cash Drawer report — date range filter
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Set opening amounts for 5 dates
2. View Cash Drawer Report with from/to date

**Expected:** Only those dates in range shown. Sorted DESC.

---

### TC-M8-010 | Cash Drawer report — no dates without opening amounts
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. View Cash Drawer Report — dates with no opening set

**Expected:** Only dates where opening was explicitly saved appear.

---

### TC-M8-011 | Report empty state (no data)
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Clear all data, view all 5 report tabs

**Expected:** Each shows appropriate empty state message. No crash. No undefined errors.

---

### TC-M8-012 | Print bill from Client Bills report
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. Click print icon on a bill in Client Bills report

**Expected:** Print modal opens with correct bill data. Thermal receipt triggered.

---

### TC-M8-013 | Print Vendor Bill from Vendor Bills report
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. Click print on a vendor bill row

**Expected:** VendorBillPrint renders with vendor header, full vegetable names, total.

---

### TC-M8-014 | Print Vendor Summary
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. Click Print on Vendor Summary tab

**Expected:** VendorSummaryPrint renders 2-column layout (vendor | amount). Thermal 80mm.

---

### TC-M8-015 | Edit bill from Client Bills report
**Priority:** High | **Type:** Integration  
**Steps:**
1. Click pencil icon on active bill in Client Bills
2. Edit modal pre-filled with existing data
3. Modify and save

**Expected:** Bill updated. Report refreshes showing new values.

---

### TC-M8-016 | Reverse bill from Client Bills report
**Priority:** High | **Type:** Integration  
**Steps:**
1. Click Reverse on active bill
2. Confirm dialog

**Expected:** Bill reversed. Badge shows. All totals (cash, vendor) immediately updated.

---

### TC-M8-017 | No filters applied — shows all data
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Open each report tab with no filters

**Expected:** All data shown. No hidden records due to default filter state.

---

### TC-M8-018 | Clear filters resets results
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Apply date filter, observe filtered results
2. Clear date filter

**Expected:** All data returns to view.

---

### TC-M8-019 | Large dataset performance
**Priority:** Low | **Type:** Performance  
**Steps:**
1. Create 200+ bills
2. View Client Bills report with no filter

**Expected:** Loads within 5 seconds. No UI freeze. Scroll works.

---

### TC-M8-020 | Vendor with no bills in summary excluded
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Create vendor but never add to any bill
2. View Vendor Summary

**Expected:** Vendor NOT listed (HAVING SUM > 0 excludes them).

---

## 11. Module M9 — Settings & Configuration

### TC-M9-001 | Change language to Tamil and back
**Priority:** High | **Type:** Functional  
**Steps:**
1. Settings > Language: select Tamil
2. Observe UI: navigation labels, page titles, buttons in Tamil
3. Switch back to English

**Expected:** All UI text changes to Tamil. Switches back correctly. Bills still print with correct language.

---

### TC-M9-002 | Upload company logo
**Priority:** High | **Type:** Functional  
**Steps:**
1. Settings > Logo, click Upload
2. Select a PNG file < 2 MB
3. Save settings

**Expected:** Logo preview shown. Saved as base64. Appears in bill prints.

---

### TC-M9-003 | Reject logo > 2 MB
**Priority:** High | **Type:** Negative  
**Steps:**
1. Try to upload a 3 MB image

**Expected:** Error toast: "Image is too large." File not loaded.

---

### TC-M9-004 | Reset logo
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Upload logo, then click Reset

**Expected:** Logo removed. Preview area empty. Bill prints without logo.

---

### TC-M9-005 | Print toggle — disable logo in bills
**Priority:** High | **Type:** Functional  
**Steps:**
1. Upload logo
2. Settings > "Print Logo in Bill" → OFF
3. Print a bill

**Expected:** Logo absent from print output even though logo is set.

---

### TC-M9-006 | Print toggle — disable address/phone/footer
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Toggle off "Print Address", "Print Phone", "Print Footer"
2. Print a bill

**Expected:** Address, phone, footer all absent from print.

---

### TC-M9-007 | Change commission rate
**Priority:** High | **Type:** Functional  
**Steps:**
1. Change commission_rate from 10% to 15%
2. Create new bill: Subtotal=₹1000

**Expected:** Commission = ₹150. Net = 1000 - 150 - ChitCost.

---

### TC-M9-008 | Change chit cost per record
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Set chit_cost=₹10
2. Create bill with 3 items (Kg type: 1 chit each = 3 chits)

**Expected:** ChitCost = 3 × 10 = ₹30.

---

### TC-M9-009 | Change currency symbol
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Change currency to "$"
2. View billing page and bill print

**Expected:** $ shown instead of ₹ throughout.

---

### TC-M9-010 | Change theme colour
**Priority:** Low | **Type:** UI  
**Steps:**
1. Change theme to Blue

**Expected:** Nav/button/accent colours change immediately. Persists across navigation.

---

### TC-M9-011 | Clear All Data — confirm with "CLEAR"
**Priority:** High | **Type:** Functional  
**Steps:**
1. Create bills, receipts, clients, vendors, vegetables
2. Settings > Clear All Data
3. Type "CLEAR" in confirmation field and confirm

**Expected:** Backup created in %APPDATA%/backups/. All transaction data deleted. Config preserved. All lists empty. App functional.

---

### TC-M9-012 | Clear All Data — reject wrong confirmation text
**Priority:** Medium | **Type:** Negative  
**Steps:**
1. In Clear All Data dialog, type "clear" (lowercase) or "DELETE"
2. Click Confirm

**Expected:** Error: wrong confirmation text. Data NOT deleted.

---

### TC-M9-013 | Commission rate boundary — 0 and 100
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Set commission_rate = 0, verify bill
2. Set commission_rate = 100, verify bill
3. Try commission_rate = 101 (validation)

**Expected:** 0 and 100 accepted. 101 rejected (max=100 enforced). Negative rejected (min=0).

---

### TC-M9-014 | Company name change reflected in prints
**Priority:** Low | **Type:** Integration  
**Steps:**
1. Change company name to "Test Company Ltd"
2. Print a bill

**Expected:** "Test Company Ltd" appears in print header.

---

## 12. Module M10 — Print Functionality

### TC-M10-001 | Client bill print — 80mm width (no clipping)
**Priority:** High | **Type:** Print  
**Steps:**
1. Create a bill with 5 items of varying name lengths
2. Print

**Expected:** All text fits within 66mm content width. No text clipped at right edge. 3-column layout: 38% | 26% | 36%.

---

### TC-M10-002 | Client bill print — all content present
**Priority:** High | **Type:** Print  
**Steps:**
1. Print a bill with: logo, company name/address/phone, footer enabled

**Expected:** Receipt shows: Logo, Company Name, Address, Phone, Bill#, Date, Farmer Name, Items table, Subtotal, Commission, Chit Cost, Net Amount, Footer.

---

### TC-M10-003 | Short name used in client bill, full name in vendor bill
**Priority:** High | **Type:** Functional  
**Steps:**
1. Vegetable: Tomato (short: TMT)
2. Create bill → Print Client Bill and Vendor Bill

**Expected:** Client bill shows "TMT - Arun Traders". Vendor bill shows "Tomato".

---

### TC-M10-004 | Footer bilingual (always Tamil + English)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Language = English. Print bill with footer enabled.

**Expected:** Footer shows both English AND Tamil lines (bilingual regardless of UI language).

---

### TC-M10-005 | TVS printer auto-detection
**Priority:** High | **Type:** Integration  
**Steps:**
1. If TVS RP 3230 printer available: print a bill
2. If no TVS: print a bill

**Expected:** With TVS → silent print (no system dialog). Without TVS → system print dialog opens.

---

### TC-M10-006 | Print modal closes on success
**Priority:** Medium | **Type:** UX  
**Steps:**
1. Trigger print, complete print job

**Expected:** Modal auto-closes. Toast success.

---

### TC-M10-007 | Print modal stays open if cancelled
**Priority:** Medium | **Type:** UX  
**Steps:**
1. Trigger print, cancel from system dialog

**Expected:** Modal stays open. No success toast. User can retry.

---

### TC-M10-008 | Farmer receipt print — no company header/footer
**Priority:** High | **Type:** Print  
**Steps:**
1. Print a farmer receipt (arrival slip)

**Expected:** NO company name/address/logo/footer. Only: Receipt#, Date, Farmer Name, vegetable table with blank weight/amount columns and dotted borders.

---

### TC-M10-009 | Vendor summary print — 2-column layout
**Priority:** Medium | **Type:** Print  
**Steps:**
1. Print Vendor Summary report

**Expected:** Vendor Name (left) | Total Amount (right). Fits 80mm. Sorted or grouped.

---

### TC-M10-010 | Long vegetable name in print (wrapping)
**Priority:** Low | **Type:** Print  
**Steps:**
1. Vegetable with 30-char name, print bill

**Expected:** Text wraps within column. Doesn't overflow into adjacent column.

---

### TC-M10-011 | Print isolated from DOM (portal technique)
**Priority:** Low | **Type:** Technical  
**Steps:**
1. Print while navigation/modals are open

**Expected:** Only print-area content appears in print. No nav/modal elements appear.

---

### TC-M10-012 | Multiple print jobs sequentially
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Print bill #1, wait for completion
2. Immediately print bill #2

**Expected:** Both print correctly. No data bleed. State properly reset between prints.

---

## 13. Module M11 — SmartSelect Component

### TC-M11-001 | Search filtering (case-insensitive)
**Priority:** High | **Type:** Functional  
**Steps:**
1. Open SmartSelect for client field
2. Type "ravi"

**Expected:** "Ravi Kumar" appears (case-insensitive match). Others hidden.

---

### TC-M11-002 | Keyboard navigation (↑↓ Enter Esc)
**Priority:** High | **Type:** UX  
**Steps:**
1. Open dropdown
2. Press ↓ → highlight moves down
3. Press ↑ → highlight moves up
4. Press Enter → selects highlighted item
5. Press Esc → closes dropdown without selecting

**Expected:** All 4 keys work correctly.

---

### TC-M11-003 | Highlighted item scrolls into view
**Priority:** Medium | **Type:** UX  
**Steps:**
1. Dropdown with 20+ items
2. Press ↓ repeatedly to navigate past visible area

**Expected:** Highlighted item scrolls into view automatically.

---

### TC-M11-004 | Duplicate name detection on add
**Priority:** High | **Type:** Functional  
**Steps:**
1. "Ravi Kumar" already exists
2. Type "Ravi Kumar" in SmartSelect, click Add New
3. Enter name "Ravi Kumar" in inline form, click Create

**Expected:** Duplicate detected. Toast: "Ravi Kumar already exists." Existing record selected instead of creating duplicate.

---

### TC-M11-005 | Inline add form opens and closes
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Type new name, click "+ Add New"
2. Inline form appears at bottom of dropdown
3. Fill details, click Create

**Expected:** Record created. Dropdown closes. New record selected in parent field.

---

### TC-M11-006 | Inline add — cancel
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Open inline add form, click Cancel

**Expected:** Form collapses. Dropdown returns to list. Nothing created.

---

### TC-M11-007 | Empty search — shows all options
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Open SmartSelect, clear search input

**Expected:** All options listed.

---

### TC-M11-008 | No matches — shows "no results" state
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Type "XYZXYZ" (no matches)

**Expected:** "No results" message or empty list (with Add New option if onAdd provided).

---

### TC-M11-009 | Tamil phonetic search in SmartSelect
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Language = Tamil
2. Client with Tamil name "முருகன்" exists
3. In SmartSelect, type "murukan"

**Expected:** "முருகன்" appears in dropdown (phonetic transliteration search).

---

### TC-M11-010 | Full object returned (3rd arg onChange)
**Priority:** High | **Type:** Technical  
**Steps:**
1. Select vegetable in billing
2. Verify unit type auto-populates from full vegetable object

**Expected:** 3rd argument of onChange carries full {id, name, unit, shortName}. Unit used to auto-set unit type. No stale closure issue.

---

## 14. Module M12 — Tamil Language & Transliteration

### TC-M12-001 | Toggle to Tamil — UI labels change
**Priority:** High | **Type:** Functional  
**Steps:**
1. Settings > Language = Tamil
2. Navigate all pages

**Expected:** Navigation, page titles, buttons, labels all in Tamil. No English labels remain (except bilingual footer in prints).

---

### TC-M12-002 | Basic vowel transliteration
**Priority:** High | **Type:** Functional  
**Steps:**
1. In a TamilInput (Tamil mode), type: "a aa i ii u uu e ae ai o oa au"

**Expected:** Produces: அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ

---

### TC-M12-003 | Basic consonant transliteration
**Priority:** High | **Type:** Functional  
**Steps:**
1. Type: "ka na ma pa ta"

**Expected:** Each produces consonant + vowel marker. "ka"=க "na"=ந "ma"=ம "pa"=ப "ta"=த

---

### TC-M12-004 | Special uppercase consonants
**Priority:** High | **Type:** Functional  
**Steps:**
1. Type: "N T L R S" (uppercase)

**Expected:** N=ண T=ட L=ள R=ற S=ஸ (hard consonants).

---

### TC-M12-005 | Multi-char consonants
**Priority:** High | **Type:** Functional  
**Steps:**
1. Type: "ng zh sh th ch rr ll nn tt ksh"

**Expected:** ங ழ ஷ த ச ற ள ண ட க்ஷ

---

### TC-M12-006 | Backspace removes last Tamil grapheme
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Type "murukan" → "முருகன்"
2. Press Backspace 3 times

**Expected:** Last 3 graphemes removed one at a time.

---

### TC-M12-007 | Space commits engBuffer to Tamil
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Type "murukan" (no space), observe: building "முருகன்"
2. Press Space

**Expected:** Space commits current buffer. Next keystrokes start fresh.

---

### TC-M12-008 | Paste in Tamil input (no transliteration)
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Copy plain text "test" to clipboard
2. Paste in TamilInput (Tamil mode)

**Expected:** "test" inserted as-is (no transliteration). Paste is exempt.

---

### TC-M12-009 | Number/email/tel inputs bypass transliteration
**Priority:** High | **Type:** Functional  
**Steps:**
1. Language = Tamil
2. Type in phone number field, quantity field, rate field

**Expected:** No transliteration. Numbers type normally. Transliteration only for text fields.

---

### TC-M12-010 | Transliteration OFF in English mode
**Priority:** Medium | **Type:** Functional  
**Steps:**
1. Language = English
2. Type in any text field

**Expected:** Plain English input. No transliteration attempted.

---

### TC-M12-011 | Tamil input in Settings company name
**Priority:** Medium | **Type:** Integration  
**Steps:**
1. Language = Tamil, Settings > Company Name
2. Type Tamil company name phonetically

**Expected:** Tamil characters appear. Saved correctly. Printed in Tamil on bills.

---

### TC-M12-012 | Ctrl+X cut in Tamil input
**Priority:** Low | **Type:** Functional  
**Steps:**
1. Select text in Tamil input, press Ctrl+X

**Expected:** Text copied to clipboard. Selected text removed from input.

---

## 15. Module M13 — Business Logic & Calculations

### TC-M13-001 | Commission formula verification
**Priority:** High | **Type:** Business Logic  
**Formula:** Commission = Subtotal × (rate/100)  
**Test Cases:**

| Subtotal | Rate | Expected Commission |
|----------|------|-------------------|
| ₹1000 | 10% | ₹100.00 |
| ₹1234.56 | 10% | ₹123.456 → ₹123.46 (rounded) |
| ₹500 | 7.5% | ₹37.50 |
| ₹100 | 0% | ₹0.00 |
| ₹100 | 100% | ₹100.00 |

---

### TC-M13-002 | Chit cost — weight-based units (Kg, Ton) = 1 chit per item
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Bill: 1× Tomato (Kg, qty=100), 1× Banana (Ton, qty=5)
2. ChitCost = (1+1) × ₹5 = ₹10 (regardless of quantity)

**Expected:** Weight units always = 1 chit per item line, not qty-based.

---

### TC-M13-003 | Chit cost — count-based units (Box, Bag, Pcs) = qty chits per item
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Bill: 1× Brinjal (Box, qty=20), 1× Potato (Bag, qty=15), 1× Something (Pcs, qty=50)
2. ChitCost = (20+15+50) × ₹5 = ₹425

**Expected:** Count units use qty as number of chits.

---

### TC-M13-004 | Mixed unit types — combined chit cost
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Items: Tomato Kg qty=10 (1 chit), Onion Kg qty=20 (1 chit), Brinjal Box qty=5 (5 chits), Banana Ton qty=2 (1 chit)
2. Total chits = 1+1+5+1 = 8, ChitCost = 8×5 = ₹40

**Expected:** Chits correctly computed per unit type.

---

### TC-M13-005 | Net amount = Subtotal - Commission - ChitCost
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Subtotal=₹1000, Commission=₹100, ChitCost=₹25
2. Expected Net = ₹875

**Expected:** Exact match. No rounding error.

---

### TC-M13-006 | Fractional chit cost — decimal chit_cost per record
**Priority:** Medium | **Type:** Business Logic  
**Steps:**
1. Set chit_cost = ₹2.50
2. Bill: Box qty=4 → 4 chits × ₹2.50 = ₹10.00

**Expected:** Fractional chit cost handled correctly. 4 × 2.50 = ₹10.00.

---

### TC-M13-007 | Item price = qty × rate (per item)
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Item: Qty=12.5, Rate=₹8.40
2. Price = 12.5 × 8.40 = ₹105.00

**Expected:** Per-item price calculated to 2dp.

---

### TC-M13-008 | Subtotal = SUM of all item prices
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Items: Price1=₹105, Price2=₹200, Price3=₹75
2. Subtotal = ₹380

**Expected:** Exact sum. No floating-point accumulation error.

---

### TC-M13-009 | Decimal precision — 2dp throughout
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Qty=3, Rate=₹0.333333 (6dp)
2. Price = 3 × 0.333333 = ₹0.999999 → displayed as ₹1.00?

**Expected:** App rounds consistently. No display of >2dp values in totals.

---

### TC-M13-010 | Bill number daily reset sequence
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Day A: create bills → 001, 002, 003
2. Day B: first bill → 001
3. Day A again: next bill → 004

**Expected:** Each date maintains own sequence. Gaps don't reset. Days are independent.

---

### TC-M13-011 | Receipt number daily reset sequence
**Priority:** High | **Type:** Business Logic  
**Steps:** Same as above but for RCPT-YYYYMMDD-NNN format.

**Expected:** RCPT prefix, same daily-reset logic.

---

### TC-M13-012 | Cash drawer closing balance = Opening - Total Net (active bills)
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Opening=₹10,000. Bills: Net1=₹2,500, Net2=₹3,000 (total ₹5,500)
2. Closing = ₹4,500

**Expected:** Exact match.

---

### TC-M13-013 | Vendor payment pending = bill - paid
**Priority:** High | **Type:** Business Logic  
**Steps:**
1. Vendor bill=₹5,000, paid=₹2,000
2. Pending = ₹3,000

**Expected:** Accurate pending shown.

---

### TC-M13-014 | Large dataset: floating point accumulation
**Priority:** Medium | **Type:** Business Logic  
**Steps:**
1. 100 items, each Rate=₹0.10, Qty=1 → Price=₹0.10 each
2. Subtotal expected = ₹10.00

**Expected:** No floating-point drift (10.000000000001 etc.). Accurate sum.

---

## 16. Module M14 — Data Integrity & Atomicity

### TC-M14-001 | Bill save is atomic (items + header together)
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Create bill with 3 items, simulate interruption (check DB)

**Expected:** Either all (header + all 3 items) saved, or nothing saved. No partial state.

---

### TC-M14-002 | Bill update is atomic (delete old + insert new)
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Edit bill: remove 2 items, add 1 new item
2. Verify old items gone, new items present, no orphans

**Expected:** Old items fully deleted, new items fully inserted. No old-item remnants.

---

### TC-M14-003 | Farmer receipt save atomic
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Save receipt with 3 vegetable items

**Expected:** FarmerReceipts + FarmerReceiptItems saved together atomically.

---

### TC-M14-004 | Vendor payments batch save atomic
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Save payments for 3 vendors simultaneously

**Expected:** All 3 upserted or none (transaction). If one fails validation, none saved.

---

### TC-M14-005 | Clear All Data — backup created before delete
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Create data, run Clear All Data
2. Check %APPDATA%\kks-commission-mundy\backups\

**Expected:** Backup file CommissionMundy_backup_YYYY-MM-DD_HH-MM-SS.db exists before data deleted.

---

### TC-M14-006 | Clear All Data — Config preserved
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Set custom commission rate, company name, theme
2. Run Clear All Data
3. Check settings

**Expected:** All Config values preserved. Commission rate, company name, theme all intact.

---

### TC-M14-007 | Reversed bill excluded from all aggregates
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Create bill. Reverse it.
2. Check: Vendor Bills, Cash Drawer, Vendor Payments, Vendor Summary

**Expected:** Reversed bill contributes ₹0 to all aggregates. Only appears in Client Bills with badge.

---

### TC-M14-008 | Vendor names snapshot at bill-save time
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Create bill with Vendor "Arun Traders"
2. Rename vendor to "Arun & Co" in Vendors master
3. View existing bill in Client Bills report

**Expected:** Bill still shows "Arun Traders" (snapshotted at save). New bills use "Arun & Co".

---

### TC-M14-009 | Bill number uniqueness (no duplicates)
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Rapidly create multiple bills for same date (rapid-click test)

**Expected:** Each bill gets unique sequential number. No duplicates (bill_number UNIQUE constraint).

---

### TC-M14-010 | Receipt number uniqueness
**Priority:** High | **Type:** Data Integrity  
**Steps:**
1. Rapid save multiple receipts

**Expected:** All unique RCPT numbers. No duplicates.

---

## 17. Module M15 — Edge Cases & Boundary Values

### TC-M15-001 | Zero commission rate bill
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Commission rate = 0%, create bill Subtotal=₹1000
2. Net = ₹1000 - ₹0 - ChitCost

**Expected:** Commission = ₹0. Net correctly calculated.

---

### TC-M15-002 | Zero chit cost
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Chit cost = ₹0, create bill with 5 items
2. ChitCost = ₹0

**Expected:** Net = Subtotal - Commission (no chit deduction).

---

### TC-M15-003 | Negative net amount display
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Commission rate = 80%, chit_cost = ₹50, bill Subtotal=₹1
2. Net = 1 - 0.80 - 50 = -₹49.80

**Expected:** Net shown in red. Bill still saves. Print shows negative amount.

---

### TC-M15-004 | Maximum bill number in a day (999 bills)
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Create 999 bills in one day (using automation or data seed)
2. Create bill #1000

**Expected:** Bill# = YYYYMMDD-1000 (no fixed 3-digit limit — pads with leading zeros as needed). No crash.

---

### TC-M15-005 | Qty = 0.01 (minimum positive decimal)
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Item: Qty=0.01, Rate=₹100 → Price=₹1.00

**Expected:** Price correctly calculated.

---

### TC-M15-006 | Rate = 0.01 (minimum positive price)
**Priority:** Medium | **Type:** Boundary  
**Steps:**
1. Item: Qty=100, Rate=₹0.01 → Price=₹1.00

**Expected:** Price correctly calculated.

---

### TC-M15-007 | Empty reports (no data state)
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Fresh database, open all 5 report tabs

**Expected:** Each shows empty state. No errors. No undefined/null display.

---

### TC-M15-008 | Special characters in names
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Create client: name = "O'Brien & Sons Ltd. #1"
2. Create vegetable: name = "Chilly (Green) / Extra-Hot"
3. Create bill with both, print

**Expected:** Special chars saved and displayed correctly. No SQL injection. Print renders without issues.

---

### TC-M15-009 | Very long name in print
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Client name = 50 characters, vendor name = 40 characters
2. Create bill, print

**Expected:** Names wrap/truncate gracefully in 80mm width. No layout break.

---

### TC-M15-010 | Rapid date changes in vendor payments
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. Vendor Payments: rapidly change date 5 times
2. Observe final loaded state

**Expected:** Only the last selected date's data shown. No race condition mixing data from multiple dates. loadingRef guard prevents overlap.

---

### TC-M15-011 | Logo with non-image file (extension trick)
**Priority:** Medium | **Type:** Security  
**Steps:**
1. Rename a text file as "logo.png", try to upload

**Expected:** App may accept (picks by extension) but base64 encodes as-is. Preview may show broken image. No crash. No code execution.

---

### TC-M15-012 | Very long address in print
**Priority:** Low | **Type:** Edge Case  
**Steps:**
1. Company address = 3 lines of 60 chars each
2. Print a bill

**Expected:** Address wraps within 80mm width. Doesn't overflow to next section.

---

### TC-M15-013 | Open Billing with no master data (no clients/vendors/vegetables)
**Priority:** High | **Type:** Edge Case  
**Steps:**
1. Clear all data (preserves Config)
2. Open Billing page, try to add an item

**Expected:** SmartSelect shows empty list with Add New option. App doesn't crash.

---

### TC-M15-014 | Switch UI language during active billing session
**Priority:** Medium | **Type:** Edge Case  
**Steps:**
1. In-progress bill with items
2. Navigate to Settings, change language
3. Return to Billing

**Expected:** UI language changes. Partially entered bill data preserved. No loss of in-progress data.

---

### TC-M15-015 | Backspace to empty SmartSelect field
**Priority:** Low | **Type:** Edge Case  
**Steps:**
1. Select a client in billing
2. Clear the client field using backspace

**Expected:** Client deselected. Totals reset. Validation shows client required on save attempt.

---

### TC-M15-016 | Database file missing at startup
**Priority:** High | **Type:** Fault Tolerance  
**Steps:**
1. Close app, manually delete/rename CommissionMundy.db
2. Relaunch app

**Expected:** App creates a fresh database with all schema/migrations. Starts cleanly. No crash.

---

## 18. Test Execution Results

| TC ID | Description | Priority | Status | Pass/Fail | Notes |
|-------|-------------|----------|--------|-----------|-------|
| TC-M1-001 | Add vegetable all fields | High | | | |
| TC-M1-002 | Add vegetable name only | High | | | |
| TC-M1-003 | Add vegetable empty name | High | | | |
| TC-M1-004 | Whitespace-only name | High | | | |
| TC-M1-005 | Edit vegetable name/short | Medium | | | |
| TC-M1-006 | Change unit type | Medium | | | |
| TC-M1-007 | Delete with confirmation | Medium | | | |
| TC-M1-008 | Cancel delete | Medium | | | |
| TC-M1-009 | Search by name | Medium | | | |
| TC-M1-010 | Search by short name | Low | | | |
| TC-M1-011 | All units in dropdown | Low | | | |
| TC-M1-012 | Large list performance | Low | | | |
| TC-M2-001 | Add client all fields | High | | | |
| TC-M2-002 | Add client name only | High | | | |
| TC-M2-003 | Empty name validation | High | | | |
| TC-M2-004 | Phone any format | High | | | |
| TC-M2-005 | Edit client name | Medium | | | |
| TC-M2-006 | Delete client | Medium | | | |
| TC-M2-007 | Search clients | Medium | | | |
| TC-M2-008 | Tamil name client | Medium | | | |
| TC-M2-009 | Cancel add modal | Low | | | |
| TC-M2-010 | Long address | Low | | | |
| TC-M3-001 | Add vendor all fields | High | | | |
| TC-M3-003 | Empty vendor name | High | | | |
| TC-M3-010B | Vendor delete — no cascade | Medium | | | |
| TC-M4-001 | Create bill happy path | High | | | |
| TC-M4-002 | Multi-item mixed units | High | | | |
| TC-M4-003 | Bill# increments daily | High | | | |
| TC-M4-004 | Bill# resets new date | High | | | |
| TC-M4-005 | No client validation | High | | | |
| TC-M4-006 | No items validation | High | | | |
| TC-M4-007 | Item missing fields | High | | | |
| TC-M4-008 | Unit auto-populated | High | | | |
| TC-M4-009 | Real-time recalculation | High | | | |
| TC-M4-010 | Add/remove item rows | High | | | |
| TC-M4-011 | Load receipt into billing | High | | | |
| TC-M4-012 | Banner dismissable | Medium | | | |
| TC-M4-013 | Edit existing bill | High | | | |
| TC-M4-014 | Reverse bill | High | | | |
| TC-M4-015 | Edit reversed bill error | High | | | |
| TC-M4-016 | Negative net amount | Medium | | | |
| TC-M4-017 | Zero quantity | Medium | | | |
| TC-M4-018 | Zero rate | Medium | | | |
| TC-M4-019 | Fractional quantity | Medium | | | |
| TC-M4-020 | Same veg different vendors | Medium | | | |
| TC-M4-021 | Large qty×rate values | Low | | | |
| TC-M4-022 | Commission 0% | Medium | | | |
| TC-M4-023 | Commission 100% | Medium | | | |
| TC-M4-024 | Chit cost = ₹0 | Low | | | |
| TC-M4-025 | Inline add client | Medium | | | |
| TC-M4-026 | Inline add vegetable | Medium | | | |
| TC-M4-027 | Past/future date bills | Low | | | |
| TC-M4-028 | Chit formula all units | High | | | |
| TC-M5-001 | Farmer receipt happy path | High | | | |
| TC-M5-002 | Receipt# daily reset | High | | | |
| TC-M5-003 | No client validation | High | | | |
| TC-M5-004 | No vegetables validation | High | | | |
| TC-M5-005 | Missing vegetable selection | High | | | |
| TC-M5-006 | Multiple receipts same day | High | | | |
| TC-M5-007 | Receipt print layout | Medium | | | |
| TC-M5-008 | Short name persisted | Medium | | | |
| TC-M5-009 | Inline add in receipt | Medium | | | |
| TC-M5-010 | Remove receipt item | Medium | | | |
| TC-M5-011 | Load receipt into billing | High | | | |
| TC-M5-012 | No banner without receipt | Medium | | | |
| TC-M5-013 | Cancel receipt | Low | | | |
| TC-M5-014 | 20 items in receipt | Low | | | |
| TC-M6-001 | Set opening amount | High | | | |
| TC-M6-002 | Closing balance calc | High | | | |
| TC-M6-003 | Reversed bills excluded | High | | | |
| TC-M6-004 | No cards for unset date | High | | | |
| TC-M6-005 | Save button disabled empty | High | | | |
| TC-M6-006 | Reset opening amount | Medium | | | |
| TC-M6-007 | Reset hidden no record | Medium | | | |
| TC-M6-008 | Date navigation | Medium | | | |
| TC-M6-009 | Open amount = ₹0 | Medium | | | |
| TC-M6-010 | Negative amount rejected | Medium | | | |
| TC-M6-011 | Non-numeric rejected | Medium | | | |
| TC-M6-012 | Cash drawer report range | Low | | | |
| TC-M7-001 | Load vendor bills | High | | | |
| TC-M7-002 | Enter payment | High | | | |
| TC-M7-003 | Pay in Full button | High | | | |
| TC-M7-004 | Batch save | High | | | |
| TC-M7-005 | All-settled banner | High | | | |
| TC-M7-006 | Overpayment rejected | High | | | |
| TC-M7-007 | Negative payment | High | | | |
| TC-M7-008 | Non-numeric payment | High | | | |
| TC-M7-009 | Stale payment detection | High | | | |
| TC-M7-010 | Date change guard | Medium | | | |
| TC-M7-011 | ₹0 bill vendors hidden | Medium | | | |
| TC-M7-012 | Rounds to 2dp on blur | Medium | | | |
| TC-M7-013 | Cumulative payments report | Low | | | |
| TC-M7-014 | Re-fetch live bill on save | Medium | | | |
| TC-M7-015 | ₹0 payment allowed | Low | | | |
| TC-M7-016 | Reversed bill excluded VP | High | | | |
| TC-M8-001 | Client bills all | High | | | |
| TC-M8-002 | Filter by client | High | | | |
| TC-M8-003 | Filter by date | High | | | |
| TC-M8-004 | Reversed badge visible | High | | | |
| TC-M8-005 | Vendor bills by vendor | High | | | |
| TC-M8-006 | Vendor bills reversed excl | High | | | |
| TC-M8-007 | Vendor summary date range | High | | | |
| TC-M8-008 | Vendor payment cumulative | High | | | |
| TC-M8-009 | Cash drawer date range | Medium | | | |
| TC-M8-010 | Cash drawer no unset dates | Medium | | | |
| TC-M8-011 | Empty state all tabs | Medium | | | |
| TC-M8-012 | Print bill from report | Medium | | | |
| TC-M8-013 | Print vendor bill | Medium | | | |
| TC-M8-014 | Print vendor summary | Medium | | | |
| TC-M8-015 | Edit bill from report | High | | | |
| TC-M8-016 | Reverse bill from report | High | | | |
| TC-M8-017 | No filters shows all | Medium | | | |
| TC-M8-018 | Clear filters resets | Low | | | |
| TC-M8-019 | Large dataset perf | Low | | | |
| TC-M8-020 | Vendor no bills excluded | Low | | | |
| TC-M9-001 | Language toggle Tamil/EN | High | | | |
| TC-M9-002 | Upload company logo | High | | | |
| TC-M9-003 | Reject logo > 2MB | High | | | |
| TC-M9-004 | Reset logo | Medium | | | |
| TC-M9-005 | Logo disabled in print | High | | | |
| TC-M9-006 | Disable address/phone/footer | Medium | | | |
| TC-M9-007 | Change commission rate | High | | | |
| TC-M9-008 | Change chit cost | Medium | | | |
| TC-M9-009 | Change currency symbol | Low | | | |
| TC-M9-010 | Change theme colour | Low | | | |
| TC-M9-011 | Clear all data CLEAR | High | | | |
| TC-M9-012 | Clear all wrong text | Medium | | | |
| TC-M9-013 | Commission rate 0 and 100 | Medium | | | |
| TC-M9-014 | Company name in print | Low | | | |
| TC-M10-001 | 80mm no clipping | High | | | |
| TC-M10-002 | All content in print | High | | | |
| TC-M10-003 | Short name client, full vendor | High | | | |
| TC-M10-004 | Footer bilingual | High | | | |
| TC-M10-005 | TVS auto-detection | High | | | |
| TC-M10-006 | Modal closes on success | Medium | | | |
| TC-M10-007 | Modal stays on cancel | Medium | | | |
| TC-M10-008 | Farmer receipt no header | High | | | |
| TC-M10-009 | Vendor summary 2-col | Medium | | | |
| TC-M10-010 | Long name wrapping | Low | | | |
| TC-M10-011 | Print DOM isolation | Low | | | |
| TC-M10-012 | Sequential print jobs | Low | | | |
| TC-M11-001 | Case-insensitive search | High | | | |
| TC-M11-002 | Keyboard navigation | High | | | |
| TC-M11-003 | Scroll into view | Medium | | | |
| TC-M11-004 | Duplicate name detection | High | | | |
| TC-M11-005 | Inline add open/close | Medium | | | |
| TC-M11-006 | Inline add cancel | Medium | | | |
| TC-M11-007 | Empty search shows all | Medium | | | |
| TC-M11-008 | No matches state | Low | | | |
| TC-M11-009 | Tamil phonetic search | Medium | | | |
| TC-M11-010 | Full object 3rd arg | High | | | |
| TC-M12-001 | Tamil UI labels | High | | | |
| TC-M12-002 | Vowel transliteration | High | | | |
| TC-M12-003 | Consonant transliteration | High | | | |
| TC-M12-004 | Uppercase consonants | High | | | |
| TC-M12-005 | Multi-char consonants | High | | | |
| TC-M12-006 | Backspace grapheme | Medium | | | |
| TC-M12-007 | Space commits buffer | Medium | | | |
| TC-M12-008 | Paste no transliteration | Medium | | | |
| TC-M12-009 | Number fields bypass | High | | | |
| TC-M12-010 | English mode no transliteration | Medium | | | |
| TC-M12-011 | Tamil in Settings | Medium | | | |
| TC-M12-012 | Ctrl+X cut | Low | | | |
| TC-M13-001 | Commission formula | High | | | |
| TC-M13-002 | Chit cost weight units | High | | | |
| TC-M13-003 | Chit cost count units | High | | | |
| TC-M13-004 | Mixed unit chit cost | High | | | |
| TC-M13-005 | Net = Sub - Comm - Chit | High | | | |
| TC-M13-006 | Fractional chit cost | Medium | | | |
| TC-M13-007 | Item price = qty × rate | High | | | |
| TC-M13-008 | Subtotal = SUM prices | High | | | |
| TC-M13-009 | Decimal precision 2dp | High | | | |
| TC-M13-010 | Bill number daily reset | High | | | |
| TC-M13-011 | Receipt number daily reset | High | | | |
| TC-M13-012 | Cash drawer closing calc | High | | | |
| TC-M13-013 | Vendor pending = bill-paid | High | | | |
| TC-M13-014 | Float accumulation | Medium | | | |
| TC-M14-001 | Bill save atomic | High | | | |
| TC-M14-002 | Bill update atomic | High | | | |
| TC-M14-003 | Receipt save atomic | High | | | |
| TC-M14-004 | Vendor payments atomic | High | | | |
| TC-M14-005 | Clear data backup | High | | | |
| TC-M14-006 | Clear data Config preserved | High | | | |
| TC-M14-007 | Reversed excluded all agg | High | | | |
| TC-M14-008 | Vendor name snapshot | High | | | |
| TC-M14-009 | Bill# uniqueness | High | | | |
| TC-M14-010 | Receipt# uniqueness | High | | | |
| TC-M15-001 | Zero commission | High | | | |
| TC-M15-002 | Zero chit cost | High | | | |
| TC-M15-003 | Negative net display | High | | | |
| TC-M15-004 | 999+ bills in a day | Medium | | | |
| TC-M15-005 | Qty = 0.01 | Medium | | | |
| TC-M15-006 | Rate = 0.01 | Medium | | | |
| TC-M15-007 | Empty reports state | High | | | |
| TC-M15-008 | Special chars in names | High | | | |
| TC-M15-009 | Long name in print | Medium | | | |
| TC-M15-010 | Rapid date changes VP | Medium | | | |
| TC-M15-011 | Non-image logo upload | Medium | | | |
| TC-M15-012 | Long address in print | Low | | | |
| TC-M15-013 | No master data state | High | | | |
| TC-M15-014 | Language switch mid-session | Medium | | | |
| TC-M15-015 | Clear SmartSelect field | Low | | | |
| TC-M15-016 | DB missing at startup | High | | | |

---

*Document generated: 2026-06-07 | KKS Commission Mundy QA — 200 Test Cases across 15 modules*
