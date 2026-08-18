import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ticketService } from '../services/ticket.service'
import { socketService } from '../services/socket'
import { useToast } from '../context/ToastContext'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/Icon'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { CustomSelect } from '../components/CustomSelect'
import { HiLockClosed, HiDocumentText, HiShieldCheck, HiPlus } from 'react-icons/hi2'

const label = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_customer', label: 'Waiting for Employee' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const roleLabelMap = {
  customer: 'Employee',
  agent: 'IT Support Agent',
  admin: 'IT Administrator',
}

export const LiveDetail = ({ userRole, user, setOpen }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [ticket, setTicket] = useState(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [eligibleAgents, setEligibleAgents] = useState([])
  const [assigning, setAssigning] = useState(false)

  // Resolution states
  const [showResolve, setShowResolve] = useState(false)
  const [resolveMessage, setResolveMessage] = useState('')

  // Typing states
  const [typingUsers, setTypingUsers] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)

  const isAdmin = userRole === 'Admin' || userRole === 'IT Administrator' || user?.role === 'admin'
  const isAgent = userRole === 'Agent' || userRole === 'IT Support Agent' || user?.role === 'agent'
  const isEmployee = !isAdmin && !isAgent

  const loadTicket = useCallback(() => {
    if (id) {
      ticketService.get(id)
        .then((result) => setTicket(result.data))
        .catch((err) => setError(err.message))
    }
  }, [id])

  useEffect(() => {
    loadTicket()
  }, [id, loadTicket])

  // Load eligible active agents with workload when user is Admin
  useEffect(() => {
    if (isAdmin && id) {
      ticketService.getEligibleAgents(id)
        .then((res) => setEligibleAgents(res.data || []))
        .catch(() => { })
    }
  }, [isAdmin, id, ticket?.assignedAgentId])

  // Join/Leave socket room for the ticket
  useEffect(() => {
    if (id) {
      socketService.joinTicket(id)
    }
    return () => {
      if (id) {
        socketService.leaveTicket(id)
      }
    }
  }, [id])

  // Set up socket event listeners for real-time messaging, status updates, and typing indicators
  useEffect(() => {
    const socket = socketService.getSocket()
    if (!socket) return

    const handleNewMessage = (message) => {
      if (Number(message.ticketId) === Number(id)) {
        setTicket((prev) => {
          if (!prev) return prev
          const alreadyExists = prev.replies?.some((r) => Number(r.id) === Number(message.id))
          if (alreadyExists) return prev
          return {
            ...prev,
            replies: [...(prev.replies || []), message],
          }
        })
      }
    }

    const handleStatusUpdated = (data) => {
      if (Number(data.ticketId) === Number(id)) {
        setTicket((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            status: data.status,
          }
        })
      }
    }

    const handleTypingStatus = (data) => {
      if (Number(data.ticketId) === Number(id)) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.isTyping ? data.userName : null,
        }))
      }
    }

    const handleTicketAssigned = (data) => {
      if (Number(data.ticketId) === Number(id)) {
        loadTicket()
      }
    }

    socket.on("new_ticket_message", handleNewMessage)
    socket.on("ticket_status_updated", handleStatusUpdated)
    socket.on("typing_status", handleTypingStatus)
    socket.on("ticket_assigned", handleTicketAssigned)

    return () => {
      socket.off("new_ticket_message", handleNewMessage)
      socket.off("ticket_status_updated", handleStatusUpdated)
      socket.off("typing_status", handleTypingStatus)
      socket.off("ticket_assigned", handleTicketAssigned)
    }
  }, [id, loadTicket])

  // Auto scroll messages to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.replies, typingUsers])

  const handleReplyChange = (e) => {
    const text = e.target.value
    setReply(text)

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true)
      socketService.startTyping(id)
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socketService.stopTyping(id)
    }, 2000)
  }

  const handleAddInternalNote = async (e) => {
    e?.preventDefault()
    if (!reply.trim()) return

    const messageText = reply.trim()
    try {
      const result = await ticketService.reply(id, messageText, true)
      setReply('')
      if (result.data) {
        setTicket((prev) => {
          if (!prev) return prev
          const alreadyExists = prev.replies?.some((r) => Number(r.id) === Number(result.data.id))
          if (alreadyExists) return prev
          return {
            ...prev,
            replies: [...(prev.replies || []), result.data],
          }
        })
        toast.success('Internal note added successfully', 'Note Saved')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add internal note', 'Error')
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await ticketService.update(id, { status: newStatus })
      setTicket((prev) => (prev ? { ...prev, status: newStatus } : prev))
      toast.success(`Ticket status updated to ${label(newStatus)}`, 'Status Updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update status', 'Error')
    }
  }

  const handlePriorityChange = async (newPriority) => {
    try {
      await ticketService.update(id, { priority: newPriority })
      setTicket((prev) => (prev ? { ...prev, priority: newPriority } : prev))
      toast.success(`Ticket priority updated to ${label(newPriority)}`, 'Priority Updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update priority', 'Error')
    }
  }

  const handleAssignAgent = async (agentId) => {
    setAssigning(true)
    try {
      await ticketService.assign(id, agentId || null)
      toast.success('Agent assigned successfully', 'Routing Updated')
      loadTicket()
    } catch (err) {
      toast.error(err.message || 'Failed to assign agent', 'Error')
    } finally {
      setAssigning(false)
    }
  }

  const handleResolve = async () => {
    if (!resolveMessage.trim()) {
      return toast.warning('Please enter resolution notes for the employee.', 'Resolution Required')
    }
    try {
      await ticketService.resolve(id, resolveMessage.trim())
      setShowResolve(false)
      setResolveMessage('')
      toast.success('Ticket marked as resolved!', 'Resolution Sent')
      loadTicket()
    } catch (err) {
      toast.error(err.message || 'Failed to resolve ticket', 'Error')
    }
  }

  if (error) {
    return (
      <>
        <Topbar title="Ticket Not Found" user={user} role={userRole} setOpen={setOpen} />
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-5 rounded-3xl shadow-xs">
            <h3 className="font-bold text-base mb-1">Unable to Load Ticket</h3>
            <p className="text-xs">{error}</p>
            <button
              onClick={() => navigate('/tickets')}
              className="mt-4 px-5 h-9 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
            >
              Return to Tickets
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!ticket) {
    return (
      <>
        <Topbar title="Loading Ticket..." user={user} role={userRole} setOpen={setOpen} />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-[#4C82E6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading IT support ticket details...</p>
        </div>
      </>
    )
  }

  const activeTypers = Object.values(typingUsers).filter(Boolean)
  const employeeInitials = ticket.customer?.name ? ticket.customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EM'
  const agentInitials = ticket.assignedAgent?.name ? ticket.assignedAgent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : null
  const internalNotes = (ticket.replies || []).filter((r) => r.isInternal)

  return (
    <>
      <Topbar
        title={ticket.title}
        subtitle={`Ticket #TK-${ticket.id} · ${ticket.category || 'General IT'}`}
        user={user}
        role={userRole}
        setOpen={setOpen}
        action={
          <div className="flex items-center gap-2.5">
            {ticket.status !== 'closed' && (
              <button
                onClick={() => handleStatusChange('closed')}
                className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold px-3.5 h-11 rounded-2xl transition-all shadow-xs cursor-pointer"
              >
                <Icon name="x" size={14} />
                <span>Close Ticket</span>
              </button>
            )}
            <button
              onClick={() => navigate('/tickets')}
              className="flex items-center gap-1.5 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 text-xs font-bold px-4 h-11 rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              <span>← Back to tickets</span>
            </button>
          </div>
        }
      />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-12 w-full">
        {/* Single Master Ticket Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm">
          
          {/* Card Top Header / Meta Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 rounded-t-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                TK-{ticket.id}
              </span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                {ticket.category || 'General IT'}
              </span>
              <Badge type="priority">{label(ticket.priority)}</Badge>
              <Badge>{label(ticket.status)}</Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Submitted {new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Master Card Body: 2 Integrated Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            
            {/* Left Main Section (8 cols): Problem Description & Discussion */}
            <div className="lg:col-span-8 p-6 lg:p-7 space-y-6 rounded-bl-3xl">
              
              {/* Problem Description Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Problem Description
                </h3>
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>

              {/* Resolution Banner (if resolved/closed) */}
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Issue Resolution Recorded
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      This support request has been marked as resolved. Review discussion history or use the options on the right to manage status.
                    </p>
                  </div>
                </div>
              )}

              {/* Internal Notes Section */}
              {!isEmployee ? (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <HiLockClosed className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Internal Notes
                      </h3>
                      <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {internalNotes.length}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg font-semibold border border-amber-200/70 shadow-2xs">
                      <HiShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hidden from Employee</span>
                    </span>
                  </div>

                  {/* Internal Notes List */}
                  <div className="space-y-3 min-h-[100px] max-h-[360px] overflow-y-auto pr-1 messages-scroll">
                    {internalNotes.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/60 border border-slate-100 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                          <HiDocumentText className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-700">No internal notes yet</p>
                        <p className="mt-0.5 text-slate-400">Add technical observations, routing notes, or handover comments for the IT team below.</p>
                      </div>
                    ) : (
                      internalNotes.map((note) => {
                        const authorInitials = note.author?.name
                          ? note.author.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                          : note.user?.name
                          ? note.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                          : 'IT'
                        const authorName = note.author?.name || note.user?.name || 'Support Specialist'

                        return (
                          <div
                            key={note.id}
                            className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <Avatar initials={authorInitials} tone="default" />
                                <div>
                                  <span className="font-bold text-amber-950 block leading-tight">{authorName}</span>
                                  <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium mt-0.5">
                                    <HiLockClosed className="w-2.5 h-2.5" />
                                    <span>Internal Note</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-amber-800/80 font-medium">
                                {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(note.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-amber-950 leading-relaxed whitespace-pre-wrap pl-1 font-normal">
                              {note.message}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Add Internal Note Form */}
                  <form
                    onSubmit={handleAddInternalNote}
                    className="pt-3 border-t border-slate-100 space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Add an internal note (only visible to IT team)..."
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                      />
                      <button
                        type="submit"
                        disabled={!reply.trim()}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                      >
                        <HiPlus className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 p-4 bg-blue-50/50 border border-blue-100/80 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />
                  <span>Real-time live messaging is active. Open the Live Chat button in the bottom right corner to speak with the IT support agent.</span>
                </div>
              )}

            </div>

            {/* Right Sidebar Section (4 cols): Requester & Management integrated inside the card */}
            <div className="lg:col-span-4 p-6 lg:p-7 bg-slate-50/40 space-y-6 rounded-b-3xl lg:rounded-bl-none lg:rounded-br-3xl">
              
              {/* Requester Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Requester Information
                </h3>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                  <Avatar initials={employeeInitials} tone="orange" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{ticket.customer?.name || 'Employee'}</p>
                    <p className="text-xs text-slate-500 truncate">{ticket.customer?.email || '—'}</p>
                  </div>
                </div>
                <div className="px-1 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium">User Role</span>
                    <span className="font-semibold text-slate-800">{roleLabelMap[ticket.customer?.role] || 'Employee'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium">Submitted Date</span>
                    <span className="font-medium text-slate-700">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium">Assigned Specialist</span>
                    <span className="font-semibold text-blue-700">{ticket.assignedAgent?.name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Management Controls for Staff/Agent/Admin */}
              {!isEmployee && (
                <div className="pt-5 border-t border-slate-200/80 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    IT Ticket Management
                  </h3>
                  
                  <div className="space-y-3.5">
                    <CustomSelect
                      label="Update Status"
                      value={ticket.status}
                      onChange={(val) => handleStatusChange(val)}
                      options={STATUS_OPTIONS}
                    />

                    <CustomSelect
                      label="Update Priority"
                      value={ticket.priority}
                      onChange={(val) => handlePriorityChange(val)}
                      options={PRIORITY_OPTIONS}
                    />

                    {isAdmin && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-700">Assign IT Support Agent</label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {eligibleAgents.length} eligible
                          </span>
                        </div>
                        <CustomSelect
                          value={ticket.assignedAgent?.id ? String(ticket.assignedAgent.id) : ''}
                          onChange={(val) => handleAssignAgent(val)}
                          disabled={assigning}
                          placeholder="Unassigned"
                          options={[
                            { value: '', label: 'Unassigned' },
                            ...eligibleAgents.map((a) => ({
                              value: String(a.id),
                              label: a.name,
                              badge: `${a.activeTicketsCount ?? 0} active`,
                            })),
                          ]}
                        />
                      </div>
                    )}

                    {/* Resolution Action */}
                    {showResolve ? (
                      <div className="pt-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 space-y-2.5">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-900">Resolve IT Ticket</h4>
                          <p className="text-[11px] text-emerald-700 mt-0.5">Provide resolution notes for the employee.</p>
                        </div>
                        <textarea
                          value={resolveMessage}
                          onChange={(e) => setResolveMessage(e.target.value)}
                          placeholder="Type resolution summary..."
                          rows={3}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-3 h-8 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            onClick={() => setShowResolve(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="px-3.5 h-8 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-xs"
                            onClick={handleResolve}
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                        <button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                          onClick={() => setShowResolve(true)}
                        >
                          <Icon name="check" size={16} />
                          <span>Resolve Ticket</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Employee Resolution Verification Card (only when resolved) */}
              {isEmployee && ticket.status === 'resolved' && (
                <div className="pt-4 border-t border-slate-200/80 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2.5 shadow-2xs">
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    The IT support team has marked this ticket as resolved. Please verify and accept to close, or reopen if you still need assistance.
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl transition-all shadow-xs cursor-pointer"
                      onClick={() => handleStatusChange('closed')}
                    >
                      Accept & Close Ticket
                    </button>
                    <button
                      className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs h-9 rounded-xl transition-all shadow-xs cursor-pointer"
                      onClick={() => handleStatusChange('reopened')}
                    >
                      Reopen Ticket
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </>
  )
}
