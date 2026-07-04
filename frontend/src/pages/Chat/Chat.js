import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, groupChatAPI } from '../../services/api';
import './Chat.css';

const POLL_INTERVAL_MS = 3000;

const Chat = () => {
  const { id } = useParams(); // this is a Room ID
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [chat, setChat] = useState(null);           // resolved GroupChat document
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // null = checking, false = denied, true = ok
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [sendError, setSendError] = useState('');

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);
  const chatIdRef = useRef(null); // stable ref so interval callback doesn't go stale

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages using the resolved GroupChat ID
  const fetchMessages = useCallback(async () => {
    const chatId = chatIdRef.current;
    if (!chatId) return;
    try {
      const data = await groupChatAPI.getMessages(chatId);
      setMessages(data);
    } catch (err) {
      if (err.response?.status === 403) {
        clearInterval(pollTimerRef.current);
        setStatus(false);
        setStatusError('Access revoked. You no longer have access to this chat.');
      }
    }
  }, []);

  // On mount: redirect if not logged in → resolve Room ID to GroupChat → start polling
  useEffect(() => {
    if (!user?.token) {
      navigate(`/property/${id}`, { replace: true });
      return;
    }

    const init = async () => {
      // 1. Resolve Room ID → GroupChat
      try {
        const chatDoc = await groupChatAPI.getByRoom(id);
        setChat(chatDoc);
        chatIdRef.current = chatDoc._id;
        setStatus(true);
      } catch (err) {
        setStatus(false);
        const msg = err.response?.data?.message || 'Could not access group chat.';
        setStatusError(msg);
        return;
      }

      // 2. Load property header info (non-fatal)
      try {
        const prop = await adminAPI.getPropertyById(id);
        setProperty(prop);
      } catch { /* non-fatal */ }

      // 3. Initial message load
      await fetchMessages();

      // 4. Start polling
      pollTimerRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);
    };

    init();
    return () => clearInterval(pollTimerRef.current);
  }, [id, user, navigate, fetchMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || isLoading || !chatIdRef.current) return;

    setNewMessage('');
    setSendError('');
    setIsLoading(true);

    try {
      const saved = await groupChatAPI.sendMessage(chatIdRef.current, text);
      setMessages((prev) => [...prev, saved]);
    } catch (err) {
      setSendError(
        err.response?.data?.message || 'Failed to send message. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (status === null) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-access-denied"><p>Connecting to group chat…</p></div>
        </div>
      </div>
    );
  }

  if (status === false) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-access-denied">
            <p>{statusError}</p>
            <button onClick={() => navigate(`/property/${id}`)}>← Back to Property</button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = chat?.owner?._id === user?._id || chat?.owner === user?._id;
  const myRole = isOwner ? 'Owner' : 'Renter';
  const memberNames = chat?.members?.map((m) => m.name).join(', ') || '';

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <button onClick={() => navigate(`/property/${id}`)} className="btn-back-chat">
            ← Back
          </button>
          <div className="chat-header-info">
            <h2>{chat?.name || 'Group Chat'}</h2>
            {property && (
              <p className="chat-property-info">
                {property.title} · {property.location}
              </p>
            )}
            <p className="chat-role-badge">
              You are: <strong>{myRole}</strong>
              {memberNames && <span style={{ marginLeft: '0.5rem', color: '#9ca3af', fontWeight: 400 }}>· {chat?.members?.length} member{chat?.members?.length !== 1 ? 's' : ''}</span>}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">No messages yet. Start the conversation!</p>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender?._id === user._id || msg.sender === user._id;
            const senderName = msg.sender?.name || 'Unknown';

            return (
              <div
                key={msg._id}
                className={`message ${isMe ? 'message-user' : 'message-broker'}`}
              >
                <div className="message-content">
                  {!isMe && (
                    <span className="message-sender-name">{senderName}</span>
                  )}
                  <p>{msg.text}</p>
                  <span className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {sendError && <p className="chat-send-error">{sendError}</p>}

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn-send" disabled={isLoading || !newMessage.trim()}>
            {isLoading ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
