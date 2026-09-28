// src/components/ui/FloatingChat.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { pempalApi, chatApi } from '../../services/api';


// ─── Greeting shown before the user types ────────────────────────────────────
const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm your **InsightsIQ Assistant**. I can help you understand your PEMPAL plan data — ask me about entries, GM%, discount depth, channel mix, or anything in your current plan.",
};


// ─── Simple markdown renderer (bold, code, bullet lists) ─────────────────────
function SimpleMarkdown({ text }) {
  const lines = text.split('\n');
  return (
    <span className="leading-relaxed">
      {lines.map((line, li) => {
        // bullet line
        if (/^[-•]\s/.test(line)) {
          return (
            <span key={li} className="flex gap-1.5 mt-0.5">
              <span className="mt-1 w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-60" />
              <span>{renderInline(line.replace(/^[-•]\s/, ''))}</span>
            </span>
          );
        }
        return (
          <span key={li} className="block">
            {renderInline(line)}
          </span>
        );
      })}
    </span>
  );
}

function renderInline(text) {
  // Split on **bold**, `code`, and plain text
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded text-[10px] bg-neutral-100 font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}


// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-soft"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}


// ─── Floating chat widget ─────────────────────────────────────────────────────
export default function FloatingChat() {
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([WELCOME_MESSAGE]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context,   setContext]   = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const hasFetchedCtx  = useRef(false);

  // ── Auto-scroll to bottom ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Focus input when opened ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Fetch plan context on first open ──────────────────────────────
  useEffect(() => {
    if (!isOpen || hasFetchedCtx.current) return;
    hasFetchedCtx.current = true;

    Promise.all([
      pempalApi.getEntries().catch(() => []),
      pempalApi.getProducts().catch(() => []),
      pempalApi.getPeriods().catch(() => []),
    ]).then(([entries, products, periods]) => {
      const channels = [...new Set(entries.map(e => e.channel).filter(Boolean))];
      const typeCounts = entries.reduce((acc, e) => {
        acc[e.entry_type] = (acc[e.entry_type] || 0) + 1;
        return acc;
      }, {});

      setContext({
        brand: 'Athleta',
        total_entries: entries.length,
        total_products: products.length,
        periods: periods.map(p => p.id),
        channels,
        entry_type_breakdown: typeCounts,
      });
    }).catch(() => setContext({}));
  }, [isOpen]);

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsg   = { role: 'user', content: text };
    const nextMsgs  = [...messages, userMsg];
    setMessages(nextMsgs);
    setIsLoading(true);

    try {
      // Send last 10 turns as history (excluding the welcome message)
      const history = nextMsgs.slice(1, -1).slice(-10);
      const result  = await chatApi.send({ message: text, history, context });
      const aiMsg   = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, aiMsg]);
      if (!isOpen) setHasUnread(true);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not reach the server. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, context, isOpen]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="pointer-events-auto w-[380px] flex flex-col rounded-2xl shadow-high border border-neutral-200/80 bg-white overflow-hidden animate-fade-in-up"
          style={{ height: 520 }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #035775 0%, #024A62 60%, #013D52 100%)' }}
          >
            {/* AI avatar */}
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 20c0-4 4-7 9-7s9 3 9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="19" cy="5" r="2" fill="#7EC8A4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">InsightsIQ Assistant</p>
              <p className="text-[10px] text-primary-200 leading-tight">
                {context ? `${context.total_entries ?? 0} entries · ${context.total_products ?? 0} products` : 'Loading context…'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Clear chat */}
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                title="Minimise"
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-primary-600">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl rounded-tl-sm shadow-xs">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (shown only at start) */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What is my average GM%?',
                  'Which channel has the most entries?',
                  'How many products are in the plan?',
                  'What does PCF mean?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="px-3 pb-3 pt-2 border-t border-neutral-100 flex-shrink-0">
            <div className="flex items-end gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 focus-within:border-primary-400 focus-within:bg-white transition-all shadow-xs">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your plan data…"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-[12px] text-neutral-800 placeholder-neutral-400 focus:outline-none leading-relaxed max-h-20 min-h-0 disabled:opacity-50"
                style={{ overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                title="Send (Enter)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-neutral-300 text-center mt-1.5">
              Answers are based on your live PEMPAL plan data
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle button ───────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`pointer-events-auto relative w-13 h-13 rounded-full shadow-high border-2 transition-all duration-200 flex items-center justify-center group ${
          isOpen
            ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-800'
            : 'border-primary-400/60 hover:scale-105'
        }`}
        style={isOpen ? {} : { background: 'linear-gradient(135deg, #035775 0%, #4A9EAE 100%)' }}
        title={isOpen ? 'Close assistant' : 'Open AI Assistant'}
      >
        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-500 border-2 border-white animate-pulse-soft" />
        )}

        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="9" cy="10" r="1" fill="currentColor"/>
            <circle cx="12" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
          </svg>
        )}
      </button>
    </div>
  );
}


// ─── Individual message bubble ────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[12px] text-white leading-relaxed shadow-xs"
          style={{ background: 'linear-gradient(135deg, #035775 0%, #3A8AA0 100%)' }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      {/* AI avatar */}
      <div className="w-6 h-6 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-primary-600">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-neutral-50 border border-neutral-200 text-[12px] text-neutral-700 shadow-xs">
        <SimpleMarkdown text={msg.content} />
      </div>
    </div>
  );
}
