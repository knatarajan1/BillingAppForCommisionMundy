import { useState, useEffect, useMemo } from 'react'
import { Printer, ChevronDown, Users, Truck, FileText, Wallet, Banknote, Edit, RotateCcw, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SmartSelect from '../components/SmartSelect'
import { ClientBillPrint, VendorBillPrint, VendorSummaryPrint } from '../components/BillPrint'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitLabel, getUnitOptions } from '../lib/units'

const api = window.electronAPI

export default function Reports() {
  const { t } = useLanguage()
  const [tab,     setTab]     = useState('client')
  const [clients,    setClients]    = useState([])
  const [vendors,    setVendors]    = useState([])
  const [vegetables, setVegetables] = useState([])
  const [config,     setConfig]     = useState({})

  const [clientId, setClientId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [date,     setDate]     = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const [results,       setResults]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [printBill,     setPrintBill]     = useState(null)
  const [printSummary,  setPrintSummary]  = useState(null)
  const [editBill,      setEditBill]      = useState(null)
  const [reverseConfirm, setReverseConfirm] = useState(null)
  const [reversing,     setReversing]     = useState(false)

  useEffect(() => {
    Promise.all([api.clients.getAll(), api.vendors.getAll(), api.config.getAll(), api.vegetables.getAll()])
      .then(([c, v, cfg, vegs]) => { setClients(c); setVendors(v); setConfig(cfg); setVegetables(vegs) })
      .catch(() => toast.error(t('master.loadError')))
  }, [])

  async function handleSearch() {
    setLoading(true)
    try {
      if (tab === 'client') {
        setResults(await api.transactions.getClientBills(clientId || null, date || null))
      } else if (tab === 'vendor') {
        setResults(await api.transactions.getVendorBills(vendorId || null, date || null))
      } else if (tab === 'vendor-summary') {
        setResults(await api.transactions.getVendorSummary(fromDate || null, toDate || null))
      } else if (tab === 'cash-drawer') {
        setResults(await api.cashDrawer.getHistory(fromDate || null, toDate || null))
      } else if (tab === 'vendor-payment') {
        setResults(await api.vendorPayments.report(vendorId || null))
      }
    } catch (err) {
      toast.error(err.message || t('master.loadError'))
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setClientId(''); setVendorId(''); setDate('')
    setFromDate(''); setToDate('')
    setResults([])
  }

  async function handleUpdate(updatedBill) {
    setEditBill(null)
    setPrintBill(updatedBill)
    // Refresh the current result set silently
    try {
      if (tab === 'client') setResults(await api.transactions.getClientBills(clientId || null, date || null))
    } catch { /* ignore */ }
    toast.success(t('billing.billUpdated').replace('{billNumber}', updatedBill.billNumber))
  }

  async function handleReverse() {
    if (!reverseConfirm) return
    setReversing(true)
    try {
      await api.transactions.reverse(reverseConfirm.transactionId)
      toast.success(t('billing.reversedSuccess').replace('{billNumber}', reverseConfirm.billNumber))
      setReverseConfirm(null)
      if (tab === 'client') setResults(await api.transactions.getClientBills(clientId || null, date || null))
    } catch (err) {
      toast.error(err.message || t('master.operationFailed'))
    } finally {
      setReversing(false)
    }
  }

  const hasFilters = clientId || vendorId || date || fromDate || toDate

  return (
    <div>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-200 rounded-xl w-fit mb-5 no-print">
        {[
          { id: 'client',         labelKey: 'reports.clientBills',        icon: Users    },
          { id: 'vendor',         labelKey: 'reports.vendorBills',        icon: Truck    },
          { id: 'vendor-summary', labelKey: 'reports.vendorSummary',      icon: FileText },
          { id: 'cash-drawer',    labelKey: 'reports.cashDrawerReport',   icon: Wallet   },
          { id: 'vendor-payment', labelKey: 'reports.vendorPaymentReport', icon: Banknote },
        ].map(tab_ => (
          <button key={tab_.id}
            onClick={() => { setTab(tab_.id); setResults([]) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === tab_.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}>
            <tab_.icon size={15} /> {t(tab_.labelKey)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 no-print">
        <div className="flex flex-wrap items-end gap-4">
          {tab === 'client' && (
            <div className="w-52">
              <label className="label">{t('billing.client')}</label>
              <div className="relative">
                <select className="input pr-8 appearance-none" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">{t('reports.allClients')}</option>
                  {clients.map(c => <option key={c.clientId} value={c.clientId}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          {tab === 'vendor' && (
            <div className="w-52">
              <label className="label">{t('billing.vendor')}</label>
              <div className="relative">
                <select className="input pr-8 appearance-none" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                  <option value="">{t('reports.allVendors')}</option>
                  {vendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          {tab === 'client' || tab === 'vendor' ? (
            <div>
              <label className="label">{t('common.date')}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          ) : tab === 'vendor-summary' || tab === 'cash-drawer' ? (
            <>
              <div>
                <label className="label">{t('reports.fromDate')}</label>
                <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('reports.toDate')}</label>
                <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </>
          ) : tab === 'vendor-payment' ? (
            <div className="w-52">
              <label className="label">{t('billing.vendor')}</label>
              <div className="relative">
                <select className="input pr-8 appearance-none" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                  <option value="">{t('reports.allVendors')}</option>
                  {vendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          ) : null}
          <button className="btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? t('common.loading') : t('reports.generateReport')}
          </button>
          {hasFilters && (
            <button className="btn-secondary" onClick={clearFilters}>{t('common.clear')}</button>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title={t('reports.noData')} description={t('reports.noDataDesc')} />
        </div>
      ) : tab === 'client' ? (
        <ClientBills bills={results} config={config} onPrint={setPrintBill}
          onEdit={setEditBill} onReverse={setReverseConfirm} />
      ) : tab === 'vendor' ? (
        <VendorBills bills={results} config={config} onPrint={setPrintBill} />
      ) : tab === 'vendor-summary' ? (
        <VendorSummary rows={results} config={config} fromDate={fromDate} toDate={toDate} onPrint={setPrintSummary} />
      ) : tab === 'cash-drawer' ? (
        <CashDrawerReport rows={results} config={config} />
      ) : tab === 'vendor-payment' ? (
        <VendorPaymentReport rows={results} config={config} />
      ) : null}

      {printBill && (tab === 'client' || editBill) && (
        <ClientBillPrint bill={printBill} config={config} onClose={() => setPrintBill(null)} />
      )}
      {printBill && tab === 'vendor' && !editBill && (
        <VendorBillPrint bill={printBill} config={config} onClose={() => setPrintBill(null)} />
      )}
      {printSummary && (
        <VendorSummaryPrint data={printSummary} config={config} onClose={() => setPrintSummary(null)} />
      )}

      {/* Edit Bill Modal */}
      {editBill && (
        <EditBillModal
          bill={editBill} config={config}
          vegetables={vegetables} vendors={vendors} clients={clients}
          onClose={() => setEditBill(null)}
          onUpdated={handleUpdate}
        />
      )}

      {/* Reverse confirmation dialog */}
      {reverseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReverseConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('billing.reverseBill')}</h2>
            <p className="text-sm text-slate-600">
              {t('billing.confirmReverse').replace('{billNumber}', reverseConfirm.billNumber)}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setReverseConfirm(null)} disabled={reversing}>
                {t('common.cancel')}
              </button>
              <button className="btn-danger" onClick={handleReverse} disabled={reversing}>
                <RotateCcw size={14} /> {reversing ? t('common.saving') : t('billing.confirmReverseBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientBills({ bills, config, onPrint, onEdit, onReverse }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const grandTotal = useMemo(
    () => bills.filter(b => b.status !== 'reversed').reduce((s, b) => s + (b.netAmount || 0), 0),
    [bills]
  )

  return (
    <div className="space-y-4">
      {bills.map(bill => {
        const isReversed = bill.status === 'reversed'
        return (
        <div key={bill.transactionId} className={`card overflow-hidden ${isReversed ? 'opacity-60' : ''}`}>
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <span className="font-bold text-brand-700 text-sm">{bill.billNumber}</span>
            {isReversed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                {t('billing.reversed')}
              </span>
            )}
            <span className="text-slate-600 text-sm font-medium">{bill.clientName}</span>
            <span className="text-slate-400 text-xs">{bill.date}</span>
            <span className="ml-auto text-xs text-slate-500">
              {t('reports.commission')}: <strong>{fmtC(bill.commissionAmount)}</strong>
              {' · '}{t('reports.chit')}: <strong>{fmtC(bill.totalChitCost)}</strong>
            </span>
            <span className={`font-bold text-sm ${bill.netAmount < 0 ? 'text-red-600' : isReversed ? 'text-slate-400' : 'text-brand-700'}`}>
              {t('reports.net')}: {fmtC(bill.netAmount)}
            </span>
            <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => onPrint(bill)}>
              <Printer size={13} /> {t('common.print')}
            </button>
            {!isReversed && (
              <>
                <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => onEdit(bill)}>
                  <Edit size={13} /> {t('billing.editBill')}
                </button>
                <button className="btn-danger py-1 px-2.5 text-xs"
                  onClick={() => onReverse({ transactionId: bill.transactionId, billNumber: bill.billNumber })}>
                  <RotateCcw size={13} /> {t('billing.reverseBill')}
                </button>
              </>
            )}
          </div>
          {bill.items && bill.items.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[t('reports.vegetable'), t('billing.vendor'), t('reports.qty'), t('reports.rate'), `${t('reports.price')} (${currency})`].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="table-cell">{item.vegetableName}</td>
                    <td className="table-cell">{item.vendorName}</td>
                    <td className="table-cell">{item.units} {getUnitLabel(item.unitType, t)}</td>
                    <td className="table-cell">{fmtC(item.rate)}</td>
                    <td className="table-cell font-medium">{fmtC(item.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={4} className="table-cell text-right font-semibold text-slate-600">{t('reports.subtotal')}</td>
                  <td className="table-cell font-bold text-slate-800">{fmtC(bill.subTotal)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        )
      })}
      <div className="card p-4 flex justify-end">
        <div className="text-sm">
          <span className="text-slate-500 mr-3">{t('reports.grandTotalNet')}</span>
          <span className="font-bold text-lg text-brand-700">{fmtC(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

function VendorBills({ bills, config, onPrint }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const grandTotal = useMemo(
    () => bills.reduce((s, b) => s + (b.totalAmount || 0), 0),
    [bills]
  )

  return (
    <div className="space-y-4">
      {bills.map((bill, gi) => (
        <div key={gi} className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
            <div>
              <span className="text-slate-600 text-sm font-medium">{bill.vendorName}</span>
              {bill.vendorPhone && <span className="text-slate-400 text-xs ml-2">· {bill.vendorPhone}</span>}
            </div>
            {bill.date && <span className="text-slate-400 text-xs">{bill.date}</span>}
            <span className="ml-auto font-bold text-sm text-brand-700">
              {t('reports.total')}: {fmtC(bill.totalAmount)}
            </span>
            <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => onPrint(bill)}>
              <Printer size={13} /> {t('common.print')}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[t('reports.billNo'), t('reports.vegetable'), t('reports.qty'), t('reports.rate'), `${t('reports.amount')} (${currency})`].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="table-cell text-brand-700 font-medium">{item.billNumber}</td>
                  <td className="table-cell">{item.vegetableName}</td>
                  <td className="table-cell">{item.units} {getUnitLabel(item.unitType, t)}</td>
                  <td className="table-cell">{fmtC(item.rate)}</td>
                  <td className="table-cell font-medium">{fmtC(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="card p-4 flex justify-end">
        <div className="text-sm">
          <span className="text-slate-500 mr-3">{t('reports.grandTotal')}</span>
          <span className="font-bold text-lg text-brand-700">{fmtC(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}

function VendorSummary({ rows, config, fromDate, toDate, onPrint }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0),
    [rows]
  )

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-700 text-sm">{t('print.vendorSummary')}</span>
          {(fromDate || toDate) && (
            <span className="text-slate-400 text-xs ml-3">
              {fromDate || '—'} → {toDate || '—'}
            </span>
          )}
        </div>
        <button className="btn-secondary py-1 px-2.5 text-xs"
          onClick={() => onPrint({ rows, fromDate, toDate })}>
          <Printer size={13} /> {t('common.print')}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header text-left">{t('billing.vendor')}</th>
            <th className="table-header text-right">{t('reports.amount')} ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              <td className="table-cell">
                <div>{row.vendorName}</div>
                {row.vendorPhone && <div className="text-xs text-slate-400">{row.vendorPhone}</div>}
              </td>
              <td className="table-cell text-right font-semibold text-brand-700">{fmtC(row.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td className="table-cell font-bold text-slate-700">{t('print.totalPayable')}</td>
            <td className="table-cell text-right font-bold text-lg text-brand-700">{fmtC(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function CashDrawerReport({ rows, config }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const totOpening = rows.reduce((s, r) => s + (r.openingAmount || 0), 0)
  const totPaid    = rows.reduce((s, r) => s + (r.totalPaid    || 0), 0)
  const totClosing = rows.reduce((s, r) => s + (r.closingAmount || 0), 0)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <span className="font-bold text-slate-700 text-sm">{t('reports.cashDrawerReport')}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header text-left">{t('common.date')}</th>
            <th className="table-header text-right">{t('cashDrawer.openingAmount')} ({currency})</th>
            <th className="table-header text-right">{t('cashDrawer.totalBillsPaid')} ({currency})</th>
            <th className="table-header text-right">{t('cashDrawer.closingAmount')} ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              <td className="table-cell font-medium">{row.date}</td>
              <td className="table-cell text-right text-blue-700 font-semibold">{fmtC(row.openingAmount)}</td>
              <td className="table-cell text-right text-amber-600 font-semibold">{fmtC(row.totalPaid)}</td>
              <td className={`table-cell text-right font-bold ${row.closingAmount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {fmtC(row.closingAmount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td className="table-cell font-bold text-slate-700">{t('reports.grandTotal')}</td>
            <td className="table-cell text-right font-bold text-blue-700">{fmtC(totOpening)}</td>
            <td className="table-cell text-right font-bold text-amber-600">{fmtC(totPaid)}</td>
            <td className={`table-cell text-right font-bold text-lg ${totClosing < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmtC(totClosing)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function EditBillModal({ bill, config, vegetables, vendors, clients, onClose, onUpdated }) {
  const { t } = useLanguage()
  const UNIT_OPTIONS = getUnitOptions(t)
  const currency = config.currency_symbol || '₹'

  const CLIENT_FIELDS = [
    { key: 'name',  label: t('common.name'),  span2: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone', label: t('common.phone'), type: 'tel', placeholder: t('common.placeholder.phone') },
  ]
  const VENDOR_FIELDS = [
    { key: 'name',  label: t('common.name'),  span2: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone', label: t('common.phone'), type: 'tel', placeholder: t('common.placeholder.phone') },
  ]
  const VEG_FIELDS = [
    { key: 'name', label: t('common.name'), placeholder: t('vegetables.placeholder') },
    { key: 'unit', label: t('vegetables.unit'), type: 'select', defaultValue: 'Kg', options: UNIT_OPTIONS },
  ]

  function emptyItem() {
    return { vegetableId: '', vegetableName: '', vendorId: '', vendorName: '', units: '', unitType: 'Kg', rate: '', price: '' }
  }

  const [clientId,   setClientId]   = useState(bill.clientId   || '')
  const [clientName, setClientName] = useState(bill.clientName || '')
  const [date,       setDate]       = useState(bill.date || '')
  const [items,      setItems]      = useState(
    bill.items && bill.items.length > 0
      ? bill.items.map(i => ({ ...i, units: String(i.units), rate: String(i.rate) }))
      : [emptyItem()]
  )
  const [saving, setSaving] = useState(false)

  // Local lists (start from parent props; updated on inline-add)
  const [localVegs,     setLocalVegs]     = useState(vegetables)
  const [localVendors,  setLocalVendors]  = useState(vendors)
  const [localClients,  setLocalClients]  = useState(clients)
  useEffect(() => { setLocalVegs(vegetables) },   [vegetables])
  useEffect(() => { setLocalVendors(vendors) },   [vendors])
  useEffect(() => { setLocalClients(clients) },   [clients])

  const commissionRate    = parseFloat(config.commission_rate)      || 0
  const chitCostPerRecord = parseFloat(config.chit_cost_per_record) || 0

  const { computedItems, subTotal, commissionAmount, totalChitCost, netAmount } = useMemo(() => {
    const computedItems = items.map(it => ({
      ...it,
      price: it.units && it.rate
        ? parseFloat((parseFloat(it.units) * parseFloat(it.rate)).toFixed(2))
        : 0,
    }))
    const subTotal         = computedItems.reduce((s, i) => s + (i.price || 0), 0)
    const commissionAmount = parseFloat((subTotal * commissionRate / 100).toFixed(2))
    const totalChitUnits   = items.reduce((s, item) => {
      const isWeight = item.unitType === 'Kg' || item.unitType === 'Ton'
      return s + (isWeight ? 1 : (parseFloat(item.units) || 1))
    }, 0)
    const totalChitCost    = parseFloat((totalChitUnits * chitCostPerRecord).toFixed(2))
    const netAmount        = parseFloat((subTotal - commissionAmount - totalChitCost).toFixed(2))
    return { computedItems, subTotal, commissionAmount, totalChitCost, netAmount }
  }, [items, commissionRate, chitCostPerRecord])

  function updateItem(idx, field, val) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  async function handleAddVegetable(data) {
    const added = await api.vegetables.add(data)
    setLocalVegs(prev => [...prev, added])
    return { vegetableId: added.vegetableId, name: added.name, unit: added.unit }
  }
  async function handleAddVendor(data) {
    const added = await api.vendors.add(data)
    setLocalVendors(prev => [...prev, added])
    return { vendorId: added.vendorId, name: added.name }
  }
  async function handleAddClient(data) {
    const added = await api.clients.add(data)
    setLocalClients(prev => [...prev, added])
    return { clientId: added.clientId, name: added.name }
  }

  async function handleSave() {
    if (!clientId) return toast.error(t('billing.selectClientErr'))
    if (items.some(i => !i.vegetableId || !i.vendorId || !i.units || !i.rate)) {
      return toast.error(t('billing.fillAllErr'))
    }
    setSaving(true)
    try {
      const result = await api.transactions.update({
        transactionId: bill.transactionId,
        clientId, clientName,
        items: computedItems, commissionRate, chitCostPerRecord, date,
      })
      onUpdated(result)
    } catch (err) {
      toast.error(err.message || t('master.operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">
            {t('billing.editBill')} — {bill.billNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Client + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('billing.client')}</label>
              <SmartSelect value={clientId}
                onChange={(id, name) => { setClientId(id); setClientName(name) }}
                options={localClients} idKey="clientId" nameKey="name"
                placeholder={t('billing.selectClient')} entityLabel={t('billing.client.label')}
                addFields={CLIENT_FIELDS} onAdd={handleAddClient} />
            </div>
            <div>
              <label className="label">{t('common.date')}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{t('billing.items')}</h3>
              <button className="btn-primary py-1 text-xs" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus size={13} /> {t('billing.addItem')}
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-4 relative group">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">{t('billing.vegetable')}</label>
                      <SmartSelect value={item.vegetableId}
                        onChange={(id, name, obj) => {
                          setItems(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], vegetableId: id, vegetableName: name, unitType: obj?.unit || 'Kg' }
                            return next
                          })
                        }}
                        options={localVegs} idKey="vegetableId" nameKey="name"
                        placeholder={t('billing.selectVegetable')} entityLabel={t('billing.vegetable.label')}
                        addFields={VEG_FIELDS} onAdd={handleAddVegetable} />
                    </div>
                    <div>
                      <label className="label">{t('billing.vendor')}</label>
                      <SmartSelect value={item.vendorId}
                        onChange={(id, name) => {
                          setItems(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], vendorId: id, vendorName: name }
                            return next
                          })
                        }}
                        options={localVendors} idKey="vendorId" nameKey="name"
                        placeholder={t('billing.selectVendor')} entityLabel={t('billing.vendor.label')}
                        addFields={VENDOR_FIELDS} onAdd={handleAddVendor} />
                    </div>
                    <div>
                      <label className="label">{t('billing.quantity')}</label>
                      <div className="flex gap-2">
                        <input type="number" min="0" step="0.01" placeholder="0.00" className="input flex-1"
                          value={item.units} onChange={e => updateItem(idx, 'units', e.target.value)} />
                        <div className="relative w-20">
                          <select className="input pr-6 appearance-none" value={item.unitType}
                            onChange={e => updateItem(idx, 'unitType', e.target.value)}>
                            {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="label">{t('billing.rate')} ({currency}/unit)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" className="input"
                        value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                    </div>
                  </div>
                  {item.units && item.rate && (
                    <div className="mt-2 text-right text-xs text-slate-500">
                      {t('billing.price')}: <span className="font-semibold text-brand-700">
                        {currency}{(parseFloat(item.units) * parseFloat(item.rate)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {items.length > 1 && (
                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('billing.subtotal')}</span>
              <span className="font-medium">{currency}{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('billing.commission')} ({commissionRate}%)</span>
              <span className="font-medium text-amber-600">− {currency}{commissionAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('billing.chit')} ({parseFloat(totalChitUnits.toFixed(2))} × {currency}{chitCostPerRecord})</span>
              <span className="font-medium text-amber-600">− {currency}{totalChitCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-semibold text-slate-700">{t('billing.netAmount')}</span>
              <span className={`font-bold text-base ${netAmount < 0 ? 'text-red-600' : 'text-brand-700'}`}>
                {currency}{netAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('billing.updateBill')}
          </button>
        </div>
      </div>
    </div>
  )
}

function VendorPaymentReport({ rows, config }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const totBill    = rows.reduce((s, r) => s + (r.totalBill    || 0), 0)
  const totPaid    = rows.reduce((s, r) => s + (r.totalPaid    || 0), 0)
  const totPending = rows.reduce((s, r) => s + (r.totalPending || 0), 0)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
        <span className="font-bold text-slate-700 text-sm">{t('reports.vendorPaymentReport')}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header text-left">{t('billing.vendor')}</th>
            <th className="table-header text-right">{t('vendorPayments.totalBill')} ({currency})</th>
            <th className="table-header text-right">{t('vendorPayments.totalPaid')} ({currency})</th>
            <th className="table-header text-right">{t('vendorPayments.totalPending')} ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              <td className="table-cell font-medium">{row.vendorName}</td>
              <td className="table-cell text-right text-slate-700 font-semibold">{fmtC(row.totalBill)}</td>
              <td className="table-cell text-right text-green-600 font-semibold">{fmtC(row.totalPaid)}</td>
              <td className={`table-cell text-right font-bold ${row.totalPending <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {fmtC(Math.max(0, row.totalPending))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td className="table-cell font-bold text-slate-700">{t('reports.grandTotal')}</td>
            <td className="table-cell text-right font-bold text-slate-700">{fmtC(totBill)}</td>
            <td className="table-cell text-right font-bold text-green-600">{fmtC(totPaid)}</td>
            <td className={`table-cell text-right font-bold text-lg ${totPending <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {fmtC(Math.max(0, totPending))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
