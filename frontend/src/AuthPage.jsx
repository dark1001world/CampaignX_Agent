import { useState, useEffect } from "react"
import { Zap, Mail, Lock, User, ArrowRight, Loader, AlertCircle, Activity, Shield, Target, TrendingUp } from "lucide-react"
import { login, register } from "./api/authApi"

/* ── DESIGN TOKENS — exact match to AegisAgentUI ──────────────────── */
const T = {
  bg:         '#03070F',
  bgCard:     '#070D1A',
  bgDeep:     '#050A14',
  border:     'rgba(56,189,248,0.08)',
  borderHi:   'rgba(56,189,248,0.20)',
  borderGlow: 'rgba(56,189,248,0.40)',
  sky:        '#38BDF8',
  skyDim:     'rgba(56,189,248,0.10)',
  mint:       '#34D399',
  mintDim:    'rgba(52,211,153,0.10)',
  gold:       '#FBBF24',
  rose:       '#FB7185',
  roseDim:    'rgba(251,113,133,0.10)',
  indigo:     '#818CF8',
  text:       '#E2EBF6',
  textSub:    '#7A90B0',
  textMuted:  '#3A4A62',
  font:       "'IBM Plex Mono', 'Courier New', monospace",
  fontSans:   "'DM Sans', 'Segoe UI', sans-serif",
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin    { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
  @keyframes glow    { 0%,100%{box-shadow:0 0 8px rgba(56,189,248,0.2)}50%{box-shadow:0 0 20px rgba(56,189,248,0.5)} }
  @keyframes blink   { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes scanline{ 0%{transform:translateY(-100%)}100%{transform:translateY(200%)} }
  @keyframes pulse   { 0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input::placeholder { color: ${T.textMuted}; font-family: ${T.fontSans}; font-size: 13px; }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #070D1A inset !important;
    -webkit-text-fill-color: ${T.text} !important;
  }
`

/* ── GRID BACKGROUND — identical to AegisAgentUI ──────────────────── */
const GridBg = () => (
  <div style={{
    position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden',
    backgroundImage:`
      linear-gradient(rgba(56,189,248,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.025) 1px, transparent 1px)
    `,
    backgroundSize:'40px 40px',
  }}>
    <div style={{ position:'absolute', top:'-15%', left:'30%', width:600, height:600, background:'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', borderRadius:'50%' }} />
    <div style={{ position:'absolute', bottom:'-15%', right:'20%', width:500, height:500, background:'radial-gradient(circle, rgba(129,140,248,0.05) 0%, transparent 70%)', borderRadius:'50%' }} />
    <div style={{ position:'absolute', top:'40%', left:'-10%', width:400, height:400, background:'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)', borderRadius:'50%' }} />
    {/* Scanline effect */}
    <div style={{
      position:'absolute', left:0, right:0, height:2,
      background:'linear-gradient(90deg, transparent, rgba(56,189,248,0.06), transparent)',
      animation:'scanline 8s linear infinite',
      pointerEvents:'none',
    }} />
  </div>
)

/* ── STAT TICKER — shows live-looking system stats ─────────────────── */
const stats = [
  { icon: Activity,   label:'CAMPAIGNS ACTIVE',  value:'24'    },
  { icon: Target,     label:'SEGMENTS TRACKED',  value:'9'     },
  { icon: TrendingUp, label:'AVG CLICK RATE',     value:'18.4%' },
  { icon: Shield,     label:'SYSTEM STATUS',      value:'ONLINE'},
]

const StatTicker = () => (
  <div style={{
    display:'flex', gap:0,
    borderRadius:8, overflow:'hidden',
    border:`1px solid ${T.border}`,
    marginBottom:32,
  }}>
    {stats.map((s, i) => (
      <div key={s.label} style={{
        flex:1, padding:'8px 10px',
        borderRight: i < stats.length-1 ? `1px solid ${T.border}` : 'none',
        background: T.bgDeep,
        textAlign:'center',
      }}>
        <div style={{ fontFamily:T.font, fontSize:14, fontWeight:700, color:T.sky, lineHeight:1 }}>{s.value}</div>
        <div style={{ fontFamily:T.font, fontSize:7, color:T.textMuted, letterSpacing:'0.08em', marginTop:3 }}>{s.label}</div>
      </div>
    ))}
  </div>
)

/* ── INPUT FIELD ───────────────────────────────────────────────────── */
const InputField = ({ icon: Icon, type='text', value, onChange, onKeyDown, placeholder, autoFocus }) => {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      position:'relative',
      border:`1px solid ${focused ? T.borderHi : T.border}`,
      borderRadius:8,
      background: T.bgDeep,
      transition:'all 0.2s',
      boxShadow: focused ? `0 0 0 3px rgba(56,189,248,0.06)` : 'none',
    }}>
      <Icon size={13} style={{
        position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
        color: focused ? T.sky : T.textMuted,
        transition:'color 0.2s',
        pointerEvents:'none',
      }} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width:'100%', background:'none', border:'none', outline:'none',
          padding:'12px 12px 12px 36px',
          color:T.text, fontFamily:T.fontSans, fontSize:13,
        }}
      />
    </div>
  )
}

/* ── MAIN AUTH PAGE ────────────────────────────────────────────────── */
export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin]   = useState(true)
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

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
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:T.bg, color:T.text,
      fontFamily:T.fontSans, position:'relative',
      padding:'24px',
    }}>
      <style>{GLOBAL_CSS}</style>
      <GridBg />

      <div style={{
        position:'relative', zIndex:1, width:'100%', maxWidth:420,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition:'all 0.5s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* ── LOGO ── */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:10,
            marginBottom:6,
          }}>
            <div style={{
              width:34, height:34, borderRadius:9,
              background:'linear-gradient(135deg, #0284C7, #38BDF8)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 20px rgba(56,189,248,0.4)',
            }}>
              <Zap size={17} color="white" fill="white" />
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:T.font, fontWeight:700, fontSize:18, letterSpacing:'-0.02em', color:T.text, lineHeight:1 }}>
                AEGIS<span style={{ color:T.sky }}>.AI</span>
              </div>
              <div style={{ fontFamily:T.font, fontSize:7, color:T.textMuted, letterSpacing:'0.12em', marginTop:2 }}>
                CAMPAIGN INTELLIGENCE
              </div>
            </div>
          </div>
        </div>

        {/* ── STAT TICKER ── */}
        <StatTicker />

        {/* ── CARD ── */}
        <div style={{
          background:T.bgCard,
          border:`1px solid ${T.border}`,
          borderRadius:12,
          overflow:'hidden',
          boxShadow:'0 24px 48px rgba(0,0,0,0.4)',
        }}>

          {/* Tab toggle */}
          <div style={{ display:'flex', borderBottom:`1px solid ${T.border}` }}>
            {['LOGIN','REGISTER'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsLogin(i===0); setError(null) }} style={{
                flex:1, padding:'12px',
                background: (i===0)===isLogin ? T.skyDim : 'transparent',
                border:'none',
                borderBottom: (i===0)===isLogin ? `2px solid ${T.sky}` : '2px solid transparent',
                color: (i===0)===isLogin ? T.sky : T.textMuted,
                fontFamily:T.font, fontSize:9, fontWeight:700,
                letterSpacing:'0.12em', cursor:'pointer',
                transition:'all 0.2s',
              }}>{tab}</button>
            ))}
          </div>

          <div style={{ padding:'24px' }}>

            {/* System access label */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 12px', borderRadius:6,
              background:T.bgDeep, border:`1px solid ${T.border}`,
              marginBottom:20,
            }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:T.mint, boxShadow:`0 0 5px ${T.mint}`, animation:'glow 2s ease-in-out infinite', flexShrink:0 }} />
              <span style={{ fontFamily:T.font, fontSize:8, color:T.textSub, letterSpacing:'0.1em' }}>
                {isLogin ? 'AUTHENTICATE TO ACCESS CAMPAIGN SYSTEM' : 'CREATE ENTERPRISE ACCESS CREDENTIALS'}
              </span>
            </div>

            {/* Fields */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {!isLogin && (
                <div style={{ animation:'fadeUp 0.2s ease' }}>
                  <div style={{ fontFamily:T.font, fontSize:8, color:T.textMuted, letterSpacing:'0.1em', marginBottom:5 }}>FULL NAME</div>
                  <InputField icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" autoFocus={!isLogin} />
                </div>
              )}

              <div>
                <div style={{ fontFamily:T.font, fontSize:8, color:T.textMuted, letterSpacing:'0.1em', marginBottom:5 }}>EMAIL ADDRESS</div>
                <InputField icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} placeholder="you@company.com" autoFocus={isLogin} />
              </div>

              <div>
                <div style={{ fontFamily:T.font, fontSize:8, color:T.textMuted, letterSpacing:'0.1em', marginBottom:5 }}>PASSWORD</div>
                <InputField icon={Lock} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} placeholder="••••••••••••" />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'9px 12px', borderRadius:7,
                  background:T.roseDim, border:`1px solid rgba(251,113,133,0.25)`,
                  animation:'fadeUp 0.2s ease',
                }}>
                  <AlertCircle size={12} color={T.rose} style={{ flexShrink:0 }} />
                  <div>
                    <div style={{ fontFamily:T.font, fontSize:7, color:T.rose, letterSpacing:'0.1em', marginBottom:1 }}>AUTH ERROR</div>
                    <span style={{ fontFamily:T.fontSans, fontSize:11, color:T.rose }}>{error}</span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button onClick={handleSubmit} disabled={loading} style={{
                width:'100%', padding:'12px 16px',
                borderRadius:8, marginTop:4,
                background: loading ? T.skyDim : 'linear-gradient(135deg, #0284C7, #38BDF8)',
                border:`1px solid ${loading ? T.borderHi : 'transparent'}`,
                color:'white',
                fontFamily:T.font, fontSize:10, fontWeight:700,
                letterSpacing:'0.1em',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition:'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(56,189,248,0.3)',
              }}>
                {loading
                  ? <>
                      <Loader size={12} style={{ animation:'spin 1s linear infinite' }} />
                      AUTHENTICATING...
                    </>
                  : <>
                      <ArrowRight size={12} />
                      {isLogin ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'}
                    </>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:20, display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
            {['BRIEF AGENT','SEGMENTATION','CAMPAIGN GEN','OPTIMIZER'].map((label, i) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{
                  width:4, height:4, borderRadius:'50%',
                  background:[T.sky, T.mint, T.gold, T.indigo][i],
                  boxShadow:`0 0 4px ${[T.sky, T.mint, T.gold, T.indigo][i]}`,
                }} />
                <span style={{ fontFamily:T.font, fontSize:7, color:T.textMuted, letterSpacing:'0.08em' }}>{label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily:T.font, fontSize:7, color:T.textMuted, letterSpacing:'0.14em' }}>
            AEGIS AGENT v3.4 · ENTERPRISE · ALL RIGHTS RESERVED
          </p>
        </div>

      </div>
    </div>
  )
}