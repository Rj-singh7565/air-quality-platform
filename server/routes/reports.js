const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const {
    createReport,
    getReports,
    getNearbyReports,
    getHotspots,
    voteReport,
    uploadResolutionProof,
    getMyReports
} = require('../controllers/reportController');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `report-${uuidv4()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.get('/', getReports);
router.get('/nearby', getNearbyReports);
router.get('/hotspots', getHotspots);
router.get('/my', auth, getMyReports);
router.post('/', auth, upload.single('image'), createReport);
router.post('/:id/vote', auth, voteReport);
router.post('/:id/resolve', auth, upload.single('resolution_image'), uploadResolutionProof);

module.exports = router;
