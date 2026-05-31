import { NavLink } from 'react-router-dom'
import { ReceiptText, Leaf, Users, Truck, BarChart2, Settings2, Sprout, Wallet, Banknote, ClipboardList } from 'lucide-react'
import { useLanguage } from '../lib/LanguageContext'

export default function Sidebar() {
  const { t, logo } = useLanguage()

  const NAV = [
    { to: '/billing',          icon: ReceiptText,   labelKey: 'nav.billing' },
    { to: '/farmer-receipt',   icon: ClipboardList, labelKey: 'nav.farmerReceipt' },
    { to: '/vegetables',       icon: Leaf,          labelKey: 'nav.vegetables' },
    { to: '/clients',          icon: Users,         labelKey: 'nav.clients' },
    { to: '/vendors',          icon: Truck,         labelKey: 'nav.vendors' },
    { to: '/cash-drawer',      icon: Wallet,        labelKey: 'nav.cashDrawer' },
    { to: '/vendor-payments',  icon: Banknote,      labelKey: 'nav.vendorPayments' },
    { to: '/reports',          icon: BarChart2,     labelKey: 'nav.reports' },
    { to: '/configuration',    icon: Settings2,     labelKey: 'nav.configuration' },
  ]

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen shadow-xl" style={{ backgroundColor: 'var(--brand-800)' }}>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3" style={{ borderBottom: '1px solid var(--brand-700)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner overflow-hidden shrink-0"
          style={{ backgroundColor: logo ? 'transparent' : 'var(--brand-500)' }}>
          {logo
            ? <img src={logo} alt="logo" className="w-full h-full object-contain" />
            : <Sprout size={20} className="text-white" />
          }
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">KKS Commission</p>
          <p className="text-xs" style={{ color: 'var(--brand-300)' }}>Mundy System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive ? 'text-white shadow-sm' : 'hover:text-white'
              }`
            }
            style={({ isActive }) => isActive
              ? { backgroundColor: 'var(--brand-600)' }
              : { color: 'var(--brand-200)' }
            }
            onMouseEnter={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.backgroundColor = 'var(--brand-700)' }}
            onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.backgroundColor = '' }}
          >
            <Icon size={18} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--brand-700)' }}>
        <p className="text-xs" style={{ color: 'var(--brand-400)' }}>v2.3.1</p>
      </div>
    </aside>
  )
}
