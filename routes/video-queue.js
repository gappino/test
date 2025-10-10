const express = require('express');
const router = express.Router();
const videoQueueManager = require('../video-queue-manager');

/**
 * دریافت وضعیت کامل صف
 * GET /api/video-queue/status
 */
router.get('/status', (req, res) => {
    try {
        const status = videoQueueManager.getQueueStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status',
            details: error.message
        });
    }
});

/**
 * دریافت تاریخچه ویدیوها
 * GET /api/video-queue/history?limit=50
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = videoQueueManager.getHistory(limit);
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get history',
            details: error.message
        });
    }
});

/**
 * لغو ویدیو
 * POST /api/video-queue/cancel/:videoId
 */
router.post('/cancel/:videoId', (req, res) => {
    try {
        const { videoId } = req.params;
        const success = videoQueueManager.cancelVideo(videoId);
        
        if (success) {
            res.json({
                success: true,
                message: 'ویدیو با موفقیت لغو شد'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'ویدیو در صف یافت نشد'
            });
        }
    } catch (error) {
        console.error('Error cancelling video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel video',
            details: error.message
        });
    }
});

/**
 * پاک کردن صف
 * DELETE /api/video-queue/clear
 */
router.delete('/clear', (req, res) => {
    try {
        const clearedCount = videoQueueManager.clearQueue();
        
        res.json({
            success: true,
            message: `${clearedCount} ویدیو از صف پاک شد`,
            clearedCount
        });
    } catch (error) {
        console.error('Error clearing queue:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear queue',
            details: error.message
        });
    }
});

/**
 * پاک کردن تاریخچه
 * DELETE /api/video-queue/history
 */
router.delete('/history', (req, res) => {
    try {
        const clearedCount = videoQueueManager.clearHistory();
        
        res.json({
            success: true,
            message: `${clearedCount} آیتم از تاریخچه پاک شد`,
            clearedCount
        });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear history',
            details: error.message
        });
    }
});

/**
 * ریست آمار
 * POST /api/video-queue/reset-stats
 */
router.post('/reset-stats', (req, res) => {
    try {
        videoQueueManager.resetStats();
        
        res.json({
            success: true,
            message: 'آمار با موفقیت ریست شد'
        });
    } catch (error) {
        console.error('Error resetting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset stats',
            details: error.message
        });
    }
});

module.exports = router;

