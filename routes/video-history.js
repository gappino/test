const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Get video history endpoint
router.get('/history', async (req, res) => {
  try {
    const outputDir = path.join(__dirname, '../output');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Ensure directories exist
    await fs.ensureDir(outputDir);
    await fs.ensureDir(uploadsDir);
    
    // Get completed videos from output directory
    const completedVideos = await getVideoFiles(outputDir, 'completed');
    
    // Get processing videos from uploads directory
    const processingVideos = await getVideoFiles(uploadsDir, 'processing');
    
    // Combine and sort by creation time (newest first)
    const allVideos = [...completedVideos, ...processingVideos]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      videos: allVideos,
      total: allVideos.length
    });
    
  } catch (error) {
    console.error('Error getting video history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video history'
    });
  }
});

// Helper function to get video files from directory
async function getVideoFiles(directory, status) {
  try {
    const files = await fs.readdir(directory);
    const videoFiles = [];
    
    for (const file of files) {
      if (file.match(/\.(mp4|avi|mov|mkv)$/i)) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        // Extract video ID from filename (e.g., video-1234567890.mp4)
        const videoId = file.replace(/\.(mp4|avi|mov|mkv)$/i, '');
        
        videoFiles.push({
          id: videoId,
          filename: file,
          status: status,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size,
          url: status === 'completed' ? `/api/remotion/download/${file}` : null
        });
      }
    }
    
    return videoFiles;
  } catch (error) {
    console.error(`Error reading ${directory}:`, error);
    return [];
  }
}

// Get single video details
router.get('/details/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const outputDir = path.join(__dirname, '../output');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Look for video in both directories
    const outputFiles = await fs.readdir(outputDir).catch(() => []);
    const uploadFiles = await fs.readdir(uploadsDir).catch(() => []);
    
    let videoFile = null;
    let status = 'not_found';
    
    // Check output directory first (completed videos)
    for (const file of outputFiles) {
      if (file.includes(videoId)) {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);
        videoFile = {
          id: videoId,
          filename: file,
          status: 'completed',
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size,
          url: `/api/remotion/download/${file}`
        };
        break;
      }
    }
    
    // Check uploads directory (processing videos)
    if (!videoFile) {
      for (const file of uploadFiles) {
        if (file.includes(videoId)) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);
          videoFile = {
            id: videoId,
            filename: file,
            status: 'processing',
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            size: stats.size,
            url: null
          };
          break;
        }
      }
    }
    
    if (!videoFile) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.json({
      success: true,
      video: videoFile
    });
    
  } catch (error) {
    console.error('Error getting video details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video details'
    });
  }
});

// Delete video endpoint
router.delete('/delete/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const outputDir = path.join(__dirname, '../output');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    let deleted = false;
    
    // Try to delete from output directory
    const outputFiles = await fs.readdir(outputDir).catch(() => []);
    for (const file of outputFiles) {
      if (file.includes(videoId)) {
        await fs.unlink(path.join(outputDir, file));
        deleted = true;
        break;
      }
    }
    
    // Try to delete from uploads directory
    if (!deleted) {
      const uploadFiles = await fs.readdir(uploadsDir).catch(() => []);
      for (const file of uploadFiles) {
        if (file.includes(videoId)) {
          await fs.unlink(path.join(uploadsDir, file));
          deleted = true;
          break;
        }
      }
    }
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete video'
    });
  }
});

module.exports = router;



