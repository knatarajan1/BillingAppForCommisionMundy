import { useState, useEffect } from 'react'
import { Plus, Trash2, Printer, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SmartSelect from '../components/SmartSelect'
import { FarmerReceiptPrint } from '../components/BillPrint'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitOptions } from '../lib/units'

const api = window.electronAPI
const today = () => new Date().toISOString().slice(0, 10)

function emptyItem() {
  return { vegetableId: '', vegetableName: '', vegetableShortName: '' }
}

export default function FarmerReceipt() {
  const { t } = useLanguage()

  const UNIT_OPTIONS = getUnitOptions(t)

  const CLIENT_FIELDS = [
    { key: 'name',  label: t('common.name'),  span2: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone', label: t('common.phone'), type: 'tel', placeholder: t('common.placeholder.phone') },
  ]
  const VEG_FIELDS = [
    { key: 'name', label: t('common.name'), placeholder: t('vegetables.placeholder') },
    { key: 'shortName', label: t('vegetables.shortName'), placeholder: t('vegetables.shortNamePlaceholder') },
    { key: 'unit', label: t('vegetables.unit'), type: 'select', defaultValue: 'Kg', options: UNIT_OPTIONS },
  ]

  const [clients,    setClients]    = useState([])
  const [vegetables, setVegetables] = useState([])
  const [config,     setConfig]     = useState({})

  const [clientId,   setClientId]   = useState('')
  const [clientName, setClientName] = useState('')
  const [date,       setDate]       = useState(today())
  const [items,      setItems]      = useState([emptyItem()])

  const [savedReceipt, setSavedReceipt] = useState(null)
  const [printReceipt, setPrintReceipt] = useState(null)
  const [saving,       setSaving]       = useState(false)

  const [dateReceipts, setDateReceipts] = useState([])

  async function loadAll() {
    try {
      const [c, v, cfg] = await Promise.all([
        api.clients.getAll(), api.vegetables.getAll(), api.config.getAll(),
      ])
      setClients(c); setVegetables(v); setConfig(cfg)
    } catch { toast.error(t('farmerReceipt.loadError')) }
  }

  async function loadDateReceipts(d) {
    try {
      const list = await api.farmerReceipts.getByDate(d)
      setDateReceipts(list)
    } catch { /* silent */ }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadDateReceipts(date) }, [date])

  function addItem()       { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  function setVegetable(idx, id, name, obj) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { vegetableId: id, vegetableName: name || '', vegetableShortName: obj?.shortName || '' }
      return next
    })
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

  async function handleSave() {
    if (!clientId) return toast.error(t('farmerReceipt.selectClientErr'))
    if (items.some(i => !i.vegetableId)) return toast.error(t('farmerReceipt.fillAllErr'))

    setSaving(true)
    try {
      const result = await api.farmerReceipts.save({
        clientId, clientName, date,
        items: items.map(i => ({ vegetableId: i.vegetableId, vegetableName: i.vegetableName, vegetableShortName: i.vegetableShortName || '' })),
      })
      setSavedReceipt(result)
      setPrintReceipt(result)
      setItems([emptyItem()])
      setClientId(''); setClientName('')
      toast.success(t('farmerReceipt.savedMsg').replace('{receiptNumber}', result.receiptNumber))
      loadDateReceipts(date)
    } catch (err) {
      toast.error(err.message || t('master.operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title={t('farmerReceipt.title')} subtitle={t('farmerReceipt.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Farmer & Date */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{t('farmerReceipt.details')}</h2>
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
                <input type="date" className="input" value={date}
                  onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Items — vegetable only */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">{t('farmerReceipt.items')}</h2>
              <button className="btn-primary py-1.5 text-xs" onClick={addItem}>
                <Plus size={14} /> {t('farmerReceipt.addItem')}
              </button>
            </div>

            {items.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t('farmerReceipt.noItems')}
                description={t('farmerReceipt.noItemsDesc')} />
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl px-4 py-3 relative group flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center">{idx + 1}</span>
                    <div className="flex-1">
                      <SmartSelect
                        value={item.vegetableId}
                        onChange={(id, name, obj) => setVegetable(idx, id, name, obj)}
                        options={vegetables}
                        idKey="vegetableId" nameKey="name"
                        placeholder={t('farmerReceipt.selectVegetable')}
                        entityLabel={t('billing.vegetable.label')}
                        addFields={VEG_FIELDS}
                        onAdd={handleAddVegetable}
                      />
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — actions + history */}
        <div className="space-y-4">
          {/* Save card */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{t('farmerReceipt.details')}</h2>
            <div className="text-sm text-slate-500 space-y-1 mb-4">
              <div className="flex justify-between">
                <span>{t('billing.client')}</span>
                <span className="font-medium text-slate-700">{clientName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('common.date')}</span>
                <span className="font-medium text-slate-700">{date}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('billing.items')}</span>
                <span className="font-medium text-slate-700">{items.filter(i => i.vegetableId).length}</span>
              </div>
            </div>
            <button className="btn-primary w-full justify-center py-2.5" onClick={handleSave} disabled={saving}>
              {saving ? t('farmerReceipt.saving') : t('farmerReceipt.saveReceipt')}
            </button>
          </div>

          {/* Last receipt card */}
          {savedReceipt && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">{t('farmerReceipt.lastSaved')}</h2>
                <button className="btn-primary py-1.5 text-xs" onClick={() => setPrintReceipt(savedReceipt)}>
                  <Printer size={13} /> {t('farmerReceipt.printReceipt')}
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('farmerReceipt.receiptNo')}</span>
                  <span className="font-bold text-brand-700">{savedReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('billing.client')}</span>
                  <span className="font-medium">{savedReceipt.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.date')}</span>
                  <span>{savedReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('billing.items')}</span>
                  <span className="font-medium">{savedReceipt.items?.length ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Receipts for this date */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{t('farmerReceipt.todayReceipts')}</h2>
            {dateReceipts.length === 0 ? (
              <p className="text-xs text-slate-400">{t('farmerReceipt.noReceiptsToday')}</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {dateReceipts.map(r => (
                  <div key={r.receiptId}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
                    onClick={() => setPrintReceipt(r)}>
                    <div>
                      <p className="text-xs font-bold text-brand-700">{r.receiptNumber}</p>
                      <p className="text-xs text-slate-500">{r.clientName} · {r.items.length} items</p>
                    </div>
                    <Printer size={13} className="text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {printReceipt && (
        <FarmerReceiptPrint
          receipt={printReceipt}
          config={config}
          onClose={() => setPrintReceipt(null)}
        />
      )}
    </div>
  )
}
