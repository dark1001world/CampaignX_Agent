import { useState } from "react"
import { Zap, Mail, Lock, User, ArrowRight, Loader, AlertCircle } from "lucide-react"
import { login, register } from "./api/authApi"

export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin]     = useState(true)
  const [name, setName]           = useState("")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = isLogin
        ? await login(email, password)
        : await register(name, email, password)

      localStorage.setItem("token", data.token)
      localStorage.setItem("user",  JSON.stringify(data.user))

      onAuth(data.user)

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: "#020617", color: "#f1f5f9" }}>

      
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap size={22} className="text-white fill-current" />
          </div>
          <span className="font-black text-2xl tracking-tighter">
            AEGIS<span className="text-blue-500">.AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 backdrop-blur-md shadow-2xl p-8"
          style={{ background: "rgba(15, 23, 42, 0.6)" }}>

          {/* Tab toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/8 mb-8">
            {["Login", "Register"].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(i === 0); setError(null) }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
                  (i === 0) === isLogin
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-4">

            {/* Name field — register only */}
            {!isLogin && (
              <div className="relative">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Email address"
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Password"
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mt-2"
            >
              {loading
                ? <Loader size={14} className="animate-spin" />
                : <><ArrowRight size={14} />{isLogin ? "Access System" : "Create Account"}</>
              }
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6 font-bold uppercase tracking-widest">
          Aegis Agent v3.4 // Enterprise Tier
        </p>
      </div>
    </div>
  )
}