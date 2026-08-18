import { useState, useEffect } from 'react'
import { analyticsService } from '../services/analytics.service'
import { Topbar } from '../components/Topbar'
import { Icon } from '../components/Icon'
import { Badge } from '../components/Badge'

const label = (v) => String(v || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

const toneMap = {
  indigo: 'bg-indigo-50 text-indigo-600',
  blue:   'bg-sky-50 text-sky-600',
  orange: 'bg-amber-50 text-amber-600',
  green:  'bg-emerald-50 text-emerald-600',
  red:    'bg-rose-50 text-rose-600',
}

const StatCard = ({ label: lbl, value, icon, tone }) => (
  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center gap-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${toneMap[tone] || toneMap.green}`}>
      <Icon name={icon} size={20} />
    </div>
    <div>
      <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">{lbl}</p>
      <p className="text-2xl font-black text-slate-900 mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
)

export const AdminAnalytics = ({ setOpen }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    analyticsService.dashboard()
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <Topbar title="IT Operations Analytics" setOpen={setOpen} />
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading IT analytics...</div>
    </>
  )

  if (error) return (
    <>
      <Topbar title="IT Operations Analytics" setOpen={setOpen} />
      <div className="m-8 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
    </>
  )

  if (!data) return null

  return (
    <>
      <Topbar title="IT Operations Analytics" subtitle="Enterprise-wide support metrics, routing efficiency, and agent workload." setOpen={setOpen} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 w-full">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total IT Tickets" value={data.totals.tickets} icon="tickets" tone="indigo" />
          <StatCard label="Total Users" value={data.totals.users} icon="users" tone="blue" />
          <StatCard label="Employees" value={data.totals.customers} icon="user" tone="orange" />
          <StatCard label="Resolved Tickets" value={data.totals.resolved} icon="check" tone="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Workload */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">IT Agent Workload</h2>
              <p className="text-slate-500 text-xs mt-0.5">Active support tickets assigned per IT specialist</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data.workload?.map(w => (
                <div key={w.assignedAgentId} className="flex items-center justify-between px-7 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {(w['assignedAgent.name'] || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{w['assignedAgent.name'] || 'Unassigned'}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{w.count} tickets</span>
                </div>
              ))}
              {!data.workload?.length && (
                <div className="py-12 text-center text-slate-400 text-sm">No active assignments.</div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Support Breakdown</h2>
              <p className="text-slate-500 text-xs mt-0.5">Distribution by status, priority & category</p>
            </div>
            <div className="px-7 py-6 flex flex-col gap-5">
              {[
                ['By Status', data.byStatus?.map(s => <Badge key={s.status}>{label(s.status)}: {s.count}</Badge>)],
                ['By Priority', data.byPriority?.map(p => <Badge key={p.priority} type="priority">{label(p.priority)}: {p.count}</Badge>)],
                ['By Category', data.byCategory?.map(c => <Badge key={c.category}>{label(c.category)}: {c.count}</Badge>)],
              ].map(([heading, items]) => (
                <div key={heading}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{heading}</p>
                  <div className="flex flex-wrap gap-2">{items}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
