import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Billing from './pages/Billing'
import Vegetables from './pages/Vegetables'
import Clients from './pages/Clients'
import Vendors from './pages/Vendors'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { applyTheme } from './lib/themes'
import { LanguageProvider } from './lib/LanguageContext'

const api = window.electronAPI

export default function App() {
  const [initialLang, setInitialLang] = useState('en')
  const [initialLogo, setInitialLogo] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (api) {
      api.config.getAll()
        .then(cfg => {
          applyTheme(cfg.theme_color || 'green')
          setInitialLang(cfg.app_language || 'en')
          setInitialLogo(cfg.custom_logo_data || null)
        })
        .catch(() => applyTheme('green'))
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) return null

  return (
    <LanguageProvider initialLang={initialLang} initialLogo={initialLogo}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/billing" replace />} />
          <Route path="billing"       element={<Billing />} />
          <Route path="vegetables"    element={<Vegetables />} />
          <Route path="clients"       element={<Clients />} />
          <Route path="vendors"       element={<Vendors />} />
          <Route path="reports"       element={<Reports />} />
          <Route path="configuration" element={<Settings />} />
          <Route path="settings"      element={<Navigate to="/configuration" replace />} />
        </Route>
      </Routes>
    </LanguageProvider>
  )
}
