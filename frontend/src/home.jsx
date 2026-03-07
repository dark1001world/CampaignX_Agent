import React, { useState, useRef, useEffect } from 'react';
import {
  Send, BarChart2, Sparkles, CheckCircle, Loader, AlertCircle,
  RefreshCw, Terminal, Cpu, Trophy, Users, ChevronRight, Zap, FlaskConical,
  Trash2, MessageSquare, Plus, Bot, User, LogOut, Paperclip, ArrowUp
} from 'lucide-react';
import { approveCampaign, collectAbTestMetrics, confirmWinner,
         analyzeCampaign, relaunchCampaign, createCampaign } from '../src/api/campaignApi';
import { saveChat, getChatHistory, getChatById, deleteChat } from '../src/api/chatApi';

/* ── DESIGN TOKENS ─────────────────────────────────────────────────── */
const T = {
  bg:          '#080C14',
  bgCard:      '#0D1320',
  bgGlass:     'rgba(13,19,32,0.85)',
  border:      'rgba(99,179,237,0.10)',
  borderHi:    'rgba(99,179,237,0.25)',
  cyan:        '#63B3ED',
  cyanDim:     'rgba(99,179,237,0.12)',
  amber:       '#F6AD55',
  amberDim:    'rgba(246,173,85,0.12)',
  emerald:     '#68D391',
  emeraldDim:  'rgba(104,211,145,0.12)',
  violet:      '#B794F4',
  violetDim:   'rgba(183,148,244,0.12)',
  red:    '#FC8181',  // same as rose
redDim: 'rgba(252,129,129,0.10)',
  text:        '#E2E8F0',
  textMuted:   '#4A5568',
  textDim:     '#718096',
};
/* ── SHARED COMPONENTS ─────────────────────────────────────────────── */
const Glass = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: T.bgGlass, border: `1px solid ${T.border}`, borderRadius: 14, backdropFilter: 'blur(16px)', ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ icon: Icon, label, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
    <Icon size={12} color={color} />
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>{label}</span>
  </div>
);

const ActionBtn = ({ onClick, disabled, loading, icon: Icon, label, color = T.cyan, dimColor }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', padding: '11px 16px', borderRadius: 10,
      background: disabled ? 'transparent' : (dimColor || T.cyanDim),
      border: `1px solid ${disabled ? T.border : color + '40'}`,
      color: disabled ? T.textMuted : color,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s', opacity: disabled ? 0.4 : 1,
    }}
  >
    {loading
      ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
      : <Icon size={13} />
    }
    {label}
  </button>
);

const ThinkingBanner = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12, background: T.cyanDim, border: `1px solid ${T.borderHi}`, marginBottom: 16 }}>
    <Cpu size={14} color={T.cyan} style={{ animation: 'spin 2s linear infinite', flexShrink: 0 }} />
    <span style={{ fontSize: 11, color: T.cyan, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
  </div>
);

const ErrorBanner = ({ message }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: T.roseDim, border: `1px solid ${T.rose}30`, marginBottom: 16 }}>
    <AlertCircle size={14} color={T.rose} style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 12, color: T.rose }}>{message}</span>
  </div>
);

/* ── STEP INDICATOR ────────────────────────────────────────────────── */
const STEPS = ['Draft', 'A/B Test', 'Metrics', 'Winner', 'Final Send', 'Optimize'];
const STAGE_MAP = {
  preview:              0,
  ab_sent:              1,
  metrics_collected:    2,
  winner_confirmation:  3,
  winner_sent:          4,
  analysis:             5,
  relaunched:           5,
};

const StepIndicator = ({ currentStage }) => {
  const activeIdx = STAGE_MAP[currentStage] ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 20, flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 6,
            color:      i <= activeIdx ? T.cyan : T.textMuted,
            background: i <= activeIdx ? T.cyanDim : 'transparent',
            border:     `1px solid ${i <= activeIdx ? T.borderHi : 'transparent'}`,
            transition: 'all 0.3s',
          }}>{s}</div>
          {i < STEPS.length - 1 && (
            <ChevronRight size={10} color={i < activeIdx ? T.cyan : T.textMuted} style={{ opacity: 0.5 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ── VARIANT CARD ──────────────────────────────────────────────────── */
const VariantCard = ({ variant, label, color, metrics, isWinner }) => (
  <Glass style={{
    overflow: 'hidden',
    border: `1px solid ${isWinner ? color + '50' : T.border}`,
    boxShadow: isWinner ? `0 0 20px ${color}15` : 'none',
    transition: 'all 0.3s',
  }}>
    {/* Header */}
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: isWinner ? `${color}10` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color }}>{label}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textDim }}>Variant {label}</span>
      </div>
      {isWinner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, background: `${color}20`, border: `1px solid ${color}40` }}>
          <Trophy size={9} color={color} />
          <span style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Winner</span>
        </div>
      )}
    </div>

    {/* Subject */}
    <div style={{ padding: '12px 14px', borderBottom: metrics ? `1px solid ${T.border}` : 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Subject</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.5 }}>{variant?.subject}</div>
    </div>
     <div style={{ padding: '12px 14px', borderBottom: metrics ? `1px solid ${T.border}` : 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Body</div>
      <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.8, fontStyle: 'italic', borderLeft: `2px solid ${color}30`, paddingLeft: 12, whiteSpace: 'pre-line' }}>
        {variant?.body ?? '—'}
      </div>
    </div>

    {/* Metrics if available */}
    {metrics && (
      <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Open Rate</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.emerald }}>{metrics.open_rate != null ? `${(metrics.open_rate * 100).toFixed(1)}%` : '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Click Rate</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.cyan }}>{metrics.click_rate != null ? `${(metrics.click_rate * 100).toFixed(1)}%` : '—'}</div>
        </div>
      </div>
    )}
  </Glass>
);

/* ── CAMPAIGN FLOW MESSAGE ─────────────────────────────────────────── */
const VARIANT_COLORS = [T.amber, T.cyan, T.violet];
const VARIANT_LABELS = ['A', 'B', 'C'];

const CampaignFlowMessage = ({ initialData, chatId, onChatIdUpdate }) => {
  const [stage, setStage]               = useState('preview');
  const [abData, setAbData]             = useState(null);
  const [metricsData, setMetricsData]   = useState(null);
  const [winnerSentData, setWinnerSentData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [relaunchData, setRelaunchData] = useState(null);
  const [busy, setBusy]                 = useState(false);
  const [thinking, setThinking]         = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const createId      = initialData?.campaign_id;
  const winnerCampaignIdRef = useRef(null);

  const attemptsRemaining = analysisData?.attempts_remaining ?? relaunchData?.attempts_remaining;
  const optimizedCampaign = analysisData?.improvedCampaign;

  const go = async (label, fn) => {
    setBusy(true); setThinking(true); setErrorMessage(null); setThinkingLabel(label);
    try { return await fn(); }
    catch (e) { setErrorMessage(e.message); return null; }
    finally { setBusy(false); setThinking(false); }
  };

  // STEP 5: Approve → send A/B/C to 20%
  const handleApprove = async () => {
    const res = await go('Sending A/B/C variants to test group (20%)...', () => approveCampaign(createId));
    if (!res) return;
    await saveChat({ role: 'agent', type: 'text', text: `A/B/C test sent. Campaign: ${createId}` }, chatId).then(s => onChatIdUpdate(s.chat_id));
    setTimeout(() => { setAbData(res); setStage('ab_sent'); }, 800);
  };

  // STEP 7-9: Collect metrics → AI picks winner
  const handleCollectMetrics = async () => {
    const res = await go('Collecting metrics and running AI analysis...', () => collectAbTestMetrics(createId));
    if (!res) return;
    await saveChat({ role: 'agent', type: 'text', text: `Winner: Variant ${res.winner?.id}` }, chatId).then(s => onChatIdUpdate(s.chat_id));
    setTimeout(() => { setMetricsData(res); setStage('winner_confirmation'); }, 800);
  };

  // STEP 10-11: Confirm winner → send to full 80%
  const handleConfirmWinner = async () => {
    const res = await go(`Sending Variant ${metricsData?.winner?.id} to full audience (80%)...`, () => confirmWinner(createId));
    if (!res) return;
    winnerCampaignIdRef.current = res.campaign_id;
    await saveChat({ role: 'agent', type: 'text', text: `Winner sent to full audience. New ID: ${res.campaign_id}`, campaign_id: res.campaign_id }, chatId).then(s => onChatIdUpdate(s.chat_id));
    setTimeout(() => { setWinnerSentData(res); setStage('winner_sent'); }, 800);
  };

  // STEP 12-14: Analyze final metrics
  const handleAnalyze = async () => {
    const campaignId = winnerCampaignIdRef.current;
    if (!campaignId) { setErrorMessage("No campaign ID found — confirm winner first"); return; }
    const res = await go('Analyzing final campaign performance...', () => analyzeCampaign(campaignId));
    if (!res) return;
    setTimeout(() => { setAnalysisData(res); setStage('analysis'); }, 800);
  };

  // STEP 15-16: Relaunch optimized
  const handleRelaunch = async () => {
    const campaignId = winnerCampaignIdRef.current;
    if (!campaignId) { setErrorMessage("No campaign ID found"); return; }
    const res = await go('Relaunching optimized campaign...', () => relaunchCampaign(campaignId));
    if (!res) return;
    await saveChat({ role: 'agent', type: 'text', text: `Relaunched. ID: ${res.campaign_id}. ${res.attempts_remaining} attempts left.`, campaign_id: res.campaign_id }, chatId).then(s => onChatIdUpdate(s.chat_id));
    setTimeout(() => { setRelaunchData(res); setStage('relaunched'); }, 800);
  };

  return (
    <div style={{ width: '100%' }}>
      <StepIndicator currentStage={stage} />

      {errorMessage && <ErrorBanner message={errorMessage} />}
      {thinking     && <ThinkingBanner label={thinkingLabel} />}

      {!thinking && (
        <>

          {/* ── STAGE: PREVIEW (show 3 variants) ───────────────────── */}
          {stage === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={Terminal} label="3 Campaign Variants Generated" color={T.amber} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {initialData?.variants?.map((v, i) => (
                  <VariantCard key={v.id} variant={v.campaign} label={VARIANT_LABELS[i]} color={VARIANT_COLORS[i]} />
                ))}
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: T.cyanDim, border: `1px solid ${T.borderHi}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <FlaskConical size={13} color={T.cyan} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, marginBottom: 3 }}>A/B/C Test Plan</div>
                  <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6 }}>
                    Each variant will be sent to ~{Math.round((initialData?.test_group_size / initialData?.segment_size) * 100) || 20}% of your {initialData?.segment_size} recipients ({initialData?.test_group_size} contacts). The remaining {initialData?.full_group_size} will receive the winning variant.
                  </div>
                </div>
              </div>
              <ActionBtn onClick={handleApprove} disabled={busy} loading={busy} icon={Send} label="Approve & Launch A/B/C Test" color={T.cyan} dimColor={T.cyanDim} />
            </div>
          )}

          {/* ── STAGE: AB SENT ─────────────────────────────────────── */}
          {stage === 'ab_sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={FlaskConical} label="A/B/C Test Running" color={T.emerald} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {abData?.ab_test_results?.map((v, i) => (
                  <Glass key={v.id} style={{ padding: '12px 14px', border: `1px solid ${VARIANT_COLORS[i]}25` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: VARIANT_COLORS[i], letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Variant {v.id}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{v.recipient_count}</div>
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>recipients</div>
                  </Glass>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: T.emeraldDim, border: `1px solid ${T.emerald}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={14} color={T.emerald} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.emerald, fontWeight: 600 }}>All variants sent. Collect metrics when ready.</span>
              </div>
              <ActionBtn onClick={handleCollectMetrics} disabled={busy} loading={busy} icon={BarChart2} label="Collect Metrics & Identify Winner" color={T.emerald} dimColor={T.emeraldDim} />
            </div>
          )}

          {/* ── STAGE: WINNER CONFIRMATION ─────────────────────────── */}
          {stage === 'winner_confirmation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={BarChart2} label="A/B/C Test Results" color={T.violet} />

              {/* All variant results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

              {/* AI recommendation */}
              <Glass style={{ padding: '14px 18px', border: `1px solid ${T.violet}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles size={12} color={T.violet} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.violet }}>AI Recommendation</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  Variant {metricsData?.winner?.id} selected as winner
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 14, lineHeight: 1.6 }}>
                  Based on composite score (open rate × 0.4 + click rate × 0.6). Ready to send to remaining {initialData?.full_group_size} recipients.
                </div>
                <ActionBtn onClick={handleConfirmWinner} disabled={busy} loading={busy} icon={Trophy} label={`Confirm & Send Variant ${metricsData?.winner?.id} to Full Audience`} color={T.violet} dimColor={T.violetDim} />
              </Glass>
            </div>
          )}

          {/* ── STAGE: WINNER SENT ─────────────────────────────────── */}
          {stage === 'winner_sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={Users} label="Winner Sent to Full Audience" color={T.emerald} />
              <div style={{ padding: '14px 18px', borderRadius: 12, background: T.emeraldDim, border: `1px solid ${T.emerald}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={18} color={T.emerald} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.emerald }}>Variant {winnerSentData?.winner_variant} is live</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontFamily: 'monospace' }}>ID: {winnerSentData?.campaign_id}</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{winnerSentData?.full_audience_size} recipients</div>
                </div>
              </div>
              <ActionBtn onClick={handleAnalyze} disabled={busy} loading={busy} icon={BarChart2} label="Analyze Final Performance" color={T.cyan} dimColor={T.cyanDim} />
            </div>
          )}

          {/* ── STAGE: ANALYSIS ────────────────────────────────────── */}
          {stage === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={BarChart2} label="Final Campaign Analysis" color={T.emerald} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Open Rate',  val: analysisData?.metrics?.open_rate  != null ? `${(analysisData.metrics.open_rate  * 100).toFixed(1)}%` : '—' },
                  { label: 'Click Rate', val: analysisData?.metrics?.click_rate != null ? `${(analysisData.metrics.click_rate * 100).toFixed(1)}%` : '—' },
                ].map(m => (
                  <Glass key={m.label} style={{ padding: '14px 18px', border: `1px solid ${T.emerald}20` }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: T.emerald }}>{m.val}</div>
                  </Glass>
                ))}
              </div>

              {attemptsRemaining != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: T.cyanDim, border: `1px solid ${T.borderHi}` }}>
                  <RefreshCw size={10} color={T.cyan} />
                  <span style={{ fontSize: 10, color: T.cyan, fontWeight: 700 }}>
                    {attemptsRemaining} optimization {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                  </span>
                </div>
              )}

              {analysisData?.approval_required && (
                <Glass style={{ padding: '16px 18px', border: `1px solid ${T.violet}25` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <Sparkles size={11} color={T.violet} />
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.violet }}>Optimized Variant Ready</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>{optimizedCampaign?.subject ?? '—'}</div>
                  <ActionBtn
                    onClick={handleRelaunch}
                    disabled={busy || attemptsRemaining === 0}
                    loading={busy}
                    icon={RefreshCw}
                    label={attemptsRemaining === 0 ? 'Max Attempts Reached' : 'Approve & Relaunch Optimized Campaign'}
                    color={T.emerald}
                    dimColor={T.emeraldDim}
                  />
                </Glass>
              )}

              {analysisData?.max_reached && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: T.roseDim, border: `1px solid ${T.rose}30`, fontSize: 12, color: T.rose, fontWeight: 600 }}>
                  Max optimization attempts reached. Campaign closed.
                </div>
              )}
            </div>
          )}

          {/* ── STAGE: RELAUNCHED ──────────────────────────────────── */}
          {stage === 'relaunched' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel icon={CheckCircle} label="Campaign Relaunched" color={T.violet} />
              <div style={{ padding: '14px 18px', borderRadius: 12, background: T.emeraldDim, border: `1px solid ${T.emerald}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={16} color={T.emerald} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.emerald }}>Optimized campaign is live</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontFamily: 'monospace' }}>ID: {relaunchData?.campaign_id}</div>
                  {attemptsRemaining != null && (
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{attemptsRemaining} optimization {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining</div>
                  )}
                </div>
              </div>
              <Glass style={{ overflow: 'hidden', border: `1px solid ${T.violet}25` }}>
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, background: T.violetDim }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.violet, marginBottom: 4 }}>Optimized Subject</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{optimizedCampaign?.subject ?? '—'}</div>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.8, fontStyle: 'italic', borderLeft: `2px solid ${T.violet}40`, paddingLeft: 14 }}>
                    {optimizedCampaign?.body ?? '—'}
                  </div>
                </div>
              </Glass>
            </div>
          )}

        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};



/* ── MAIN UI ───────────────────────────────────────────────────────── */
export default function AegisAgentUI({ user, onLogout }) {
  const [input, setInput]             = useState('');
  const [messages, setMessages]       = useState([]);
  const [isTyping, setIsTyping]       = useState(false);
  const [history, setHistory]         = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatId, setChatId]           = useState(() => localStorage.getItem('activeChatId') || null);
  const messagesEndRef                = useRef(null);

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

  const suggestions = ['Re-engage churned users', 'Promote Term Deposit product', 'Holiday flash sale', 'KYC compliance nudge'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, color: T.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: 'relative' }}>

      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,179,237,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(183,148,244,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '40%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(104,211,145,0.04) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: 260,
        background: 'rgba(8,12,20,0.97)', borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', zIndex: 40,
        transform: showHistory ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim }}>History</span>
          <button onClick={handleNewChat} style={{ fontSize: 10, fontWeight: 800, color: T.cyan, background: T.cyanDim, border: `1px solid ${T.borderHi}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            + New
          </button>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.textMuted, fontSize: 11, marginTop: 40 }}>No chats yet</div>
          ) : history.map(chat => (
            <div
              key={chat._id}
              onClick={() => loadChat(chat._id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                background: chatId === chat._id ? T.cyanDim : 'transparent',
                border: `1px solid ${chatId === chat._id ? T.borderHi : 'transparent'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (chatId !== chat._id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (chatId !== chat._id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{new Date(chat.updatedAt).toLocaleDateString()}</div>
              </div>
              <button
                onClick={e => handleDeleteChat(chat._id, e)}
                style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, borderRadius: 4, marginLeft: 6, flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = T.red}
                onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* User info + logout */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.cyanDim, border: `1px solid ${T.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={14} color={T.cyan} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar overlay */}
      {showHistory && (
        <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)' }} />
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* Header — z-index 100 ensures logout is always clickable */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: 'blur(20px)',
          background: 'rgba(8,12,20,0.90)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{ padding: 8, background: showHistory ? T.cyanDim : 'transparent', border: `1px solid ${showHistory ? T.borderHi : 'transparent'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            >
              <MessageSquare size={16} color={showHistory ? T.cyan : T.textDim} />
            </button>
            <button
              onClick={handleNewChat}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.textDim, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.cyanDim; e.currentTarget.style.color = T.cyan; e.currentTarget.style.borderColor = T.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border; }}
            >
              <Plus size={12} /> New
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #3B82F6, #63B3ED)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,179,237,0.3)' }}>
                <Zap size={15} color="white" fill="white" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', color: T.text }}>
                AEGIS<span style={{ color: T.cyan }}>.AI</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: T.emeraldDim, border: `1px solid ${T.emerald}30` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.emerald, boxShadow: `0 0 6px ${T.emerald}` }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.emerald }}>Online</span>
            </div>

            {/* LOGOUT BUTTON — always visible, high z-index */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.textDim, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative', zIndex: 100,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.redDim; e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red + '40'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border; }}
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </header>

        {/* Chat area */}
        <main style={{ flex: 1, maxWidth: 780, width: '100%', margin: '0 auto', padding: '24px 24px 140px', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 32 }}>
              <div>
                <div style={{ fontSize: 13, color: T.textDim, marginBottom: 10 }}>
                  Welcome back, <span style={{ color: T.text, fontWeight: 700 }}>{user?.name}</span>
                </div>
                <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0 }}>
                  What are we<br /><span style={{ color: T.cyan }}>launching today?</span>
                </h1>
                <p style={{ color: T.textMuted, fontSize: 13, marginTop: 12, maxWidth: 360, margin: '12px auto 0' }}>
                  Deploy AI-driven marketing campaigns with autonomous optimization.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 480 }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{
                    padding: '14px 16px', borderRadius: 12, border: `1px solid ${T.border}`,
                    background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left',
                    color: T.textDim, fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.cyanDim; e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
                  >
                    <Sparkles size={11} color={T.cyan} style={{ marginBottom: 8, display: 'block' }} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'agent' && (
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #63B3ED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(99,179,237,0.25)' }}>
                      <Bot size={17} color="white" />
                    </div>
                  )}
                  <div style={{ maxWidth: '85%', width: m.type === 'flow' ? '100%' : 'auto' }}>
                    {m.type === 'flow' ? (
                      <CampaignFlowMessage initialData={m.data} chatId={chatId} onChatIdUpdate={setChatId} />
                    ) : (
                      <div style={{
                        padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: m.role === 'user' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : T.bgCard,
                        border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                        fontSize: 13, lineHeight: 1.7, color: T.text,
                        boxShadow: m.role === 'user' ? '0 4px 20px rgba(59,130,246,0.3)' : 'none',
                      }}>
                        {m.text}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={15} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 5, padding: '14px 18px', borderRadius: '4px 16px 16px 16px', background: T.bgCard, border: `1px solid ${T.border}` }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted, animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input dock — z-index 50, below header */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: '16px 24px 24px',
          background: 'linear-gradient(to top, rgba(8,12,20,1) 60%, transparent)',
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.bgCard, border: `1px solid ${T.borderHi}`,
              borderRadius: 16, padding: '8px 8px 8px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <Paperclip size={16} color={T.textMuted} style={{ flexShrink: 0 }} />
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Describe campaign objectives, target segment, or tone..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: T.text, fontSize: 13, padding: '6px 4px', fontFamily: 'inherit' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: input.trim() ? 'linear-gradient(135deg, #3B82F6, #63B3ED)' : T.bgGlass,
                  border: `1px solid ${input.trim() ? 'transparent' : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: input.trim() ? '0 4px 16px rgba(99,179,237,0.3)' : 'none',
                }}
              >
                <ArrowUp size={17} color={input.trim() ? 'white' : T.textMuted} />
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 9, color: T.textMuted, marginTop: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Aegis Agent v3.4 · Enterprise
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        input::placeholder { color: ${T.textMuted}; }
      `}</style>
    </div>
  );
}