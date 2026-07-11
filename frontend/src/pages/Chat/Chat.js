import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, groupChatAPI, userAPI } from '../../services/api';
import './Chat.css';

const POLL_INTERVAL_MS = 3000;

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

const getDateCategory = (value) => {
  if (!value) return 'Older';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Older';
};

const initialsFor = (name = 'User') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

const EmptyConversationIcon = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
    <rect x="12" y="14" width="48" height="34" rx="10" fill="#eef2ff" />
    <path d="M22 28h28M22 38h18" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
    <path d="M28 48l-8 9v-11" fill="#eef2ff" />
    <circle cx="56" cy="18" r="7" fill="#14b8a6" stroke="#fff" strokeWidth="3" />
  </svg>
);

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Boolean, not the token string: AuthContext refreshes the session every 10s
  // and the backend re-signs a new JWT (fresh `iat`) each time, so `user.token`
  // changes on every refresh. Keying `refreshChat` on that value would re-run
  // the full connect sequence and flash the skeletons. A boolean stays stable.
  const isAuthenticated = Boolean(user?.token);

  const [property, setProperty] = useState(null);
  const [chat, setChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [sendError, setSendError] = useState('');
  const [memberActionLoading, setMemberActionLoading] = useState('');

  const canManageMembers = Boolean(user?.token) && (user?.role === 'owner' || user?.role === 'superadmin' || user?.role === 'admin');

  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const pollTimerRef = useRef(null);
  const chatIdRef = useRef(null);
  const inputRef = useRef(null);
  const isOwner = chat?.owner?._id === user?._id || chat?.owner === user?._id;
  const myRole = isOwner ? 'Owner' : 'Renter';
  const memberCount = chat?.members?.length || 0;
  const memberIds = useMemo(
    () => new Set((chat?.members || []).map((member) => String(member._id || member))),
    [chat]
  );
  const availableUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return allUsers
      .filter((candidate) => {
        const candidateId = String(candidate._id || candidate.id);
        if (!candidateId || candidateId === String(user?._id) || memberIds.has(candidateId)) {
          return false;
        }

        if (!search) return true;
        return [candidate.username, candidate.name, candidate.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search));
      })
      .slice(0, 50);
  }, [allUsers, memberIds, user, userSearch]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (status === true) {
      shouldAutoScrollRef.current = true;
      scrollToBottom('auto');
    }
  }, [status, chat?._id, scrollToBottom]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    inputRef.current?.style.setProperty('height', 'auto');
    inputRef.current?.style.setProperty('height', `${Math.min(inputRef.current.scrollHeight, 112)}px`);
  }, [newMessage]);

  const fetchMessages = useCallback(async (showLoader = false) => {
    const chatId = chatIdRef.current;
    if (!chatId) return;

    if (showLoader) setIsFetching(true);
    try {
      const data = await groupChatAPI.getMessages(chatId);
      setMessages(data);
      setStatusError('');
    } catch (err) {
      if (err.response?.status === 403) {
        clearInterval(pollTimerRef.current);
        setStatus(false);
        setStatusError('Access revoked. You no longer have access to this chat.');
      } else {
        setStatusError('Connection interrupted. Messages may be out of date.');
      }
    } finally {
      if (showLoader) setIsFetching(false);
    }
  }, []);

  const refreshChat = useCallback(async () => {
    if (!isAuthenticated) {
      navigate(`/property/${id}`, { replace: true });
      return;
    }

    clearInterval(pollTimerRef.current);
    setIsConnecting(true);
    setStatus(null);
    setStatusError('');

    try {
      const [mine, chatDoc] = await Promise.all([
        groupChatAPI.getMine().catch(() => []),
        groupChatAPI.getByRoom(id),
      ]);
      setChats(mine);
      setChat(chatDoc);
      chatIdRef.current = chatDoc._id;
      setStatus(true);
      await fetchMessages(true);
      pollTimerRef.current = setInterval(() => fetchMessages(false), POLL_INTERVAL_MS);
    } catch (err) {
      setStatus(false);
      setStatusError(err.response?.data?.message || 'Could not access group chat.');
    }

    try {
      const prop = await adminAPI.getPropertyById(id);
      setProperty(prop);
    } catch {
      setProperty(null);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchMessages, id, navigate, isAuthenticated]);

  useEffect(() => {
    refreshChat();
    return () => clearInterval(pollTimerRef.current);
  }, [refreshChat]);

  useEffect(() => {
    if (!groupPanelOpen || !canManageMembers || !isOwner) return;

    setUsersLoading(true);
    userAPI
      .getAllUsers()
      .then((users) => setAllUsers(users))
      .catch(() => setToast('Unable to load users right now.'))
      .finally(() => setUsersLoading(false));
  }, [groupPanelOpen, canManageMembers, isOwner]);

  const groupedChats = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Older: [] };
    chats.forEach((item) => {
      const lastActivity = item.updatedAt || item.createdAt;
      groups[getDateCategory(lastActivity)].push(item);
    });
    return groups;
  }, [chats]);

  const messageRows = useMemo(() => {
    const rows = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const dateLabel = new Date(msg.createdAt).toLocaleDateString();
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        rows.push({ type: 'date', key: dateLabel, label: getDateCategory(msg.createdAt) === 'Older' ? dateLabel : getDateCategory(msg.createdAt) });
      }
      rows.push({ type: 'message', key: msg._id, data: msg });
    });

    return rows;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || isSending || !chatIdRef.current) return;

    setNewMessage('');
    setSendError('');
    setIsSending(true);
    shouldAutoScrollRef.current = true;

    try {
      const saved = await groupChatAPI.sendMessage(chatIdRef.current, text);
      setMessages((prev) => [...prev, saved]);
      scrollToBottom('smooth');
    } catch (err) {
      setSendError(err.response?.data?.message || 'Failed to send message. Please try again.');
      setNewMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const syncChat = (nextChat) => {
    setChat(nextChat);
    setChats((prev) => prev.map((item) => (item._id === nextChat._id ? nextChat : item)));
    setSelectedUserIds([]);
  };

  const handleAddAllMembers = async () => {
    if (!chat?._id) return;
    setMemberActionLoading('add');
    setToast('');
    try {
      const updated = await groupChatAPI.addMembers(chat._id, { addAll: true });
      syncChat(updated);
      setToast('Members updated.');
    } catch (err) {
      setToast(err.response?.data?.message || 'Unable to add members right now.');
    } finally {
      setMemberActionLoading('');
    }
  };

  const handleAddSelectedMembers = async () => {
    if (!chat?._id || selectedUserIds.length === 0) return;
    setMemberActionLoading('selected');
    setToast('');
    try {
      const updated = await groupChatAPI.addMembers(chat._id, { memberIds: selectedUserIds });
      syncChat(updated);
      setToast('Selected users added.');
    } catch (err) {
      setToast(err.response?.data?.message || 'Unable to add selected users right now.');
    } finally {
      setMemberActionLoading('');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!chat?._id || !memberId) return;
    setMemberActionLoading(memberId);
    setToast('');
    try {
      const updated = await groupChatAPI.removeMember(chat._id, memberId);
      syncChat(updated);
      setToast('Member removed.');
    } catch (err) {
      setToast(err.response?.data?.message || 'Unable to remove this member.');
    } finally {
      setMemberActionLoading('');
    }
  };

  return (
    <div className="chat-page">
      <div className={`chat-shell ${sidebarOpen ? 'chat-shell--sidebar-open' : ''}`}>
        <aside className="chat-sidebar" aria-label="Conversations">
          <div className="chat-sidebar-header">
            <div>
              <p className="chat-eyebrow">Messages</p>
              <h1>Group Chats</h1>
            </div>
            <button type="button" className="chat-icon-btn chat-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close conversations">
              <span aria-hidden="true">x</span>
            </button>
          </div>

          {isConnecting ? (
            <div className="chat-sidebar-skeleton">
              {[1, 2, 3].map((item) => (
                <div className="chat-list-skeleton" key={item}>
                  <span />
                  <div><b /><i /></div>
                </div>
              ))}
            </div>
          ) : (
            Object.entries(groupedChats).map(([label, group]) =>
              group.length > 0 ? (
                <section className="chat-list-section" key={label}>
                  <h2>{label}</h2>
                  {group.map((item) => {
                    const roomId = item.room?._id || item.room;
                    const title = item.name || item.room?.title || 'Group Chat';
                    const active = String(roomId) === String(id);
                    const online = (item.members?.length || 0) > 1;

                    return (
                      <button
                        type="button"
                        key={item._id}
                        className={`chat-list-item ${active ? 'chat-list-item--active' : ''}`}
                        onClick={() => {
                          navigate(`/chat/${roomId}`);
                          setSidebarOpen(false);
                        }}
                      >
                        <span className="chat-list-avatar" aria-hidden="true">
                          {initialsFor(title)}
                          <i className={online ? 'is-online' : ''} />
                        </span>
                        <span className="chat-list-copy">
                          <strong>{title}</strong>
                          <small>{item.room?.location || `${item.members?.length || 0} members`}</small>
                        </span>
                        {active && <span className="chat-unread-badge">New</span>}
                      </button>
                    );
                  })}
                </section>
              ) : null
            )
          )}
        </aside>

        <main className="chat-main">
          <header className="chat-header">
            <button type="button" className="chat-icon-btn chat-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" onClick={() => navigate(`/property/${id}`)} className="chat-icon-btn" aria-label="Back to property">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="chat-header-info">
              <h2>{chat?.name || 'Group Chat'}</h2>
              <p>{property ? `${property.title} | ${property.location}` : `${memberCount} members`}</p>
            </div>

            {status === true && (
              <div className="chat-header-actions">
                <span className={`chat-role-pill chat-role-pill--${myRole.toLowerCase()}`}>{myRole}</span>
                <button type="button" className="chat-info-btn" onClick={() => setGroupPanelOpen(true)}>
                  Info
                </button>
              </div>
            )}
          </header>

          {statusError && (
            <div className="chat-error-banner" role="alert">
              <span>{statusError}</span>
              <button type="button" onClick={refreshChat}>Retry connection</button>
            </div>
          )}

          {status === null || isFetching ? (
            <div className="chat-message-skeletons" aria-label="Loading messages">
              {[1, 2, 3, 4].map((item) => <span key={item} className={`message-skeleton message-skeleton--${item % 2 ? 'left' : 'right'}`} />)}
            </div>
          ) : status === false ? (
            <div className="chat-empty-state">
              <EmptyConversationIcon />
              <h2>Unable to open chat</h2>
              <p>{statusError || 'Select a conversation to start messaging'}</p>
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <EmptyConversationIcon />
                  <h2>Select a conversation to start messaging</h2>
                  <p>This group is ready. Send the first update when you are ready.</p>
                </div>
              ) : (
                <div
                  className="chat-messages"
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  aria-live="polite"
                >
                  {messageRows.map((item) => {
                    if (item.type === 'date') {
                      return <div key={item.key} className="chat-date-divider"><span>{item.label}</span></div>;
                    }

                    const msg = item.data;
                    const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                    const senderName = msg.sender?.name || 'Unknown';

                    return (
                      <div key={item.key} className={`message-row ${isMe ? 'message-row--own' : 'message-row--other'}`}>
                        {!isMe && <div className="message-avatar" aria-hidden="true">{initialsFor(senderName)}</div>}
                        <div className={`message-bubble ${isMe ? 'message-bubble--own' : 'message-bubble--other'}`}>
                          {!isMe && <span className="message-sender-name">{senderName}</span>}
                          <p>{msg.text}</p>
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {sendError && <div className="chat-send-error" role="alert">{sendError}</div>}

          <form className="chat-input-form" onSubmit={handleSend}>
            <button type="button" className="chat-attach-btn" aria-label="Add attachment" onClick={() => setToast('Attachments are coming soon.')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21.4 11.6l-8.8 8.8a6 6 0 01-8.5-8.5l9.2-9.2a4 4 0 015.7 5.7l-9.2 9.2a2 2 0 01-2.8-2.8l8.6-8.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending || status !== true}
              rows="1"
              aria-label="Message text"
            />
            <button type="submit" className="btn-send" disabled={isSending || !newMessage.trim() || status !== true} aria-label="Send message">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </main>

        {groupPanelOpen && (
          <div className="group-panel-backdrop" onClick={() => setGroupPanelOpen(false)}>
            <aside className="group-panel" onClick={(e) => e.stopPropagation()} aria-label="Manage group">
              <div className="group-panel-header">
                <div>
                  <p className="chat-eyebrow">Manage Group</p>
                  <h2>{chat?.name || 'Group Chat'}</h2>
                </div>
                <button type="button" className="chat-icon-btn" onClick={() => setGroupPanelOpen(false)} aria-label="Close group panel">x</button>
              </div>
              <div className="group-panel-body">
                {toast && <p className="group-toast">{toast}</p>}
                {canManageMembers && isOwner && (
                  <section className="group-user-picker" aria-label="Add users to group">
                    <div className="group-user-picker-header">
                      <div>
                        <h3>Add users</h3>
                        <p>{allUsers.length} total users</p>
                      </div>
                      <button
                        type="button"
                        className="group-add-btn"
                        onClick={handleAddSelectedMembers}
                        disabled={memberActionLoading === 'selected' || selectedUserIds.length === 0}
                      >
                        {memberActionLoading === 'selected'
                          ? 'Adding...'
                          : `Add Selected${selectedUserIds.length ? ` (${selectedUserIds.length})` : ''}`}
                      </button>
                    </div>
                    <input
                      className="group-user-search"
                      type="search"
                      placeholder="Search by username"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                    <div className="group-user-list">
                      {usersLoading ? (
                        <p className="group-user-empty">Loading users...</p>
                      ) : availableUsers.length === 0 ? (
                        <p className="group-user-empty">No users available to add.</p>
                      ) : (
                        availableUsers.map((candidate) => {
                          const candidateId = String(candidate._id || candidate.id);
                          const checked = selectedUserIds.includes(candidateId);
                          const username = candidate.username || candidate.name || candidate.email;

                          return (
                            <label className="group-user-option" key={candidateId}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedUserIds((prev) =>
                                    checked
                                      ? prev.filter((item) => item !== candidateId)
                                      : [...prev, candidateId]
                                  )
                                }
                              />
                              <span className="group-member-avatar">{initialsFor(candidate.name || username)}</span>
                              <span>
                                <strong>@{username}</strong>
                                <small>{candidate.name || candidate.email || 'User'}</small>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <button
                      type="button"
                      className="group-add-secondary"
                      onClick={handleAddAllMembers}
                      disabled={memberActionLoading === 'add'}
                    >
                      {memberActionLoading === 'add' ? 'Adding...' : 'Add approved renters'}
                    </button>
                  </section>
                )}
                <ul className="group-member-list">
                  {(chat?.members || []).map((member) => {
                    const memberId = member._id || member;
                    const isCurrentUser = memberId === user?._id;
                    const memberName = member.name || member.username || 'Group member';
                    return (
                      <li key={memberId}>
                        <span className="group-member-avatar">{initialsFor(memberName)}</span>
                        <span>
                          <strong>{memberName}</strong>
                          <small>{member.username ? `@${member.username}` : member.email || (isCurrentUser ? 'You' : 'Member')}</small>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(memberId)}
                          disabled={!isOwner || isCurrentUser || memberActionLoading === memberId}
                        >
                          {memberActionLoading === memberId ? 'Removing...' : 'Remove'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
