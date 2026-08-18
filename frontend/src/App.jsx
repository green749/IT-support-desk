import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authService } from './services/auth.service'
import { socketService } from './services/socket'

import { useToast } from './context/ToastContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'

// Layouts & Guards
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Pages
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { LiveTickets } from './pages/LiveTickets'
import { LiveDetail } from './pages/LiveDetail'
import { CreateTicket } from './pages/CreateTicket'
import { LiveUsers } from './pages/LiveUsers'
import { AdminAnalytics } from './pages/AdminAnalytics'
import { Profile } from './pages/Profile'

function AppContent({ user, role, menu, setMenu, signIn, signOut }) {
  const toast = useToast()
  const { addNotification } = useNotifications()

  // Socket connection manager & global event listener
  useEffect(() => {
    if (user) {
      socketService.connect()
      const socket = socketService.getSocket()
      if (socket) {
        const handleTicketAssigned = (data) => {
          const title = data.ticketTitle ? `"${data.ticketTitle}"` : data.title ? `"${data.title}"` : 'IT Support Ticket'
          const notif = {
            id: `assign-${data.ticketId}-${Date.now()}`,
            type: 'assignment',
            ticketId: data.ticketId,
            ticketTitle: data.ticketTitle || data.title || `Ticket #${data.ticketId}`,
            message: data.message || `Ticket TK-${data.ticketId} (${title}) was assigned to you.`,
            createdAt: new Date().toISOString(),
          }
          addNotification(notif)
          toast.info(notif.message, 'Ticket Assigned')
        }

        const handleAssignmentRequired = (data) => {
          if (user.role === 'admin') {
            const notif = {
              id: `req-${data.ticketId}-${Date.now()}`,
              type: 'assignment_required',
              ticketId: data.ticketId,
              ticketTitle: data.ticketTitle || `Ticket #${data.ticketId}`,
              message: data.message || `Ticket #${data.ticketId} (${data.category || 'General'}) requires manual assignment.`,
              createdAt: new Date().toISOString(),
            }
            addNotification(notif)
            toast.info(notif.message, 'Assignment Required')
          }
        }

        const handleTicketNotification = (data) => {
          if (data.senderId && Number(data.senderId) === Number(user.id)) return

          // Message notifications are handled specifically by LiveChatWidget on the chat icon
          if (data.type === 'message') {
            const snippet = data.message.length > 55 ? `${data.message.slice(0, 55)}...` : data.message
            toast.info(`${data.senderName || 'IT Support'} on TK-${data.ticketId}: "${snippet}"`, 'New Chat Message')
            return
          }

          // System notifications (ticket assignment, ticket closed, ticket resolved, ticket reopened, etc.)
          const titleMap = {
            ticket_closed: 'Ticket Closed',
            ticket_resolved: 'Ticket Resolved',
            ticket_reopened: 'Ticket Reopened',
            assignment: 'Ticket Assigned',
            assignment_required: 'Assignment Required',
          }

          const notif = {
            id: data.id || `notif-${Date.now()}-${Math.random()}`,
            type: data.type || 'system',
            ticketId: data.ticketId,
            ticketTitle: data.ticketTitle || `Ticket #${data.ticketId}`,
            senderName: data.senderName || 'IT Operations',
            message: data.message,
            createdAt: data.createdAt || new Date().toISOString(),
          }
          addNotification(notif)
          toast.info(notif.message, titleMap[data.type] || 'Ticket Update')
        }

        socket.on("ticket_assigned", handleTicketAssigned)
        socket.on("ticket_assignment_required", handleAssignmentRequired)
        socket.on("ticket_notification", handleTicketNotification)

        return () => {
          socket.off("ticket_assigned", handleTicketAssigned)
          socket.off("ticket_assignment_required", handleAssignmentRequired)
          socket.off("ticket_notification", handleTicketNotification)
        }
      }
    } else {
      socketService.disconnect()
    }
  }, [user, toast, addNotification])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login onLogin={signIn} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />

        {/* Authenticated Layout */}
        <Route
          element={
            <ProtectedRoute user={user}>
              <Layout user={user} role={role} onLogout={signOut} open={menu} setOpen={setMenu} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard role={role} setOpen={setMenu} />} />
          <Route path="/tickets" element={<LiveTickets role={role} setOpen={setMenu} />} />
          <Route path="/tickets/create" element={<ProtectedRoute user={user} allowedRoles={['customer', 'admin']}><CreateTicket user={user} role={role} setOpen={setMenu} /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<LiveDetail userRole={role} user={user} setOpen={setMenu} />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <LiveUsers roleFilter="" setOpen={setMenu} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agents"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <LiveUsers roleFilter="agent" setOpen={setMenu} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <AdminAnalytics setOpen={setMenu} />
              </ProtectedRoute>
            }
          />
          
          <Route path="/profile" element={<Profile user={user} setOpen={setMenu} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('Employee')
  const [menu, setMenu] = useState(false)
  const [checking, setChecking] = useState(true)

  const roleLabelMap = {
    customer: 'Employee',
    agent: 'IT Support Agent',
    admin: 'IT Administrator',
  }

  const signIn = (userData) => {
    setUser(userData)
    setRole(roleLabelMap[userData.role] || userData.role || 'Employee')
  }

  const signOut = async () => {
    try {
      await authService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
    setUser(null)
    socketService.disconnect()
  }

  useEffect(() => {
    authService.me()
      .then((result) => {
        setUser(result.user)
        setRole(roleLabelMap[result.user.role] || 'Employee')
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-600/30">IT</div>
        <p className="text-slate-400 text-sm">Loading ITDesk workspace...</p>
      </main>
    )
  }

  return (
    <NotificationProvider user={user}>
      <AppContent
        user={user}
        role={role}
        menu={menu}
        setMenu={setMenu}
        signIn={signIn}
        signOut={signOut}
      />
    </NotificationProvider>
  )
}

export default App
