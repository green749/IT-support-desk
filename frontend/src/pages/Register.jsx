import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/auth.service'

export const Register = () => {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [checkboxError, setCheckboxError] = useState(false)

  // Field states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setCheckboxError(false)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) return setError('Please enter your full name.')
    if (!trimmedEmail) return setError('Please enter your work email address.')
    if (!isValidEmail(trimmedEmail)) return setError('Please enter a valid email address (e.g. name@company.com).')
    if (!password) return setError('Please enter a password.')
    if (password.length < 8) return setError('Password must be at least 8 characters long.')
    if (password !== confirmPassword) return setError('Passwords do not match. Please re-type your confirm password.')
    if (!agreed) {
      setCheckboxError(true)
      return
    }

    setLoading(true)
    try {
      await authService.register(trimmedName, trimmedEmail, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked
    setAgreed(isChecked)
    if (isChecked) setCheckboxError(false)
  }

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-x-hidden font-sans">
      {/* Left Full-Height Chromatic Aura Hero Section (Flush Edge-to-Edge, No Border Radius) */}
      <section className="relative hidden lg:flex lg:w-[48%] min-h-screen flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#4C82E6] via-[#3558D4] to-[#1E3CA6] text-white z-10 select-none overflow-hidden rounded-none">
        
        {/* Chromatic Aura Mesh Layers */}
        <div className="absolute -top-16 -right-16 w-96 h-96 bg-[#E0D8FD] rounded-full blur-[85px] opacity-80 pointer-events-none" />
        <div className="absolute top-1/3 -right-10 w-80 h-80 bg-[#C4B5FD] rounded-full blur-[80px] opacity-70 pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-[#93C5FD] rounded-full blur-[65px] opacity-75 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-96 h-96 bg-[#1E40AF] rounded-full blur-[80px] opacity-85 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-20 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/30">
            ✱
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">ITDesk</h1>
            <p className="text-[10px] text-blue-100 font-bold tracking-[0.2em] uppercase mt-1">
              ENTERPRISE IT SUPPORT
            </p>
          </div>
        </div>

        {/* Hero Headline */}
        <div className="relative z-20 my-auto py-12 max-w-lg space-y-3">
          <p className="text-xs font-bold text-blue-100 tracking-[0.2em] uppercase">
            REAL-TIME ENTERPRISE IT HELP DESK
          </p>
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.15] tracking-tight">
            Rapid resolution for enterprise IT &amp; infrastructure.
          </h2>
          <p className="text-blue-100/90 text-sm font-medium pt-2 leading-relaxed max-w-md">
            Join your organization's ITDesk hub to create tickets, track issues live, and collaborate with IT specialists.
          </p>
        </div>

        {/* Status Footer */}
        <div className="relative z-20 flex items-center justify-between text-xs text-blue-100 border-t border-white/20 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
            <span className="font-semibold text-white text-[13px]">IT Operations Online</span>
          </div>
          <span className="text-blue-100 font-medium text-[13px]">v2.0 Enterprise</span>
        </div>
      </section>

      {/* Right Form Section */}
      <section className="flex-1 min-h-screen flex items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 bg-white relative z-10">
        <div className="w-full max-w-[480px]">
          
          {/* Mobile Brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#568BEB] to-[#4C82E6] flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/30">
              ✱
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg block leading-none">ITDesk</span>
              <span className="text-[10px] text-[#4C82E6] font-bold uppercase tracking-wider">Enterprise IT Support</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <div className="text-[#4C82E6] text-2xl font-black mb-2 hidden lg:block">
              ✱
            </div>
            <p className="text-[11px] font-extrabold text-[#4C82E6] tracking-[0.2em] uppercase mb-2">
              ENTERPRISE PORTAL
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Create Employee Account
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-normal">
              Join the ITDesk service platform to submit and track IT support requests.
            </p>
          </div>

          {done ? (
            <div className="text-center py-10 bg-emerald-50/60 border border-emerald-200 rounded-3xl p-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 shadow-sm">
                ✓
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Account Created!</h3>
              <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto">
                Your employee account is ready. Sign in with your work credentials to access the IT help desk.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white font-bold text-sm rounded-2xl px-8 h-12 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              >
                <span>Go to Sign In</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              {/* Full Name field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError('') }}
                    placeholder="Jane Smith"
                    className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Work email field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="employee@company.com"
                    className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Passwords grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      name="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      type={show ? 'text' : 'password'}
                      placeholder="Min 8 chars"
                      className="w-full h-11 pl-11 pr-11 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {show ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      type={show ? 'text' : 'password'}
                      placeholder="Repeat password"
                      className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox agreement */}
              <div className="relative pt-2">
                <label
                  className={`flex items-start gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    checkboxError
                      ? 'border-red-300 bg-red-50/50 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 mt-0.5 rounded text-[#4C82E6] accent-[#4C82E6] cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-[#4C82E6] font-bold hover:underline">
                      IT Acceptable Use Policy
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-[#4C82E6] font-bold hover:underline">
                      Privacy Guidelines
                    </a>
                    .
                  </span>
                </label>

                {/* Animated message when checkbox is required */}
                {checkboxError && (
                  <div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200/90 px-3.5 py-2 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">!</span>
                    <span>Please agree to the IT policy to create your account.</span>
                  </div>
                )}
              </div>

              {/* Specific Field Error Banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {loading ? (
                  <span>Registering employee account...</span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="text-base leading-none">→</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Sign In link */}
          <p className="text-center text-slate-500 text-sm mt-7 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-[#4C82E6] font-bold hover:underline ml-1">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
