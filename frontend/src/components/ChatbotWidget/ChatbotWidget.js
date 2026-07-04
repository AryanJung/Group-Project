import React, { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../../services/api';
import './ChatbotWidget.css';

const WELCOME = {
  id: 0,
  role: 'bot',
  text: "Hi! I'm your AI rental assistant 🏠\nAsk me anything about renting rooms, deposits, leases, or this platform.",
  ts: new Date(),
};

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text, ts: new Date() },
    ]);
    setLoading(true);

    const snapshot = [...historyRef.current];

    try {
      const reply = await chatbotAPI.sendMessage(text, snapshot);
      historyRef.current = [
        ...snapshot,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ];
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: reply, ts: new Date() },
      ]);
    } catch (err) {
      const errText =
        err.response?.data?.message ||
        'AI assistant is unavailable. Make sure the backend and Ollama are running.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: errText, ts: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (ts) =>
    ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="cw-root">
      {/* Chat panel */}
      {open && (
        <div className="cw-panel">
          <div className="cw-header">
            <div className="cw-header-left">
              <span className="cw-avatar">🏠</span>
              <div>
                <p className="cw-title">AI Rental Assistant</p>
                <p className="cw-subtitle">Powered by local AI</p>
              </div>
            </div>
            <button
              className="cw-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="cw-messages">
            {messages.map((m) => (
              <div key={m.id} className={`cw-msg cw-msg--${m.role}`}>
                <div className="cw-bubble">
                  {m.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < m.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <span className="cw-time">{fmt(m.ts)}</span>
              </div>
            ))}

            {loading && (
              <div className="cw-msg cw-msg--bot">
                <div className="cw-bubble cw-bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="cw-form" onSubmit={send}>
            <input
              ref={inputRef}
              className="cw-input"
              type="text"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="cw-send"
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble */}
      <button
        className={`cw-bubble-btn ${open ? 'cw-bubble-btn--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI chat assistant"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default ChatbotWidget;
