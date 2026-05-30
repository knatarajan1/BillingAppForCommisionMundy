import { useState, useEffect } from 'react'
import { Save, Settings as SettingsIcon, ImagePlus, RotateCcw, Trash2, AlertTriangle, Sprout } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import TamilInput from '../components/TamilInput'
import { THEMES, THEME_LABELS, applyTheme } from '../lib/themes'
import { useLanguage } from '../lib/LanguageContext'

const api = window.electronAPI

export default function Settings() {
  const { lang, setLang, t, logo, setLogo } = useLanguage()
  const [values,  setValues]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [changed, setChanged] = useState(new Set())

  // Clear data modal state
  const [showClearModal, setShowClearModal]   = useState(false)
  const [clearConfirm,   setClearConfirm]     = useState('')
  const [clearing,       setClearing]         = useState(false)
  const [backupPath,     setBackupPath]        = useState(null)

  // Logo preview state
  const [logoPreview, setLogoPreview] = useState(logo)
  const [logoUploading, setLogoUploading] = useState(false)

  const SETTING_GROUPS = [
    {
      group: t('settings.companyDetails'),
      fields: [
        { key: 'company_name',    label: t('settings.companyName'),    type: 'text',     placeholder: 'KKS Commission Mundy' },
        { key: 'company_address', label: t('settings.companyAddress'), type: 'textarea', placeholder: t('common.placeholder.address') },
        { key: 'company_phone',   label: t('settings.companyPhone'),   type: 'tel',      placeholder: t('common.placeholder.phone') },
      ],
    },
    {
      group: t('settings.billingSettings'),
      fields: [
        { key: 'commission_rate',       label: t('settings.commissionRate'), type: 'number', placeholder: '10', min: '0', max: '100', step: '0.01' },
        { key: 'chit_cost_per_record',  label: t('settings.chitCost'),       type: 'number', placeholder: '5',  min: '0', step: '0.01' },
        { key: 'bill_prefix',           label: t('settings.billPrefix'),     type: 'text',   placeholder: 'BILL' },
        { key: 'currency_symbol',       label: t('settings.currencySymbol'), type: 'text',   placeholder: '₹' },
      ],
    },
  ]

  useEffect(() => {
    api.config.getAll().then(cfg => {
      setValues(cfg)
      setLogoPreview(cfg.custom_logo_data || null)
    }).catch(() => toast.error(t('settings.loadError')))
  }, [])

  function handleChange(key, val) {
    setValues(p => ({ ...p, [key]: val }))
    setChanged(p => new Set(p).add(key))
  }

  async function handleSave() {
    if (changed.size === 0) return toast(t('settings.noChanges'))
    setSaving(true)
    try {
      await Promise.all([...changed].map(key => api.config.update(key, values[key])))
      setChanged(new Set())
      toast.success(t('settings.saved'))
      if (changed.has('theme_color')) applyTheme(values.theme_color)
      if (changed.has('app_language')) setLang(values.app_language || 'en')
    } catch (err) {
      toast.error(err.message || t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  function selectTheme(themeName) {
    handleChange('theme_color', themeName)
    applyTheme(themeName)
  }

  // ─── Logo ───────────────────────────────────────────────────────

  async function handleChangeLogo() {
    setLogoUploading(true)
    try {
      const dataUrl = await api.app.pickLogo()
      if (!dataUrl) return // user cancelled
      await api.config.update('custom_logo_data', dataUrl)
      setLogoPreview(dataUrl)
      setLogo(dataUrl)
      toast.success(t('settings.logoSuccess'))
    } catch (err) {
      toast.error(err.message || t('settings.logoError'))
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleResetLogo() {
    try {
      await api.config.update('custom_logo_data', '')
      setLogoPreview(null)
      setLogo(null)
      toast.success(t('settings.logoReset'))
    } catch (err) {
      toast.error(err.message || t('settings.logoError'))
    }
  }

  // ─── Clear data ─────────────────────────────────────────────────

  async function handleClearData() {
    if (clearConfirm !== 'CLEAR') return
    setClearing(true)
    try {
      const result = await api.db.clearData()
      setBackupPath(result.backupPath)
      toast.success(t('settings.clearDataSuccess'))
      setClearConfirm('')
    } catch (err) {
      toast.error(err.message || t('settings.clearDataError'))
    } finally {
      setClearing(false)
    }
  }

  const activeTheme = values.theme_color || 'green'
  const activeLang  = values.app_language || 'en'

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <button className="btn-primary" onClick={handleSave} disabled={saving || changed.size === 0}>
            <Save size={15} /> {saving ? t('common.saving') : t('common.saveChanges')}
          </button>
        }
      />

      <div className="space-y-5">

        {/* ─── Language ──────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
            {t('settings.language')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'en', label: t('settings.english'), flag: '🇬🇧' },
              { value: 'ta', label: t('settings.tamil'),   flag: '🇮🇳' },
            ].map(opt => {
              const active = activeLang === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChange('app_language', opt.value)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    active
                      ? 'border-slate-800 bg-slate-50 shadow-md scale-105 text-slate-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <span className="text-lg">{opt.flag}</span>
                  {opt.label}
                  {active && <span className="ml-1 text-xs font-bold">✓</span>}
                </button>
              )
            })}
          </div>
          {changed.has('app_language') && (
            <p className="text-xs text-amber-600 mt-3">{t('settings.languageHint')}</p>
          )}
        </div>

        {/* ─── App Logo ──────────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
            {t('settings.appLogo')}
          </h2>
          <div className="flex items-center gap-6">
            {/* Preview */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 overflow-hidden"
              style={{ backgroundColor: 'var(--brand-500)' }}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                : <Sprout size={28} className="text-white" />
              }
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{t('settings.appLogoDesc')}</p>
              <p className="text-xs text-slate-400">{t('settings.logoHint')}</p>
              <div className="flex gap-2 mt-3">
                <button
                  className="btn-primary py-1.5 text-xs"
                  onClick={handleChangeLogo}
                  disabled={logoUploading}
                >
                  <ImagePlus size={14} />
                  {logoUploading ? t('common.loading') : t('settings.changeLogo')}
                </button>
                {logoPreview && (
                  <button
                    className="btn-secondary py-1.5 text-xs"
                    onClick={handleResetLogo}
                  >
                    <RotateCcw size={13} />
                    {t('settings.resetLogo')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Print logo toggle */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">{t('settings.printLogoLabel')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t('settings.printLogoDesc')}</p>
            </div>
            <button
              onClick={() => handleChange('print_logo_in_bill', values.print_logo_in_bill === '1' ? '0' : '1')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                values.print_logo_in_bill === '1' ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  values.print_logo_in_bill === '1' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* ─── Theme colour ────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">
            {t('settings.themeColor')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(THEME_LABELS).map(([key, label]) => {
              const c = THEMES[key]
              const active = activeTheme === key
              return (
                <button
                  key={key}
                  onClick={() => selectTheme(key)}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    active
                      ? 'border-slate-800 shadow-md scale-105'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-0.5 rounded-full overflow-hidden">
                    {['800','600','400','200'].map(shade => (
                      <div key={shade} className="w-6 h-6" style={{ backgroundColor: c[shade] }} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-slate-800' : 'text-slate-500'}`}>
                    {label}
                  </span>
                  {active && (
                    <span className="text-xs font-bold text-slate-700">{t('settings.active')}</span>
                  )}
                </button>
              )
            })}
          </div>
          {changed.has('theme_color') && (
            <p className="text-xs text-amber-600 mt-3">{t('settings.themeHint')}</p>
          )}
        </div>

        {/* ─── Other settings ──────────────────────────────────── */}
        {SETTING_GROUPS.map(({ group, fields }) => (
          <div key={group} className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-5 pb-3 border-b border-slate-100">{group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {fields.map(f => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="label">
                    {f.label}
                    {changed.has(f.key) && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                    )}
                  </label>
                  {f.type === 'textarea' ? (
                    <TamilInput rows={3} className="input resize-none" placeholder={f.placeholder}
                      value={values[f.key] ?? ''} onChange={e => handleChange(f.key, e.target.value)} />
                  ) : (
                    <TamilInput type={f.type} className="input"
                      placeholder={f.placeholder} min={f.min} max={f.max} step={f.step}
                      value={values[f.key] ?? ''} onChange={e => handleChange(f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ─── Commission info ─────────────────────────────────── */}
        <div className="card p-5 flex items-start gap-3 bg-brand-50 border-brand-100">
          <SettingsIcon size={18} className="text-brand-600 mt-0.5 shrink-0" />
          <div className="text-sm text-brand-800">
            <p className="font-semibold mb-1">{t('settings.commissionInfo')}</p>
            <p className="text-brand-700 text-xs leading-relaxed">{t('settings.commissionFormula')}</p>
          </div>
        </div>

        {/* ─── Danger Zone ─────────────────────────────────────── */}
        <div className="card p-6 border-red-200 bg-red-50">
          <h2 className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            {t('settings.dangerZone')}
          </h2>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 border border-red-200 rounded-xl p-4 bg-white">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">{t('settings.clearDataTitle')}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('settings.clearDataDesc')}</p>
              {backupPath && (
                <p className="text-xs text-green-700 mt-2 font-medium break-all">
                  ✓ {t('settings.clearDataSuccess')}<br />
                  <span className="font-mono text-xs">{backupPath}</span>
                </p>
              )}
            </div>
            <button
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              onClick={() => { setShowClearModal(true); setClearConfirm(''); setBackupPath(null) }}
            >
              <Trash2 size={15} />
              {t('settings.clearDataBtn')}
            </button>
          </div>
        </div>

      </div>

      {/* ─── Clear Data Confirmation Modal ───────────────────────── */}
      {showClearModal && (
        <Modal title={t('settings.clearDataConfirmTitle')} onClose={() => setShowClearModal(false)}>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{t('settings.clearDataConfirmMsg')}</p>
            </div>
            <div>
              <label className="label text-slate-700">{t('settings.clearDataTypeHint')}</label>
              <input
                className="input font-mono tracking-widest"
                placeholder={t('settings.clearDataTypePlaceholder')}
                value={clearConfirm}
                onChange={e => setClearConfirm(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                disabled={clearConfirm !== 'CLEAR' || clearing}
                onClick={handleClearData}
              >
                <Trash2 size={15} />
                {clearing ? t('settings.clearDataClearing') : t('settings.clearDataConfirmBtn')}
              </button>
              <button
                className="btn-secondary flex-1 justify-center"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
