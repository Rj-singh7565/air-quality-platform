const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getLeaderboard, getUserProfile, getPlatformStats } = require('../controllers/userController');

router.get('/leaderboard', getLeaderboard);
router.get('/stats', getPlatformStats);
router.get('/:id/profile', getUserProfile);

module.exports = router;
