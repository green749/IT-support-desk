import { useState, useEffect, useCallback } from 'react'
import { userService } from '../services/user.service'
import { categoryService } from '../services/category.service'
import { useToast } from '../context/ToastContext'
import { Topbar } from '../components/Topbar'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Icon } from '../components/Icon'

const roleLabelMap = {
  customer: 'Employee',
  agent: 'IT Support Agent',
  admin: 'IT Administrator',
}

const DEFAULT_CATEGORIES = [
  { id: 1, key: 'hardware', name: 'Hardware Issue' },
  { id: 2, key: 'network', name: 'Network Issue' },
  { id: 3, key: 'vpn', name: 'VPN Issue' },
  { id: 4, key: 'software', name: 'Software Issue' },
  { id: 5, key: 'email', name: 'Email Issue' },
  { id: 6, key: 'account_access', name: 'Account & Access Issue' },
  { id: 7, key: 'printer_scanning', name: 'Printer & Scanning Issue' },
  { id: 8, key: 'security', name: 'Security Issue' },
  { id: 9, key: 'new_employee_it', name: 'New Employee IT Request' },
  { id: 10, key: 'other', name: 'Other' },
]

export const LiveUsers = ({ roleFilter, setOpen }) => {
  const [data, setData] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('customer')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    categoryService.list()
      .then((r) => {
        if (r.data && r.data.length > 0) setCategories(r.data)
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(() => {
    let active = true
    Promise.resolve().then(() => { if (active) setLoading(true) })
    userService.list(roleFilter ? { role: roleFilter.toLowerCase() } : {})
      .then(r => { if (active) setData(r.data) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [roleFilter])

  useEffect(() => loadData(), [loadData])

  const toggleStatus = async (u) => {
    try {
      await userService.update(u.id, { isActive: !u.isActive })
      toast.success(`${u.name} is now ${!u.isActive ? 'Active' : 'Inactive'}`, 'Status Updated')
      loadData()
    } catch (e) {
      toast.error(e.message, 'Update Failed')
    }
  }

  const openEditModal = (u) => {
    setEditingUser(u)
    setSelectedRole(u.role)
    const existingIds = (u.supportCategories || []).map((c) => Number(c.id))
    setSelectedCategoryIds(existingIds)
  }

  const closeEditModal = () => {
    setEditingUser(null)
    setSelectedRole('customer')
    setSelectedCategoryIds([])
  }

  const toggleCategory = (catId) => {
    const numId = Number(catId)
    setSelectedCategoryIds((prev) =>
      prev.includes(numId) ? prev.filter((id) => id !== numId) : [...prev, numId]
    )
  }

  const saveUserChanges = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      const payload = {
        role: selectedRole,
      }
      if (selectedRole === 'agent') {
        payload.categoryIds = selectedCategoryIds
      }
      await userService.update(editingUser.id, payload)
      toast.success(`Updated ${editingUser.name}'s role and categories`, 'User Updated')
      closeEditModal()
      loadData()
    } catch (e) {
      toast.error(e.message, 'Update Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar
        title={roleFilter === 'agent' ? 'IT Support Agents' : 'User Management'}
        subtitle="Manage employees, IT support agents, permissions, and category routing."
        setOpen={setOpen}
      />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-12 w-full">
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">Loading users...</div>
          ) : error ? (
            <div className="m-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Email</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Support Categories</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map(u => {
                    const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <tr key={u.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar initials={initials} tone="green" />
                            <div>
                              <span className="text-sm font-bold text-slate-900 block">{u.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-xs font-medium">{u.email}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.role === 'admin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : u.role === 'agent'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {roleLabelMap[u.role] || u.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {u.role === 'agent' ? (
                            u.supportCategories && u.supportCategories.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.supportCategories.map((cat) => (
                                  <span key={cat.id} className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                    {cat.name.replace(' Issue', '')}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 font-bold">No categories assigned</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <Badge>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(u)}
                              className="text-xs font-bold px-3 h-8 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                            >
                              Edit Role & Categories
                            </button>
                            <button
                              onClick={() => toggleStatus(u)}
                              className={`text-xs font-bold px-3 h-8 rounded-xl border transition-all cursor-pointer shadow-xs ${u.isActive ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!data.length && (
                <div className="py-16 text-center text-slate-400 text-sm font-medium">No users found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Role & Categories Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Edit User Role & Categories</h3>
                <p className="text-slate-500 text-xs mt-0.5">{editingUser.name} ({editingUser.email})</p>
              </div>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 p-1">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">System Role</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    ['customer', 'Employee'],
                    ['agent', 'IT Support Agent'],
                    ['admin', 'IT Administrator'],
                  ].map(([rVal, rLbl]) => (
                    <button
                      key={rVal}
                      type="button"
                      onClick={() => setSelectedRole(rVal)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        selectedRole === rVal
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-2 ring-blue-600/10'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {rLbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Support Categories Section */}
              {selectedRole === 'agent' && (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Authorized Support Categories</label>
                    <span className="text-xs text-blue-700 font-semibold">{selectedCategoryIds.length} selected</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select which IT support categories this agent is authorized to resolve. Tickets matching these categories will be auto-routed to them.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {categories.map((cat) => {
                      const isChecked = selectedCategoryIds.includes(Number(cat.id))
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCategory(cat.id)}
                            className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span className="truncate">{cat.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedRole !== 'agent' && editingUser.role === 'agent' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl p-4">
                  <span className="font-bold">Notice:</span> Changing this agent to {roleLabelMap[selectedRole]} will automatically remove their support category routing assignments.
                </div>
              )}
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 h-10 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveUserChanges}
                className="px-5 h-10 rounded-2xl bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] disabled:opacity-60 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
