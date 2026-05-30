import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitLabel } from '../lib/units'

const DASH  = '─'.repeat(72)
const THICK = '═'.repeat(72)

/* ─── Client Bill ─────────────────────────────────────────────── */
export function ClientBillPrint({ bill, config, onClose }) {
  const { t, logo } = useLanguage()
  const company      = config.company_name    || 'KKS Commission Mundy'
  const currency     = config.currency_symbol || '₹'
  const showLogo     = config.print_logo_in_bill === '1' && !!logo

  function fmtC(n) { return `${currency}${parseFloat(n || 0).toFixed(2)}` }

  return (
    <PrintModal onClose={onClose} title={t('print.clientBill')}>
      <div className="font-mono text-sm leading-relaxed">
        {/* Header */}
        <div className="text-center mb-4">
          {showLogo && (
            <img src={logo} alt="logo" className="mx-auto mb-2 h-16 w-16 object-contain" />
          )}
          <p className="text-xl font-bold tracking-widest uppercase">{company}</p>
        </div>

        {/* Meta */}
        <div className="flex justify-between mb-1">
          <span><strong>{t('print.billNo')}:</strong> {bill.billNumber}</span>
          <span><strong>{t('print.date')}:</strong> {bill.date}</span>
        </div>
        <div className="mb-3">
          <span><strong>{t('print.client')}:</strong> {bill.clientName}</span>
        </div>

        <p className="text-slate-400 mb-0">{DASH}</p>

        {/* Table header */}
        <table className="w-full text-sm mb-0">
          <thead>
            <tr className="font-bold">
              <td className="w-6 py-1">#</td>
              <td className="py-1">{t('print.vegetable')}</td>
              <td className="py-1">{t('print.vendor')}</td>
              <td className="py-1 text-right">{t('print.units')}</td>
              <td className="py-1 text-right">{t('print.rate')}</td>
              <td className="py-1 text-right">{t('print.price')}</td>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="py-0.5 text-slate-500">{i + 1}</td>
                <td className="py-0.5">{item.vegetableName}</td>
                <td className="py-0.5">{item.vendorName}</td>
                <td className="py-0.5 text-right">{item.units} {getUnitLabel(item.unitType, t)}</td>
                <td className="py-0.5 text-right">{fmtC(item.rate)}</td>
                <td className="py-0.5 text-right">{fmtC(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-slate-400 mt-0 mb-1">{DASH}</p>

        {/* Totals */}
        <div className="space-y-0.5 text-sm">
          <div className="flex justify-between">
            <span>{t('print.subTotal')}:</span>
            <span>{fmtC(bill.subTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('print.commission')} ({bill.commissionRate}%):</span>
            <span>− {fmtC(bill.commissionAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('print.chitCost')} ({bill.itemCount} {t('print.records')} × {fmtC(bill.chitCostPerRecord)}):</span>
            <span>− {fmtC(bill.totalChitCost)}</span>
          </div>
        </div>

        <p className="text-slate-400 my-1">{DASH}</p>

        {/* Net */}
        <div className="flex justify-between font-bold text-base">
          <span>{t('print.netPayable')}:</span>
          <span>{fmtC(bill.netAmount)}</span>
        </div>

        <p className="text-slate-400 my-1">{DASH}</p>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-3">
          <p>{t('print.thankYou')}</p>
          <p>{company}</p>
        </div>
      </div>
    </PrintModal>
  )
}

/* ─── Vendor Bill ─────────────────────────────────────────────── */
export function VendorBillPrint({ bill, config, onClose }) {
  const { t, logo } = useLanguage()
  const company      = config.company_name    || 'KKS Commission Mundy'
  const currency     = config.currency_symbol || '₹'
  const showLogo     = config.print_logo_in_bill === '1' && !!logo

  function fmtC(n) { return `${currency}${parseFloat(n || 0).toFixed(2)}` }

  return (
    <PrintModal onClose={onClose} title={t('print.vendorBill')}>
      <div className="font-mono text-sm leading-relaxed">
        {/* Header */}
        <div className="text-center mb-4">
          {showLogo && (
            <img src={logo} alt="logo" className="mx-auto mb-2 h-16 w-16 object-contain" />
          )}
          <p className="text-xl font-bold tracking-widest uppercase">{company}</p>
          <p className="text-sm tracking-widest uppercase text-slate-600">{t('print.vendorBill')}</p>
        </div>

        {/* Meta */}
        <div className="flex justify-between mb-1">
          <span><strong>{t('print.vendor')}:</strong> {bill.vendorName}</span>
          <span><strong>{t('print.date')}:</strong> {bill.date}</span>
        </div>
        {bill.vendorPhone && (
          <div className="mb-3">
            <span><strong>{t('print.phone')}:</strong> {bill.vendorPhone}</span>
          </div>
        )}

        <p className="text-slate-400 mb-0">{THICK}</p>

        {/* Table header */}
        <table className="w-full text-sm mb-0">
          <thead>
            <tr className="font-bold">
              <td className="w-6 py-1">#</td>
              <td className="py-1">{t('print.billNo')}</td>
              <td className="py-1">{t('print.vegetable')}</td>
              <td className="py-1 text-right">{t('print.units')}</td>
              <td className="py-1 text-right">{t('print.rate')}</td>
              <td className="py-1 text-right">{t('print.price')}</td>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="py-0.5 text-slate-500">{i + 1}</td>
                <td className="py-0.5 text-brand-700">{item.billNumber}</td>
                <td className="py-0.5">{item.vegetableName}</td>
                <td className="py-0.5 text-right">{item.units} {getUnitLabel(item.unitType, t)}</td>
                <td className="py-0.5 text-right">{fmtC(item.rate)}</td>
                <td className="py-0.5 text-right">{fmtC(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-slate-400 mt-0 mb-1">{THICK}</p>

        {/* Total */}
        <div className="flex justify-between font-bold text-base">
          <span>{t('print.totalBillValue')}:</span>
          <span>{fmtC(bill.totalAmount)}</span>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-4">
          <p>{t('print.thankYou')}</p>
          <p>{company}</p>
        </div>
      </div>
    </PrintModal>
  )
}

/* ─── Shared print modal wrapper ──────────────────────────────── */
function PrintModal({ title, children, onClose }) {
  const { t } = useLanguage()

  function handlePrint() { window.print() }

  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Modal toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">{title} {t('print.preview')}</h2>
            <div className="flex items-center gap-2">
              <button className="btn-primary py-1.5 text-xs" onClick={handlePrint}>
                <Printer size={14} /> {t('print.print')}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Bill preview */}
          <div className="overflow-y-auto flex-1 p-8 bg-slate-50">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-lg mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only area */}
      <div id="print-area">
        <div className="p-8">{children}</div>
      </div>
    </>
  )
}
