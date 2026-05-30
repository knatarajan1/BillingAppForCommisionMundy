import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { useLanguage } from '../lib/LanguageContext'
import { getShortUnitLabel } from '../lib/units'

/**
 * Thermal receipt print for TVS RP 3230 (3-inch / 80mm paper).
 *
 * Print isolation strategy:
 *  - PrintModal mounts #print-area via createPortal(…, document.body)
 *    so it is a DIRECT <body> child in the DOM.
 *  - CSS: body > *:not(#print-area) { display:none } hides everything else
 *    without touching #print-area, avoiding the Chromium print-pipeline
 *    bug where position:fixed children of display:none parents render blank.
 *
 * Layout (72mm content = 80mm page − 4mm padding each side):
 *  - Logo 40px top-left, company name to the right (flex row)
 *  - Items: 3-column table (no headers) — 48% item | 22% qty+rate | 30% total
 *  - Rate shown as sub-line under qty in the qty column
 */

/* ─── Client Bill ─────────────────────────────────────────────── */
export function ClientBillPrint({ bill, config, onClose }) {
  const { t, logo } = useLanguage()
  const company  = config.company_name    || 'KKS Commission Mundy'
  const addr     = config.company_address || ''
  const phone    = config.company_phone   || ''
  const currency = config.currency_symbol || '₹'
  const showLogo = config.print_logo_in_bill === '1' && !!logo

  const fmt = n => `${currency}${parseFloat(n || 0).toFixed(2)}`

  return (
    <PrintModal onClose={onClose} title={t('print.clientBill')}>
      <div className="rcp">

        {/* ── Header: logo (top-left) + company name ── */}
        <div className="rcp-header">
          {showLogo && <img className="rcp-logo" src={logo} alt="" />}
          <div className="rcp-co">
            <div className="rcp-co-name">{company}</div>
            {addr  && <div className="rcp-co-sub">{addr}</div>}
            {phone && <div className="rcp-co-sub">{t('print.phone')}: {phone}</div>}
          </div>
        </div>

        <hr className="rcp-div" />

        {/* ── Bill info ── */}
        <div className="rcp-kv">
          <span className="k">{t('print.billNo')}:</span>
          <span className="v" style={{fontWeight:700}}>{bill.billNumber}</span>
        </div>
        <div className="rcp-kv">
          <span className="k">{t('print.date')}:</span>
          <span className="v">{bill.date}</span>
        </div>
        <div className="rcp-meta">
          <span style={{fontWeight:600}}>{t('print.client')}:</span> {bill.clientName}
        </div>

        <hr className="rcp-div" />

        {/* ── Items table (no headers) ── */}
        <table>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="col-item">{item.vegetableName}</td>
                <td className="col-qty">
                  {item.units} {getShortUnitLabel(item.unitType)}
                  <div className="item-sub">@ {fmt(item.rate)}</div>
                </td>
                <td className="col-price">{fmt(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="rcp-div" />

        {/* ── Totals ── */}
        <div className="rcp-totals">
          <div className="rcp-row">
            <span className="lbl">{t('print.subTotal')}:</span>
            <span className="amt">{fmt(bill.subTotal)}</span>
          </div>
          <div className="rcp-row">
            <span className="lbl">{t('print.commission')}:</span>
            <span className="amt" style={{color:'#c00'}}>− {fmt(bill.commissionAmount)}</span>
          </div>
          <div className="rcp-row">
            <span className="lbl">{t('print.chitCost')}:</span>
            <span className="amt" style={{color:'#c00'}}>− {fmt(bill.totalChitCost)}</span>
          </div>
        </div>

        <hr className="rcp-div2" />

        {/* ── Net payable ── */}
        <div className="rcp-net">
          <span>{t('print.netPayable')}:</span>
          <span style={{color: bill.netAmount < 0 ? '#c00' : '#000'}}>{fmt(bill.netAmount)}</span>
        </div>

        <hr className="rcp-div2" />

        {/* ── Footer ── */}
        <div className="rcp-footer">
          <p>{t('print.thankYou')}</p>
          <p><strong>{t('print.visitAgain')}</strong></p>
        </div>

      </div>
    </PrintModal>
  )
}

/* ─── Vendor Bill ─────────────────────────────────────────────── */
export function VendorBillPrint({ bill, config, onClose }) {
  const { t, logo } = useLanguage()
  const company  = config.company_name    || 'KKS Commission Mundy'
  const addr     = config.company_address || ''
  const phone    = config.company_phone   || ''
  const currency = config.currency_symbol || '₹'
  const showLogo = config.print_logo_in_bill === '1' && !!logo

  const fmt = n => `${currency}${parseFloat(n || 0).toFixed(2)}`

  return (
    <PrintModal onClose={onClose} title={t('print.vendorBill')}>
      <div className="rcp">

        {/* ── Header: logo (top-left) + company name ── */}
        <div className="rcp-header">
          {showLogo && <img className="rcp-logo" src={logo} alt="" />}
          <div className="rcp-co">
            <div className="rcp-co-name">{company}</div>
            {addr  && <div className="rcp-co-sub">{addr}</div>}
            {phone && <div className="rcp-co-sub">{t('print.phone')}: {phone}</div>}
          </div>
        </div>

        <hr className="rcp-div2" />

        {/* ── Vendor info ── */}
        <div className="rcp-meta" style={{fontWeight:700, fontSize:'13px'}}>
          {t('print.vendorBill')}
        </div>
        <div className="rcp-kv">
          <span className="k">{t('print.vendor')}:</span>
          <span className="v" style={{fontWeight:600}}>{bill.vendorName}</span>
        </div>
        {bill.vendorPhone && (
          <div className="rcp-kv">
            <span className="k">{t('print.phone')}:</span>
            <span className="v">{bill.vendorPhone}</span>
          </div>
        )}
        {bill.date && (
          <div className="rcp-kv">
            <span className="k">{t('print.date')}:</span>
            <span className="v">{bill.date}</span>
          </div>
        )}

        <hr className="rcp-div2" />

        {/* ── Items table (no headers; bill# kept in DB, not printed) ── */}
        <table>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="col-item">{item.vegetableName}</td>
                <td className="col-qty">
                  {item.units} {getShortUnitLabel(item.unitType)}
                  <div className="item-sub">@ {fmt(item.rate)}</div>
                </td>
                <td className="col-price">{fmt(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="rcp-div2" />

        {/* ── Grand total ── */}
        <div className="rcp-net">
          <span>{t('print.totalBillValue')}:</span>
          <span>{fmt(bill.totalAmount)}</span>
        </div>

        <hr className="rcp-div2" />

        {/* ── Footer ── */}
        <div className="rcp-footer">
          <p>{t('print.thankYou')}</p>
          <p><strong>{t('print.visitAgain')}</strong></p>
        </div>

      </div>
    </PrintModal>
  )
}

/* ─── Shared print modal wrapper ──────────────────────────────── */
function PrintModal({ title, children, onClose }) {
  const { t } = useLanguage()

  return (
    <>
      {/* Screen overlay — hidden during print via .no-print */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">{title} — {t('print.preview')}</h2>
            <div className="flex items-center gap-2">
              <button className="btn-primary py-1 text-xs" onClick={() => window.print()}>
                <Printer size={13} /> {t('print.print')}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={15} />
              </button>
            </div>
          </div>
          {/* Preview — narrow to match 80mm paper */}
          <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
            <div className="bg-white border border-slate-200 rounded-lg p-4 mx-auto" style={{maxWidth:'280px'}}>
              {children}
            </div>
          </div>
        </div>
      </div>

      {/*
       * Print-only area — portaled directly onto document.body.
       * This makes #print-area a DIRECT <body> child so the CSS rule
       * "body > *:not(#print-area) { display:none }" hides everything
       * else without suppressing #print-area's rendering.
       */}
      {createPortal(
        <div id="print-area">{children}</div>,
        document.body
      )}
    </>
  )
}
