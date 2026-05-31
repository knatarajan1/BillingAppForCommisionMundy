import { useState, useEffect } from 'react'
import { Printer, ChevronDown, Users, Truck, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { ClientBillPrint, VendorBillPrint, VendorSummaryPrint } from '../components/BillPrint'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitLabel } from '../lib/units'

const api = window.electronAPI

export default function Reports() {
  const { t } = useLanguage()
  const [tab,     setTab]     = useState('client')
  const [clients, setClients] = useState([])
  const [vendors, setVendors] = useState([])
  const [config,  setConfig]  = useState({})

  const [clientId, setClientId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [date,     setDate]     = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const [results,      setResults]      = useState([])
  const [loading,      setLoading]      = useState(false)
  const [printBill,    setPrintBill]    = useState(null)
  const [printSummary, setPrintSummary] = useState(null)

  useEffect(() => {
    Promise.all([api.clients.getAll(), api.vendors.getAll(), api.config.getAll()])
      .then(([c, v, cfg]) => { setClients(c); setVendors(v); setConfig(cfg) })
      .catch(() => toast.error(t('master.loadError')))
  }, [])

  async function handleSearch() {
    setLoading(true)
    try {
      if (tab === 'client') {
        setResults(await api.transactions.getClientBills(clientId || null, date || null))
      } else if (tab === 'vendor') {
        setResults(await api.transactions.getVendorBills(vendorId || null, date || null))
      } else {
        setResults(await api.transactions.getVendorSummary(fromDate || null, toDate || null))
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

  const hasFilters = clientId || vendorId || date || fromDate || toDate

  return (
    <div>
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-200 rounded-xl w-fit mb-5 no-print">
        {[
          { id: 'client',         labelKey: 'reports.clientBills',  icon: Users     },
          { id: 'vendor',         labelKey: 'reports.vendorBills',  icon: Truck     },
          { id: 'vendor-summary', labelKey: 'reports.vendorSummary', icon: FileText },
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
          {tab !== 'vendor-summary' ? (
            <div>
              <label className="label">{t('common.date')}</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          ) : (
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
          )}
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
        <ClientBills bills={results} config={config} onPrint={setPrintBill} />
      ) : tab === 'vendor' ? (
        <VendorBills bills={results} config={config} onPrint={setPrintBill} />
      ) : (
        <VendorSummary rows={results} config={config} fromDate={fromDate} toDate={toDate} onPrint={setPrintSummary} />
      )}

      {printBill && tab === 'client' && (
        <ClientBillPrint bill={printBill} config={config} onClose={() => setPrintBill(null)} />
      )}
      {printBill && tab === 'vendor' && (
        <VendorBillPrint bill={printBill} config={config} onClose={() => setPrintBill(null)} />
      )}
      {printSummary && (
        <VendorSummaryPrint data={printSummary} config={config} onClose={() => setPrintSummary(null)} />
      )}
    </div>
  )
}

function ClientBills({ bills, config, onPrint }) {
  const { t } = useLanguage()
  const currency = config.currency_symbol || '₹'
  const fmtC = n => `${currency}${parseFloat(n || 0).toFixed(2)}`
  const grandTotal = bills.reduce((s, b) => s + (b.netAmount || 0), 0)

  return (
    <div className="space-y-4">
      {bills.map(bill => (
        <div key={bill.transactionId} className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4">
            <span className="font-bold text-brand-700 text-sm">{bill.billNumber}</span>
            <span className="text-slate-600 text-sm font-medium">{bill.clientName}</span>
            <span className="text-slate-400 text-xs">{bill.date}</span>
            <span className="ml-auto text-xs text-slate-500">
              {t('reports.commission')}: <strong>{fmtC(bill.commissionAmount)}</strong>
              {' · '}{t('reports.chit')}: <strong>{fmtC(bill.totalChitCost)}</strong>
            </span>
            <span className={`font-bold text-sm ${bill.netAmount < 0 ? 'text-red-600' : 'text-brand-700'}`}>
              {t('reports.net')}: {fmtC(bill.netAmount)}
            </span>
            <button className="btn-secondary py-1 px-2.5 text-xs" onClick={() => onPrint(bill)}>
              <Printer size={13} /> {t('common.print')}
            </button>
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
      ))}
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
  const grandTotal = bills.reduce((s, b) => s + (b.totalAmount || 0), 0)

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
  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0)

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
