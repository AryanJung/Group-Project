require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDb = require('./config/dbConnection');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-super-key'],
}));

// Set body parser limits to support handling image files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

connectDb();

// ── Core routes ───────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const roomRoutes        = require('./routes/roomRoutes');
const reviewRoutes      = require('./routes/reviewRoutes');

// ── Feature routes (our work) ─────────────────────────────────────────────────
const chatRoutes        = require('./routes/chatRoutes');
const rentalRoutes      = require('./routes/rentalRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const groupChatRoutes   = require('./routes/groupChatRoutes');

// ── Teammate's routes (KYC / SuperAdmin / Appeals) ────────────────────────────
const superAdminRoutes  = require('./routes/superAdminRoutes');
const kycRoutes         = require('./routes/kycRoutes');
const appealRoutes      = require('./routes/appealRoutes');

app.use('/auth',          authRoutes);
app.use('/users',         userRoutes);
app.use('/rooms',         roomRoutes);
app.use('/rooms',         reviewRoutes);
app.use('/chat',          chatRoutes);
app.use('/rentals',       rentalRoutes);
app.use('/applications',  applicationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/group-chats',   groupChatRoutes);
app.use('/super-admin',   superAdminRoutes);
app.use('/kyc',           kycRoutes);
app.use('/',              appealRoutes);

// ─── GLOBAL EXPRESS ERROR HANDLER MIDDLEWARE ──────────────────────────────────
// This explicitly catches errors before they leak out as [object Object]
app.use((err, req, res, next) => {
    console.error("🚨 GLOBAL EXPRESS ERROR CATCH:");
    console.error("Message:", err.message);
    console.error("Stack Trace:\n", err.stack || err);
    
    res.status(err.status || 500).json({
        message: err.message || "An internal error occurred during processing",
        error: err.stack ? err.message : err
    });
});
// ──────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});