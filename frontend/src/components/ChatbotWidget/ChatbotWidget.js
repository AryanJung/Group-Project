import React, { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../../services/api';
import './ChatbotWidget.css';

const WELCOME = {
  id: 0,
  role: 'bot',
  text: "Hi! I'm your AI rental assistant.\nAsk me anything about renting rooms, deposits, leases, or this platform.",
  ts: new Date(),
};

const MOCK_RECOMMENDATIONS = [
  { id: 1, title: 'Sunny 2BHK near Ring Road', price: 'Rs 28,000/mo', image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=500&q=80' },
  { id: 2, title: 'Compact Studio in Lalitpur', price: 'Rs 16,500/mo', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80' },
  { id: 3, title: 'Family Flat with Parking', price: 'Rs 35,000/mo', image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=500&q=80' },
  { id: 4, title: 'Quiet Room near Campus', price: 'Rs 11,000/mo', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=500&q=80' },
];

const getShuffledRecommendations = () =>
  [...MOCK_RECOMMENDATIONS].sort(() => Math.random() - 0.5).slice(0, 3);

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(() => getShuffledRecommendations());
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
              <span className="cw-avatar" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
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
              x
            </button>
          </div>

          <section className="cw-recommendations" aria-label="Recommended properties">
            <div className="cw-rec-header">
              <p>Recommended Properties</p>
              <button type="button" onClick={() => setRecommendations(getShuffledRecommendations())}>
                Refresh Suggestions
              </button>
            </div>
            <div className="cw-rec-grid">
              {recommendations.map((property) => (
                <article className="cw-rec-card" key={property.id}>
                  <img src={property.image} alt="" />
                  <div>
                    <span>AI Match</span>
                    <h3>{property.title}</h3>
                    <p>{property.price}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
        {open ? 'x' : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 15a3 3 0 01-3 3H8l-5 4V6a3 3 0 013-3h12a3 3 0 013 3v9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatbotWidget;
