const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

const TRACKING_FILE = path.join(__dirname, '../video-tracking.json');

// Helper function to load tracking data
async function loadTrackingData() {
    try {
        if (await fs.pathExists(TRACKING_FILE)) {
            const data = await fs.readJson(TRACKING_FILE);
            return Array.isArray(data) ? data : [];
        }
    } catch (error) {
        console.error('Error loading tracking data:', error);
    }
    return [];
}

// Helper function to save tracking data
async function saveTrackingData(data) {
    try {
        await fs.writeJson(TRACKING_FILE, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Error saving tracking data:', error);
        return false;
    }
}

// Create new video tracking entry
router.post('/tracking', async (req, res) => {
    try {
        const trackingData = req.body;
        
        // Validate required fields
        if (!trackingData.id || !trackingData.title) {
            return res.status(400).json({
                success: false,
                error: 'Video ID and title are required'
            });
        }

        // Load existing data
        const existingData = await loadTrackingData();
        
        // Check if video already exists
        const existingIndex = existingData.findIndex(video => video.id === trackingData.id);
        
        if (existingIndex !== -1) {
            // Update existing entry
            existingData[existingIndex] = {
                ...existingData[existingIndex],
                ...trackingData,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Add new entry
            existingData.unshift(trackingData); // Add to beginning
        }

        // Save data
        const saved = await saveTrackingData(existingData);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Video tracking entry created/updated',
                data: trackingData
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error creating video tracking entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create video tracking entry'
        });
    }
});

// Update video tracking entry
router.put('/tracking/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const updateData = req.body;
        
        // Load existing data
        const existingData = await loadTrackingData();
        
        // Find video
        const videoIndex = existingData.findIndex(video => video.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        // Update video
        existingData[videoIndex] = {
            ...existingData[videoIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        // Save data
        const saved = await saveTrackingData(existingData);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Video tracking updated',
                data: existingData[videoIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error updating video tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update video tracking'
        });
    }
});

// Get video tracking data
router.get('/tracking', async (req, res) => {
    try {
        const trackingData = await loadTrackingData();
        
        res.json({
            success: true,
            data: trackingData,
            total: trackingData.length
        });
        
    } catch (error) {
        console.error('Error getting video tracking data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get video tracking data'
        });
    }
});

// Get single video tracking entry
router.get('/tracking/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const trackingData = await loadTrackingData();
        
        const video = trackingData.find(v => v.id === videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }
        
        res.json({
            success: true,
            data: video
        });
        
    } catch (error) {
        console.error('Error getting video tracking entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get video tracking entry'
        });
    }
});

// Delete video tracking entry
router.delete('/tracking/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const trackingData = await loadTrackingData();
        
        const videoIndex = trackingData.findIndex(v => v.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }
        
        // Remove video
        trackingData.splice(videoIndex, 1);
        
        // Save data
        const saved = await saveTrackingData(trackingData);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Video tracking entry deleted'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error deleting video tracking entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete video tracking entry'
        });
    }
});

// Test endpoint to manually update video status to processing
router.post('/tracking/:videoId/test-processing', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Load existing data
        const existingData = await loadTrackingData();
        
        // Find video
        const videoIndex = existingData.findIndex(video => video.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        // Update video to processing status
        existingData[videoIndex] = {
            ...existingData[videoIndex],
            status: 'processing',
            progress: 15,
            currentStep: 'تولید تصاویر (2/5)',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'active', timestamp: new Date().toISOString() },
                { name: 'تولید صدا', status: 'pending', timestamp: null },
                { name: 'ترکیب ویدیو', status: 'pending', timestamp: null },
                { name: 'آماده', status: 'pending', timestamp: null }
            ],
            updatedAt: new Date().toISOString()
        };

        // Save data
        const saved = await saveTrackingData(existingData);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Video tracking updated to processing status',
                data: existingData[videoIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error updating video tracking to processing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update video tracking'
        });
    }
});

// Clean up completed videos from tracking
router.post('/tracking/cleanup-completed', async (req, res) => {
    try {
        // Load existing data
        const existingData = await loadTrackingData();
        
        // Filter out completed videos (keep only processing and error videos)
        const filteredData = existingData.filter(video => 
            video.status !== 'completed'
        );
        
        // Save filtered data
        const saved = await saveTrackingData(filteredData);
        
        if (saved) {
            const removedCount = existingData.length - filteredData.length;
            res.json({
                success: true,
                message: `Cleaned up ${removedCount} completed videos from tracking`,
                removedCount: removedCount,
                remainingCount: filteredData.length
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error cleaning up completed videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clean up completed videos'
        });
    }
});

// Test endpoint to manually update video status to completed
router.post('/tracking/:videoId/test-complete', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Load existing data
        const existingData = await loadTrackingData();
        
        // Find video
        const videoIndex = existingData.findIndex(video => video.id === videoId);
        
        if (videoIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        // Update video to completed status
        existingData[videoIndex] = {
            ...existingData[videoIndex],
            status: 'completed',
            progress: 100,
            currentStep: 'آماده',
            steps: [
                { name: 'در صف انتظار', status: 'completed', timestamp: null },
                { name: 'تولید اسکریپت', status: 'completed', timestamp: null },
                { name: 'تولید تصاویر', status: 'completed', timestamp: null },
                { name: 'تولید صدا', status: 'completed', timestamp: null },
                { name: 'ترکیب ویدیو', status: 'completed', timestamp: new Date().toISOString() },
                { name: 'آماده', status: 'completed', timestamp: new Date().toISOString() }
            ],
            metadata: {
                ...existingData[videoIndex].metadata,
                videoUrl: `/api/remotion/download/test-video.mp4`,
                duration: 30
            },
            updatedAt: new Date().toISOString()
        };

        // Save data
        const saved = await saveTrackingData(existingData);
        
        if (saved) {
            res.json({
                success: true,
                message: 'Video tracking updated to completed status',
                data: existingData[videoIndex]
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save tracking data'
            });
        }
        
    } catch (error) {
        console.error('Error updating video tracking to completed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update video tracking'
        });
    }
});

module.exports = router;
