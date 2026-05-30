import { useState, useEffect } from 'react'
import { Leaf } from 'lucide-react'
import toast from 'react-hot-toast'
import MasterPage from '../components/MasterPage'
import { useLanguage } from '../lib/LanguageContext'
import { getUnitOptions, getUnitLabel } from '../lib/units'

const api = window.electronAPI

export default function Vegetables() {
  const { t } = useLanguage()
  const [items, setItems] = useState([])

  const COLUMNS = [
    { key: 'name', label: t('common.name') },
    { key: 'unit', label: t('vegetables.unit'), render: item => getUnitLabel(item.unit, t) },
  ]

  const FIELDS = [
    { key: 'name', label: t('vegetables.name'), required: true, placeholder: t('vegetables.placeholder') },
    {
      key: 'unit', label: t('vegetables.unit'), type: 'select',
      defaultValue: 'Kg',
      options: getUnitOptions(t),
    },
  ]

  async function load() {
    try { setItems(await api.vegetables.getAll()) }
    catch { toast.error(t('master.loadError')) }
  }

  useEffect(() => { load() }, [])

  async function onAdd(data)    { await api.vegetables.add(data);    await load() }
  async function onUpdate(data) { await api.vegetables.update(data); await load() }
  async function onDelete(id)   { await api.vegetables.delete(id);   await load() }

  return (
    <MasterPage
      title={t('vegetables.title')} subtitle={t('vegetables.subtitle')}
      icon={Leaf} items={items} idField="vegetableId"
      columns={COLUMNS} fields={FIELDS}
      onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}
      emptyTitle={t('vegetables.emptyTitle')}
      emptyDescription={t('vegetables.emptyDesc')}
    />
  )
}
