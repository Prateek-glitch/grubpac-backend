const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');

dotenv.config();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files securely
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);

// Health Check & 404
app.get('/', (req, res) => res.json({ status: 'GrubPac Broadcasting API Live' }));
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// Global Error Handler for multer/express
app.use((err, req, res, next) => {
    if (err.message) {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running in production mode on port ${PORT}`);
});