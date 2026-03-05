import React, { useState, useRef, useEffect } from 'react';
import { Bot, Megaphone, BarChart3, Users, Zap, Cpu, ArrowUp, Paperclip, Sparkles } from 'lucide-react';
import   Navbar from './components/navbar';

const CampaignAIHome = () => {
  const [isDark, setIsDark] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const theme = {
    bg: isDark ? '#020617' : '#f8fafc',
    surface: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    surfaceHover: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    text: isDark ? '#e2e8f0' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    glow1: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)',
    glow2: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)',
  };

  const suggestions = [
    'Write a persuasive email for our healthcare reform campaign',
    'Generate outreach for swing-state voters aged 45–60',
    'Create a fundraising email with urgency and social proof',
    'Draft a 3-email re-engagement sequence for lapsed donors',
  ];

  const handleAutoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Simulated agent response
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `Aegis is generating your campaign email based on: "${trimmed}"\n\nThis is where the live response from your AI agent will stream in. Connect your backend to replace this placeholder.`,
        },
      ]);
    }, 1800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div
      className="min-h-screen font-sans selection:bg-blue-500/30 transition-colors duration-300"
      style={{ background: theme.bg, color: theme.text }}
    >
      {/* Decorative Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-500"
          style={{ background: theme.glow1 }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-500"
          style={{ background: theme.glow2 }}
        />
      </div>

      {/* Navbar */}
      <Navbar isDark={isDark} toggleTheme={toggleTheme} />

      {/* Hero */}
      <header className="px-8 pt-28 pb-16 max-w-6xl mx-auto text-center relative">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold mb-8 animate-pulse"
          style={{ borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa', background: 'rgba(59,130,246,0.06)' }}
        >
          <Zap size={13} /> v2.0 AGENT CORE NOW LIVE
        </div>
        <h1
          className="text-6xl md:text-8xl font-extrabold mb-6 tracking-tighter leading-[0.9]"
          style={{ color: isDark ? '#fff' : '#0f172a' }}
        >
          The Intelligence <br />
          <span className="bg-gradient-to-b from-blue-400 to-indigo-600 bg-clip-text text-transparent">
            Behind the Win.
          </span>
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: theme.muted }}>
          Aegis isn't just a bot. It's a sovereign campaign entity that orchestrates high-frequency outreach and
          tactical sentiment shifts in real-time.
        </p>
      </header>

      {/* Bento Grid */}
      <section id="features" className="px-8 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div
            className="md:col-span-8 p-10 rounded-3xl border overflow-hidden relative group transition-colors duration-300"
            style={{ background: `linear-gradient(135deg, ${theme.surface}, transparent)`, borderColor: theme.border }}
          >
            <div className="relative z-10">
              <Cpu className="text-blue-500 mb-4" size={40} />
              <h3 className="text-3xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#0f172a' }}>Neural Narrative Engine</h3>
              <p className="max-w-md text-lg" style={{ color: theme.muted }}>
                Our proprietary LLM architecture adapts your campaign's voice across 15+ languages and 50+ cultural contexts instantly.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] group-hover:bg-blue-600/40 transition-colors" />
          </div>

          <div
            className="md:col-span-4 p-10 rounded-3xl border flex flex-col justify-between transition-all duration-200 hover:border-blue-500/50"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
            <BarChart3 className="text-indigo-400" size={32} />
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>Live Sentiment Data</h3>
              <p className="text-sm" style={{ color: theme.muted }}>Micro-target based on real-time emotional shifts in the voter base.</p>
            </div>
          </div>

          <div
            className="md:col-span-4 p-10 rounded-3xl border flex flex-col justify-between transition-all duration-200 hover:border-blue-500/50"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
            <Megaphone className="text-amber-400" size={32} />
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>Omnichannel Sync</h3>
              <p className="text-sm" style={{ color: theme.muted }}>One command updates SMS, Email, Social, and Ad copy simultaneously.</p>
            </div>
          </div>

          <div
            className="md:col-span-8 p-10 rounded-3xl border transition-colors duration-300"
            style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.08), transparent)`, borderColor: theme.border }}
          >
            <Users className="text-blue-400 mb-4" size={32} />
            <h3 className="text-2xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#0f172a' }}>Autonomous Community Manager</h3>
            <p className="text-lg" style={{ color: theme.muted }}>
              The agent handles thousands of 1-on-1 conversations, moving prospects through the funnel without human intervention.
            </p>
          </div>
        </div>
      </section>

      {/* ── Agent Chat Interface ── */}
      <section id="agent" className="px-8 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-blue-600">
              <Bot className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: isDark ? '#fff' : '#0f172a' }}>
              Talk to Aegis
            </span>
          </div>
          <p className="text-sm" style={{ color: theme.muted }}>
            Describe your campaign goal and Aegis will generate tailored email content instantly.
          </p>
        </div>

        {/* Chat Window */}
        <div
          className="rounded-3xl border overflow-hidden transition-colors duration-300"
          style={{ borderColor: theme.border, background: theme.inputBg }}
        >
          {/* Messages Area */}
          {messages.length > 0 && (
            <div
              className="px-6 py-6 max-h-[380px] overflow-y-auto flex flex-col gap-5 border-b"
              style={{ borderColor: theme.border }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div
                    className="max-w-[80%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line"
                    style={{
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
                          : theme.surface,
                      color: msg.role === 'user' ? '#fff' : theme.text,
                      border: msg.role === 'agent' ? `1px solid ${theme.border}` : 'none',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div
                    className="px-5 py-3.5 rounded-2xl border"
                    style={{ background: theme.surface, borderColor: theme.border }}
                  >
                    <div className="flex gap-1.5 items-center h-5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Suggestion Pills — only when no messages */}
          {messages.length === 0 && (
            <div className="px-6 pt-6 pb-4 flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 hover:border-blue-500/60 hover:scale-[1.02]"
                  style={{
                    background: theme.surface,
                    borderColor: theme.border,
                    color: theme.muted,
                  }}
                >
                  <Sparkles size={11} className="inline mr-1.5 text-blue-400" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="px-4 py-4 flex items-end gap-3">
            <button
              className="p-2.5 rounded-xl flex-shrink-0 transition-colors"
              style={{ color: theme.muted }}
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleAutoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your campaign email goal…"
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-2 placeholder:opacity-40 transition-colors"
              style={{
                color: theme.text,
                maxHeight: '200px',
                fontFamily: 'inherit',
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110"
              style={{
                background: input.trim() ? '#2563eb' : theme.surface,
                color: input.trim() ? '#fff' : theme.muted,
              }}
            >
              <ArrowUp size={18} />
            </button>
          </div>

          <p className="text-center text-xs pb-3" style={{ color: theme.muted, opacity: 0.5 }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="px-8 py-8 text-center border-t" style={{ borderColor: theme.border }}>
        <p className="text-xs" style={{ color: theme.muted }}>
          © 2026 Aegis Intelligence Systems. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default CampaignAIHome;