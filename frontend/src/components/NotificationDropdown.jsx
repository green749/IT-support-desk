import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { Icon } from './Icon'

const formatTime = (dateStr) => {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffSec = Math.floor((now - d) / 1000)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch (e) {
    return ''
  }
}

export const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleItemClick = (n) => {
    markAsRead(n.id)
    onClose()
    if (n.ticketId) {
      navigate(`/tickets/${n.ticketId}`)
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/15 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Clear all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 messages-scroll">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Icon name="bell" size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">You're all caught up on all support updates.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isClosed = n.type === 'ticket_closed'
            const isResolved = n.type === 'ticket_resolved'
            const isReopened = n.type === 'ticket_reopened'
            const isAssignment = n.type === 'assignment'
            const isReq = n.type === 'assignment_required'

            const iconName = isClosed ? 'x' : isResolved ? 'check' : isReopened ? 'tickets' : isAssignment ? 'user' : isReq ? 'alert' : 'bell'
            const iconColorClass = isClosed
              ? 'bg-rose-100 text-rose-600'
              : isResolved
              ? 'bg-emerald-100 text-emerald-600'
              : isReopened || isReq
              ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-600'

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 relative group ${
                  !n.read ? 'bg-blue-50/25' : 'bg-white'
                }`}
              >
                {/* Type icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColorClass}`}
                >
                  <Icon name={iconName} size={15} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {isClosed
                        ? `Ticket TK-${n.ticketId} Closed`
                        : isResolved
                        ? `Ticket TK-${n.ticketId} Resolved`
                        : isReopened
                        ? `Ticket TK-${n.ticketId} Reopened`
                        : isAssignment
                        ? `Ticket TK-${n.ticketId} Assigned`
                        : n.senderName
                        ? `${n.senderName} on TK-${n.ticketId}`
                        : `Ticket TK-${n.ticketId}`}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>

                  {n.ticketTitle && (
                    <p className="text-[11px] font-medium text-blue-600 truncate mb-0.5">
                      {n.ticketTitle}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                    {String(n.message || '').replaceAll('by undefined', 'by IT Support').replaceAll('undefined', 'IT Support')}
                  </p>

                {/* Mark as read button */}
                {!n.read && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(n.id)
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition-colors shadow-2xs"
                    >
                      <Icon name="check" size={11} /> Mark as read
                    </button>
                  </div>
                )}
              </div>

              {/* Unread indicator dot */}
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5" />
              )}
            </div>
          )
        })
      )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
          <button
            onClick={markAllAsRead}
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Mark all {unreadCount} unread as read
          </button>
        </div>
      )}
    </div>
  )
}
