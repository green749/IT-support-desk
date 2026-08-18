import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children, user }) => {
  const [notifications, setNotifications] = useState([])

  const storageKey = user ? `supportly_notifications_${user.id}` : null

  // Load from localStorage on mount or when user changes
  useEffect(() => {
    if (!storageKey) {
      setNotifications([])
      return
    }
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setNotifications(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load notifications from localStorage', e)
    }
  }, [storageKey])

  // Save to localStorage when notifications change
  const saveNotifications = useCallback((newNotifs) => {
    setNotifications(newNotifs)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newNotifs))
      } catch (e) {
        console.error('Failed to save notifications to localStorage', e)
      }
    }
  }, [storageKey])

  const addNotification = useCallback((notif) => {
    setNotifications((prev) => {
      // Prevent duplicate notification IDs
      if (prev.some((n) => n.id === notif.id)) return prev
      const updated = [
        {
          id: notif.id || `notif-${Date.now()}-${Math.random()}`,
          type: notif.type || 'message',
          ticketId: notif.ticketId,
          ticketTitle: notif.ticketTitle || `Ticket #${notif.ticketId}`,
          senderName: notif.senderName || 'Support',
          message: notif.message || '',
          createdAt: notif.createdAt || new Date().toISOString(),
          read: false,
        },
        ...prev.slice(0, 49), // Keep max 50 recent notifications
      ]
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch (e) {}
      }
      return updated
    })
  }, [storageKey])

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch (e) {}
      }
      return updated
    })
  }, [storageKey])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch (e) {}
      }
      return updated
    })
  }, [storageKey])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id)
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch (e) {}
      }
      return updated
    })
  }, [storageKey])

  const clearAll = useCallback(() => {
    saveNotifications([])
  }, [saveNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
