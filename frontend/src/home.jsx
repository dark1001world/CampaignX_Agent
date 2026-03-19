import React, { useState, useRef, useEffect } from 'react';
import {
  Send, BarChart2, Sparkles, CheckCircle, Loader, AlertCircle,
  RefreshCw, Terminal, Cpu, Trophy, Users, ChevronRight, Zap, FlaskConical,
  Trash2, MessageSquare, Plus, Bot, User, LogOut, Paperclip, ArrowUp,
  Activity, Target, TrendingUp, Shield, Clock, ChevronDown
} from 'lucide-react';
import {
  approveCampaign, collectAbTestMetrics, confirmWinner,
  analyzeCampaign, relaunchCampaign, createCampaign,
  approveOptimized, rejectCampaign, getCampaignStatus, optimizeAndRetestWinner
} from '../src/api/campaignApi';
import { saveChat, getChatHistory, getChatById, deleteChat } from '../src/api/chatApi';


const T = {
  bg: '#03070F',
  bgCard: '#070D1A',
  bgDeep: '#050A14',
  surface: 'rgba(10,18,35,0.9)',
  border: 'rgba(56,189,248,0.08)',
  borderHi: 'rgba(56,189,248,0.20)',
  borderGlow: 'rgba(56,189,248,0.40)',
  sky: '#38BDF8',
  skyDim: 'rgba(56,189,248,0.10)',
  skyGlow: 'rgba(56,189,248,0.04)',
  mint: '#34D399',
  mintDim: 'rgba(52,211,153,0.10)',
  gold: '#FBBF24',
  goldDim: 'rgba(251,191,36,0.10)',
  rose: '#FB7185',
  roseDim: 'rgba(251,113,133,0.10)',
  indigo: '#818CF8',
  indigoDim: 'rgba(129,140,248,0.10)',
  text: '#E2EBF6',
  textSub: '#7A90B0',
  textMuted: '#3A4A62',
  font: "'IBM Plex Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Segoe UI', sans-serif",
};


const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin   { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  @keyframes pulse  { 0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
  @keyframes scanline { 0%{transform:translateY(-100%)}100%{transform:translateY(100vh)} }
  @keyframes blink  { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes glow   { 0%,100%{box-shadow:0 0 8px rgba(56,189,248,0.2)}50%{box-shadow:0 0 20px rgba(56,189,248,0.5)} }
  @keyframes shimmer{ 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes nodeIn { from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
  input::placeholder { color: ${T.textMuted}; font-family: ${T.fontSans}; }
  body { background: ${T.bg}; }
`;


const cx = (...args) => args.filter(Boolean).join(' ');


const GridBg = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
    backgroundImage: `
      linear-gradient(rgba(56,189,248,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.025) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  }}>
    {/* Radial glow spots */}
    <div style={{ position: 'absolute', top: '-20%', left: '30%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', bottom: '-20%', right: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(129,140,248,0.04) 0%, transparent 70%)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', top: '50%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)', borderRadius: '50%' }} />
  </div>
);


const AgentNode = ({ icon: Icon, label, status = 'idle', detail, index }) => {
  const colors = {
    idle: { color: T.textMuted, bg: 'transparent', border: T.border },
    running: { color: T.sky, bg: T.skyDim, border: T.borderHi },
    done: { color: T.mint, bg: T.mintDim, border: 'rgba(52,211,153,0.25)' },
    error: { color: T.rose, bg: T.roseDim, border: 'rgba(251,113,133,0.25)' },
  };
  const c = colors[status] ?? colors.idle;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 12px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      borderLeft: `2px solid ${c.color}`,
      transition: 'all 0.25s',
      animation: status === 'running' ? 'glow 2s ease-in-out infinite' : (status !== 'idle' ? 'nodeIn 0.3s ease' : 'none'),
    }}>
      <div style={{ flexShrink: 0, marginTop: 1, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'running' && <Loader size={11} color={c.color} style={{ animation: 'spin 1s linear infinite' }} />}
        {status === 'done' && <CheckCircle size={11} color={c.color} />}
        {status === 'error' && <AlertCircle size={11} color={c.color} />}
        {status === 'idle' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.color }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.font, fontSize: 10, fontWeight: 600, color: c.color, letterSpacing: '0.04em' }}>{label}</div>
        {detail && <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textSub, marginTop: 3, lineHeight: 1.5 }}>{detail}</div>}
      </div>
      {status === 'done' && (
        <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, flexShrink: 0 }}>OK</div>
      )}
    </div>
  );
};


const STEPS = [
  { key: 'preview', label: 'BRIEF', icon: Terminal },
  { key: 'ab_sent', label: 'A/B SEND', icon: FlaskConical },
  { key: 'metrics_collected', label: 'METRICS', icon: Activity },
  { key: 'ab_optimization_required', label: 'METRICS', icon: Activity },
  { key: 'winner_confirmation', label: 'WINNER', icon: Trophy },
  { key: 'winner_sent', label: 'DEPLOYED', icon: Send },
  { key: 'analysis', label: 'ANALYSIS', icon: BarChart2 },
  { key: 'relaunched', label: 'RELAUNCH', icon: RefreshCw },
];
const STEP_ORDER = ['preview', 'ab_sent', 'metrics_collected', 'winner_confirmation', 'winner_sent', 'analysis', 'relaunched'];
const STAGE_IDX = { preview: 0, ab_sent: 1, metrics_collected: 2, ab_optimization_required: 2, winner_confirmation: 3, winner_sent: 4, analysis: 5, relaunched: 6 };

const PipelineRail = ({ currentStage }) => {
  const activeIdx = STAGE_IDX[currentStage] ?? 0;
  const labels = ['BRIEF', 'A/B', 'METRICS', 'WINNER', 'DEPLOY', 'ANALYZE', 'RELAUNCH'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, padding: '10px 14px', background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 6,
            background: i === activeIdx ? T.skyDim : 'transparent',
            border: `1px solid ${i === activeIdx ? T.borderHi : 'transparent'}`,
            transition: 'all 0.3s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i < activeIdx ? T.mint : i === activeIdx ? T.sky : T.textMuted,
              boxShadow: i === activeIdx ? `0 0 6px ${T.sky}` : 'none',
              transition: 'all 0.3s',
            }} />
            <span style={{
              fontFamily: T.font, fontSize: 8, fontWeight: 700,
              letterSpacing: '0.1em',
              color: i < activeIdx ? T.mint : i === activeIdx ? T.sky : T.textMuted,
              transition: 'all 0.3s',
            }}>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div style={{
              flex: 1, height: 1, minWidth: 8,
              background: i < activeIdx
                ? `linear-gradient(90deg, ${T.mint}, ${T.mint})`
                : `linear-gradient(90deg, ${T.border}, ${T.border})`,
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const MetricChip = ({ label, value, color = T.sky }) => (
  <div style={{ padding: '10px 14px', background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 8, borderTop: `2px solid ${color}` }}>
    <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, letterSpacing: '0.1em', marginBottom: 5 }}>{label}</div>
    <div style={{ fontFamily: T.font, fontSize: 20, fontWeight: 700, color }}>{value}</div>
  </div>
);


const VariantCard = ({ variant, label, color, metrics, isWinner }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      border: `1px solid ${isWinner ? color + '60' : T.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      background: isWinner ? `${color}05` : T.bgDeep,
      boxShadow: isWinner ? `0 0 24px ${color}12, inset 0 0 24px ${color}06` : 'none',
      transition: 'all 0.3s',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isWinner ? `${color}12` : 'rgba(255,255,255,0.02)',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer',
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `${color}15`, border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.font, fontSize: 11, fontWeight: 700, color,
          }}>{label}</div>
          <div>
            <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 700, color: T.text }}>{variant?.subject ?? '—'}</div>
            <div style={{ fontFamily: T.font, fontSize: 9, color: T.textMuted, marginTop: 1 }}>VARIANT {label}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isWinner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: `${color}20`, border: `1px solid ${color}40` }}>
              <Trophy size={9} color={color} />
              <span style={{ fontFamily: T.font, fontSize: 8, fontWeight: 700, color, letterSpacing: '0.1em' }}>WINNER</span>
            </div>
          )}
          {metrics && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontFamily: T.font, fontSize: 10, color: T.mint }}>OR {(metrics.open_rate * 100).toFixed(1)}%</span>
              <span style={{ fontFamily: T.font, fontSize: 10, color: T.sky }}>CR {(metrics.click_rate * 100).toFixed(1)}%</span>
            </div>
          )}
          <ChevronDown size={12} color={T.textMuted} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '12px 14px', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, letterSpacing: '0.1em', marginBottom: 6 }}>BODY</div>
          <div style={{
            fontFamily: T.fontSans, fontSize: 11, color: T.textSub, lineHeight: 1.8,
            borderLeft: `2px solid ${color}30`, paddingLeft: 12,
            whiteSpace: 'pre-line',
          }}>{variant?.body ?? '—'}</div>
          {variant?.cta && (
            <div style={{ marginTop: 10, display: 'inline-block', padding: '6px 14px', borderRadius: 6, background: `${color}15`, border: `1px solid ${color}40`, fontFamily: T.font, fontSize: 10, color, fontWeight: 600 }}>
              → {variant.cta}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({ onClick, disabled, loading, icon: Icon, label, color = T.sky, dimColor, secondary }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: '100%', padding: secondary ? '9px 16px' : '12px 16px',
    borderRadius: 8,
    background: disabled ? 'transparent' : secondary ? 'transparent' : (dimColor || T.skyDim),
    border: `1px solid ${disabled ? T.border : color + (secondary ? '30' : '50')}`,
    color: disabled ? T.textMuted : color,
    fontFamily: T.font, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled ? 0.4 : 1,
  }}>
    {loading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={12} />}
    {label}
  </button>
);

const TerminalLog = ({ tasks }) => {
  if (!tasks?.length) return null;
  return (
    <div style={{
      background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 10,
      overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{
        padding: '7px 12px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.01)',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[T.rose, T.gold, T.mint].map(c => (
            <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
          ))}
        </div>
        <span style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, letterSpacing: '0.1em' }}>AGENT ACTIVITY LOG</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.mint, boxShadow: `0 0 6px ${T.mint}`, animation: 'glow 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: T.font, fontSize: 7, color: T.mint, letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </div>
      <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tasks.map((t, i) => (
          <AgentNode key={t.id} index={i} icon={Activity} label={t.label} status={t.status} detail={t.detail} />
        ))}
      </div>
    </div>
  );
};

const ThinkingBanner = ({ label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', borderRadius: 8,
    background: T.skyDim, border: `1px solid ${T.borderHi}`,
    marginBottom: 14,
    animation: 'glow 2s ease-in-out infinite',
  }}>
    <Cpu size={13} color={T.sky} style={{ animation: 'spin 3s linear infinite', flexShrink: 0 }} />
    <div>
      <div style={{ fontFamily: T.font, fontSize: 9, color: T.sky, letterSpacing: '0.08em', marginBottom: 2 }}>PROCESSING</div>
      <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.sky, opacity: 0.8 }}>{label}</div>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(j => (
        <div key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: T.sky, animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />
      ))}
    </div>
  </div>
);

const ErrorBanner = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 14px', borderRadius: 8,
    background: T.roseDim, border: `1px solid rgba(251,113,133,0.25)`,
    marginBottom: 14,
  }}>
    <AlertCircle size={13} color={T.rose} style={{ flexShrink: 0, marginTop: 1 }} />
    <div>
      <div style={{ fontFamily: T.font, fontSize: 8, color: T.rose, letterSpacing: '0.1em', marginBottom: 2 }}>ERROR</div>
      <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.rose }}>{message}</span>
    </div>
  </div>
);

const SectionLabel = ({ icon: Icon, label, color = T.sky }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
    <Icon size={11} color={color} />
    <span style={{ fontFamily: T.font, fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}30, transparent)`, marginLeft: 4 }} />
  </div>
);


const VARIANT_COLORS = [T.gold, T.sky, T.indigo];
const VARIANT_LABELS = ['A', 'B', 'C'];
const MAX_OPTIMIZATION_ATTEMPTS = 3
const TERMINAL_STATES = ["COMPLETED", "REJECTED"]
const PAUSE_POLLING_STATES = ["RELAUNCHED", "WINNER_PENDING_CONFIRMATION", "OPTIMIZATION_PENDING_APPROVAL"]

const CampaignFlowMessage = ({ initialData, chatId, onChatIdUpdate }) => {
  const [campaignStatus, setCampaignStatus] = useState(initialData?.status || "PENDING_APPROVAL")
  const [abData, setAbData] = useState(
    initialData?.status === "AB_TEST_SENT"
      ? { ab_test_results: initialData?.ab_test_results ?? null }
      : null
  )
  const [winnerSentData, setWinnerSentData] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [relaunchData, setRelaunchData] = useState(null)

  const [attemptsRemaining, setAttemptsRemaining] = useState(
    initialData?.attempts_remaining ?? MAX_OPTIMIZATION_ATTEMPTS
  )
  const [busy, setBusy] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [thinkingLabel, setThinkingLabel] = useState("")
  const [errorMessage, setErrorMessage] = useState(null)
  const [tasks, setTasks] = useState([])
  const createId = initialData?.campaign_id
  const autoCollectTimerRef = useRef(null)
  const winnerCampaignIdRef = useRef(
    initialData?.relaunch_results?.[0]?.campaign_id ??
    initialData?.real_campaign_id ??
    initialData?.campaign_id ??
    null
  )
  const chatIdRef = useRef(chatId)
  const [metricsData, setMetricsData] = useState(() => {
    if (
      initialData?.status === "WINNER_PENDING_CONFIRMATION" ||
      initialData?.status === "OPTIMIZATION_PENDING_APPROVAL"
    ) {
      return {
        ab_metrics: initialData.ab_metrics ?? null,
        winner: initialData.winner ?? null,
        approval_required: initialData.approval_required ?? false,
        optimization_preview: initialData.optimization_preview ?? null,
        micro_segments_found: initialData.micro_segments_found ?? 0,
        variants_generated: initialData.variants_generated ?? 0,
      }
    }
    return null
  })

  const mapStatusToStage = (status) => {
    switch (status) {
      case "PENDING_APPROVAL": return "preview"
      case "AB_TEST_SENT": return "ab_sent"
      case "WINNER_PENDING_CONFIRMATION": return "winner_confirmation"
      case "WINNER_SENT": return "winner_sent"
      case "OPTIMIZATION_PENDING_APPROVAL": return "ab_optimization_required"
      case "RELAUNCHED": return "relaunched"
      case "COMPLETED": return "analysis"
      case "REJECTED": return "rejected"
      default: return "preview"
    }
  }

  const stage = mapStatusToStage(campaignStatus)

  useEffect(() => { chatIdRef.current = chatId }, [chatId])
  useEffect(() => () => {
    if (autoCollectTimerRef.current) clearTimeout(autoCollectTimerRef.current)
  }, [])


  useEffect(() => {
    if (!createId) return

    const poll = setInterval(async () => {
      try {
        const res = await getCampaignStatus(createId)
        if (!res?.status) return

        setCampaignStatus(res.status)
        if (res.attempts_remaining != null) {
          setAttemptsRemaining(res.attempts_remaining)
        }


        if (res.ab_metrics) {
          setMetricsData({
            ab_metrics: res.ab_metrics,
            winner: res.winner,
            approval_required: res.approval_required,
            optimization_preview: res.optimization_preview,
            micro_segments_found: res.micro_segments_found,
            variants_generated: res.variants_generated,
          })
        }

        // Hydrate winnerCampaignIdRef when real_campaign_id becomes available
        if (res.real_campaign_id) {
          winnerCampaignIdRef.current = res.real_campaign_id
        }

        // Hydrate winnerSentData when status reaches WINNER_SENT via polling
        // (covers case where user confirmed in another tab or polling catches up)
        if (res.status === "WINNER_SENT" && !winnerSentData && res.real_campaign_id) {
          setWinnerSentData({
            campaign_id: res.real_campaign_id,
            full_audience_size: initialData?.full_group_size,
            winner_variant: res.winner?.id,
          })
        }
        if (
          (res.status === "COMPLETED" || res.status === "OPTIMIZATION_PENDING_APPROVAL") &&
          !analysisData &&
          res.metrics
        ) {
          setAnalysisData({
            metrics: res.metrics,
            score: res.score ?? null,
            approval_required: res.approval_required ?? false,
            max_reached: res.max_reached ?? false,
            attempts_remaining: res.attempts_remaining ?? 0,
            optimization_preview: res.optimization_preview ?? null,
          })
          setCampaignStatus(res.status)
          if (res.attempts_remaining != null) setAttemptsRemaining(res.attempts_remaining)
        }

        // BUG FIX #7 — only stop at true terminal states
        if (TERMINAL_STATES.includes(res.status)) {
          clearInterval(poll)
          return
        }

        // Pause polling when human action is required — resume naturally on next tick
        if (PAUSE_POLLING_STATES.includes(res.status)) {
          return
        }

      } catch (e) {
        console.error("Status polling failed", e)
      }
    }, 8000)

    return () => clearInterval(poll)
  }, [createId])


  const optimizedCampaign = analysisData?.optimization_preview?.[0]
    ?? relaunchData?.optimization_preview?.[0]

  const addTask = (id, label) => setTasks(p => [...p, { id, label, status: "running" }])
  const doneTask = (id, detail) => setTasks(p => p.map(t => t.id === id ? { ...t, status: "done", detail: detail ?? t.detail } : t))
  const errorTask = (id, detail) => setTasks(p => p.map(t => t.id === id ? { ...t, status: "error", detail: detail ?? t.detail } : t))

  const go = async (label, fn) => {
    setBusy(true); setThinking(true); setErrorMessage(null); setThinkingLabel(label)
    try { return await fn() }
    catch (e) { setErrorMessage(e.message); return null }
    finally { setBusy(false); setThinking(false) }
  }

  const save = (msg) => saveChat(msg, chatIdRef.current).then(s => onChatIdUpdate(s.chat_id))

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleReject = async () => {
    const reason = window.prompt("Enter rejection reason (optional):") ?? "Rejected by user"
    addTask("reject", "Rejecting campaign...")
    const res = await go("Rejecting campaign...", () => rejectCampaign(createId, reason))
    if (!res) { errorTask("reject", "Failed to reject"); return }
    doneTask("reject", `Rejected: ${reason}`)
    await save({ role: "agent", type: "text", text: `Campaign rejected. Reason: ${reason}` })
    // BUG FIX #6 — response now includes status field; hardcoded fallback just in case
    setCampaignStatus(res.status ?? "REJECTED")
  }

  // Pipeline: APPROVAL GATE #1 → A/B TEST SEND
  const handleApprove = async () => {
    if (autoCollectTimerRef.current) clearTimeout(autoCollectTimerRef.current)
    addTask("approve", "Sending A/B/C variants to test group (20%)...")
    const res = await go("Sending A/B/C variants to test group (20%)...", () =>
      approveCampaign(createId, ["A", "B", "C"])
    )
    if (!res) { errorTask("approve", "Failed to send variants"); return }
    doneTask("approve", `${res.test_group_size} recipients across ${res.ab_test_results?.length} variants`)
    await save({ role: "agent", type: "text", text: `A/B/C test sent. Campaign: ${createId}` })
    setAbData(res)
    // BUG FIX #5 — response now includes status field; hardcoded fallback just in case
    setCampaignStatus(res.status ?? "AB_TEST_SENT")
  }

  // Pipeline: APPROVAL GATE #2 → RELAUNCH (micro-segments)
  // BUG FIX #1 — approveOptimized() now correctly calls approveAndRelaunchOptimized
  //              on the backend, handling all micro-segments with per-segment
  //              audiences and Gemini-recommended send times.
  const handleApproveOptimizedAbTest = async () => {
    addTask("sendOpt", "Relaunching AI-optimized micro-segment campaigns...")
    const res = await go("Relaunching optimized campaigns...", () => approveOptimized(createId))
    if (!res) { errorTask("sendOpt", "Failed"); return }
    // res.campaign_id is temp_id; real IDs are in res.relaunch_results[].campaign_id
    const firstResult = res.relaunch_results?.[0]
    if (firstResult) {
      winnerCampaignIdRef.current = firstResult.campaign_id
      console.log(`[frontend] winnerCampaignIdRef updated to: ${firstResult.campaign_id}`)
    }
    doneTask("sendOpt", `${res.total_reached} recipients across ${res.relaunch_results?.length} micro-segments`)
    await save({
      role: "agent", type: "text",
      text: `Optimized micro-segments relaunched. Total: ${res.total_reached}`,
      campaign_id: firstResult?.campaign_id,
    })
    setTimeout(() => {
      setRelaunchData(res)
      setCampaignStatus(res.status ?? "RELAUNCHED")
      if (res.attempts_remaining != null) setAttemptsRemaining(res.attempts_remaining)
    }, 400)
  }

  // Pipeline: APPROVAL GATE #3 → FULL AUDIENCE SEND
  const handleConfirmWinner = async () => {
    addTask("sendWinner", `Sending Variant ${metricsData?.winner?.id} to full audience (80%)...`)
    const res = await go("Sending winner to full audience...", () => confirmWinner(createId))
    if (!res) { errorTask("sendWinner", "Failed"); return }
    winnerCampaignIdRef.current = res.campaign_id
    doneTask("sendWinner", `${res.full_audience_size} recipients · ID: ${res.campaign_id}`)
    await save({ role: "agent", type: "text", text: `Winner sent. ID: ${res.campaign_id}`, campaign_id: res.campaign_id })
    setTimeout(() => {
      setWinnerSentData(res)
      setCampaignStatus(res.status ?? "WINNER_SENT")
    }, 400)
  }

  // Pipeline: FINAL METRICS POLLER (manual trigger from winner_sent stage)
  const handleAnalyze = async () => {
    const snapshotId = winnerCampaignIdRef.current
    if (!snapshotId) { setErrorMessage("No campaign ID — send campaign first"); return }
    addTask("fetchMetrics", "Fetching final campaign metrics...")
    addTask("runOptAgent", "Running optimization analysis...")
    const res = await go("Analyzing final campaign performance...", () => analyzeCampaign(snapshotId))
    if (!res) { errorTask("fetchMetrics", "Failed"); errorTask("runOptAgent", "Skipped"); return }
    doneTask("fetchMetrics", `OR: ${((res.metrics?.open_rate ?? 0) * 100).toFixed(1)}% · CR: ${((res.metrics?.click_rate ?? 0) * 100).toFixed(1)}%`)
    doneTask("runOptAgent", res.status === "COMPLETED"
      ? "Threshold met — campaign complete ✓"
      : `Optimized variants ready · approval required`
    )
    setTimeout(() => {
      setAnalysisData(res)
      setCampaignStatus(res.status)
      if (res.attempts_remaining != null) setAttemptsRemaining(res.attempts_remaining)
    }, 400)
  }

  // Pipeline: APPROVAL GATE #4 → RELAUNCH → loop back to FINAL METRICS POLLER
  const handleRelaunch = async () => {
    const snapshotId = winnerCampaignIdRef.current
    if (!snapshotId) { setErrorMessage("No campaign ID"); return }
    addTask("relaunch", "Relaunching optimized campaign...")
    // BUG FIX #2 — relaunchCampaign() now correctly reads optimizationResult
    //              (was trying to read doc.optimizedCampaign which is never set)
    const res = await go("Relaunching optimized campaign...", () => relaunchCampaign(snapshotId))
    if (!res) { errorTask("relaunch", "Failed"); return }
    const firstResult = res.relaunch_results?.[0]
    if (firstResult) {
      winnerCampaignIdRef.current = firstResult.campaign_id
      console.log(`[frontend] winnerCampaignIdRef updated to: ${firstResult.campaign_id}`)
    }
    doneTask("relaunch", `Live · ${res.total_reached} recipients across ${res.relaunch_results?.length} micro-segments`)
    await save({
      role: "agent", type: "text",
      text: `Relaunched. Total: ${res.total_reached}`,
      campaign_id: firstResult?.campaign_id,
    })
    setTimeout(() => {
      setRelaunchData(res)
      setCampaignStatus(res.status ?? "RELAUNCHED")
      if (res.attempts_remaining != null) setAttemptsRemaining(res.attempts_remaining)
    }, 400)
  }

  const handleRetryMetrics = async () => {
    addTask("retryMetrics", "Manually retrying metrics collection...")
    const res = await go("Retrying metrics collection...", () => collectAbTestMetrics(createId))
    if (!res) { errorTask("retryMetrics", "Failed"); return }
    doneTask("retryMetrics", `Status: ${res.status}`)
    setCampaignStatus(res.status)
    if (res.ab_metrics) setMetricsData({
      ab_metrics: res.ab_metrics,
      winner: res.winner,
      approval_required: res.approval_required,
      optimization_preview: res.optimization_preview,
      micro_segments_found: res.micro_segments_found,
      variants_generated: res.variants_generated,
    })
  }

  const handleOptimizeAndRetest = async () => {
    addTask("optimizeRetest", "Generating 2 challenger variants based on winner...")
    const res = await go("Re-running A/B test with optimized challengers...", () =>
      optimizeAndRetestWinner(createId)
    )
    if (!res) { errorTask("optimizeRetest", "Failed"); return }
    doneTask("optimizeRetest", `${res.test_group_size} recipients across 3 variants`)
    await save({
      role: "agent", type: "text",
      text: `Winner retest started. Original winner (Variant ${metricsData?.winner?.id}) vs 2 new challengers.`,
    })
    setTimeout(() => {
      setAbData(res)
      setCampaignStatus(res.status ?? "AB_TEST_SENT")
    }, 400)
  }




  return (
    <div style={{ width: "100%", animation: "fadeUp 0.3s ease" }}>
      <PipelineRail currentStage={stage} />
      <TerminalLog tasks={tasks} />
      {errorMessage && <ErrorBanner message={errorMessage} />}
      {thinking && <ThinkingBanner label={thinkingLabel} />}

      {!thinking && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── PREVIEW — APPROVAL GATE #1 ── */}
          {stage === "preview" && (
            <>
              <SectionLabel icon={Terminal} label="GENERATED VARIANTS" color={T.gold} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 4 }}>
                <MetricChip label="RECIPIENTS" value={initialData?.segment_size?.toLocaleString("en-IN") ?? "—"} color={T.sky} />
                <MetricChip label="TEST GROUP" value={initialData?.test_group_size?.toLocaleString("en-IN") ?? "—"} color={T.gold} />
                <MetricChip label="FULL GROUP" value={initialData?.full_group_size?.toLocaleString("en-IN") ?? "—"} color={T.mint} />
                <MetricChip label="SEND IN" value="~15 min" color={T.indigo} />
              </div>

              <div style={{ padding: "8px 12px", background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, letterSpacing: "0.1em" }}>SEGMENTS →</span>
                {Object.entries(initialData?.segments_used ?? {}).map(([k, v]) => (
                  <div key={k} style={{ padding: "2px 8px", borderRadius: 4, background: T.skyDim, border: `1px solid ${T.borderHi}`, fontFamily: T.font, fontSize: 9, color: T.sky }}>
                    {k}: {v}
                  </div>
                ))}
              </div>

              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: initialData?.ab_test_skipped ? T.goldDim : T.skyDim,
                border: `1px solid ${initialData?.ab_test_skipped ? T.gold + "40" : T.borderHi}`,
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <FlaskConical size={12} color={initialData?.ab_test_skipped ? T.gold : T.sky} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontFamily: T.font, fontSize: 9, fontWeight: 700, color: initialData?.ab_test_skipped ? T.gold : T.sky, letterSpacing: "0.08em", marginBottom: 3 }}>
                    {initialData?.ab_test_skipped ? "⚠ A/B TEST SKIPPED" : "A/B/C TEST PLAN"}
                  </div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>
                    {initialData?.ab_test_skipped
                      ? initialData.ab_skip_reason
                      : `Variants A/B/C will each be sent to ~${Math.round((initialData?.test_group_size / initialData?.segment_size) * 100) || 20}% of the test group (${initialData?.test_group_size} contacts). Winning variant deploys to remaining ${initialData?.full_group_size}.`
                    }
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {initialData?.variants?.map((v, i) => (
                  <VariantCard key={v.id} variant={v.campaign} label={VARIANT_LABELS[i]} color={VARIANT_COLORS[i]} />
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <ActionBtn onClick={handleApprove} disabled={busy} loading={busy} icon={Send} label="Approve & Launch A/B/C Test" color={T.sky} />
                <ActionBtn onClick={handleReject} disabled={busy} loading={busy} icon={AlertCircle} label="Reject Campaign" color={T.rose} secondary />
              </div>
            </>
          )}

          {/* ── AB SENT — autonomous, no user action ── */}
          {stage === "ab_sent" && (
            <>
              <SectionLabel icon={FlaskConical} label="A/B TEST ACTIVE" color={T.mint} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {abData?.ab_test_results?.map((v, i) => (
                  <div key={v.id} style={{ padding: "14px", background: T.bgDeep, border: `1px solid ${VARIANT_COLORS[i]}25`, borderRadius: 8, borderTop: `2px solid ${VARIANT_COLORS[i]}` }}>
                    <div style={{ fontFamily: T.font, fontSize: 8, color: VARIANT_COLORS[i], letterSpacing: "0.1em", marginBottom: 8 }}>VARIANT {v.id}</div>
                    <div style={{ fontFamily: T.font, fontSize: 22, fontWeight: 700, color: T.text }}>{v.recipient_count}</div>
                    <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>recipients</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: T.skyDim, border: `1px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader size={11} color={T.sky} style={{ animation: "spin 2s linear infinite", flexShrink: 0 }} />
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.sky }}>Metrics collection running autonomously</span>
                </div>
                <ActionBtn
                  onClick={handleRetryMetrics}
                  disabled={busy}
                  loading={busy}
                  icon={RefreshCw}
                  label="Retry Metrics"
                  color={T.sky}
                  secondary
                />
              </div>
            </>
          )}

          {/* ── AB OPTIMIZATION REQUIRED — APPROVAL GATE #2 ── */}
          {stage === "ab_optimization_required" && (
            <>
              <SectionLabel icon={BarChart2} label="A/B TEST RESULTS" color={T.gold} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {metricsData?.ab_metrics?.map((v, i) => (
                  <VariantCard
                    key={v.id}
                    variant={initialData?.variants?.find(vr => vr.id === v.id)?.campaign}
                    label={v.id}
                    color={VARIANT_COLORS[i]}
                    metrics={v.metrics}
                  />
                ))}
              </div>

              {/* Micro-segments identified by Gemini */}
              {metricsData?.optimization_preview?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <SectionLabel icon={Target} label="MICRO-SEGMENTS IDENTIFIED" color={T.indigo} />
                  {metricsData.optimization_preview.map((seg, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", background: T.bgDeep,
                      border: `1px solid ${T.indigo}25`, borderRadius: 8,
                      borderLeft: `3px solid ${T.indigo}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontFamily: T.font, fontSize: 9, fontWeight: 700, color: T.indigo, letterSpacing: "0.1em" }}>
                          {seg.micro_segment?.toUpperCase()}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {seg.tone && <div style={{ padding: "2px 7px", borderRadius: 4, background: T.indigoDim, border: `1px solid ${T.indigo}30`, fontFamily: T.font, fontSize: 8, color: T.indigo }}>{seg.tone}</div>}
                          {seg.style && <div style={{ padding: "2px 7px", borderRadius: 4, background: T.skyDim, border: `1px solid ${T.sky}30`, fontFamily: T.font, fontSize: 8, color: T.sky }}>{seg.style}</div>}
                        </div>
                      </div>
                      <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                        {seg.subject}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textSub }}>
                          Base: {seg.base_segment} · CTA: {seg.cta}
                        </div>
                        <div style={{ fontFamily: T.font, fontSize: 9, color: T.gold }}>
                          ⏰ {seg.send_time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: "10px 14px", borderRadius: 8, background: T.goldDim, border: `1px solid ${T.gold}30`, display: "flex", gap: 10 }}>
                <AlertCircle size={13} color={T.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.gold, lineHeight: 1.6 }}>
                  No variant met performance threshold. Gemini identified {metricsData?.micro_segments_found ?? 0} micro-segments and generated {metricsData?.variants_generated ?? 0} optimized variants.
                </div>
              </div>

              {/* Optimized preview — BUG FIX #4: read from optimization_preview[0] */}
              {metricsData?.optimization_preview?.[0] && (
                <div style={{ padding: "14px", background: T.bgDeep, border: `1px solid ${T.indigo}30`, borderRadius: 10, borderLeft: `3px solid ${T.indigo}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <Sparkles size={11} color={T.indigo} />
                    <span style={{ fontFamily: T.font, fontSize: 8, color: T.indigo, letterSpacing: "0.1em" }}>
                      AI OPTIMIZED — {metricsData.optimization_preview[0].micro_segment?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                    {/* BUG FIX #4 — was metricsData?.improvedCampaign?.subject — field doesn't exist */}
                    {metricsData.optimization_preview[0].subject ?? "—"}
                  </div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textSub, lineHeight: 1.8, borderLeft: `2px solid ${T.indigo}30`, paddingLeft: 12, marginBottom: 14 }}>
                    {/* BUG FIX #4 — was metricsData?.improvedCampaign?.body — field doesn't exist */}
                    {metricsData.optimization_preview[0].body ?? "—"}
                  </div>
                  <ActionBtn
                    onClick={handleApproveOptimizedAbTest}
                    disabled={busy} loading={busy}
                    icon={Send}
                    label={`Approve & Relaunch ${metricsData.optimization_preview.length} Micro-Segment${metricsData.optimization_preview.length > 1 ? "s" : ""}`}
                    color={T.indigo}
                  />
                  <ActionBtn
                    onClick={handleReject}
                    disabled={busy}
                    loading={busy}
                    icon={AlertCircle}
                    label="Reject & Close Campaign"
                    color={T.rose}
                    secondary
                  />
                </div>
              )}
            </>
          )}

          {/* ── WINNER CONFIRMATION — APPROVAL GATE #3 ── */}
          {stage === "winner_confirmation" && (
            <>
              <SectionLabel icon={Trophy} label="WINNER SELECTED" color={T.indigo} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {metricsData?.ab_metrics?.map((v, i) => (
                  <VariantCard
                    key={v.id}
                    variant={initialData?.variants?.find(vr => vr.id === v.id)?.campaign}
                    label={v.id}
                    color={VARIANT_COLORS[i]}
                    metrics={v.metrics}
                    isWinner={v.id === metricsData?.winner?.id}
                  />
                ))}
              </div>
              <div style={{ padding: "14px", background: T.bgDeep, border: `1px solid ${T.indigo}30`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <Sparkles size={11} color={T.indigo} />
                  <span style={{ fontFamily: T.font, fontSize: 8, color: T.indigo, letterSpacing: "0.1em" }}>AI RECOMMENDATION</span>
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                  Variant {metricsData?.winner?.id} selected as winner
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textSub, marginBottom: 14, lineHeight: 1.6 }}>
                  Composite score: CR×0.70 + OR×0.30 = {metricsData?.winner?.score?.toFixed(4)}.
                  Ready to deploy to {initialData?.full_group_size?.toLocaleString("en-IN")} remaining recipients.
                </div>

                {/* Primary action */}
                <ActionBtn
                  onClick={handleConfirmWinner}
                  disabled={busy} loading={busy}
                  icon={Trophy}
                  label={`Confirm & Deploy Variant ${metricsData?.winner?.id} to Full Audience`}
                  color={T.indigo}
                />
              </div>

              {/* NEW — optimize option */}
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: T.bgDeep,
                border: `1px solid ${T.gold}25`,
                borderLeft: `3px solid ${T.gold}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <FlaskConical size={11} color={T.gold} />
                  <span style={{ fontFamily: T.font, fontSize: 8, color: T.gold, letterSpacing: "0.1em" }}>
                    NOT SATISFIED WITH THE WINNER?
                  </span>
                </div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.textSub, lineHeight: 1.6, marginBottom: 12 }}>
                  Re-run the A/B test using Variant {metricsData?.winner?.id} as the base, with 2 AI-generated challengers sent to the test group again.
                </div>
                <ActionBtn
                  onClick={handleOptimizeAndRetest}
                  disabled={busy} loading={busy}
                  icon={RefreshCw}
                  label="Optimize & Re-run A/B Test"
                  color={T.gold}
                  secondary
                />
              </div>
            </>
          )}

          {/* ── WINNER SENT — autonomous FINAL METRICS POLLER starts ── */}
          {stage === "winner_sent" && (
            <>
              <SectionLabel icon={CheckCircle} label="CAMPAIGN DEPLOYED" color={T.mint} />
              <div style={{ padding: "16px", borderRadius: 10, background: T.mintDim, border: `1px solid ${T.mint}30`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.mint + "20", border: `1px solid ${T.mint}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckCircle size={20} color={T.mint} />
                </div>
                <div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 14, fontWeight: 700, color: T.mint }}>
                    {winnerSentData?.winner_variant ? `Variant ${winnerSentData.winner_variant} is live` : "Campaign is live"}
                  </div>
                  <div style={{ fontFamily: T.font, fontSize: 9, color: T.textMuted, marginTop: 3 }}>
                    ID: {winnerSentData?.campaign_id}
                  </div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textSub, marginTop: 2 }}>
                    {winnerSentData?.full_audience_size?.toLocaleString("en-IN")} recipients reached
                  </div>
                </div>
              </div>
              <ActionBtn onClick={handleAnalyze} disabled={busy} loading={busy} icon={BarChart2} label="Analyze Final Performance" color={T.sky} />
            </>
          )}

          {/* ── ANALYSIS — APPROVAL GATE #4 if below threshold ── */}
          {stage === "analysis" && (
            <>
              <SectionLabel icon={BarChart2} label="FINAL ANALYSIS" color={T.mint} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <MetricChip label="OPEN RATE" value={analysisData?.metrics?.open_rate != null ? `${(analysisData.metrics.open_rate * 100).toFixed(1)}%` : "—"} color={T.mint} />
                <MetricChip label="CLICK RATE" value={analysisData?.metrics?.click_rate != null ? `${(analysisData.metrics.click_rate * 100).toFixed(1)}%` : "—"} color={T.sky} />
              </div>

              {attemptsRemaining != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, background: T.skyDim, border: `1px solid ${T.borderHi}` }}>
                  <RefreshCw size={10} color={T.sky} />
                  <span style={{ fontFamily: T.font, fontSize: 9, color: T.sky, letterSpacing: "0.06em" }}>
                    {attemptsRemaining} OPTIMIZATION ATTEMPT{attemptsRemaining !== 1 ? "S" : ""} REMAINING
                  </span>
                </div>
              )}

              {analysisData?.approval_required && !analysisData?.max_reached && (
                <div style={{ padding: "14px", background: T.bgDeep, border: `1px solid ${T.indigo}30`, borderRadius: 10, borderLeft: `3px solid ${T.indigo}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Sparkles size={11} color={T.indigo} />
                    <span style={{ fontFamily: T.font, fontSize: 8, color: T.indigo, letterSpacing: "0.1em" }}>OPTIMIZED VARIANTS READY</span>
                  </div>
                  {/* BUG FIX #4 — optimizedCampaign now correctly reads from optimization_preview[0] */}
                  <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>
                    {optimizedCampaign?.subject ?? "—"}
                  </div>
                  <ActionBtn
                    onClick={handleRelaunch}
                    disabled={busy || attemptsRemaining === 0}
                    loading={busy}
                    icon={RefreshCw}
                    label={attemptsRemaining === 0 ? "Max Attempts Reached" : "Approve & Relaunch Optimized Campaign"}
                    color={T.indigo}
                  />
                </div>
              )}

              {analysisData?.max_reached && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: T.roseDim, border: `1px solid ${T.rose}30`, fontFamily: T.fontSans, fontSize: 12, color: T.rose, fontWeight: 600 }}>
                  Max optimization attempts reached. Campaign closed.
                </div>
              )}
            </>
          )}

          {/* ── RELAUNCHED ── */}
          {stage === "relaunched" && (
            <>
              <SectionLabel icon={RefreshCw} label="CAMPAIGN RELAUNCHED" color={T.indigo} />
              <div style={{ padding: "14px 18px", borderRadius: 10, background: T.mintDim, border: `1px solid ${T.mint}30`, display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle size={16} color={T.mint} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 13, fontWeight: 700, color: T.mint }}>
                    {relaunchData?.relaunch_results?.length ?? 0} micro-segment campaign{(relaunchData?.relaunch_results?.length ?? 0) !== 1 ? "s" : ""} live
                  </div>
                  <div style={{ fontFamily: T.font, fontSize: 9, color: T.textMuted, marginTop: 3 }}>
                    Total reached: {relaunchData?.total_reached?.toLocaleString("en-IN")}
                  </div>
                  {attemptsRemaining != null && (
                    <div style={{ fontFamily: T.fontSans, fontSize: 10, color: T.textSub, marginTop: 2 }}>
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                    </div>
                  )}
                </div>
              </div>

              {/* Show all relaunched micro-segments */}
              {relaunchData?.relaunch_results?.map((r, i) => (
                <div key={i} style={{ padding: "10px 14px", background: T.bgDeep, border: `1px solid ${T.indigo}20`, borderRadius: 8, borderLeft: `3px solid ${T.indigo}` }}>
                  <div style={{ fontFamily: T.font, fontSize: 8, color: T.indigo, letterSpacing: "0.1em", marginBottom: 4 }}>
                    {r.micro_segment?.toUpperCase()} — {r.sent} RECIPIENTS
                  </div>
                  <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.text }}>
                    {r.subject}
                  </div>
                  <div style={{ fontFamily: T.font, fontSize: 9, color: T.gold, marginTop: 3 }}>⏰ {r.send_time}</div>
                </div>
              ))}

              {attemptsRemaining > 0 && (
                <ActionBtn onClick={handleAnalyze} disabled={busy} loading={busy} icon={BarChart2} label="Analyze Relaunched Campaign" color={T.sky} />
              )}
            </>
          )}

          {/* ── REJECTED ── */}
          {stage === "rejected" && (
            <div style={{ padding: "14px 18px", borderRadius: 10, background: T.roseDim, border: `1px solid ${T.rose}30`, display: "flex", alignItems: "center", gap: 12 }}>
              <AlertCircle size={16} color={T.rose} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: T.font, fontSize: 10, color: T.rose, letterSpacing: "0.1em", marginBottom: 3 }}>CAMPAIGN REJECTED</div>
                <div style={{ fontFamily: T.fontSans, fontSize: 11, color: T.rose, opacity: 0.8 }}>
                  This campaign has been closed and will not be sent.
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}


export default function AegisAgentUI({ user, onLogout }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatId, setChatId] = useState(() => localStorage.getItem('activeChatId') || null);
  const messagesEndRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeChatId');
    onLogout();
  };

  useEffect(() => {
    if (chatId) localStorage.setItem('activeChatId', chatId);
    else localStorage.removeItem('activeChatId');
  }, [chatId]);

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { if (chatId) loadChat(chatId); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadHistory = async () => {
    try { const d = await getChatHistory(); setHistory(d.chats); }
    catch (e) { console.error('[loadHistory]', e.message); }
  };

  const loadChat = async (id) => {
    try {
      const d = await getChatById(id);
      setMessages(d.chat.messages.map(m => ({ role: m.role, text: m.text, type: m.type, data: m.data })));
      setChatId(id); setShowHistory(false);
    } catch (e) { console.error('[loadChat]', e.message); }
  };

  const handleNewChat = () => { setMessages([]); setChatId(null); setShowHistory(false); };

  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setHistory(p => p.filter(c => c._id !== id));
      if (chatId === id) handleNewChat();
    } catch (e) { console.error('[deleteChat]', e.message); }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(p => [...p, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    try {
      const saved = await saveChat({ role: 'user', type: 'text', text: userMsg }, chatId);
      setChatId(saved.chat_id);
      const data = await createCampaign({ brief: userMsg });
      await saveChat({ role: 'agent', type: 'flow', text: `Campaign generated for: ${userMsg}`, campaign_id: data.campaign_id, data }, saved.chat_id);
      setMessages(p => [...p, { role: 'agent', type: 'flow', data }]);
      await loadHistory();
    } catch (e) {
      setMessages(p => [...p, { role: 'agent', text: e.message || 'Something went wrong.' }]);
    } finally { setIsTyping(false); }
  };

  const suggestions = [
    { label: 'Re-engage churned users', icon: Users },
    { label: 'Promote Term Deposit', icon: TrendingUp },
    { label: 'Holiday flash sale', icon: Zap },
    { label: 'KYC compliance nudge', icon: Shield },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, color: T.text, fontFamily: T.fontSans, position: 'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <GridBg />

      {/* ── SIDEBAR ── */}
      <div style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: 256,
        background: 'rgba(3,7,15,0.97)',
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', zIndex: 40,
        transform: showHistory ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: T.font, fontSize: 8, letterSpacing: '0.14em', color: T.textMuted }}>CHAT HISTORY</span>
            <button onClick={handleNewChat} style={{
              fontFamily: T.font, fontSize: 8, color: T.sky,
              background: T.skyDim, border: `1px solid ${T.borderHi}`,
              borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
              letterSpacing: '0.08em',
            }}>+ NEW</button>
          </div>
        </div>
        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.textMuted, fontFamily: T.font, fontSize: 9, marginTop: 40, letterSpacing: '0.08em' }}>NO CHATS YET</div>
          ) : history.map(chat => (
            <div key={chat._id} onClick={() => loadChat(chat._id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 2,
              background: chatId === chat._id ? T.skyDim : 'transparent',
              border: `1px solid ${chatId === chat._id ? T.borderHi : 'transparent'}`,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (chatId !== chat._id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { if (chatId !== chat._id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</div>
                <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, marginTop: 2, letterSpacing: '0.04em' }}>{new Date(chat.updatedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={e => handleDeleteChat(chat._id, e)} style={{
                padding: 4, background: 'none', border: 'none', cursor: 'pointer',
                color: T.textMuted, borderRadius: 4, marginLeft: 6, flexShrink: 0,
              }}
                onMouseEnter={e => e.currentTarget.style.color = T.rose}
                onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
              ><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
        {/* User info */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: T.skyDim, border: `1px solid ${T.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={13} color={T.sky} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.fontSans, fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)' }} />
      )}

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: 'blur(24px)',
          background: 'rgba(3,7,15,0.92)',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{
              padding: 7, background: showHistory ? T.skyDim : 'transparent',
              border: `1px solid ${showHistory ? T.borderHi : 'transparent'}`,
              borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={15} color={showHistory ? T.sky : T.textMuted} />
            </button>
            <button onClick={handleNewChat} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', background: 'transparent',
              border: `1px solid ${T.border}`, borderRadius: 7, cursor: 'pointer',
              color: T.textMuted, fontFamily: T.font, fontSize: 8,
              letterSpacing: '0.1em', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.skyDim; e.currentTarget.style.color = T.sky; e.currentTarget.style.borderColor = T.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border; }}
            ><Plus size={10} /> NEW</button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(56,189,248,0.4)',
              }}>
                <Zap size={14} color="white" fill="white" />
              </div>
              <div>
                <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: T.text, lineHeight: 1 }}>
                  AEGIS<span style={{ color: T.sky }}>.AI</span>
                </div>
                <div style={{ fontFamily: T.font, fontSize: 7, color: T.textMuted, letterSpacing: '0.12em', marginTop: 1 }}>CAMPAIGN INTELLIGENCE</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: T.mintDim, border: `1px solid ${T.mint}30` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.mint, boxShadow: `0 0 5px ${T.mint}`, animation: 'glow 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: T.font, fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', color: T.mint }}>SYSTEMS ONLINE</span>
            </div>
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textMuted, fontFamily: T.font, fontSize: 8,
              letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = T.roseDim; e.currentTarget.style.color = T.rose; e.currentTarget.style.borderColor = T.rose + '40'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border; }}
            ><LogOut size={11} /> LOGOUT</button>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '28px 24px 160px', display: 'flex', flexDirection: 'column' }}>

          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 36, animation: 'fadeUp 0.5s ease' }}>
              {/* Hero */}
              <div>
                <div style={{ fontFamily: T.font, fontSize: 10, color: T.textMuted, letterSpacing: '0.14em', marginBottom: 12 }}>
                  WELCOME BACK, <span style={{ color: T.sky }}>{user?.name?.toUpperCase()}</span>
                </div>
                <h1 style={{ fontFamily: T.fontSans, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, color: T.text }}>
                  What campaign are<br /><span style={{ color: T.sky }}>we launching today?</span>
                </h1>
                <p style={{ fontFamily: T.fontSans, color: T.textMuted, fontSize: 13, marginTop: 14, maxWidth: 380, margin: '14px auto 0', lineHeight: 1.7 }}>
                  AI-driven campaigns with autonomous A/B testing, micro-segment optimization, and human-in-loop approval.
                </p>
              </div>

              {/* Suggestion grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 500 }}>
                {suggestions.map(s => (
                  <button key={s.label} onClick={() => setInput(s.label)} style={{
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.01)',
                    cursor: 'pointer', textAlign: 'left',
                    color: T.textSub, fontFamily: T.fontSans, fontSize: 12, fontWeight: 600,
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.skyDim; e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
                  >
                    <s.icon size={13} color={T.sky} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.3s ease' }}>
                  {m.role === 'agent' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: 'linear-gradient(135deg, #0284C7, #38BDF8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 14px rgba(56,189,248,0.3)',
                    }}>
                      <Bot size={15} color="white" />
                    </div>
                  )}
                  <div style={{ maxWidth: '88%', width: m.type === 'flow' ? '100%' : 'auto' }}>
                    {m.type === 'flow' ? (
                      <CampaignFlowMessage initialData={m.data} chatId={chatId} onChatIdUpdate={setChatId} />
                    ) : (
                      <div style={{
                        padding: '11px 15px',
                        borderRadius: m.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                        background: m.role === 'user'
                          ? 'linear-gradient(135deg, #0369A1, #0EA5E9)'
                          : T.bgCard,
                        border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                        fontFamily: T.fontSans, fontSize: 13, lineHeight: 1.7, color: T.text,
                        boxShadow: m.role === 'user' ? '0 4px 16px rgba(14,165,233,0.25)' : 'none',
                      }}>{m.text}</div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: T.bgCard, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={14} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', borderRadius: '3px 14px 14px 14px', background: T.bgCard, border: `1px solid ${T.border}` }}>
                    <div style={{ fontFamily: T.font, fontSize: 8, color: T.textMuted, letterSpacing: '0.1em' }}>AEGIS IS THINKING</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(j => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: T.sky, animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: '14px 20px 22px',
          background: 'linear-gradient(to top, rgba(3,7,15,1) 50%, transparent)',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.bgCard,
              border: `1px solid ${T.borderHi}`,
              borderRadius: 12, padding: '8px 8px 8px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.05)',
            }}>
              <Paperclip size={15} color={T.textMuted} style={{ flexShrink: 0 }} />
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Describe campaign objectives, target segment, tone..."
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: T.text, fontSize: 13, padding: '5px 4px',
                  fontFamily: T.fontSans,
                }}
              />
              <button onClick={handleSend} disabled={!input.trim()} style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: input.trim() ? 'linear-gradient(135deg, #0284C7, #38BDF8)' : 'transparent',
                border: `1px solid ${input.trim() ? 'transparent' : T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? '0 0 12px rgba(56,189,248,0.35)' : 'none',
              }}>
                <ArrowUp size={16} color={input.trim() ? 'white' : T.textMuted} />
              </button>
            </div>
            <div style={{ textAlign: 'center', fontFamily: T.font, fontSize: 7, color: T.textMuted, marginTop: 8, letterSpacing: '0.14em' }}>
              AEGIS AGENT v3.4 · ENTERPRISE · ALL PIPELINE ACTIONS REQUIRE HUMAN APPROVAL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}