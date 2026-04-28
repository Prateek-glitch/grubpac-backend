const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { uploadContent, reviewContent, getLiveContent } = require('../controllers/contentController');

// Teacher Routes
router.post('/upload', verifyToken, requireRole('teacher'), upload.single('file'), uploadContent);

// Principal Routes
router.put('/review/:id', verifyToken, requireRole('principal'), reviewContent);

// Public Broadcasting Route (No Auth Required)
router.get('/live/:teacherId', getLiveContent);

module.exports = router;