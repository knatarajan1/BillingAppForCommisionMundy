import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, X, Plus, Search } from 'lucide-react'
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
  const [open,        setOpen]        = useState(false)
  const [search,      setSearch]      = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const [adding,      setAdding]      = useState(false)
  const [form,        setForm]        = useState({})
  const [busy,        setBusy]        = useState(false)
  const containerRef = useRef(null)
  const inputRef     = useRef(null)
  const listRef      = useRef(null)

  // Close dropdown when clicking outside this component
  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || highlighted < 0) return
    const els = listRef.current.querySelectorAll('[data-idx]')
    if (els[highlighted]) els[highlighted].scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const selected    = options.find(o => String(o[idKey]) === String(value))
  const displayName = selected ? selected[nameKey] : ''

  const filtered = useMemo(() =>
    options.filter(o => !search || o[nameKey].toLowerCase().includes(search.toLowerCase())),
    [options, search, nameKey]
  )

  function openDropdown() {
    setOpen(true)
    setSearch('')
    setHighlighted(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function closeDropdown() {
    setOpen(false)
    setSearch('')
    setHighlighted(-1)
  }

  function selectOption(opt) {
    onChange(String(opt[idKey]), opt[nameKey], opt)
    closeDropdown()
  }

  function handleSearchKeyDown(e) {
    const addIdx = filtered.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, addIdx - (onAdd ? 0 : 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && highlighted < filtered.length) selectOption(filtered[highlighted])
      else if (onAdd && highlighted === addIdx) openAdd()
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  function openAdd() {
    const init = {}
    addFields.forEach(f => { init[f.key] = f.defaultValue ?? '' })
    setForm(init)
    setAdding(true)
    closeDropdown()
  }

  function cancel() { setAdding(false); setForm({}) }

  async function handleAdd() {
    const name = (form[nameKey] ?? '').trim()
    if (!name) { toast.error(`${entityLabel} ${t('smartselect.nameRequired')}`); return }

    const dup = options.find(o => o[nameKey].toLowerCase() === name.toLowerCase())
    if (dup) {
      toast(`"${name}" ${t('smartselect.alreadyExists')}`, { icon: '⚠️' })
      onChange(String(dup[idKey]), dup[nameKey], dup)
      cancel()
      return
    }

    setBusy(true)
    try {
      const added = await onAdd({ ...form, [nameKey]: name })
      onChange(String(added[idKey]), added[nameKey], added)
      toast.success(`${entityLabel} "${name}" ${t('smartselect.added')}`)
      cancel()
    } catch (err) {
      toast.error(err.message || t('smartselect.failedToAdd'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2" ref={containerRef}>

      {/* ── Trigger / search input ── */}
      <div className="relative">
        {open ? (
          <>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <TamilInput
              ref={inputRef}
              type="text"
              className="input pl-7 pr-7"
              placeholder={`${t('common.search')} ${entityLabel}…`}
              value={search}
              onChange={e => { setSearch(e.target.value); setHighlighted(0) }}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              onClick={closeDropdown}
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="input text-left flex items-center justify-between w-full"
            onClick={openDropdown}
          >
            <span className={`flex-1 min-w-0 truncate ${displayName ? 'text-slate-800' : 'text-slate-400'}`}>
              {displayName || placeholder}
            </span>
            <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" />
          </button>
        )}

        {/* ── Dropdown list ── */}
        {open && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto"
            style={{ maxHeight: '190px' }}
          >
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">{t('common.noResults')}</div>
            )}
            {filtered.map((opt, i) => (
              <button
                key={opt[idKey]}
                type="button"
                data-idx={i}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === highlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectOption(opt)}
              >
                {String(opt[idKey]) === String(value)
                  ? <Check size={12} className="text-brand-600 flex-shrink-0" />
                  : <span className="w-3 flex-shrink-0" />}
                <span className={`flex-1 min-w-0 truncate ${String(opt[idKey]) === String(value) ? 'font-semibold text-brand-700' : 'text-slate-700'}`}>
                  {opt[nameKey]}
                </span>
              </button>
            ))}
            {onAdd && (
              <button
                type="button"
                data-idx={filtered.length}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 font-medium text-brand-600 border-t border-slate-100 transition-colors ${
                  highlighted === filtered.length ? 'bg-brand-50' : 'hover:bg-brand-50'
                }`}
                onMouseEnter={() => setHighlighted(filtered.length)}
                onClick={openAdd}
              >
                <Plus size={13} className="flex-shrink-0" />
                {t('smartselect.addNew')} {entityLabel}…
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Inline add form ── */}
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
