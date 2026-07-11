import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { getPropertyImages } from '../../utils/propertyHelpers';
import './ChatbotWidget.css';

const WELCOME = {
  id: 0,
  role: 'bot',
  text: "Hi! I'm your AI rental assistant.\nAsk me anything about renting rooms, deposits, leases, or this platform.",
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
      const { reply, listings } = await chatbotAPI.sendMessage(text, snapshot);
      historyRef.current = [
        ...snapshot,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ];
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: reply, listings, ts: new Date() },
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

  const fmtPrice = (price) =>
    typeof price === 'number' ? `Rs ${price.toLocaleString()}/mo` : price;

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

                {m.listings?.length > 1 && (
                  <div className="cw-compare-wrap">
                    <table className="cw-compare-table">
                      <thead>
                        <tr>
                          <th className="cw-compare-label-col" />
                          {m.listings.map((room) => {
                            const [thumb] = getPropertyImages(room);
                            return (
                              <th key={room._id}>
                                <Link to={`/property/${room._id}`} className="cw-compare-head">
                                  {thumb ? (
                                    <img src={thumb} alt="" />
                                  ) : (
                                    <span className="cw-compare-fallback">
                                      {room.image || '🏠'}
                                    </span>
                                  )}
                                  <span className="cw-compare-title">{room.title}</span>
                                </Link>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="cw-compare-label-col">Price</th>
                          {m.listings.map((room) => (
                            <td key={room._id} className="cw-compare-price">
                              {fmtPrice(room.price)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <th className="cw-compare-label-col">Location</th>
                          {m.listings.map((room) => (
                            <td key={room._id}>{room.location || '—'}</td>
                          ))}
                        </tr>
                        <tr>
                          <th className="cw-compare-label-col">Bedrooms</th>
                          {m.listings.map((room) => (
                            <td key={room._id}>{room.bedrooms ?? '—'}</td>
                          ))}
                        </tr>
                        <tr>
                          <th className="cw-compare-label-col">Bathrooms</th>
                          {m.listings.map((room) => (
                            <td key={room._id}>{room.bathrooms ?? '—'}</td>
                          ))}
                        </tr>
                        <tr>
                          <th className="cw-compare-label-col">Area</th>
                          {m.listings.map((room) => (
                            <td key={room._id}>{room.area && room.area !== 'N/A' ? room.area : '—'}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {m.listings?.length === 1 && (
                  <div className="cw-msg-listings">
                    {m.listings.map((room) => {
                      const [thumb] = getPropertyImages(room);
                      return (
                        <Link
                          to={`/property/${room._id}`}
                          className="cw-msg-listing-card"
                          key={room._id}
                        >
                          {thumb ? (
                            <img src={thumb} alt="" />
                          ) : (
                            <span className="cw-msg-listing-fallback">
                              {room.image || '🏠'}
                            </span>
                          )}
                          <div>
                            <h4>{room.title}</h4>
                            <p className="cw-msg-listing-location">{room.location}</p>
                            <p className="cw-msg-listing-price">{fmtPrice(room.price)}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

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
