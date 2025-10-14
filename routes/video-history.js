const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Import helper functions from video.js
const { 
  removeVideoFromTracking,
  loadTrackingData,
  saveTrackingData,
  updateVideoTracking
} = require('./video');

const TRACKING_FILE = path.join(__dirname, '../video-tracking.json');

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
    
    // Get tracking data for additional video information
    const trackingData = await loadTrackingData();
    
    // Combine tracking data with file-based videos
    const allVideos = [...completedVideos, ...processingVideos];
    
    // Merge tracking data with file data
    const enrichedVideos = allVideos.map(video => {
      const tracking = trackingData.find(t => t.id === video.id);
      if (tracking) {
        return {
          ...video,
          title: tracking.title,
          status: video.status, // Use file status for completed videos
          progress: tracking.progress,
          currentStep: tracking.currentStep,
          steps: tracking.steps,
          metadata: tracking.metadata,
          createdAt: tracking.createdAt,
          updatedAt: tracking.updatedAt
        };
      }
      return video;
    });
    
    // Add tracking-only videos (videos that are being processed but don't have files yet)
    // Only include videos that are still processing or have errors
    const trackingOnlyVideos = trackingData.filter(tracking => 
      !allVideos.some(video => video.id === tracking.id) && 
      (tracking.status === 'processing' || tracking.status === 'error')
    ).map(tracking => ({
      id: tracking.id,
      filename: `${tracking.id}.mp4`,
      status: tracking.status,
      createdAt: new Date(tracking.createdAt),
      modifiedAt: new Date(tracking.updatedAt),
      size: tracking.metadata?.fileSize || null,
      url: tracking.metadata?.videoUrl || null,
      title: tracking.title,
      progress: tracking.progress,
      currentStep: tracking.currentStep,
      steps: tracking.steps,
      metadata: tracking.metadata
    }));
    
    // Combine all videos and sort by creation time (newest first)
    const finalVideos = [...enrichedVideos, ...trackingOnlyVideos]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      videos: finalVideos,
      total: finalVideos.length
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
    
    let fileDeleted = false;
    
    // Try to delete from output directory
    const outputFiles = await fs.readdir(outputDir).catch(() => []);
    for (const file of outputFiles) {
      if (file.includes(videoId)) {
        await fs.unlink(path.join(outputDir, file));
        fileDeleted = true;
        console.log(`✅ Deleted video file from output: ${file}`);
        break;
      }
    }
    
    // Try to delete from uploads directory
    if (!fileDeleted) {
      const uploadFiles = await fs.readdir(uploadsDir).catch(() => []);
      for (const file of uploadFiles) {
        if (file.includes(videoId)) {
          await fs.unlink(path.join(uploadsDir, file));
          fileDeleted = true;
          console.log(`✅ Deleted video file from uploads: ${file}`);
          break;
        }
      }
    }
    
    // Always try to remove from tracking, even if file not found
    // This fixes the issue with stuck videos that have no files
    await removeVideoFromTracking(videoId);
    
    // Consider it successful if either file was deleted OR tracking entry was removed
    if (!fileDeleted) {
      console.log(`⚠️ Video file not found for ${videoId}, but tracking entry removed`);
    }
    
    res.json({
      success: true,
      message: 'Video deleted successfully',
      fileDeleted,
      trackingRemoved: true
    });
    
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete video',
      details: error.message
    });
  }
});

// Cleanup stuck videos endpoint - updates processing videos that have been stuck for > 1 hour
router.post('/cleanup-stuck', async (req, res) => {
  try {
    const trackingData = await loadTrackingData();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cleanedVideos = [];
    
    for (let i = 0; i < trackingData.length; i++) {
      const video = trackingData[i];
      
      // Check if video is stuck in processing state for more than 1 hour
      if (video.status === 'processing') {
        const updatedAt = new Date(video.updatedAt || video.createdAt);
        
        if (updatedAt < oneHourAgo) {
          // Update status to error
          trackingData[i] = {
            ...video,
            status: 'error',
            progress: 0,
            currentStep: 'خطا در تولید',
            updatedAt: new Date().toISOString(),
            metadata: {
              ...video.metadata,
              errorMessage: 'Processing timeout - video was stuck for more than 1 hour'
            }
          };
          
          cleanedVideos.push({
            id: video.id,
            title: video.title,
            stuckSince: video.updatedAt || video.createdAt
          });
          
          console.log(`🔧 Cleaned up stuck video: ${video.id} - ${video.title}`);
        }
      }
    }
    
    // Save updated tracking data if any videos were cleaned
    if (cleanedVideos.length > 0) {
      await saveTrackingData(trackingData);
      console.log(`✅ Cleaned up ${cleanedVideos.length} stuck video(s)`);
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedVideos.length} stuck video(s)`,
      cleanedVideos,
      count: cleanedVideos.length
    });
    
  } catch (error) {
    console.error('Error cleaning up stuck videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup stuck videos',
      details: error.message
    });
  }
});

// Bulk delete stuck videos endpoint - removes all videos with processing or error status
router.delete('/delete-stuck', async (req, res) => {
  try {
    const trackingData = await loadTrackingData();
    const outputDir = path.join(__dirname, '../output');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    const stuckVideos = trackingData.filter(
      video => video.status === 'processing' || video.status === 'error'
    );
    
    let filesDeleted = 0;
    let trackingEntriesRemoved = 0;
    const deletedVideos = [];
    
    for (const video of stuckVideos) {
      let fileDeleted = false;
      
      // Try to delete files from both directories
      try {
        const outputFiles = await fs.readdir(outputDir).catch(() => []);
        for (const file of outputFiles) {
          if (file.includes(video.id)) {
            await fs.unlink(path.join(outputDir, file));
            fileDeleted = true;
            filesDeleted++;
            console.log(`✅ Deleted file: ${file}`);
            break;
          }
        }
        
        if (!fileDeleted) {
          const uploadFiles = await fs.readdir(uploadsDir).catch(() => []);
          for (const file of uploadFiles) {
            if (file.includes(video.id)) {
              await fs.unlink(path.join(uploadsDir, file));
              fileDeleted = true;
              filesDeleted++;
              console.log(`✅ Deleted file: ${file}`);
              break;
            }
          }
        }
      } catch (err) {
        console.error(`Error deleting file for ${video.id}:`, err.message);
      }
      
      // Remove from tracking
      await removeVideoFromTracking(video.id);
      trackingEntriesRemoved++;
      
      deletedVideos.push({
        id: video.id,
        title: video.title,
        status: video.status,
        fileDeleted
      });
    }
    
    console.log(`🗑️ Bulk delete completed: ${filesDeleted} files, ${trackingEntriesRemoved} tracking entries`);
    
    res.json({
      success: true,
      message: `Deleted ${trackingEntriesRemoved} stuck video(s)`,
      filesDeleted,
      trackingEntriesRemoved,
      deletedVideos
    });
    
  } catch (error) {
    console.error('Error bulk deleting stuck videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete stuck videos',
      details: error.message
    });
  }
});

module.exports = router;



