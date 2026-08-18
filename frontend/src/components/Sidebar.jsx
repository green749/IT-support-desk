import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Icon } from './Icon'

const navByRole = {
  Customer: [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'My Tickets', 'ticket'],
    ['create', 'Create Ticket', 'plus'],
  ],
  Employee: [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'My Tickets', 'ticket'],
    ['create', 'Create Ticket', 'plus'],
  ],
  Agent: [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'Assigned Queue', 'ticket'],
  ],
  'IT Support Agent': [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'Assigned Queue', 'ticket'],
  ],
  Admin: [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'All Tickets', 'ticket'],
    ['users', 'User Management', 'users'],
    ['analytics', 'Analytics', 'chart'],
  ],
  'IT Administrator': [
    ['dashboard', 'Dashboard', 'home'],
    ['tickets', 'All Tickets', 'ticket'],
    ['users', 'User Management', 'users'],
    ['analytics', 'Analytics', 'chart'],
  ],
}

const routeMap = {
  dashboard: '/dashboard',
  tickets: '/tickets',
  create: '/tickets/create',
  users: '/users',
  analytics: '/analytics',
}

export const Sidebar = ({ user, role, onLogout, open, setOpen, isExpanded, setIsExpanded }) => {
  const [internalHover, setInternalHover] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  if (!user) return null

  const hovered = typeof isExpanded === 'boolean' ? isExpanded : internalHover
  const setHovered = (val) => {
    setInternalHover(val)
    if (setIsExpanded) setIsExpanded(val)
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const navItems = navByRole[role] || navByRole.Employee

  const isActive = (key) => {
    const path = location.pathname
    if (key === 'dashboard') return path === '/dashboard'
    if (key === 'create') return path === '/tickets/create'
    if (key === 'tickets') return path === '/tickets' || (path.startsWith('/tickets/') && path !== '/tickets/create')
    if (key === 'users') return path === '/users' || path.startsWith('/users/')
    if (key === 'analytics') return path === '/analytics' || path.startsWith('/analytics/')
    return false
  }

  return (
    <>
      {/* Mobile Drawer (Only visible on small screens when open) */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:hidden flex flex-col bg-gradient-to-b from-[#568BEB] via-[#4C82E6] to-[#3D74D9] text-white p-3 w-64 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-1 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-lg text-white border border-white/30">
              IT
            </div>
            <div>
              <span className="text-white font-extrabold text-lg block leading-tight">ITDesk</span>
              <span className="text-[10px] text-blue-100 font-semibold block">Enterprise Support</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white p-1">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Mobile Nav */}
        <nav className="flex-1 px-1 flex flex-col gap-1.5 overflow-y-auto mt-4">
          {navItems.map(([key, labelText, iconName]) => {
            const active = isActive(key)
            return (
              <button
                key={key}
                onClick={() => { navigate(routeMap[key]); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-white text-[#3D74D9] shadow-md font-black'
                    : 'text-white/85 hover:bg-white/15 hover:text-white font-semibold'
                }`}
              >
                <Icon name={iconName} size={18} />
                <span>{labelText}</span>
              </button>
            )
          })}
        </nav>

        {/* Mobile User Profile */}
        <div className="pt-2 px-1 flex-shrink-0">
          <div
            onClick={() => navigate('/profile')}
            className="w-full flex items-center justify-between p-2.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl text-white shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white text-[#4C82E6] font-black text-xs flex items-center justify-center">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-blue-100 font-medium truncate">{role}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onLogout() }}
              title="Sign Out"
              className="text-blue-100 hover:text-white p-1"
            >
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Responsive Inline Sidebar (Butter-smooth animated flex expansion) */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: hovered ? '250px' : '68px',
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="hidden lg:flex flex-col h-full text-white p-1.5 flex-shrink-0 overflow-hidden select-none will-change-[width]"
      >
        {/* Brand Header */}
        <div className="flex items-center px-1 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-lg text-white border border-white/30 shadow-inner flex-shrink-0">
              IT
            </div>
            <div
              style={{
                opacity: hovered ? 1 : 0,
                maxWidth: hovered ? '180px' : '0px',
                transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-white font-extrabold text-xl tracking-tight block leading-tight">ITDesk</span>
              <span className="text-[11px] text-blue-100 font-semibold tracking-wide block">Enterprise Support</span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-0 flex flex-col gap-2 overflow-y-auto mt-4">
          {navItems.map(([key, labelText, iconName]) => {
            const active = isActive(key)
            return (
              <button
                key={key}
                onClick={() => navigate(routeMap[key])}
                title={!hovered ? labelText : ''}
                className={`w-full flex items-center h-12 rounded-2xl transition-colors duration-150 cursor-pointer overflow-hidden ${
                  active
                    ? 'bg-white text-[#3D74D9] shadow-lg shadow-blue-950/20 font-black'
                    : 'text-white/85 hover:bg-white/15 hover:text-white font-semibold'
                }`}
              >
                {/* Fixed-width Icon Slot */}
                <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                  <span className={`flex items-center justify-center ${active ? 'text-[#3D74D9]' : 'text-white/90'}`}>
                    <Icon name={iconName} size={19} />
                  </span>
                </div>

                {/* Text Label */}
                <span
                  style={{
                    opacity: hovered ? 1 : 0,
                    maxWidth: hovered ? '180px' : '0px',
                    transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="text-sm tracking-tight whitespace-nowrap overflow-hidden pr-3 font-semibold"
                >
                  {labelText}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Bottom User Profile Section */}
        <div className="pt-2 px-0 flex-shrink-0">
          <div
            onClick={() => navigate('/profile')}
            className={`w-full flex items-center p-1.5 rounded-2xl text-white cursor-pointer shadow-sm overflow-hidden transition-colors duration-200 ${
              hovered
                ? 'bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 justify-between'
                : 'justify-center bg-transparent border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-white text-[#4C82E6] font-black text-sm flex items-center justify-center shadow-inner">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#4C82E6] rounded-full" />
              </div>

              <div
                style={{
                  opacity: hovered ? 1 : 0,
                  maxWidth: hovered ? '130px' : '0px',
                  transition: 'opacity 220ms ease, max-width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-xs font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-blue-100 font-medium truncate mt-0.5">{role}</p>
              </div>
            </div>

            {hovered && (
              <button
                onClick={(e) => { e.stopPropagation(); onLogout() }}
                title="Sign Out"
                className="text-blue-100 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0 ml-1"
              >
                <Icon name="logout" size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
