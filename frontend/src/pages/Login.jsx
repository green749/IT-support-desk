import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/auth.service'

export const Login = ({ onLogin }) => {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) return setError('Please enter your work email address.')
    if (!isValidEmail(trimmedEmail)) return setError('Please enter a valid email address (e.g. name@company.com).')
    if (!password) return setError('Please enter your password.')

    setLoading(true)
    try {
      const result = await authService.login(trimmedEmail, password)
      onLogin(result.data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
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
            Streamlined ticketing, automated category routing, and real-time support for workplace operations.
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
        <div className="w-full max-w-[430px]">
          
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
              Sign in to ITDesk
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-normal">
              Enter your employee or administrator credentials.
            </p>
          </div>

          <form onSubmit={submit} noValidate className="space-y-5">
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
                  type="text"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="employee@company.com"
                  className="w-full h-11 pl-11 pr-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={show ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Enter your password"
                  className="w-full h-11 pl-11 pr-11 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {show ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#568BEB] to-[#4C82E6] hover:from-[#4C82E6] hover:to-[#3D74D9] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <span className="text-base leading-none">→</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <p className="text-center text-slate-500 text-sm mt-7 font-medium">
            New employee?{' '}
            <Link to="/register" className="text-[#4C82E6] font-bold hover:underline ml-1">
              Register employee account
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
