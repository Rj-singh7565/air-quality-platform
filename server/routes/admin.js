const express = require('express');
const router = express.Router();
const { anyAdminAuth, superAdminAuth } = require('../middleware/auth');
const {
    getAllReports,
    updateReportStatus,
    rewardCitizen,
    getAdminStats,
    getCitizens,
    applyFine,
    verifyResolution,
    getPendingAuthorities,
    approveAuthority,
    getFines
} = require('../controllers/adminController');

// All admin routes require at least municipal_admin role
router.use(anyAdminAuth);

router.get('/stats', getAdminStats);
router.get('/reports', getAllReports);
router.put('/reports/:id/status', updateReportStatus);
router.post('/reports/:id/reward', rewardCitizen);
router.post('/reports/:id/fine', applyFine);
router.post('/reports/:id/verify-resolution', verifyResolution);
router.get('/citizens', getCitizens);
router.get('/fines', getFines);

// Super admin only routes
router.get('/authorities', superAdminAuth, getPendingAuthorities);
router.put('/authorities/:id/approve', superAdminAuth, approveAuthority);

module.exports = router;
