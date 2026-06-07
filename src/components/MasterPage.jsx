import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import EmptyState from './EmptyState'
import PageHeader from './PageHeader'
import { useLanguage } from '../lib/LanguageContext'
import TamilInput from './TamilInput'

export default function MasterPage({
  title, subtitle, icon: Icon,
  items, idField, columns, fields,
  onAdd, onUpdate, onDelete,
  emptyTitle, emptyDescription,
}) {
  const { t } = useLanguage()
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({})
  const [busy, setBusy]           = useState(false)
  const [deleteId, setDeleteId]   = useState(null)

  const searchLower = search.toLowerCase()
  const filtered = useMemo(() => {
    if (!search) return items
    return items.filter(item =>
      columns.some(col => {
        const val = col.render ? '' : String(item[col.key] ?? '')
        return val.toLowerCase().includes(searchLower)
      }) || fields.some(f => String(item[f.key] ?? '').toLowerCase().includes(searchLower))
    )
  }, [items, searchLower, columns, fields])

  function openAdd() {
    const init = {}
    fields.forEach(f => { init[f.key] = f.defaultValue ?? '' })
    setEditing(null); setForm(init); setShowModal(true)
  }

  function openEdit(item) {
    const init = {}
    fields.forEach(f => { init[f.key] = item[f.key] ?? '' })
    setEditing(item); setForm(init); setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm({}) }

  async function handleSubmit(e) {
    e.preventDefault()
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? '').trim()) {
        toast.error(`${f.label} ${t('master.required')}`); return
      }
    }
    setBusy(true)
    try {
      if (editing) {
        await onUpdate({ [idField]: editing[idField], ...form })
        toast.success(t('master.updatedSuccess'))
      } else {
        await onAdd(form)
        toast.success(t('master.addedSuccess'))
      }
      closeModal()
    } catch (err) {
      toast.error(err.message || t('master.operationFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    setBusy(true)
    try {
      await onDelete(id)
      toast.success(t('master.deletedSuccess'))
    } catch (err) {
      toast.error(err.message || t('master.deleteFailed'))
    } finally {
      setBusy(false); setDeleteId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={title} subtitle={subtitle}
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> {t('common.add')} {title.replace(/s$/, '')}
          </button>
        }
      />

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={`${t('common.search')} ${title.toLowerCase()}…`}
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Icon}
            title={search ? t('common.noResults') : emptyTitle}
            description={search ? t('common.tryDifferentSearch') : emptyDescription} />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="table-header text-left">{col.label}</th>
                ))}
                <th className="table-header text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item[idField]} className="hover:bg-slate-50/60 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="table-cell">
                      {col.render ? col.render(item) : (item[col.key] || <span className="text-slate-300">—</span>)}
                    </td>
                  ))}
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(item[idField])} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editing ? `${t('common.update')} ${title.replace(/s$/, '')}` : `${t('common.add')} ${title.replace(/s$/, '')}`} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="label">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                {f.type === 'select' ? (
                  <select className="input" value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                    {f.options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <TamilInput rows={3} className="input resize-none" placeholder={f.placeholder || ''}
                    value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                ) : (
                  <TamilInput type={f.type || 'text'} className="input" placeholder={f.placeholder || ''}
                    value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={busy}>
                {busy ? t('common.saving') : editing ? t('common.update') : t('common.add')}
              </button>
              <button type="button" className="btn-secondary flex-1 justify-center" onClick={closeModal}>{t('common.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title={t('common.confirmDelete')} onClose={() => setDeleteId(null)}>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-5">{t('common.confirmDeleteMsg')}</p>
            <div className="flex gap-3">
              <button className="btn-danger flex-1 justify-center" disabled={busy}
                onClick={() => handleDelete(deleteId)}>
                {busy ? t('common.deleting') : t('common.yesDelete')}
              </button>
              <button className="btn-secondary flex-1 justify-center" onClick={() => setDeleteId(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
