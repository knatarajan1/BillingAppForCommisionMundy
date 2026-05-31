import { useState, useEffect, useCallback, useRef } from 'react'
import { Banknote, RefreshCw, Save, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useLanguage } from '../lib/LanguageContext'

const api = window.electronAPI
const today = () => new Date().toISOString().slice(0, 10)

export default function VendorPayments() {
  const { t } = useLanguage()

  const [date, setDate]               = useState(today())
  const [pendingDate, setPendingDate] = useState(null)    // staged date while confirming
  const [rows, setRows]               = useState([])
  const [paidMap, setPaidMap]         = useState({})      // vendorId → string
  const [errors, setErrors]           = useState({})      // vendorId → error string
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [dirty, setDirty]             = useState(false)
  const loadingRef = useRef(false)    // prevents race condition on rapid date change

  const loadVendorBills = useCallback(async (targetDate) => {
    const d = targetDate || date
    if (!d) return
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setDirty(false)
    setErrors({})
    try {
      const data = await api.vendorPayments.getByDate(d)
      setRows(data)
      const init = {}
      for (const r of data) {
        // Pre-fill from stored value; if stale (paid > bill) start at bill amount
        init[r.vendorId] = r.paidAmount > 0
          ? String(r.isStale ? r.billAmount : r.paidAmount)
          : ''
      }
      setPaidMap(init)
    } catch (err) {
      toast.error(err.message || t('vendorPayments.loadError'))
      setRows([])
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [date, t])

  useEffect(() => { loadVendorBills(date) }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date change with unsaved-changes guard ──
  function requestDateChange(newDate) {
    if (!newDate || newDate === date) return
    if (dirty) {
      setPendingDate(newDate)
    } else {
      setDate(newDate)
    }
  }

  function confirmDateSwitch() {
    setDate(pendingDate)
    setPendingDate(null)
    setDirty(false)
  }

  function cancelDateSwitch() {
    setPendingDate(null)
  }

  // ── Per-row input handling ──
  function validatePaid(vendorId, raw) {
    if (raw === '' || raw === undefined) return ''   // empty = 0, valid
    const n = parseFloat(raw)
    if (isNaN(n))   return t('vendorPayments.invalidAmount')
    if (n < 0)      return t('vendorPayments.invalidAmount')
    const row = rows.find(r => r.vendorId === vendorId)
    if (row && n > row.billAmount)
      return t('vendorPayments.overpayError').replace('{name}', row.vendorName)
    return ''
  }

  function updatePaid(vendorId, raw) {
    const err = validatePaid(vendorId, raw)
    setErrors(prev => ({ ...prev, [vendorId]: err }))
    setPaidMap(prev => ({ ...prev, [vendorId]: raw }))
    setDirty(true)
  }

  function handleBlur(vendorId) {
    // Normalise: round to 2 dp on blur, replace empty with ''
    const raw = paidMap[vendorId]
    if (raw === '' || raw === undefined) return
    const n = parseFloat(raw)
    if (!isNaN(n) && n >= 0) {
      const rounded = parseFloat(n.toFixed(2)).toString()
      setPaidMap(prev => ({ ...prev, [vendorId]: rounded }))
    }
  }

  function handleFillFull(vendorId) {
    const row = rows.find(r => r.vendorId === vendorId)
    if (!row) return
    const val = String(row.billAmount)
    setErrors(prev => ({ ...prev, [vendorId]: '' }))
    setPaidMap(prev => ({ ...prev, [vendorId]: val }))
    setDirty(true)
  }

  // ── Save ──
  async function handleSave() {
    // Re-validate all before saving
    const newErrors = {}
    let hasError = false
    for (const row of rows) {
      const err = validatePaid(row.vendorId, paidMap[row.vendorId])
      if (err) { newErrors[row.vendorId] = err; hasError = true }
    }
    if (hasError) {
      setErrors(newErrors)
      toast.error(t('vendorPayments.fixErrorsBeforeSave'))
      return
    }

    // Check for any stale-row that wasn't adjusted
    const staleVendors = rows.filter(r => r.isStale)
    if (staleVendors.length > 0) {
      // Warn but do not block — user may have already adjusted the values
    }

    setSaving(true)
    try {
      const payments = rows.map(r => ({
        vendorId:   r.vendorId,
        vendorName: r.vendorName,
        billDate:   date,
        billAmount: r.billAmount,
        paidAmount: parseFloat(paidMap[r.vendorId] || '0') || 0,
      }))
      await api.vendorPayments.save(payments)
      toast.success(t('vendorPayments.saveSuccess'))
      setDirty(false)
      await loadVendorBills(date)
    } catch (err) {
      toast.error(err.message || t('vendorPayments.saveError'))
    } finally {
      setSaving(false)
    }
  }

  // ── Derived totals ──
  const fmtC = n => `₹${parseFloat(n || 0).toFixed(2)}`

  const totalBill    = rows.reduce((s, r) => s + r.billAmount, 0)
  const totalPaid    = rows.reduce((s, r) => s + Math.min(parseFloat(paidMap[r.vendorId] || '0') || 0, r.billAmount), 0)
  const totalPending = parseFloat((totalBill - totalPaid).toFixed(2))
  const allSettled   = rows.length > 0 && rows.every(r => {
    const paid = parseFloat(paidMap[r.vendorId] || '0') || 0
    return paid >= r.billAmount
  })
  const hasValidationErrors = Object.values(errors).some(Boolean)
  const hasStale = rows.some(r => r.isStale)

  return (
    <div>
      <PageHeader title={t('vendorPayments.title')} subtitle={t('vendorPayments.subtitle')} />

      {/* ── Date picker + actions ── */}
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">{t('common.date')}</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => requestDateChange(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary py-2"
            onClick={() => loadVendorBills(date)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {rows.length > 0 && (
            <button
              className="btn-primary py-2 ml-auto"
              onClick={handleSave}
              disabled={saving || !dirty || hasValidationErrors}
            >
              <Save size={15} />
              {saving ? t('common.saving') : t('vendorPayments.savePayments')}
            </button>
          )}
        </div>
      </div>

      {/* ── Unsaved-changes date-switch confirmation ── */}
      {pendingDate && (
        <div className="card p-4 mb-5 border border-amber-300 bg-amber-50">
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span className="text-sm text-amber-800 flex-1">{t('vendorPayments.confirmDateChange')}</span>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              onClick={confirmDateSwitch}
            >
              {t('vendorPayments.discardSwitch')}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={cancelDateSwitch}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── Stale-data global banner ── */}
      {!loading && hasStale && (
        <div className="card p-3 mb-4 border border-orange-300 bg-orange-50 flex items-start gap-2">
          <AlertCircle size={15} className="text-orange-500 shrink-0 mt-0.5" />
          <span className="text-xs text-orange-800">{t('vendorPayments.staleGlobalWarning')}</span>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500 text-sm">{t('common.loading')}</div>

      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Banknote}
            title={t('vendorPayments.noVendors')}
            description={t('vendorPayments.noVendorsDesc')}
          />
        </div>

      ) : (
        <>
          {/* ── All-settled success banner ── */}
          {allSettled && !dirty && (
            <div className="card p-4 mb-4 border border-green-300 bg-green-50 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 text-sm">{t('vendorPayments.allPaidTitle')}</p>
                <p className="text-xs text-green-600">{t('vendorPayments.allPaidDesc')}</p>
              </div>
            </div>
          )}

          {/* ── Vendor table ── */}
          <div className="card overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">
                {t('vendorPayments.billsFor')} {date}
              </span>
              <span className="text-xs text-slate-400">
                {rows.length} {t('vendorPayments.vendors')}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header text-left">{t('vendorPayments.vendorName')}</th>
                  <th className="table-header text-right">{t('vendorPayments.billAmount')}</th>
                  <th className="table-header text-center">{t('vendorPayments.paidAmount')}</th>
                  <th className="table-header text-right">{t('vendorPayments.pendingAmount')}</th>
                  <th className="table-header text-center w-24">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const rawVal   = paidMap[row.vendorId] ?? ''
                  const paid     = Math.max(0, parseFloat(rawVal || '0') || 0)
                  const pending  = parseFloat((row.billAmount - paid).toFixed(2))
                  const isFullyPaid = pending <= 0
                  const rowError = errors[row.vendorId]

                  return (
                    <tr
                      key={row.vendorId}
                      className={`
                        ${isFullyPaid && !rowError ? 'bg-green-50/50' : ''}
                        ${row.isStale ? 'bg-orange-50/60' : ''}
                        ${rowError ? 'bg-red-50/50' : ''}
                        hover:bg-slate-50/60
                      `}
                    >
                      {/* Vendor name */}
                      <td className="table-cell">
                        <div className="font-medium truncate max-w-40">{row.vendorName}</div>
                        {row.isStale && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertCircle size={11} className="text-orange-500" />
                            <span className="text-xs text-orange-600">{t('vendorPayments.staleWarning')}</span>
                          </div>
                        )}
                      </td>

                      {/* Bill amount */}
                      <td className="table-cell text-right font-semibold text-slate-700">
                        {fmtC(row.billAmount)}
                      </td>

                      {/* Paid amount input */}
                      <td className="table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <div className="relative max-w-36 w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={row.billAmount}
                              step="0.01"
                              placeholder="0.00"
                              className={`input pl-6 text-right text-sm py-1.5 w-full ${
                                rowError ? 'border-red-400 focus:ring-red-300' : ''
                              }`}
                              value={rawVal}
                              onChange={e => updatePaid(row.vendorId, e.target.value)}
                              onBlur={() => handleBlur(row.vendorId)}
                            />
                          </div>
                          {rowError && (
                            <p className="text-xs text-red-600 text-center max-w-36">{rowError}</p>
                          )}
                        </div>
                      </td>

                      {/* Pending */}
                      <td className={`table-cell text-right font-semibold ${
                        rowError ? 'text-red-500' :
                        pending <= 0 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {rowError ? '—' : fmtC(Math.max(0, pending))}
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center">
                        {isFullyPaid && !rowError ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 size={13} /> {t('vendorPayments.paidLabel')}
                          </span>
                        ) : !rowError ? (
                          <button
                            className="text-xs text-brand-600 hover:text-brand-800 font-medium underline underline-offset-2"
                            onClick={() => handleFillFull(row.vendorId)}
                            title={t('vendorPayments.fillFullTitle')}
                          >
                            {t('vendorPayments.fillFull')}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Summary footer ── */}
          <div className="card p-4 mb-3">
            <div className="flex flex-wrap gap-6 justify-end text-sm">
              <div className="text-center">
                <p className="text-slate-500 text-xs mb-0.5">{t('vendorPayments.totalBill')}</p>
                <p className="font-bold text-slate-700">{fmtC(totalBill)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-xs mb-0.5">{t('vendorPayments.totalPaid')}</p>
                <p className="font-bold text-green-600">{fmtC(totalPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-xs mb-0.5">{t('vendorPayments.totalPending')}</p>
                <p className={`font-bold text-base ${
                  totalPending <= 0 ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {fmtC(Math.max(0, totalPending))}
                </p>
              </div>
            </div>
          </div>

          {/* ── Unsaved-changes reminder bar ── */}
          {dirty && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs text-amber-700">{t('vendorPayments.unsavedChanges')}</span>
              </div>
              <button
                className="btn-primary py-1.5 text-xs"
                onClick={handleSave}
                disabled={saving || hasValidationErrors}
              >
                <Save size={13} />
                {saving ? t('common.saving') : t('vendorPayments.savePayments')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
