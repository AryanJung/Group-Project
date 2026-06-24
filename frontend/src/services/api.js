import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const formatPrice = (price) => {
  if (typeof price === 'string') {
    return price;
  }

  if (typeof price === 'number') {
    return `Rs ${price.toLocaleString()}`;
  }

  return 'Rs 0';
};

const roomToProperty = (room) => ({
  _id: room._id,
  id: room._id,
  title: room.title,
  location: room.location,
  price: formatPrice(room.price),
  bedrooms: room.bedrooms ?? 1,
  bathrooms: room.bathrooms ?? 1,
  area: room.area || 'N/A',
  image: room.image || room.images?.[0] || '🏠',
  description: room.description,
  rating: room.rating ?? 0,
  reviews: room.reviews || [],
});

const propertyToRoom = (property) => ({
  title: property.title,
  description:
    property.description ||
    `${property.bedrooms || 1} bed, ${property.bathrooms || 1} bath property in ${property.location}`,
  location: property.location,
  price: property.price,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  area: property.area,
  image: property.image,
  images: property.image ? [property.image] : [],
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
  avatar: '👤',
  rating: review.rating,
  censoredReview: review.censoredReview,
  createdAt: review.createdAt,
  status: review.status,
  aiAnalysis: review.aiAnalysis,
  wordsBlurred: review.wordsBlurred,
});

// Auth API
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
};

// User API
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

// Properties / Rooms API
export const adminAPI = {
  getAllProperties: async () => {
    const response = await api.get('/rooms');
    return response.data.map(roomToProperty);
  },
  getPropertyById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return roomToProperty(response.data);
  },
  createProperty: async (propertyData) => {
    const response = await api.post('/rooms', propertyToRoom(propertyData));
    return roomToProperty(response.data);
  },
  updateProperty: async (id, propertyData) => {
    const response = await api.put(`/rooms/${id}`, propertyToRoom(propertyData));
    return roomToProperty(response.data);
  },
  deleteProperty: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};

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

export default api;
