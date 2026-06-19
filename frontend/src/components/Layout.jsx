import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Image,
  Moon,
  Sun,
  Menu,
  X,
  ChevronRight,
  Mail,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/templates', icon: Image, label: 'Templates' },
  { to: '/settings', icon: Mail, label: 'Email Settings' },
]

const getHeaderInfo = (pathname) => {
  if (pathname === '/dashboard') {
    return {
      workspace: 'ADMIN WORKSPACE',
      title: 'Bulk Certificate Generator',
      subtitle: 'Upload lists, position placeholders, and compile print-ready PDFs locally on localhost.'
    }
  }
  if (pathname === '/templates') {
    return {
      workspace: 'ADMIN WORKSPACE',
      title: 'Templates',
      subtitle: 'Manage and configure your certificate templates'
    }
  }
  if (pathname === '/templates/new') {
    return {
      workspace: 'ADMIN WORKSPACE',
      title: 'New Template',
      subtitle: 'Upload and configure a certificate template'
    }
  }
  if (pathname === '/settings') {
    return {
      workspace: 'ADMIN WORKSPACE',
      title: 'Email Settings',
      subtitle: 'Configure your SMTP email provider and test connection'
    }
  }
  if (pathname.includes('/edit')) {
    return {
      workspace: 'ADMIN WORKSPACE',
      title: 'Edit Template',
      subtitle: 'Configure placeholder coordinate mapping and styles'
    }
  }
  return {
    workspace: 'ADMIN WORKSPACE',
    title: 'Workspace',
    subtitle: 'Manage system settings'
  }
}

function Sidebar({ onClose }) {
  return (
    <div className="flex flex-col h-full bg-[var(--surface)] text-[var(--text)]">
      {/* Brand Logo representing i-CGS by DV Analytics from image */}
      <div className="relative flex flex-col items-center justify-center w-full py-5 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="font-brand text-2xl font-black tracking-wider select-none">
          <span className="text-[#e05322]">i-</span>
          <span className="bg-gradient-to-r from-[#e05322] via-[#e05322] to-[#7c3aed] bg-clip-text text-transparent">CGS</span>
        </div>
        <div className="mt-2 select-none px-4 flex items-center justify-center gap-2">
          <span className="text-[13px] text-gray-400 font-medium lowercase">by</span>
          <img src="/DV-Logo.png" alt="DV Analytics" className="h-8 object-contain dark:brightness-110 dark:contrast-110" />
        </div>
        {onClose && (
          <button onClick={onClose} className="absolute right-4 top-4 p-1 rounded hover:bg-[var(--row-hover)] lg:hidden">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto bg-[var(--surface)]">
        <p className="px-4 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const headerInfo = getHeaderInfo(location.pathname)

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)]">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 h-full bg-[var(--surface)] border-r border-[var(--border)] z-50 animate-slide-up">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Header Card (Matching Image Layout) */}
            <div className="card p-5 flex flex-row items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight mt-0.5">
                  {headerInfo.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {headerInfo.subtitle}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded bg-[var(--surface-muted)] border border-[var(--border)] hover:bg-[var(--row-hover)] text-[var(--text)] transition-colors"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun size={15} className="text-[#e05322]" />
                  ) : (
                    <Moon size={15} className="text-[var(--text-muted)]" />
                  )}
                </button>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded border border-[var(--border)] hover:bg-[var(--row-hover)] text-[var(--text)] transition-colors"
                >
                  <Menu size={15} />
                </button>
              </div>
            </div>

            {/* Actual Page Component */}
            <div className="animate-fade-in">
              {children}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  )
}
