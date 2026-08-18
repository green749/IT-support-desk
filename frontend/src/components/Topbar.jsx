import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { useNotifications } from '../context/NotificationContext'
import { NotificationDropdown } from './NotificationDropdown'

export const Topbar = ({ title, subtitle, action, user, role, setOpen }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/tickets?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CU'

  return (
    <header className="px-6 lg:px-10 py-6 bg-transparent flex flex-wrap items-center justify-between gap-4 relative z-10">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen?.(true)}
          className="lg:hidden text-slate-600 hover:text-slate-900 p-2 rounded-2xl bg-white border border-slate-200 shadow-xs mr-1 transition-colors"
        >
          <Icon name="menu" size={20} />
        </button>
        <div>
          <h1 className="font-extrabold text-2xl lg:text-3xl text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-slate-500 text-xs lg:text-sm mt-1 font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <div className="flex items-center gap-2.5 h-11 px-3.5 border border-slate-200 rounded-xl bg-white w-72 lg:w-80 shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all text-slate-400 focus-within:text-blue-600">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets, articles..."
              className="flex-1 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none bg-transparent border-0 focus:ring-0 p-0"
            />
          </div>
        </form>

        {action}
        
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Notifications"
            className={`w-11 h-11 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center transition-all relative shadow-xs ${
              dropdownOpen
                ? 'border-[#4C82E6] text-[#4C82E6] bg-blue-50/50 ring-3 ring-[#4C82E6]/15'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon name="bell" size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} />
        </div>

        {/* Top Right User Profile Card Pill */}
        {user && (
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 p-1.5 pr-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-slate-300 transition-all cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#568BEB] to-[#3D74D9] text-white font-black text-xs flex items-center justify-center shadow-xs">
              {initials}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-none truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-[#4C82E6] uppercase tracking-wider mt-0.5">{role || 'Employee'}</p>
            </div>
            <span className="text-slate-400 text-xs hidden sm:inline-block">▾</span>
          </div>
        )}
      </div>
    </header>
  )
}
