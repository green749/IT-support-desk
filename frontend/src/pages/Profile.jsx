import { useState, useEffect } from 'react'
import { userService } from '../services/user.service'
import { Topbar } from '../components/Topbar'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'

const roleLabelMap = {
  customer: 'Employee',
  agent: 'IT Support Agent',
  admin: 'IT Administrator',
}

const InfoRow = ({ label: lbl, children }) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{lbl}</span>
    <span className="text-sm font-medium text-slate-900">{children}</span>
  </div>
)

export const Profile = ({ user, setOpen }) => {
  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const normalizedRole = user?.role?.toLowerCase() || ''
  const isAgent = normalizedRole === 'agent' || normalizedRole === 'it support agent'

  useEffect(() => {
    if (isAgent && user?.id) {
      setLoadingCats(true)
      userService.getCategories(user.id)
        .then((res) => {
          setCategories(res.data?.categories || [])
        })
        .catch((err) => {
          console.error('Failed to load agent categories:', err)
        })
        .finally(() => {
          setLoadingCats(false)
        })
    }
  }, [user?.id, isAgent])

  if (!user) return null
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleDisplay = roleLabelMap[normalizedRole] || user.role

  return (
    <>
      <Topbar title="IT User Profile" subtitle="Your IT identity, role authorizations, and account details." setOpen={setOpen} />
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8 w-full">
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 py-8 flex items-center gap-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 text-xl font-black flex items-center justify-center flex-shrink-0 shadow-inner">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">{user.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#4C82E6] border border-blue-200">
                  {roleDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <InfoRow label="Full Name">{user.name}</InfoRow>
            <InfoRow label="Work Email Address">{user.email}</InfoRow>
            <InfoRow label="Assigned System Role">{roleDisplay}</InfoRow>
            <InfoRow label="Account Status">
              <Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
            </InfoRow>
            <InfoRow label="Account Created">
              {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </InfoRow>

            {isAgent && (
              <div className="sm:col-span-2 flex flex-col pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    My Authorized IT Support Categories
                  </span>
                  {categories.length > 0 && (
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                    </span>
                  )}
                </div>

                {loadingCats ? (
                  <div className="text-xs text-slate-400 py-2">Loading authorized categories...</div>
                ) : categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50/80 text-[#3558D4] border border-blue-200/80 px-3 py-1.5 rounded-xl shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4C82E6]" />
                        <span>{c.name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-800 font-medium">
                    No support categories currently assigned. Please contact an IT Administrator to assign your specialization areas.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
