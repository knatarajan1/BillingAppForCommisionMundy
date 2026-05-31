import { useState, useEffect, useCallback } from 'react'
import { Wallet, RefreshCw, RotateCcw, Save, TrendingDown, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import { useLanguage } from '../lib/LanguageContext'

const api = window.electronAPI
const today = () => new Date().toISOString().slice(0, 10)

export default function CashDrawer() {
  const { t } = useLanguage()
  const [date, setDate]                 = useState(today())
  const [openingInput, setOpeningInput] = useState('')
  const [drawerData, setDrawerData]     = useState(null)   // null = not yet loaded
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [resetting, setResetting]       = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const loadDrawer = useCallback(async () => {
    if (!date) return
    setLoading(true)
    setDrawerData(null)
    setShowResetConfirm(false)
    try {
      const data = await api.cashDrawer.getByDate(date)
      setDrawerData(data)
      // Pre-fill input only when a record already exists
      setOpeningInput(data.hasRecord && data.openingAmount > 0 ? String(data.openingAmount) : '')
    } catch (err) {
      toast.error(err.message || t('cashDrawer.loadError'))
    } finally {
      setLoading(false)
    }
  }, [date, t])

  useEffect(() => { loadDrawer() }, [loadDrawer])

  async function handleSave() {
    const raw = openingInput.trim()
    if (raw === '') {
      toast.error(t('cashDrawer.invalidAmount'))
      return
    }
    const amt = parseFloat(raw)
    if (isNaN(amt) || amt < 0) {
      toast.error(t('cashDrawer.invalidAmount'))
      return
    }
    setSaving(true)
    try {
      const updated = await api.cashDrawer.saveOpening(date, amt)
      setDrawerData(updated)
      toast.success(t('cashDrawer.saveSuccess'))
    } catch (err) {
      toast.error(err.message || t('cashDrawer.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      const updated = await api.cashDrawer.reset(date)
      setDrawerData(updated)
      setOpeningInput('')
      setShowResetConfirm(false)
      toast.success(t('cashDrawer.resetSuccess'))
    } catch (err) {
      toast.error(err.message || t('cashDrawer.saveError'))
    } finally {
      setResetting(false)
    }
  }

  const fmtC   = n => `₹${parseFloat(n || 0).toFixed(2)}`
  const hasRec = drawerData?.hasRecord === true
  const closing = hasRec ? drawerData.closingAmount : 0

  return (
    <div>
      <PageHeader title={t('cashDrawer.title')} subtitle={t('cashDrawer.subtitle')} />

      {/* Date selector + refresh */}
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">{t('common.date')}</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary py-2"
            onClick={loadDrawer}
            disabled={loading}
            title={t('common.loading')}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500 text-sm">{t('common.loading')}</div>
      ) : (
        <>
          {/* ── Summary cards: ONLY when a record has been saved ── */}
          {hasRec ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <SummaryCard
                icon={<Wallet size={20} className="text-blue-500" />}
                label={t('cashDrawer.openingAmount')}
                value={fmtC(drawerData.openingAmount)}
                bg="bg-blue-50"
                textColor="text-blue-700"
              />
              <SummaryCard
                icon={<TrendingDown size={20} className="text-amber-500" />}
                label={t('cashDrawer.totalBillsPaid')}
                value={`− ${fmtC(drawerData.totalPaid)}`}
                bg="bg-amber-50"
                textColor="text-amber-700"
              />
              <SummaryCard
                icon={<TrendingUp size={20} className={closing < 0 ? 'text-red-500' : 'text-green-500'} />}
                label={t('cashDrawer.closingAmount')}
                value={fmtC(closing)}
                bg={closing < 0 ? 'bg-red-50' : 'bg-green-50'}
                textColor={closing < 0 ? 'text-red-700' : 'text-green-700'}
              />
            </div>
          ) : (
            /* ── No record for this date: info prompt only, no data shown ── */
            <div className="card p-5 mb-5 border border-blue-200 bg-blue-50">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-700 text-sm">
                    {t('cashDrawer.noRecordTitle')}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {t('cashDrawer.noRecordDesc').replace('{date}', date)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Opening amount editor ── */}
          <div className="card p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              {t('cashDrawer.setOpening')}
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48">
                <label className="label">{t('cashDrawer.openingAmount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="input pl-7"
                    value={openingInput}
                    onChange={e => setOpeningInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                </div>
              </div>

              <button
                className="btn-primary py-2"
                onClick={handleSave}
                disabled={saving || !openingInput.trim()}
              >
                <Save size={15} />
                {saving ? t('common.saving') : t('cashDrawer.saveCashDrawer')}
              </button>

              {/* Reset button — only meaningful when a record exists */}
              {hasRec && (
                showResetConfirm ? (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle size={15} className="text-red-500 shrink-0" />
                    <span className="text-xs text-red-700 mr-1">{t('cashDrawer.resetConfirm')}</span>
                    <button
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                      onClick={handleReset}
                      disabled={resetting}
                    >
                      {resetting ? t('common.saving') : t('cashDrawer.confirmResetBtn')}
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors"
                    onClick={() => setShowResetConfirm(true)}
                    title={t('cashDrawer.resetWarning')}
                  >
                    <RotateCcw size={14} />
                    {t('cashDrawer.resetCashDrawer')}
                  </button>
                )
              )}
            </div>

            {/* Negative balance warning — only when record exists */}
            {hasRec && closing < 0 && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-700">{t('cashDrawer.negativeWarning')}</span>
              </div>
            )}
          </div>

          {/* Bills note — only when record exists AND there were bills */}
          {hasRec && drawerData.totalPaid > 0 && (
            <div className="card p-4">
              <p className="text-xs text-slate-500">
                {t('cashDrawer.billsNote')
                  .replace('{date}', date)
                  .replace('{amount}', fmtC(drawerData.totalPaid))}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, bg, textColor }) {
  return (
    <div className={`card p-5 flex items-center gap-4 ${bg}`}>
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-lg font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  )
}
