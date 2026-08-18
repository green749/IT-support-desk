import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketService } from '../services/ticket.service'
import { analyticsService } from '../services/analytics.service'
import { userService } from '../services/user.service'
import { authService } from '../services/auth.service'
import { socketService } from '../services/socket'
import { useToast } from '../context/ToastContext'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'

const label = (v) => String(v || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

export const Dashboard = ({ role, setOpen }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [agentCategories, setAgentCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignModalTicket, setAssignModalTicket] = useState(null)
  const [eligibleAgents, setEligibleAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)

  const navigate = useNavigate()
  const toast = useToast()

  const isAdmin = role === 'Admin' || role === 'IT Administrator' || role === 'admin'
  const isAgent = role === 'Agent' || role === 'IT Support Agent' || role === 'agent'

  const loadData = useCallback(async () => {
    try {
      const meRes = await authService.me().catch(() => null)
      if (meRes?.user) {
        setCurrentUser(meRes.user)
      }

      // Fetch user/role tickets for all users
      const ticketRes = await ticketService.list().catch(() => ({ data: [] }))
      setTickets(ticketRes.data || [])

      if (isAdmin) {
        const r = await analyticsService.dashboard().catch(() => null)
        if (r?.data) setAnalytics(r.data)
      }

      if (isAgent && meRes?.user?.id) {
        const catRes = await userService.getCategories(meRes.user.id).catch(() => null)
        setAgentCategories(catRes?.data?.categories || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isAgent])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Socket.IO listeners
  useEffect(() => {
    const socket = socketService.getSocket()
    if (!socket) return

    const handleAssignmentRequired = (data) => {
      if (isAdmin) {
        toast.info(data.message || `Ticket TK-${data.ticketId} requires manual assignment`, 'Assignment Required')
        loadData()
      }
    }

    const handleTicketAssigned = () => {
      loadData()
    }

    socket.on('ticket_assignment_required', handleAssignmentRequired)
    socket.on('ticket_assigned', handleTicketAssigned)

    return () => {
      socket.off('ticket_assignment_required', handleAssignmentRequired)
      socket.off('ticket_assigned', handleTicketAssigned)
    }
  }, [isAdmin, loadData, toast])

  const openAssignModal = async (ticket) => {
    setAssignModalTicket(ticket)
    setLoadingAgents(true)
    setSelectedAgentId('')
    try {
      const res = await ticketService.getEligibleAgents(ticket.id)
      setEligibleAgents(res.data || [])
      if (res.data && res.data.length > 0) {
        setSelectedAgentId(String(res.data[0].id))
      }
    } catch (e) {
      toast.error('Unable to load eligible agents for this ticket', 'Error')
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleManualAssign = async () => {
    if (!assignModalTicket || !selectedAgentId) return
    setAssigning(true)
    try {
      await ticketService.assign(assignModalTicket.id, Number(selectedAgentId))
      toast.success(`Ticket TK-${assignModalTicket.id} assigned successfully`, 'Ticket Assigned')
      setAssignModalTicket(null)
      loadData()
    } catch (e) {
      toast.error(e.message, 'Assignment Failed')
    } finally {
      setAssigning(false)
    }
  }

  // Greeting helper
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const userName = currentUser?.name?.split(' ')[0] || 'User'

  // Accurate live stats calculation
  let totalCount = 0
  let openCount = 0
  let inProgressCount = 0
  let resolvedCount = 0

  if (isAdmin && analytics?.totals) {
    totalCount = Number(analytics.totals.tickets ?? 0)
    openCount = Number(analytics.totals.open ?? 0)
    inProgressCount = Number(analytics.totals.inProgress ?? 0)
    resolvedCount = Number(analytics.totals.resolved ?? 0)
  } else {
    totalCount = tickets.length
    openCount = tickets.filter(t => t.status === 'open' || t.status === 'assigned').length
    inProgressCount = tickets.filter(t => t.status === 'in_progress' || t.status === 'waiting_for_customer').length
    resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  }

  const displayTickets = tickets.slice(0, 4)

  const unassignedList = analytics?.unassignedTickets || []

  return (
    <>
      <Topbar
        title={`${greeting}, ${userName} `}
        subtitle="Here's what's happening with your IT support requests today."
        user={currentUser}
        role={role}
        setOpen={setOpen}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-12 w-full space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 text-sm">Loading workspace...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">{error}</div>
        ) : (
          <>
            {/* Agent Support Categories Banner */}
            {isAgent && agentCategories.length > 0 && (
              <div className="bg-gradient-to-r from-[#568BEB] to-[#3D74D9] text-white rounded-3xl p-6 shadow-sm border border-blue-400/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100">Routing Status</span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">My Authorized Support Categories</h3>
                  <p className="text-xs text-blue-100 mt-1">Tickets matching these categories are automatically routed to your queue:</p>
                </div>
                <div className="flex flex-wrap gap-2 max-w-xl">
                  {agentCategories.map((c) => (
                    <span key={c.id} className="text-xs font-bold bg-white/20 text-white border border-white/30 px-3.5 py-1.5 rounded-xl backdrop-blur-sm">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Row: 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* TOTAL REQUESTS */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#4C82E6]">
                    <Icon name="tickets" size={20} />
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 text-lg font-bold">•••</button>
                </div>
                <div className="mt-4">
                  <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">TOTAL REQUESTS</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{totalCount}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-[#4C82E6]">
                    <span>↑ 12%</span>
                    <span className="text-slate-400 font-medium">this week</span>
                  </div>
                </div>
              </div>

              {/* OPEN REQUESTS */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100/80 flex items-center justify-center text-sky-600">
                    <Icon name="ticket" size={20} />
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 text-lg font-bold">•••</button>
                </div>
                <div className="mt-4">
                  <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">OPEN REQUESTS</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{openCount}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-sky-600">
                    <span>↑ 5%</span>
                    <span className="text-slate-400 font-medium">this week</span>
                  </div>
                </div>
              </div>

              {/* IN PROGRESS */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600">
                    <Icon name="chart" size={20} />
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 text-lg font-bold">•••</button>
                </div>
                <div className="mt-4">
                  <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">IN PROGRESS</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{inProgressCount}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-amber-600">
                    <span>↑ 8%</span>
                    <span className="text-slate-400 font-medium">this week</span>
                  </div>
                </div>
              </div>

              {/* RESOLVED */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600">
                    <Icon name="check" size={20} />
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 text-lg font-bold">•••</button>
                </div>
                <div className="mt-4">
                  <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">RESOLVED</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{resolvedCount}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600">
                    <span>↑ 20%</span>
                    <span className="text-slate-400 font-medium">this week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ADMIN VIEW: Assignment Required Section */}
            {isAdmin && (
              <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-amber-50/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                      ⚠️
                    </div>
                    <div>
                      <h2 className="font-extrabold text-slate-900 text-base">Tickets Requiring Manual Assignment</h2>
                      <p className="text-slate-500 text-xs mt-0.5">Unassigned tickets requiring IT Administrator routing decision</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3.5 py-1 rounded-full border border-amber-200">
                    {unassignedList.length} pending
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {unassignedList.map((t) => (
                    <div key={t.id} className="px-7 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-400 font-mono w-14 flex-shrink-0">TK-{t.id}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="font-bold text-[#4F39F6]">{t.category}</span>
                            <span>·</span>
                            <span>Requested by {t.customer?.name || 'Employee'}</span>
                            <span>·</span>
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${t.matchingAgentCount === 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-indigo-50 text-[#4F39F6] border border-indigo-200'
                          }`}>
                          {t.matchingAgentCount === 0 ? '0 matching agents' : `${t.matchingAgentCount} matching agents`}
                        </span>
                        <button
                          onClick={() => openAssignModal(t)}
                          className="bg-[#4F39F6] hover:bg-[#432BE8] text-white text-xs font-bold px-4 h-9 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Assign Agent
                        </button>
                      </div>
                    </div>
                  ))}

                  {!unassignedList.length && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#4F39F6] flex items-center justify-center mx-auto mb-2 text-lg">✓</div>
                      <p className="font-bold text-slate-700">All tickets assigned!</p>
                      <p className="text-xs text-slate-400 mt-0.5">There are no pending tickets requiring manual assignment.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Dashboard Grid: Ticket Trends Chart (Left 6 cols) + Recent Tickets (Right 6 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Ticket Trends Chart */}
              <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-extrabold text-slate-900 text-base">Ticket Trends</h3>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4C82E6]" />
                        <span>Opened</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                        <span>Resolved</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs font-medium">Your support activity over the last 7 days</p>
                </div>

                {/* SVG Chart Graphic */}
                <div className="relative w-full h-56 mt-4">
                  <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartBlueGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4C82E6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4C82E6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="chartCyanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Grid Lines */}
                    {[
                      [20, 20],
                      [15, 60],
                      [10, 100],
                      [5, 140],
                      [0, 180],
                    ].map(([val, y]) => (
                      <g key={val}>
                        <text x="5" y={y + 4} fill="#94a3b8" fontSize="10" fontWeight="600">{val}</text>
                        <line x1="30" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      </g>
                    ))}

                    {/* Azure Wave (Opened) */}
                    <path
                      d="M 40,150 C 90,130 130,80 170,85 C 220,90 260,110 300,105 C 340,100 370,70 410,75 C 440,80 460,90 485,75 L 485,180 L 40,180 Z"
                      fill="url(#chartBlueGrad1)"
                    />
                    <path
                      d="M 40,150 C 90,130 130,80 170,85 C 220,90 260,110 300,105 C 340,100 370,70 410,75 C 440,80 460,90 485,75"
                      fill="none"
                      stroke="#4C82E6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Cyan Wave (Resolved) */}
                    <path
                      d="M 40,165 C 90,165 130,130 170,135 C 220,170 260,150 300,145 C 340,140 370,120 410,125 C 440,145 460,135 485,140 L 485,180 L 40,180 Z"
                      fill="url(#chartCyanGrad)"
                    />
                    <path
                      d="M 40,165 C 90,165 130,130 170,135 C 220,170 260,150 300,145 C 340,140 370,120 410,125 C 440,145 460,135 485,140"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Azure Dots */}
                    {[
                      [40, 150], [115, 100], [170, 85], [245, 107], [300, 105], [365, 76], [410, 75], [455, 87], [485, 75]
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3.5" fill="#4C82E6" stroke="#ffffff" strokeWidth="1.5" />
                    ))}

                    {/* Cyan Dots */}
                    {[
                      [40, 165], [115, 140], [170, 135], [245, 165], [300, 145], [365, 122], [410, 125], [455, 142], [485, 140]
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="3.5" fill="#06B6D4" stroke="#ffffff" strokeWidth="1.5" />
                    ))}
                  </svg>
                </div>

                {/* X-Axis Labels */}
                <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-bold text-slate-400">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              {/* Recent Tickets (Right 6 cols) */}
              <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-slate-900 text-base">Recent Support Tickets</h3>
                    <button onClick={() => navigate('/tickets')} className="text-[#4C82E6] hover:text-[#3D74D9] text-xs font-bold transition-colors cursor-pointer">
                      View all ({totalCount}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {displayTickets.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs">
                        <p className="font-bold text-slate-700">No support tickets found</p>
                        <p className="mt-1">Active IT tickets will be listed here.</p>
                      </div>
                    ) : (
                      displayTickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200/80 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#4C82E6] border border-blue-100/80 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                              <Icon name="ticket" size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-[#4C82E6] truncate">{t.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {t.category || 'General IT'} • {t.timeAgo || new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            {/* Status Pill */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${t.status === 'resolved' || t.status === 'closed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.status === 'in_progress'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-blue-50 text-[#4C82E6] border-blue-200'
                              }`}>
                              {label(t.status)}
                            </span>

                            <span className="text-slate-300 group-hover:text-[#4C82E6] text-xs font-bold">›</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!isAgent && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Need immediate assistance?</span>
                    <button
                      onClick={() => navigate('/tickets/create')}
                      className="text-xs font-bold text-[#4C82E6] hover:text-[#3D74D9] flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Create Ticket</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Admin Manual Assign Modal */}
      {assignModalTicket && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Assign IT Support Agent</h3>
                <p className="text-slate-500 text-xs mt-0.5">Ticket #TK-{assignModalTicket.id} · {assignModalTicket.title}</p>
              </div>
              <button onClick={() => setAssignModalTicket(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-7 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1.5 border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-bold text-[#4F39F6]">{assignModalTicket.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Priority:</span>
                  <span className="font-bold text-slate-800">{label(assignModalTicket.priority)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Eligible IT Specialists (Category: {assignModalTicket.category})
                </label>

                {loadingAgents ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading eligible agents...</div>
                ) : eligibleAgents.length === 0 ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800">
                    <span className="font-bold">No active agents handle {assignModalTicket.category}.</span>
                    <p className="mt-1 text-slate-600">Please authorize support agents for this category in User Management.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eligibleAgents.map((ag) => {
                      const isSelected = String(ag.id) === String(selectedAgentId)
                      const initials = ag.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      return (
                        <div
                          key={ag.id}
                          onClick={() => setSelectedAgentId(String(ag.id))}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${isSelected
                            ? 'border-[#4F39F6] bg-indigo-50/70 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar initials={initials} tone={isSelected ? 'indigo' : 'default'} />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{ag.name}</p>
                              <p className="text-[11px] text-slate-500">{ag.email}</p>
                            </div>
                          </div>

                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                            {ag.activeTicketsCount} active tickets
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignModalTicket(null)}
                className="px-4 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning || !selectedAgentId || eligibleAgents.length === 0}
                onClick={handleManualAssign}
                className="px-5 h-10 rounded-xl bg-[#4F39F6] hover:bg-[#432BE8] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
