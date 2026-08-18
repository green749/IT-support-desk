import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketService } from '../services/ticket.service'
import { socketService } from '../services/socket'
import { Icon } from './Icon'
import { Avatar } from './Avatar'

const label = (v) => String(v || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const LiveChatWidget = ({ user, role }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [ticketData, setTicketData] = useState(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typingUsers, setTypingUsers] = useState({})
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  // Unread message tracking state per ticket
  const [unreadMap, setUnreadMap] = useState(() => {
    if (!user?.id) return {}
    try {
      const saved = localStorage.getItem(`supportly_chat_unreads_${user.id}`)
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      return {}
    }
  })

  // Keep refs to avoid stale closures in socket handlers
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen
  const selectedTicketIdRef = useRef(selectedTicketId)
  selectedTicketIdRef.current = selectedTicketId
  const userRef = useRef(user)
  userRef.current = user
  const roleRef = useRef(role)
  roleRef.current = role

  const isStaff = role === 'Agent' || role === 'IT Support Agent' || role === 'Admin' || role === 'IT Administrator'
  const isAgent = role === 'Agent' || role === 'IT Support Agent'

  const markTicketAsRead = useCallback((tId) => {
    if (!tId || !user?.id) return
    setUnreadMap((prev) => {
      if (!prev[tId]) return prev
      const updated = { ...prev, [tId]: 0 }
      try {
        localStorage.setItem(`supportly_chat_unreads_${user.id}`, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }, [user?.id])

  // Load ticket list
  const loadTickets = useCallback(async () => {
    setLoadingTickets(true)
    try {
      const res = await ticketService.list()
      setTickets(res.data || [])
    } catch (e) {
      console.error('Error loading tickets for chat widget:', e)
    } finally {
      setLoadingTickets(false)
    }
  }, [])

  // Load selected ticket details & conversation
  const loadSelectedTicket = useCallback(async (ticketId) => {
    if (!ticketId) return
    setLoadingConversation(true)
    try {
      const res = await ticketService.get(ticketId)
      setTicketData(res.data)
      markTicketAsRead(ticketId)
    } catch (e) {
      console.error('Error loading ticket details:', e)
    } finally {
      setLoadingConversation(false)
    }
  }, [markTicketAsRead])

  // Sync tickets list or active ticket conversation whenever widget opens or ticket changes
  useEffect(() => {
    if (isOpen) {
      if (selectedTicketId) {
        loadSelectedTicket(selectedTicketId)
        socketService.joinTicket(selectedTicketId)
      } else {
        loadTickets()
      }
    }
    return () => {
      if (selectedTicketId) {
        socketService.leaveTicket(selectedTicketId)
      }
    }
  }, [isOpen, selectedTicketId, loadSelectedTicket, loadTickets])

  const processedMsgIdsRef = useRef(new Set())

  // Global socket listener for real-time messages, typing, and unread badges
  useEffect(() => {
    const socket = socketService.getSocket()
    if (!socket) return

    const handleNewMessage = (message) => {
      if (!message || !message.ticketId) return
      const tId = Number(message.ticketId)
      const senderId = Number(message.userId || message.author?.id || message.senderId)
      const isInternalMsg = Boolean(message.isInternal)
      const msgId = Number(message.id)
      const cleanKey = `${tId}-${msgId || message.createdAt}`

      // Customer should not receive internal notes
      if (roleRef.current === 'customer' && isInternalMsg) return

      // Update active ticket conversation state in real-time
      setTicketData((prev) => {
        if (!prev || Number(prev.id) !== tId) return prev
        const exists = prev.replies?.some((r) => Number(r.id) === msgId)
        if (exists) return prev
        return {
          ...prev,
          replies: [...(prev.replies || []), message],
        }
      })

      // If user currently has this conversation open, clear unread
      if (isOpenRef.current && Number(selectedTicketIdRef.current) === tId) {
        markTicketAsRead(tId)
      } else if (!senderId || senderId !== Number(userRef.current?.id)) {
        if (!processedMsgIdsRef.current.has(cleanKey)) {
          processedMsgIdsRef.current.add(cleanKey)
          // Increment unread badge on chat icon for other users' incoming messages
          setUnreadMap((prev) => {
            const current = prev[tId] || 0
            const updated = { ...prev, [tId]: current + 1 }
            if (userRef.current?.id) {
              try {
                localStorage.setItem(`supportly_chat_unreads_${userRef.current.id}`, JSON.stringify(updated))
              } catch (e) {}
            }
            return updated
          })
        }
      }
    }

    const handleTicketNotification = (data) => {
      if (data.type === 'message') {
        const tId = Number(data.ticketId)
        const senderId = Number(data.senderId || data.userId)
        if (!tId) return
        if (senderId && senderId === Number(userRef.current?.id)) return

        const cleanKey = `${tId}-${data.id || data.createdAt}`
        if (isOpenRef.current && Number(selectedTicketIdRef.current) === tId) {
          markTicketAsRead(tId)
        } else if (!processedMsgIdsRef.current.has(cleanKey)) {
          processedMsgIdsRef.current.add(cleanKey)
          setUnreadMap((prev) => {
            const current = prev[tId] || 0
            const updated = { ...prev, [tId]: current + 1 }
            if (userRef.current?.id) {
              try {
                localStorage.setItem(`supportly_chat_unreads_${userRef.current.id}`, JSON.stringify(updated))
              } catch (e) {}
            }
            return updated
          })
        }
      }
    }

    const handleTypingStatus = (data) => {
      if (selectedTicketIdRef.current && Number(data.ticketId) === Number(selectedTicketIdRef.current)) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: data.isTyping ? data.userName : null,
        }))
      }
    }

    socket.on('new_ticket_message', handleNewMessage)
    socket.on('ticket_notification', handleTicketNotification)
    socket.on('ticket_typing_status', handleTypingStatus)

    return () => {
      socket.off('new_ticket_message', handleNewMessage)
      socket.off('ticket_notification', handleTicketNotification)
      socket.off('ticket_typing_status', handleTypingStatus)
    }
  }, [markTicketAsRead])

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (selectedTicketId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticketData?.replies, selectedTicketId])

  // Typing event handler
  const handleReplyChange = (e) => {
    const text = e.target.value
    setReplyMessage(text)

    if (!selectedTicketId) return

    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true)
      socketService.startTyping(selectedTicketId)
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socketService.stopTyping(selectedTicketId)
    }, 2000)
  }

  // Send reply
  const handleSend = async (e) => {
    e?.preventDefault()
    if (!replyMessage.trim() || !selectedTicketId || sending) return

    if (isTyping) {
      setIsTyping(false)
      socketService.stopTyping(selectedTicketId)
    }

    setSending(true)
    const msg = replyMessage.trim()
    try {
      const res = await ticketService.reply(selectedTicketId, msg, isInternal)
      setReplyMessage('')
      if (res.data) {
        setTicketData((prev) => {
          if (!prev) return prev
          const exists = prev.replies?.some((r) => Number(r.id) === Number(res.data.id))
          if (exists) return prev
          return {
            ...prev,
            replies: [...(prev.replies || []), res.data],
          }
        })
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  const handleSelectTicket = (ticketId) => {
    setSelectedTicketId(ticketId)
    markTicketAsRead(ticketId)
  }

  const totalUnreadCount = Object.values(unreadMap).reduce((sum, count) => sum + (count || 0), 0)

  const activeTypers = Object.entries(typingUsers)
    .filter(([uid, uname]) => uname && Number(uid) !== Number(user?.id))
    .map(([, uname]) => uname)

  const filteredTickets = tickets.filter(
    (t) =>
      `TK-${t.id} ${t.title} ${t.category || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-7rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#568BEB] to-[#4C82E6] text-white p-4.5 px-5 flex items-center justify-between flex-shrink-0 shadow-sm">
            {selectedTicketId ? (
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setSelectedTicketId(null)
                    setTicketData(null)
                  }}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Back to tickets list"
                >
                  ‹
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-extrabold bg-white/20 px-1.5 py-0.5 rounded">
                      TK-{selectedTicketId}
                    </span>
                    <span className="text-xs font-bold truncate text-blue-100">
                      {ticketData?.category || 'IT Ticket'}
                    </span>
                  </div>
                  <p className="text-sm font-black text-white truncate leading-tight mt-0.5">
                    {ticketData?.title || 'Loading conversation...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-sm border border-white/20">
                  IT
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight leading-tight">ITDesk Live Chat</h3>
                  <p className="text-[11px] text-blue-100 font-medium">Real-time support conversations</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {selectedTicketId && (
                <button
                  onClick={() => {
                    navigate(`/tickets/${selectedTicketId}`)
                    setIsOpen(false)
                  }}
                  title="Open full ticket details"
                  className="text-white/80 hover:text-white text-xs font-bold p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                >
                  <Icon name="arrow" size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: Tickets List View vs Ticket Conversation View */}
          {!selectedTicketId ? (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              {/* Search Tickets */}
              <div className="p-3.5 border-b border-slate-200/80 bg-white">
                <div className="flex items-center gap-2.5 h-10 px-3.5 border border-slate-200 rounded-xl bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all text-slate-400 focus-within:text-blue-600">
                  <Icon name="search" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search active tickets..."
                    className="flex-1 text-xs font-normal text-slate-900 placeholder:text-slate-400 outline-none bg-transparent border-0 p-0"
                  />
                </div>
              </div>

              {/* Tickets List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loadingTickets ? (
                  <div className="py-16 text-center text-slate-400 text-xs font-medium">Loading tickets...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs px-4">
                    <p className="font-bold text-slate-700">No support tickets found</p>
                    <p className="mt-1">Create an IT ticket to start a conversation with the support team.</p>
                  </div>
                ) : (
                  filteredTickets.map((t) => {
                    const ticketUnreads = unreadMap[t.id] || 0
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTicket(t.id)}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-600 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-3 relative"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-400">TK-{t.id}</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                              {t.category || 'General'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${
                              t.status === 'resolved' || t.status === 'closed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.status === 'in_progress'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {label(t.status)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate flex-1">
                              {t.title}
                            </p>
                            {ticketUnreads > 0 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs flex-shrink-0 animate-pulse">
                                {ticketUnreads} new
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Updated {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <span className="text-slate-300 group-hover:text-blue-600 font-bold text-sm">›</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Quick Create Action (Only for employees/admins) */}
              {!isAgent && (
                <div className="p-3 border-t border-slate-200/80 bg-white">
                  <button
                    onClick={() => {
                      navigate('/tickets/create')
                      setIsOpen(false)
                    }}
                    className="w-full h-10 rounded-2xl bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-600/25 transition-all cursor-pointer"
                  >
                    <span>+ Create New IT Ticket</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Selected Ticket Conversation View */
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
              
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {loadingConversation ? (
                  <div className="py-16 text-center text-slate-400 text-xs">Loading messages...</div>
                ) : (
                  <>
                    {/* Ticket initial description */}
                    {ticketData?.description && (
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <span className="font-bold text-slate-700">Ticket Request Details</span>
                          <span>{new Date(ticketData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{ticketData.description}</p>
                      </div>
                    )}

                    {/* Replies stream */}
                    {(ticketData?.replies || []).map((msg) => {
                      const isSelf = Number(msg.userId) === Number(user?.id)
                      const isResolution = msg.message?.startsWith('Resolved:') || msg.message?.startsWith('Resolution:')

                      if (msg.isInternal && !isStaff) return null

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                            <span className="font-bold text-slate-600">
                              {isSelf ? 'You' : msg.user?.name || 'Support Agent'}
                            </span>
                            <span>·</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap shadow-xs ${
                              msg.isInternal
                                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                : isResolution
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                                : isSelf
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                            }`}
                          >
                            {msg.isInternal && (
                              <div className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider mb-1">
                                🔒 Internal Note
                              </div>
                            )}
                            {isResolution && (
                              <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
                                ✓ Resolution
                              </div>
                            )}
                            {msg.message}
                          </div>
                        </div>
                      )
                    })}

                    {/* Typing Indicator */}
                    {activeTypers.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl w-fit shadow-xs">
                        <span className="font-semibold">{activeTypers.join(', ')}</span> is typing...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200/80 bg-white space-y-2">
                {isStaff && (
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 cursor-pointer select-none px-1">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                    <span>Internal Note (Hidden from employee)</span>
                  </label>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={handleReplyChange}
                    placeholder="Type message..."
                    className="flex-1 h-10 px-3.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!replyMessage.trim() || sending}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Floating Launcher Action Button (Only visible when popup is closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            if (selectedTicketId) {
              markTicketAsRead(selectedTicketId)
            }
          }}
          aria-label="Open IT Support Live Chat"
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white flex items-center justify-center shadow-xl shadow-blue-600/35 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/30 relative"
        >
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#4C82E6] rounded-full animate-pulse" />
          </div>

          {/* Unread Chat Messages Badge */}
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-black min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
