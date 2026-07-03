const express = require('express');
const cors = require('cors');
const connectDb = require('./config/dbConnection');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

connectDb();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const kycRoutes = require('./routes/kycRoutes');
const appealRoutes = require('./routes/appealRoutes');

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/rooms', roomRoutes);
app.use('/rooms', reviewRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/kyc', kycRoutes);
app.use('/', appealRoutes);

app.listen(PORT , () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});