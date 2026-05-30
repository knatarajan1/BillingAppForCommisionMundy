import { useState, useEffect } from 'react'
import { Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import MasterPage from '../components/MasterPage'
import { useLanguage } from '../lib/LanguageContext'

const api = window.electronAPI

export default function Vendors() {
  const { t } = useLanguage()
  const [items, setItems] = useState([])

  const COLUMNS = [
    { key: 'name',    label: t('common.name') },
    { key: 'phone',   label: t('common.phone') },
    { key: 'address', label: t('common.address') },
  ]

  const FIELDS = [
    { key: 'name',    label: t('vendors.name'),   required: true, placeholder: t('common.placeholder.fullName') },
    { key: 'phone',   label: t('common.phone'),   type: 'tel',      placeholder: t('common.placeholder.phone') },
    { key: 'address', label: t('common.address'), type: 'textarea', placeholder: t('common.placeholder.address') },
  ]

  async function load() {
    try { setItems(await api.vendors.getAll()) }
    catch { toast.error(t('master.loadError')) }
  }

  useEffect(() => { load() }, [])

  async function onAdd(data)    { await api.vendors.add(data);    await load() }
  async function onUpdate(data) { await api.vendors.update(data); await load() }
  async function onDelete(id)   { await api.vendors.delete(id);   await load() }

  return (
    <MasterPage
      title={t('vendors.title')} subtitle={t('vendors.subtitle')}
      icon={Truck} items={items} idField="vendorId"
      columns={COLUMNS} fields={FIELDS}
      onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}
      emptyTitle={t('vendors.emptyTitle')}
      emptyDescription={t('vendors.emptyDesc')}
    />
  )
}
