const toneMap = {
  default: 'bg-slate-200 text-slate-700',
  purple:  'bg-violet-100 text-violet-700',
  orange:  'bg-amber-100 text-amber-700',
  indigo:  'bg-indigo-100 text-indigo-700',
  green:   'bg-emerald-100 text-emerald-700',
}

export const Avatar = ({ initials = 'CS', tone = '' }) => {
  const colors = toneMap[tone] || toneMap.default
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colors}`}>
      {initials}
    </div>
  )
}
