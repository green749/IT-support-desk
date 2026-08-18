import { useState, useRef, useEffect } from 'react'
import { HiChevronDown, HiCheck } from 'react-icons/hi2'

export const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  label,
  required = false,
  disabled = false,
  error = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  size = 'default',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [placement, setPlacement] = useState('bottom')
  const dropdownRef = useRef(null)

  // Calculate placement (top vs bottom) based on viewport space
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      if (spaceBelow < 240 && spaceAbove > 200) {
        setPlacement('top')
      } else {
        setPlacement('bottom')
      }
    }
  }, [isOpen])

  // Normalize options to object format: { value, label, icon: IconComponent, sublabel, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? String(opt.value) : String(opt.id),
        label: opt.label || opt.name || String(opt.value ?? opt.id ?? ''),
        icon: opt.icon,
        sublabel: opt.sublabel,
        badge: opt.badge,
        disabled: opt.disabled,
      }
    }
    return {
      value: String(opt),
      label: String(opt),
      icon: null,
      sublabel: null,
      badge: null,
      disabled: false,
    }
  })

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value))

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (optValue) => {
    if (onChange) {
      onChange(optValue)
    }
    setIsOpen(false)
  }

  const SelectedIcon = selectedOption?.icon

  const sizeClasses =
    size === 'compact'
      ? 'px-3 py-2 text-xs rounded-xl'
      : 'px-4 py-2.5 text-sm rounded-xl'

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between bg-white border font-normal text-slate-900 transition-all cursor-pointer text-left outline-none ${sizeClasses} ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
            : isOpen
            ? 'border-blue-600 ring-2 ring-blue-600/10 shadow-xs'
            : error
            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
            : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {SelectedIcon && (
            <span className="text-base text-slate-500 flex-shrink-0">
              <SelectedIcon />
            </span>
          )}
          <span className={`truncate ${selectedOption ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold flex-shrink-0 ml-auto mr-1">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <HiChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/15 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 messages-scroll">
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center">No options available</div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                const OptIcon = opt.icon

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-all text-left ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold cursor-pointer'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {OptIcon && (
                        <span className={`text-base flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                          <OptIcon />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">{opt.sublabel}</div>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium flex-shrink-0 mr-1">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <HiCheck className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
