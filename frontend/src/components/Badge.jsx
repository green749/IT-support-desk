const statusMap = {
  open:                 'bg-sky-50 text-sky-700 border border-sky-200',
  assigned:             'bg-violet-50 text-violet-700 border border-violet-200',
  in_progress:          'bg-amber-50 text-amber-700 border border-amber-200',
  waiting_for_customer: 'bg-orange-50 text-orange-700 border border-orange-200',
  resolved:             'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed:               'bg-slate-100 text-slate-600 border border-slate-200',
  reopened:             'bg-red-50 text-red-700 border border-red-200',
  active:               'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const priorityMap = {
  low:      'bg-sky-50 text-sky-700 border border-sky-200',
  medium:   'bg-amber-50 text-amber-700 border border-amber-200',
  high:     'bg-rose-50 text-rose-700 border border-rose-200',
  critical: 'bg-red-50 text-red-700 border border-red-200 font-bold',
}

const dotMap = {
  open:                 'bg-sky-500',
  assigned:             'bg-violet-500',
  in_progress:          'bg-amber-500',
  waiting_for_customer: 'bg-orange-500',
  resolved:             'bg-emerald-500',
  closed:               'bg-slate-400',
  reopened:             'bg-red-500',
  active:               'bg-emerald-500',
  low:                  'bg-sky-500',
  medium:               'bg-amber-500',
  high:                 'bg-rose-500',
  critical:             'bg-red-500',
}

const normalize = (str) => String(str || '').toLowerCase().replace(/\s+/g, '_')

export const Badge = ({ children, type = 'status' }) => {
  const raw = normalize(typeof children === 'string' ? children.split(':')[0].trim() : '')
  const colorClass = type === 'priority'
    ? (priorityMap[raw] || 'bg-slate-100 text-slate-600 border border-slate-200')
    : (statusMap[raw] || 'bg-slate-100 text-slate-600 border border-slate-200')
  const dotColor = dotMap[raw] || 'bg-slate-400'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      {children}
    </span>
  )
}
