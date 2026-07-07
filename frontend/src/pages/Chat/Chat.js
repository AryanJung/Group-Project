import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, groupChatAPI } from '../../services/api';
import './Chat.css';

const POLL_INTERVAL_MS = 3000;

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [sendError, setSendError] = useState('');

  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);
  const chatIdRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = useCallback(async (showLoader = false) => {
    const chatId = chatIdRef.current;
    if (!chatId) return;

    if (showLoader) setIsFetching(true);
    try {
      const data = await groupChatAPI.getMessages(chatId);
      setMessages(data);
    } catch (err) {
      if (err.response?.status === 403) {
        clearInterval(pollTimerRef.current);
        setStatus(false);
        setStatusError('Access revoked. You no longer have access to this chat.');
      }
    } finally {
      if (showLoader) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.token) {
      navigate(`/property/${id}`, { replace: true });
      return;
    }

    const init = async () => {
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

      try {
        const prop = await adminAPI.getPropertyById(id);
        setProperty(prop);
      } catch {
        /* non-fatal */
      }

      await fetchMessages(true);
      pollTimerRef.current = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
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
      setNewMessage(text);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === null) {
    return (
      <div className="chat-page">
        <div className="chat-container chat-container--state">
          <div className="chat-state-card">
            <div className="chat-loading-spinner" aria-hidden="true" />
            <p>Connecting to group chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === false) {
    return (
      <div className="chat-page">
        <div className="chat-container chat-container--state">
          <div className="chat-state-card chat-state-card--error">
            <h2>Unable to open chat</h2>
            <p>{statusError}</p>
            <button type="button" onClick={() => navigate(`/property/${id}`)}>
              Back to Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = chat?.owner?._id === user?._id || chat?.owner === user?._id;
  const myRole = isOwner ? 'Owner' : 'Renter';
  const memberCount = chat?.members?.length || 0;

  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const dateKey = new Date(msg.createdAt).toLocaleDateString();
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ type: 'date', key: dateKey, label: dateKey });
      }
      groups.push({ type: 'message', key: msg._id, data: msg });
    });

    return groups;
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <button
            type="button"
            onClick={() => navigate(`/property/${id}`)}
            className="btn-back-chat"
            aria-label="Back to property"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="chat-header-info">
            <h2>{chat?.name || 'Group Chat'}</h2>
            {property && (
              <p className="chat-property-info">
                {property.title} · {property.location}
              </p>
            )}
            <div className="chat-header-meta">
              <span className={`chat-role-pill chat-role-pill--${myRole.toLowerCase()}`}>
                {myRole}
              </span>
              <span className="chat-member-count">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </header>

        <div className="chat-messages" aria-live="polite">
          {isFetching && messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-loading-spinner chat-loading-spinner--small" />
              <p>Loading messages...</p>
            </div>
          )}

          {!isFetching && messages.length === 0 && (
            <div className="chat-empty">
              <p>No messages yet</p>
              <span>Start the conversation with your group.</span>
            </div>
          )}

          {groupMessagesByDate().map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.key} className="chat-date-divider">
                  <span>{item.label}</span>
                </div>
              );
            }

            const msg = item.data;
            const isMe = msg.sender?._id === user._id || msg.sender === user._id;
            const senderName = msg.sender?.name || 'Unknown';
            const initials = senderName.charAt(0).toUpperCase();

            return (
              <div
                key={item.key}
                className={`message-row ${isMe ? 'message-row--own' : 'message-row--other'}`}
              >
                {!isMe && (
                  <div className="message-avatar" aria-hidden="true">
                    {initials}
                  </div>
                )}
                <div className={`message-bubble ${isMe ? 'message-bubble--own' : 'message-bubble--other'}`}>
                  {!isMe && <span className="message-sender-name">{senderName}</span>}
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

        {sendError && (
          <div className="chat-send-error" role="alert">
            {sendError}
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isLoading}
            aria-label="Message text"
          />
          <button
            type="submit"
            className="btn-send"
            disabled={isLoading || !newMessage.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="chat-send-loading">Sending</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
