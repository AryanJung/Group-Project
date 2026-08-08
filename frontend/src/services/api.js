import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from stored user on every request
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.token) {
      config.headers.Authorization = "Bearer " + user.token;
    }

    // Allow the browser to set multipart boundaries automatically for FormData uploads.
    // The default instance header is application/json, which breaks file uploads.
    if (config.data && config.data.constructor?.name === 'FormData') {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/auth/resend-otp') ||
      requestUrl.includes('/auth/verify-register-otp') ||
      requestUrl.includes('/auth/resend-register-otp');

    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatPrice = (price) => {
  if (typeof price === 'string') return price;
  if (typeof price === 'number') return `Rs ${price.toLocaleString()}`;
  return 'Rs 0';
};

/**
 * Maps a raw Room document from the backend to the shape the frontend uses.
 * Preserves createdBy, isRented, and coordinates so ownership/rental logic works.
 */
const roomToProperty = (room) => ({
  _id: room._id,
  id: room._id,
  title: room.title,
  description: room.description,
  location: room.location,
  coordinates: room.coordinates || null,
  price: formatPrice(room.price),
  rawPrice: room.price,
  bedrooms: room.bedrooms ?? 1,
  bathrooms: room.bathrooms ?? 1,
  area: room.area || 'N/A',
  image: room.image || room.images?.[0] || '',
  images: room.images || [],
  videos: room.videos || [],
  features: room.features || [],
  rating: room.rating ?? 0,
  reviews: room.reviews || [],
  createdBy: room.createdBy || null,
  isRented: room.isRented ?? false,
  maxRenters: room.maxRenters ?? 1,
  status: room.status || 'approved',
  createdAt: room.createdAt || null,
  updatedAt: room.updatedAt || null,
});

const propertyToRoom = (property) => ({
  title: property.title,
  description:
    property.description ||
    `${property.bedrooms || 1} bed, ${property.bathrooms || 1} bath property in ${property.location}`,
  location: property.location,
  coordinates: property.coordinates || undefined,
  price: property.rawPrice ?? property.price,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  area: property.area,
  image: property.image || '',
  images: property.image ? [property.image] : [],
  maxRenters: property.maxRenters ?? 1,
  features: [
    property.bedrooms ? `${property.bedrooms} bedrooms` : null,
    property.bathrooms ? `${property.bathrooms} bathrooms` : null,
    property.area ? `${property.area} sqft` : null,
  ].filter(Boolean),
});

const mapReviewForUI = (review) => ({
  _id: review._id,
  userId: {
    name: review.user?.name || 'Anonymous User',
    email: review.user?.email,
  },
  avatar: '',
  rating: review.rating,
  censoredReview: review.censoredReview,
  createdAt: review.createdAt,
  status: review.status,
  aiAnalysis: review.aiAnalysis,
  wordsBlurred: review.wordsBlurred,
});

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  verifyRegisterOtp: async ({ otpSessionId, otp }) => {
    const response = await api.post('/auth/verify-register-otp', { otpSessionId, otp });
    return response.data;
  },
  resendRegisterOtp: async ({ otpSessionId }) => {
    const response = await api.post('/auth/resend-register-otp', { otpSessionId });
    return response.data;
  },
  // Backwards compatibility aliases
  verifyOtp: async ({ otpSessionId, otp }) => {
    const response = await api.post('/auth/verify-register-otp', { otpSessionId, otp });
    return response.data;
  },
  resendOtp: async ({ otpSessionId }) => {
    const response = await api.post('/auth/resend-register-otp', { otpSessionId });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ─── User API ───────────────────────────────────────────────────────────────

export const userAPI = {
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
};

// ─── Properties / Rooms API ─────────────────────────────────────────────────

export const adminAPI = {
  /** All listings — for the public browse page */
  getAllProperties: async () => {
    const response = await api.get('/rooms');
    return response.data.map(roomToProperty);
  },

  /** Only rooms created by the logged-in user — for the owner's dashboard */
  getMyRooms: async () => {
    const response = await api.get('/rooms/mine');
    return response.data.map(roomToProperty);
  },

  getPropertyById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return roomToProperty(response.data);
  },

  createProperty: async (propertyData) => {
    let finalPayload = propertyData;
    
    if (!(propertyData instanceof FormData)) {
      finalPayload = new FormData();
      const standardData = propertyToRoom(propertyData);
      Object.keys(standardData).forEach(key => {
        if (key === 'coordinates' && standardData[key]) {
          finalPayload.append('coordinates', JSON.stringify(standardData[key]));
        } else {
          finalPayload.append(key, standardData[key]);
        }
      });
    }

    const response = await api.post('/rooms', finalPayload);
    return roomToProperty(response.data);
  },

  updateProperty: async (id, propertyData) => {
    let finalPayload = propertyData;
    
    if (!(propertyData instanceof FormData)) {
      finalPayload = new FormData();
      const standardData = propertyToRoom(propertyData);
      Object.keys(standardData).forEach(key => {
        if (key === 'coordinates' && standardData[key]) {
          finalPayload.append('coordinates', JSON.stringify(standardData[key]));
        } else {
          finalPayload.append(key, standardData[key]);
        }
      });
    }

    const response = await api.put(`/rooms/${id}`, finalPayload);
    return roomToProperty(response.data);
  },

  deleteProperty: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};

// ─── Review API ─────────────────────────────────────────────────────────────

export const reviewAPI = {
  getReviewsByRoom: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/reviews`);
    return response.data.map(mapReviewForUI);
  },
  postReview: async (roomId, rating, reviewText) => {
    const response = await api.post(`/rooms/${roomId}/reviews`, {
      comment: reviewText,
      rating,
    });
    return response.data;
  },
};

// ─── Chatbot API ─────────────────────────────────────────────────────────────

export const chatbotAPI = {
  sendMessage: async (message, history = []) => {
    const response = await api.post('/chat', { message, history });
    return {
      reply: response.data.reply,
      listings: response.data.listings || [],
    };
  },
};

// ─── Rental API ─────────────────────────────────────────────────────────────

export const rentalAPI = {
  cancelRent: async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}/rent`);
    return response.data;
  },

  getStatus: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/rent/status`);
    return response.data;
  },

  getMyChats: async () => {
    const response = await api.get('/rentals/my-chats');
    return response.data;
  },

  getMyRentals: async () => {
    const response = await api.get('/rentals/my-rentals');
    return response.data;
  },
};

// ─── Application API ─────────────────────────────────────────────────────────

export const applicationAPI = {
  apply: async (roomId, message = '') => {
    const response = await api.post(`/rooms/${roomId}/apply`, { message });
    return response.data;
  },

  withdraw: async (applicationId) => {
    const response = await api.delete(`/applications/${applicationId}`);
    return response.data;
  },

  getMine: async () => {
    const response = await api.get('/applications/mine');
    return response.data;
  },

  getByRoom: async (roomId, status = '') => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/rooms/${roomId}/applications${params}`);
    return response.data;
  },

  accept: async (applicationId) => {
    const response = await api.patch(`/applications/${applicationId}/accept`);
    return response.data.application || response.data;
  },

  reject: async (applicationId) => {
    const response = await api.patch(`/applications/${applicationId}/reject`);
    return response.data;
  },

  getApprovedRenters: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/approved-renters`);
    return response.data;
  },

  getAllForOwner: async (status = '') => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/applications/owner${params}`);
    return response.data;
  },

  getApplicantProfile: async (applicationId) => {
    const response = await api.get(`/applications/${applicationId}/applicant`);
    return response.data;
  },

  getOrCreateChat: async (applicationId) => {
    const response = await api.post(`/applications/${applicationId}/chat`);
    return response.data;
  },
};

// ─── Visit API ───────────────────────────────────────────────────────────────

export const visitAPI = {
  requestVisit: async (applicationId, proposedAt, notes) => {
    const response = await api.post(`/visits/applications/${applicationId}/request`, { proposedAt, notes });
    return response.data;
  },
  confirmVisit: async (visitId, confirmedAt) => {
    const response = await api.patch(`/visits/confirm/${visitId}`, { confirmedAt });
    return response.data;
  },
  rejectVisit: async (visitId) => {
    const response = await api.patch(`/visits/reject/${visitId}`);
    return response.data;
  },
  completeVisit: async (visitId, roleDecision) => {
    const response = await api.patch(`/visits/${visitId}/complete`, { roleDecision });
    return response.data;
  },
  getVisitsByApplication: async (applicationId) => {
    const response = await api.get(`/visits/applications/${applicationId}`);
    return response.data;
  },
};

// ─── Agreement API ───────────────────────────────────────────────────────────

export const agreementAPI = {
  create: async (payload) => {
    const response = await api.post('/agreements', payload);
    return response.data;
  },
  createVersion: async (agreementId, payload) => {
    const response = await api.post(`/agreements/${agreementId}/versions`, payload);
    return response.data;
  },
  sendVersion: async (agreementId, versionNumber) => {
    const response = await api.post(`/agreements/${agreementId}/versions/send`, { versionNumber });
    return response.data;
  },
  requestChanges: async (agreementId, versionNumber, requestedChanges) => {
    const response = await api.post(`/agreements/${agreementId}/versions/request-changes`, { versionNumber, requestedChanges });
    return response.data;
  },
  acceptVersion: async (agreementId, versionNumber) => {
    const response = await api.post(`/agreements/${agreementId}/versions/accept`, { versionNumber });
    return response.data;
  },
  decline: async (agreementId) => {
    const response = await api.post(`/agreements/${agreementId}/versions/decline`);
    return response.data;
  },
  execute: async (agreementId, versionNumber) => {
    const response = await api.post(`/agreements/${agreementId}/execute`, { versionNumber });
    return response.data;
  },
  getAgreement: async (agreementId) => {
    const response = await api.get(`/agreements/${agreementId}`);
    return response.data;
  },
  getMine: async () => {
    const response = await api.get('/agreements/mine');
    return response.data;
  },
  getByApplication: async (applicationId) => {
    const response = await api.get(`/agreements/applications/${applicationId}`);
    return response.data;
  },
};

// ─── Notification API ─────────────────────────────────────────────────────────

export const notificationAPI = {
  getAll: async (unreadOnly = false) => {
    const response = await api.get(`/notifications${unreadOnly ? '?unread=true' : ''}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

// ─── Group Chat API ───────────────────────────────────────────────────────────

export const groupChatAPI = {
  create: async (name, roomId, memberIds = []) => {
    const response = await api.post('/group-chats', { name, roomId, memberIds });
    return response.data;
  },

  getMine: async () => {
    const response = await api.get('/group-chats/mine');
    return response.data;
  },

  getById: async (chatId) => {
    const response = await api.get(`/group-chats/${chatId}`);
    return response.data;
  },

  addMembers: async (chatId, payload) => {
    const response = await api.post(`/group-chats/${chatId}/members`, payload);
    return response.data;
  },

  removeMember: async (chatId, userId) => {
    const response = await api.delete(`/group-chats/${chatId}/members/${userId}`);
    return response.data;
  },

  getMessages: async (chatId) => {
    const response = await api.get(`/group-chats/${chatId}/messages`);
    return response.data;
  },

  sendMessage: async (chatId, text, attachment) => {
    const payload = new FormData();
    payload.append('text', text);
    if (attachment) payload.append('attachment', attachment);
    const response = await api.post(`/group-chats/${chatId}/messages`, payload);
    return response.data;
  },

  getByRoom: async (roomId) => {
    const response = await api.get(`/group-chats/by-room/${roomId}`);
    return response.data;
  },

  getLegacyMessages: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/group-chat/messages`);
    return response.data;
  },
  sendLegacyMessage: async (roomId, text) => {
    const response = await api.post(`/rooms/${roomId}/group-chat/messages`, { text });
    return response.data;
  },
};

// ─── Super Admin API ─────────────────────────────────────────────────────────

export const superAdminAPI = {
  access: async (key) => {
    const response = await api.get('/super-admin/access', { params: { key } });
    return response.data;
  },
  listKyc: async (key) => {
    const response = await api.get('/super-admin/kyc', { headers: { 'x-super-key': key } });
    return response.data;
  },
  approveKyc: async (id, key) => {
    const response = await api.post(`/super-admin/kyc/${id}/approve`, {}, { headers: { 'x-super-key': key } });
    return response.data;
  },
  rejectKyc: async (id, key, body = {}) => {
    const response = await api.post(`/super-admin/kyc/${id}/reject`, body, { headers: { 'x-super-key': key } });
    return response.data;
  },
  listReviews: async (key) => {
    const response = await api.get('/super-admin/reviews', { headers: { 'x-super-key': key } });
    return response.data;
  },
  listPendingProperties: async (key) => {
    const response = await api.get('/super-admin/properties', { headers: { 'x-super-key': key } });
    return response.data;
  },
  approveProperty: async (id, key) => {
    const response = await api.post(`/super-admin/properties/${id}/approve`, {}, { headers: { 'x-super-key': key } });
    return response.data;
  },
  rejectProperty: async (id, key, body = {}) => {
    const response = await api.post(`/super-admin/properties/${id}/reject`, body, { headers: { 'x-super-key': key } });
    return response.data;
  },
  listAppeals: async (key) => {
    const response = await api.get('/super-admin/appeals', { headers: { 'x-super-key': key } });
    return response.data;
  },
  resolveAppeal: async (id, action, key) => {
    const response = await api.post(`/super-admin/appeals/${id}/resolve`, { action }, { headers: { 'x-super-key': key } });
    return response.data;
  },
  searchUsers: async (q, key) => {
    const response = await api.get('/super-admin/users', { params: { q }, headers: { 'x-super-key': key } });
    return response.data;
  },
  suspendUser: async (id, suspended, key) => {
    const response = await api.patch(`/super-admin/users/${id}/suspend`, { suspended }, { headers: { 'x-super-key': key } });
    return response.data;
  },
  banUser: async (id, banned, key) => {
    const response = await api.patch(`/super-admin/users/${id}/ban`, { banned }, { headers: { 'x-super-key': key } });
    return response.data;
  },
  deleteReview: async (id, key) => {
    const response = await api.post(`/super-admin/reviews/${id}/delete`, {}, { headers: { 'x-super-key': key } });
    return response.data;
  },
  publishReview: async (id, content, key) => {
    const response = await api.post(`/super-admin/reviews/${id}/publish`, { content }, { headers: { 'x-super-key': key } });
    return response.data;
  },
};

// ─── KYC API ─────────────────────────────────────────────────────────────

export const kycAPI = {
  submit: async (payload) => {
    const response = await api.post('/kyc/submit', payload);
    return response.data;
  },
  getByUser: async (userId) => {
    const response = await api.get(`/kyc/user/${userId}`);
    return response.data;
  },
};

// ─── Appeals API ─────────────────────────────────────────────────────────

export const appealsAPI = {
  create: async (message) => {
    const response = await api.post('/appeals', { message });
    return response.data;
  },
};

export default api;
