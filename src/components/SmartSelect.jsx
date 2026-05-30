import { useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../lib/LanguageContext'
import TamilInput from './TamilInput'

export default function SmartSelect({
  value, onChange, options = [],
  idKey = 'id', nameKey = 'name',
  placeholder = 'Select…',
  entityLabel = 'item',
  addFields = [],
  onAdd,
}) {
  const { t } = useLanguage()
  const [adding, setAdding]   = useState(false)
  const [form,   setForm]     = useState({})
  const [busy,   setBusy]     = useState(false)

  function openAdd() {
    const init = {}
    addFields.forEach(f => { init[f.key] = f.defaultValue ?? '' })
    setForm(init)
    setAdding(true)
  }

  function cancel() { setAdding(false); setForm({}) }

  async function handleAdd() {
    const name = (form[nameKey] ?? '').trim()
    if (!name) { toast.error(`${entityLabel} ${t('smartselect.nameRequired')}`); return }

    const dup = options.find(o => o[nameKey].toLowerCase() === name.toLowerCase())
    if (dup) {
      toast(`"${name}" ${t('smartselect.alreadyExists')}`, { icon: '⚠️' })
      onChange(dup[idKey], dup[nameKey])
      cancel()
      return
    }

    setBusy(true)
    try {
      const added = await onAdd({ ...form, [nameKey]: name })
      onChange(added[idKey], added[nameKey])
      toast.success(`${entityLabel} "${name}" ${t('smartselect.added')}`)
      cancel()
    } catch (err) {
      toast.error(err.message || t('smartselect.failedToAdd'))
    } finally {
      setBusy(false)
    }
  }

  function handleSelectChange(e) {
    if (e.target.value === '__add__') {
      e.target.value = value
      openAdd()
    } else {
      const opt = options.find(o => String(o[idKey]) === e.target.value)
      onChange(e.target.value, opt ? opt[nameKey] : '')
    }
  }

  return (
    <div className="space-y-2">
      {/* Main select */}
      <div className="relative">
        <select className="input pr-8 appearance-none" value={value} onChange={handleSelectChange}>
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o[idKey]} value={o[idKey]}>{o[nameKey]}</option>
          ))}
          <option value="__add__">{t('smartselect.addNew')} {entityLabel}…</option>
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            {t('smartselect.addNew').replace('＋', '').trim()} {entityLabel}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {addFields.map(f => (
              <div key={f.key} className={f.span2 ? 'col-span-2' : ''}>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <div className="relative">
                    <select
                      className="input pr-7 appearance-none"
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    >
                      {(f.options || []).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <TamilInput
                    autoFocus={f.key === nameKey}
                    type={f.type || 'text'}
                    className="input"
                    placeholder={f.placeholder || ''}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') cancel()
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary py-1.5 text-xs flex-1 justify-center" onClick={handleAdd} disabled={busy}>
              <Check size={13} /> {busy ? t('common.adding') : `${t('common.add')} ${entityLabel}`}
            </button>
            <button className="btn-secondary py-1.5 text-xs" onClick={cancel}>
              <X size={13} /> {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
