import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2, Printer, ReceiptText, ClipboardList, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SmartSelect from '../components/SmartSelect'
import { ClientBillPrint } from '../components/BillPrint'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitOptions } from '../lib/units'

const api = window.electronAPI
const today = () => new Date().toISOString().slice(0, 10)

function emptyItem() {
  return { vegetableId: '', vegetableName: '', vegetableShortName: '', vendorId: '', vendorName: '', units: '', unitType: 'Kg', rate: '', price: '' }
}

export default function Billing() {
  const { t } = useLanguage()

  const UNIT_OPTIONS   = useMemo(() => getUnitOptions(t), [t])
  const CLIENT_FIELDS  = useMemo(() => [
    { key: 'name',  label: t('common.name'),  span2: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone', label: t('common.phone'), type: 'tel', placeholder: t('common.placeholder.phone') },
  ], [t])
  const VENDOR_FIELDS  = useMemo(() => [
    { key: 'name',  label: t('common.name'),  span2: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone', label: t('common.phone'), type: 'tel', placeholder: t('common.placeholder.phone') },
  ], [t])
  const VEG_FIELDS     = useMemo(() => [
    { key: 'name',      label: t('common.name'),                  placeholder: t('vegetables.placeholder') },
    { key: 'shortName', label: t('vegetables.shortName'),         placeholder: t('vegetables.shortNamePlaceholder') },
    { key: 'unit',      label: t('vegetables.unit'), type: 'select', defaultValue: 'Kg', options: UNIT_OPTIONS },
  ], [t, UNIT_OPTIONS])

  const [clients,    setClients]    = useState([])
  const [vegetables, setVegetables] = useState([])
  const [vendors,    setVendors]    = useState([])
  const [config,     setConfig]     = useState({})

  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [date, setDate]         = useState(today())
  const [items, setItems]       = useState([emptyItem()])

  const [savedBill,  setSavedBill]  = useState(null)
  const [printBill,  setPrintBill]  = useState(null)
  const [saving,     setSaving]     = useState(false)

  // Pending farmer receipts for the selected farmer+date
  const [pendingReceipts,    setPendingReceipts]    = useState([])
  const [receiptBannerShown, setReceiptBannerShown] = useState(false)

  async function loadAll() {
    try {
      const [c, v, vn, cfg] = await Promise.all([
        api.clients.getAll(), api.vegetables.getAll(),
        api.vendors.getAll(),  api.config.getAll(),
      ])
      setClients(c); setVegetables(v); setVendors(vn); setConfig(cfg)
    } catch { toast.error(t('master.loadError')) }
  }

  useEffect(() => { loadAll() }, [])

  // When farmer or date changes, look for pending receipts
  useEffect(() => {
    if (!clientId || !api?.farmerReceipts) { setPendingReceipts([]); return }
    api.farmerReceipts.getByClient(clientId, date)
      .then(list => {
        setPendingReceipts(list || [])
        setReceiptBannerShown(false)
      })
      .catch(() => setPendingReceipts([]))
  }, [clientId, date])

  const commissionRate    = parseFloat(config.commission_rate)      || 0
  const chitCostPerRecord = parseFloat(config.chit_cost_per_record) || 0
  const currencySymbol    = config.currency_symbol || '₹'

  const { computedItems, subTotal, commissionAmount, totalChitCost, netAmount } = useMemo(() => {
    const computedItems = items.map(it => ({
      ...it,
      price: it.units && it.rate
        ? parseFloat((parseFloat(it.units) * parseFloat(it.rate)).toFixed(2))
        : 0,
    }))
    const subTotal         = computedItems.reduce((s, i) => s + (i.price || 0), 0)
    const commissionAmount = parseFloat((subTotal * commissionRate / 100).toFixed(2))
    // Chit: weight-based (Kg/Ton) = 1 chit; count-based = qty chits
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
      if (field === 'vegetableId') {
        const veg = vegetables.find(v => v.vegetableId === val)
        next[idx].vegetableName = veg ? veg.name : ''
        next[idx].unitType      = veg ? veg.unit : 'Kg'
      }
      if (field === 'vendorId') {
        const vnd = vendors.find(v => v.vendorId === val)
        next[idx].vendorName = vnd ? vnd.name : ''
      }
      return next
    })
  }

  function addItem()       { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  function loadItemsFromReceipt(receipt) {
    const loaded = receipt.items.map(ri => {
      const veg = vegetables.find(v => v.vegetableId === ri.vegetableId)
      return {
        vegetableId:        ri.vegetableId,
        vegetableName:      ri.vegetableName,
        vegetableShortName: veg ? (veg.shortName || '') : '',
        vendorId:           '',
        vendorName:         '',
        units:              '',
        unitType:           veg ? veg.unit : 'Kg',
        rate:               '',
        price:              '',
      }
    })
    setItems(loaded.length > 0 ? loaded : [emptyItem()])
    setReceiptBannerShown(true)
    toast.success(`Loaded ${loaded.length} item(s) from receipt ${receipt.receiptNumber}`)
  }

  async function handleAddClient(data) {
    const added = await api.clients.add(data)
    await loadAll()
    return { clientId: added.clientId, name: added.name }
  }

  async function handleAddVegetable(data) {
    const added = await api.vegetables.add(data)
    await loadAll()
    return { vegetableId: added.vegetableId, name: added.name, unit: added.unit, shortName: added.shortName || '' }
  }

  async function handleAddVendor(data) {
    const added = await api.vendors.add(data)
    await loadAll()
    return { vendorId: added.vendorId, name: added.name }
  }

  async function handleSave() {
    if (!clientId)  return toast.error(t('billing.selectClientErr'))
    if (items.some(i => !i.vegetableId || !i.vendorId || !i.units || !i.rate)) {
      return toast.error(t('billing.fillAllErr'))
    }
    setSaving(true)
    try {
      const result = await api.transactions.save({
        clientId, clientName,
        items: computedItems, commissionRate, chitCostPerRecord, date,
      })
      setSavedBill(result)
      setPrintBill(result)
      setItems([emptyItem()])
      setClientId(''); setClientName(''); setDate(today())
      setPendingReceipts([]); setReceiptBannerShown(false)
      toast.success(t('billing.savedMsg').replace('{billNumber}', result.billNumber))
    } catch (err) {
      toast.error(err.message || t('master.operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('billing.title')} subtitle={t('billing.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client & Date */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{t('billing.billDetails')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('billing.client')}</label>
                <SmartSelect
                  value={clientId}
                  onChange={(id, name) => { setClientId(id); setClientName(name) }}
                  options={clients}
                  idKey="clientId" nameKey="name"
                  placeholder={t('billing.selectClient')}
                  entityLabel={t('billing.client.label')}
                  addFields={CLIENT_FIELDS}
                  onAdd={handleAddClient}
                />
              </div>
              <div>
                <label className="label">{t('common.date')}</label>
                <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Pending farmer receipt banner */}
          {pendingReceipts.length > 0 && !receiptBannerShown && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-start gap-3">
              <ClipboardList size={18} className="text-brand-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-800">
                  {pendingReceipts.length === 1
                    ? `Receipt ${pendingReceipts[0].receiptNumber} available`
                    : `${pendingReceipts.length} receipts available for this farmer`}
                </p>
                <p className="text-xs text-brand-600 mt-0.5">
                  Load produce items from receipt to prefill the billing form
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pendingReceipts.map(r => (
                    <button key={r.receiptId}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--brand-100)', color: 'var(--brand-700)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-200)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--brand-100)'}
                      onClick={() => loadItemsFromReceipt(r)}>
                      {r.receiptNumber} · {r.items.length} items
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setReceiptBannerShown(true)}
                className="p-1 rounded-lg hover:bg-brand-100 text-brand-400 shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Items */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">{t('billing.items')}</h2>
              <button className="btn-primary py-1.5 text-xs" onClick={addItem}>
                <Plus size={14} /> {t('billing.addItem')}
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState icon={ReceiptText} title={t('billing.noItems')} description={t('billing.noItemsDesc')} />
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 relative group">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">{t('billing.vegetable')}</label>
                        <SmartSelect
                          value={item.vegetableId}
                          onChange={(id, name, obj) => {
                            setItems(prev => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], vegetableId: id, vegetableName: name, vegetableShortName: obj?.shortName || '', unitType: obj?.unit || 'Kg' }
                              return next
                            })
                          }}
                          options={vegetables}
                          idKey="vegetableId" nameKey="name"
                          placeholder={t('billing.selectVegetable')}
                          entityLabel={t('billing.vegetable.label')}
                          addFields={VEG_FIELDS}
                          onAdd={handleAddVegetable}
                        />
                      </div>
                      <div>
                        <label className="label">{t('billing.vendor')}</label>
                        <SmartSelect
                          value={item.vendorId}
                          onChange={(id, name) => {
                            setItems(prev => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], vendorId: id, vendorName: name }
                              return next
                            })
                          }}
                          options={vendors}
                          idKey="vendorId" nameKey="name"
                          placeholder={t('billing.selectVendor')}
                          entityLabel={t('billing.vendor.label')}
                          addFields={VENDOR_FIELDS}
                          onAdd={handleAddVendor}
                        />
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
                        <label className="label">{t('billing.rate')} ({currencySymbol}/unit)</label>
                        <input type="number" min="0" step="0.01" placeholder="0.00" className="input"
                          value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                      </div>
                    </div>
                    {item.units && item.rate && (
                      <div className="mt-2 text-right">
                        <span className="text-xs text-slate-500">{t('billing.price')}: </span>
                        <span className="text-sm font-semibold text-brand-700">
                          {currencySymbol}{(parseFloat(item.units) * parseFloat(item.rate)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)}
                        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — summary */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-0">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{t('billing.billSummary')}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('billing.subtotal')}</span>
                <span className="font-medium">{currencySymbol}{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('billing.commission')} ({commissionRate}%)</span>
                <span className="font-medium text-amber-600">− {currencySymbol}{commissionAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('billing.chit')} ({parseFloat(totalChitUnits.toFixed(2))} × {currencySymbol}{chitCostPerRecord})</span>
                <span className="font-medium text-amber-600">− {currencySymbol}{totalChitCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="font-semibold text-slate-700">{t('billing.netAmount')}</span>
                <span className={`font-bold text-base ${netAmount < 0 ? 'text-red-600' : 'text-brand-700'}`}>
                  {currencySymbol}{netAmount.toFixed(2)}
                </span>
              </div>
            </div>
            <button className="btn-primary w-full mt-5 justify-center py-2.5" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('billing.saveBill')}
            </button>
          </div>

          {savedBill && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">{t('billing.lastSaved')}</h2>
                <button className="btn-primary py-1.5 text-xs" onClick={() => setPrintBill(savedBill)}>
                  <Printer size={13} /> {t('billing.printReceipt')}
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('billing.billNo')}</span>
                  <span className="font-bold text-brand-700">{savedBill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('billing.client')}</span>
                  <span className="font-medium">{savedBill.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.date')}</span>
                  <span>{savedBill.date}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                  <span className="font-semibold text-slate-700">{t('billing.netAmount')}</span>
                  <span className={`font-bold ${savedBill.netAmount < 0 ? 'text-red-600' : 'text-brand-700'}`}>
                    {currencySymbol}{savedBill.netAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {printBill && (
        <ClientBillPrint
          bill={printBill}
          config={config}
          onClose={() => setPrintBill(null)}
        />
      )}
    </div>
  )
}
