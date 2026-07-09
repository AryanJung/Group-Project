import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, applicationAPI, groupChatAPI } from '../../services/api';
import './CreateGroupChatModal.css';

const CreateGroupChatModal = ({ open, onClose, onCreated }) => {
  const { isOwner, user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError('');
    setGroupName('');
    setSelectedUserIds([]);
    setSearch('');
    setLoading(true);

    adminAPI
      .getMyRooms()
      .then((data) => {
        setRooms(data || []);
        if (data?.length) {
          setSelectedRoomId(String(data[0]._id || data[0].id));
        } else {
          setSelectedRoomId('');
        }
      })
      .catch(() => {
        setRooms([]);
        setSelectedRoomId('');
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !selectedRoomId) {
      setUsers([]);
      return;
    }

    applicationAPI
      .getApprovedRenters(selectedRoomId)
      .then((data) => setUsers(data || []))
      .catch(() => setUsers([]));
  }, [open, selectedRoomId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((candidate) => {
      if (!query) return true;
      const fields = [candidate.username, candidate.name, candidate.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(query);
    });
  }, [search, users]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId || !groupName.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const newChat = await groupChatAPI.create(groupName.trim(), selectedRoomId, selectedUserIds);
      onCreated?.(newChat);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group chat.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-group-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="create-group-modal__body">
          <h2>Create Group Chat</h2>
          <p className="create-group-modal__subtitle">
            {isOwner
              ? 'Create a group chat for one of your listings and invite approved renters.'
              : 'Group chat creation is available for property owners.'}
          </p>

          {!isOwner ? (
            <div className="create-group-modal__notice">
              Group chat creation is available for property owners. Feature coming soon for renters.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="create-group-modal__form">
              <label className="create-group-modal__field">
                <span>Group name</span>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Flat 3B Tenants"
                  required
                />
              </label>

              <label className="create-group-modal__field">
                <span>Property</span>
                <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} disabled={loading || rooms.length === 0}>
                  {rooms.length === 0 ? (
                    <option value="">No listings available</option>
                  ) : (
                    rooms.map((room) => (
                      <option key={room._id || room.id} value={room._id || room.id}>
                        {room.title || 'Listing'}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="create-group-modal__field">
                <span>Invite approved renters</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or username"
                />
                {selectedUserIds.length > 0 && (
                  <div className="create-group-modal__chips">
                    {selectedUserIds.map((id) => {
                      const candidate = users.find((item) => String(item._id || item.id) === String(id));
                      const label = candidate?.username || candidate?.name || 'Selected';
                      return (
                        <span key={id} className="create-group-modal__chip">
                          @{label}
                          <button type="button" onClick={() => toggleUser(id)} aria-label={`Remove ${label}`}>
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="create-group-modal__list">
                  {filteredUsers.length === 0 ? (
                    <p className="create-group-modal__empty">No approved renters found for this listing.</p>
                  ) : (
                    filteredUsers.map((candidate) => {
                      const candidateId = String(candidate._id || candidate.id);
                      const checked = selectedUserIds.includes(candidateId);
                      const name = candidate.username || candidate.name || candidate.email || 'User';
                      return (
                        <label key={candidateId} className="create-group-modal__option">
                          <input type="checkbox" checked={checked} onChange={() => toggleUser(candidateId)} />
                          <span>{name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {error && <p className="create-group-modal__error">{error}</p>}

              <button type="submit" className="btn-submit" disabled={submitting || !groupName.trim() || !selectedRoomId}>
                {submitting ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChatModal;
