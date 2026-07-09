import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { groupChatAPI } from '../../services/api';
import CreateGroupChatModal from '../../components/CreateGroupChatModal/CreateGroupChatModal';
import './MyChats.css';

const MyChats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadChats = () => {
    if (!user?.token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    groupChatAPI
      .getMine()
      .then((data) => setChats(data))
      .catch(() => setError('Failed to load your chats. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChats();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="my-chats-page">
        <div className="my-chats-container">
          <div className="my-chats-loading">
            <div className="my-chats-spinner" aria-hidden="true" />
            <p>Loading your chats...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-chats-page">
      <div className="my-chats-container">
        <header className="my-chats-header">
          <div className="my-chats-header-row">
            <div>
              <h1>My Chats</h1>
              <p className="my-chats-subtitle">
                Group conversations for properties you own or rent
              </p>
            </div>
            <button type="button" className="my-chats-create-btn" onClick={() => setCreateModalOpen(true)}>
              + Create Group Chat
            </button>
          </div>
        </header>

        {error && (
          <div className="my-chats-error" role="alert">
            {error}
          </div>
        )}

        {!error && chats.length === 0 && (
          <div className="my-chats-empty">
            <div className="my-chats-empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p>No chats yet</p>
            <p className="my-chats-empty-hint">
              Rent a property or list your own and create a group chat to get started.
            </p>
            <button type="button" className="my-chats-browse-btn" onClick={() => navigate('/')}>
              Browse Properties
            </button>
            <button type="button" className="my-chats-create-btn my-chats-create-btn--secondary" onClick={() => setCreateModalOpen(true)}>
              + Create Group Chat
            </button>
          </div>
        )}

        {chats.length > 0 && (
          <ul className="my-chats-list">
            {chats.map((chat) => {
              const isOwner =
                chat.owner?._id === user?._id || chat.owner === user?._id;
              const myRole = isOwner ? 'Owner' : 'Renter';
              const roomId = chat.room?._id || chat.room;
              const roomTitle = chat.room?.title || chat.name;

              return (
                <li key={chat._id}>
                  <button
                    type="button"
                    className="my-chats-item"
                    onClick={() => navigate(`/chat/${roomId}`)}
                  >
                    <div className="my-chats-avatar" aria-hidden="true">
                      {roomTitle.charAt(0).toUpperCase()}
                    </div>
                    <div className="my-chats-info">
                      <h3 className="my-chats-room-title">{chat.name}</h3>
                      {chat.room?.title && (
                        <p className="my-chats-room-meta">{chat.room.title}</p>
                      )}
                      {chat.room?.location && (
                        <p className="my-chats-room-meta">{chat.room.location}</p>
                      )}
                      <p className="my-chats-member-count">
                        {chat.members?.length || 0} member
                        {chat.members?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="my-chats-meta">
                      <span className={`my-chats-role-badge my-chats-role-${myRole.toLowerCase()}`}>
                        {myRole}
                      </span>
                      <span className="my-chats-chevron" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CreateGroupChatModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          loadChats();
        }}
      />
    </div>
  );
};

export default MyChats;
