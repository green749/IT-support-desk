import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineComputerDesktop,
  HiOutlineSignal,
  HiOutlineShieldCheck,
  HiOutlineCommandLine,
  HiOutlineEnvelope,
  HiOutlineKey,
  HiOutlinePrinter,
  HiOutlineShieldExclamation,
  HiOutlineUserPlus,
  HiOutlineFolder,
  HiChevronDown,
  HiCheck,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import { ticketService } from '../services/ticket.service'
import { categoryService } from '../services/category.service'
import { Topbar } from '../components/Topbar'
import { CustomSelect } from '../components/CustomSelect'

const DEFAULT_CATEGORIES = [
  { id: 1, key: 'hardware', name: 'Hardware Issue', icon: HiOutlineComputerDesktop },
  { id: 2, key: 'network', name: 'Network Issue', icon: HiOutlineSignal },
  { id: 3, key: 'vpn', name: 'VPN Issue', icon: HiOutlineShieldCheck },
  { id: 4, key: 'software', name: 'Software Issue', icon: HiOutlineCommandLine },
  { id: 5, key: 'email', name: 'Email Issue', icon: HiOutlineEnvelope },
  { id: 6, key: 'account_access', name: 'Account & Access', icon: HiOutlineKey },
  { id: 7, key: 'printer_scanning', name: 'Printer & Scanning', icon: HiOutlinePrinter },
  { id: 8, key: 'security', name: 'Security Issue', icon: HiOutlineShieldExclamation },
  { id: 9, key: 'new_employee_it', name: 'New Employee Request', icon: HiOutlineUserPlus },
  { id: 10, key: 'other', name: 'Other', icon: HiOutlineFolder },
]

const PRIORITIES = [
  { id: 'Low', label: 'Low', activeClass: 'bg-white text-emerald-700 font-semibold shadow-xs' },
  { id: 'Medium', label: 'Medium', activeClass: 'bg-white text-blue-700 font-semibold shadow-xs' },
  { id: 'High', label: 'High', activeClass: 'bg-white text-amber-700 font-semibold shadow-xs' },
  { id: 'Critical', label: 'Critical', activeClass: 'bg-white text-rose-700 font-semibold shadow-xs' },
]

export const CreateTicket = ({ user, role, setOpen }) => {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [sent, setSent] = useState(false)
  const [createdTicketId, setCreatedTicketId] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ title: false, description: false })
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    categoryService
      .list()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const merged = res.data.map((cat, idx) => {
            const fallback = DEFAULT_CATEGORIES.find(
              (d) => d.key === cat.key || d.name.toLowerCase() === cat.name.toLowerCase()
            ) || DEFAULT_CATEGORIES[idx % DEFAULT_CATEGORIES.length]
            return {
              ...cat,
              icon: fallback?.icon || HiOutlineFolder,
            }
          })
          setCategories(merged)
          setSelectedCategoryId(String(merged[0].id))
        } else {
          setSelectedCategoryId(String(DEFAULT_CATEGORIES[0].id))
        }
      })
      .catch(() => {
        setSelectedCategoryId(String(DEFAULT_CATEGORIES[0].id))
      })
  }, [])

  const selectedCategory =
    categories.find((c) => String(c.id) === String(selectedCategoryId)) || categories[0] || DEFAULT_CATEGORIES[0]

  const SelectedCategoryIcon = selectedCategory?.icon || HiOutlineFolder

  const isSecurity =
    selectedCategory &&
    (selectedCategory.key === 'security' ||
      selectedCategory.name.toLowerCase().includes('security') ||
      title.toLowerCase().includes('security') ||
      title.toLowerCase().includes('password'))

  const submit = async (event) => {
    if (event) event.preventDefault()

    const hasTitle = Boolean(title.trim())
    const hasDesc = Boolean(description.trim())

    if (!hasTitle && !hasDesc) {
      setFieldErrors({ title: true, description: true })
      setError('Please provide a ticket title and description.')
      return
    }

    if (!hasTitle) {
      setFieldErrors({ title: true, description: false })
      setError('Please provide a ticket title.')
      return
    }

    if (!hasDesc) {
      setFieldErrors({ title: false, description: true })
      setError('Please provide a problem description.')
      return
    }

    setFieldErrors({ title: false, description: false })
    setLoading(true)
    setError('')
    try {
      const catId = Number(selectedCategoryId) || categories[0]?.id
      const catObj = categories.find((c) => c.id === catId)
      const res = await ticketService.create({
        title: title.trim(),
        description: description.trim(),
        categoryId: catId,
        category: catObj ? catObj.name : undefined,
        priority: priority.toLowerCase(),
      })
      if (res?.data?.id) {
        setCreatedTicketId(res.data.id)
      }
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar
        title="Create IT Ticket"
        subtitle="Submit a technical request to the Enterprise IT Help Desk."
        user={user}
        role={role}
        setOpen={setOpen}
      />

      <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-16 w-full">
        {sent ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-10 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-emerald-100">
              <HiOutlineCheckCircle />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1.5">Ticket Created Successfully</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              Your support request has been logged and assigned to the queue.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(createdTicketId ? `/tickets/${createdTicketId}` : '/tickets')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                View Tickets
              </button>
              <button
                onClick={() => {
                  setSent(false)
                  setTitle('')
                  setDescription('')
                  setSelectedCategoryId(String(categories[0]?.id || ''))
                  setPriority('Medium')
                  setError('')
                  setFieldErrors({ title: false, description: false })
                }}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 sm:p-8 lg:p-10">
            <form onSubmit={submit} noValidate className="space-y-6">
              {/* Title Field */}
              <div>
                <label htmlFor="ticket-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ticket-title"
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: false }))
                    if (error) setError('')
                  }}
                  placeholder="e.g. VPN authentication timeout / Need RAM upgrade"
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                    fieldErrors.title
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10'
                  }`}
                />
              </div>

              {/* Category & Priority in 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Dropdown */}
                <CustomSelect
                  label="Category"
                  required
                  value={selectedCategoryId}
                  onChange={(val) => setSelectedCategoryId(val)}
                  options={categories.map((cat) => ({
                    value: String(cat.id),
                    label: cat.name,
                    icon: cat.icon || HiOutlineFolder,
                  }))}
                />

                {/* Priority Segmented Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 h-[42px] items-center">
                    {PRIORITIES.map((p) => {
                      const isSelected = priority.toLowerCase() === p.id.toLowerCase()
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={`h-full py-1 text-xs rounded-lg transition-all text-center cursor-pointer ${
                            isSelected
                              ? p.activeClass
                              : 'text-slate-500 hover:text-slate-800 font-medium'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Description Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="ticket-description" className="block text-xs font-semibold text-slate-700">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">{description.length} / 2000</span>
                </div>
                <textarea
                  id="ticket-description"
                  rows={6}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: false }))
                    if (error) setError('')
                  }}
                  placeholder="Describe your issue with details (e.g. error messages, device model, steps to reproduce)..."
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-y min-h-[140px] leading-relaxed ${
                    fieldErrors.description
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10'
                  }`}
                />
              </div>

              {/* Security Warning Notice */}
              {isSecurity && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0 text-amber-600">
                    <HiOutlineExclamationTriangle />
                  </span>
                  <p className="leading-relaxed">
                    <strong className="font-semibold">Security Note:</strong> Do not include sensitive passwords or confidential API keys in plain text.
                  </p>
                </div>
              )}

              {/* Consistent Error Message Banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">
                    !
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="px-5 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
