import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketService } from '../services/ticket.service'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/Icon'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { CustomSelect } from '../components/CustomSelect'

const label = (v) => String(v || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_customer', label: 'Waiting for Employee' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
]

const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const LiveTickets = ({ role, setOpen }) => {
  const [data, setData] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const navigate = useNavigate()

  const isAgent = role === 'Agent' || role === 'IT Support Agent'

  useEffect(() => {
    const params = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (priorityFilter !== 'all') params.priority = priorityFilter
    let active = true
    Promise.resolve().then(() => { if (active) setLoading(true) })
    ticketService.list(params)
      .then(r => { if (active) setData(r.data) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [statusFilter, priorityFilter])

  const items = data.filter(t =>
    `${t.id} ${t.title} ${t.category || ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <>
      <Topbar
        title="IT Support Tickets"
        subtitle="Track, filter, and inspect enterprise IT support requests."
        setOpen={setOpen}
        action={
          !isAgent && (
            <button
              onClick={() => navigate('/tickets/create')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white text-xs font-bold px-5 h-11 rounded-2xl transition-all shadow-sm shadow-blue-600/25 cursor-pointer"
            >
              <Icon name="plus" size={16} /> Create IT Ticket
            </button>
          )
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-12 w-full">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2.5 h-[42px] px-3.5 border border-slate-200 rounded-xl bg-white w-72 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all text-slate-400 focus-within:text-blue-600 shadow-xs">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search IT tickets..."
              className="flex-1 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none bg-transparent border-0 p-0"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            className="w-48"
          />
          <CustomSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={PRIORITY_FILTER_OPTIONS}
            className="w-44"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">Loading IT tickets...</div>
          ) : error ? (
            <div className="m-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Ticket</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Priority</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Assigned Agent</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Last updated</th>
                    <th className="py-4 px-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(ticket => (
                    <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} className="cursor-pointer hover:bg-emerald-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-400 font-mono">TK-{ticket.id}</span>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{ticket.title}</p>
                        <p className="text-xs text-emerald-700 font-semibold">{ticket.category || 'Uncategorized'}</p>
                      </td>
                      <td className="py-4 px-6"><Badge type="priority">{label(ticket.priority)}</Badge></td>
                      <td className="py-4 px-6"><Badge>{label(ticket.status)}</Badge></td>
                      <td className="py-4 px-6">
                        {ticket.assignedAgent ? (
                          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                            <Avatar initials={ticket.assignedAgent.name.slice(0, 2).toUpperCase()} tone="green" />
                            {ticket.assignedAgent.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs font-medium">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-slate-300 font-bold">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && (
                <div className="py-16 text-center text-slate-400 text-sm font-medium">No IT tickets found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
