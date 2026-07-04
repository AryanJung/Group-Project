import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { groupChatAPI } from '../../services/api';
import './MyChats.css';

const MyChats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.token) {
      navigate('/', { replace: true });
      return;
    }

    groupChatAPI
      .getMine()
      .then((data) => setChats(data))
      .catch(() => setError('Failed to load your chats. Please try again.'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="my-chats-page">
        <div className="my-chats-container">
          <p className="my-chats-status">Loading your chats…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-chats-page">
      <div className="my-chats-container">
        <div className="my-chats-header">
          <h1>💬 My Chats</h1>
          <p className="my-chats-subtitle">
            All group chats you are part of as owner or renter
          </p>
        </div>

        {error && <p className="my-chats-error">{error}</p>}

        {!error && chats.length === 0 && (
          <div className="my-chats-empty">
            <span className="my-chats-empty-icon">💬</span>
            <p>No chats yet.</p>
            <p className="my-chats-empty-hint">
              Rent a property or list your own and create a group chat to get started.
            </p>
            <button className="my-chats-browse-btn" onClick={() => navigate('/')}>
              Browse Properties
            </button>
          </div>
        )}

        <ul className="my-chats-list">
          {chats.map((chat) => {
            const isOwner =
              chat.owner?._id === user?._id || chat.owner === user?._id;
            const myRole = isOwner ? 'Owner' : 'Renter';
            const roomId = chat.room?._id || chat.room;

            return (
              <li
                key={chat._id}
                className="my-chats-item"
                onClick={() => navigate(`/chat/${roomId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/chat/${roomId}`)}
              >
                <span className="my-chats-room-icon">
                  {chat.room?.image || '🏠'}
                </span>
                <div className="my-chats-info">
                  <h3 className="my-chats-room-title">{chat.name}</h3>
                  {chat.room?.title && (
                    <p className="my-chats-room-location">🏠 {chat.room.title}</p>
                  )}
                  {chat.room?.location && (
                    <p className="my-chats-room-location">📍 {chat.room.location}</p>
                  )}
                  <p className="my-chats-other-party">
                    {chat.members?.length || 0} member{chat.members?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="my-chats-meta">
                  <span className={`my-chats-role-badge my-chats-role-${myRole.toLowerCase()}`}>
                    {myRole}
                  </span>
                  <span className="my-chats-chevron">›</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default MyChats;
