const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();

// Get audio history endpoint
router.get('/history', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads/audio');
    const publicDir = path.join(__dirname, '../public/audio');
    const kokoroDir = path.join(__dirname, '../kokoro');
    const afHeartDir = path.join(__dirname, '../af_heart');
    const isDir = path.join(__dirname, '../is');
    const thisDir = path.join(__dirname, '../this');
    
    // Ensure directories exist
    await fs.ensureDir(uploadsDir);
    await fs.ensureDir(publicDir);
    
    // Get audio files from all directories
    const uploadsAudios = await getAudioFiles(uploadsDir, 'uploaded');
    const publicAudios = await getAudioFiles(publicDir, 'public');
    const kokoroAudios = await getAudioFiles(kokoroDir, 'kokoro');
    const afHeartAudios = await getAudioFiles(afHeartDir, 'af_heart');
    const isAudios = await getAudioFiles(isDir, 'is');
    const thisAudios = await getAudioFiles(thisDir, 'this');
    
    // Combine and sort by creation time (newest first)
    const allAudios = [
      ...uploadsAudios, 
      ...publicAudios, 
      ...kokoroAudios, 
      ...afHeartAudios, 
      ...isAudios, 
      ...thisAudios
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      audios: allAudios,
      total: allAudios.length
    });
    
  } catch (error) {
    console.error('Error getting audio history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audio history'
    });
  }
});

// Helper function to get audio files from directory
async function getAudioFiles(directory, category) {
  try {
    const files = await fs.readdir(directory);
    const audioFiles = [];
    
    for (const file of files) {
      if (file.match(/\.(wav|mp3|ogg|m4a|aac)$/i)) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        // Extract audio ID from filename
        const audioId = file.replace(/\.(wav|mp3|ogg|m4a|aac)$/i, '');
        
        // Determine URL based on category
        let url = null;
        if (category === 'uploaded') {
          url = `/uploads/audio/${file}`;
        } else if (category === 'public') {
          url = `/audio/${file}`;
        } else {
          url = `/${category}/${file}`;
        }
        
        audioFiles.push({
          id: audioId,
          filename: file,
          category: category,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size,
          url: url,
          duration: await getAudioDuration(filePath)
        });
      }
    }
    
    return audioFiles;
  } catch (error) {
    console.error(`Error reading ${directory}:`, error);
    return [];
  }
}

// Helper function to get audio duration (simplified)
async function getAudioDuration(filePath) {
  try {
    // This is a simplified version - in production you might want to use ffprobe
    const stats = await fs.stat(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    // Rough estimation: 1MB ≈ 1 minute for typical audio
    const estimatedDuration = Math.round(sizeInMB);
    return estimatedDuration > 0 ? estimatedDuration : 1;
  } catch (error) {
    return 1; // Default 1 minute
  }
}

// Get single audio details
router.get('/details/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads/audio'), category: 'uploaded' },
      { path: path.join(__dirname, '../public/audio'), category: 'public' },
      { path: path.join(__dirname, '../kokoro'), category: 'kokoro' },
      { path: path.join(__dirname, '../af_heart'), category: 'af_heart' },
      { path: path.join(__dirname, '../is'), category: 'is' },
      { path: path.join(__dirname, '../this'), category: 'this' }
    ];
    
    let audioFile = null;
    
    // Search in all directories
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(audioId) && file.match(/\.(wav|mp3|ogg|m4a|aac)$/i)) {
            const filePath = path.join(dir.path, file);
            const stats = await fs.stat(filePath);
            
            let url = null;
            if (dir.category === 'uploaded') {
              url = `/uploads/audio/${file}`;
            } else if (dir.category === 'public') {
              url = `/audio/${file}`;
            } else {
              url = `/${dir.category}/${file}`;
            }
            
            audioFile = {
              id: audioId,
              filename: file,
              category: dir.category,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              size: stats.size,
              url: url,
              duration: await getAudioDuration(filePath)
            };
            break;
          }
        }
        if (audioFile) break;
      } catch (error) {
        // Directory doesn't exist or can't be read, continue
        continue;
      }
    }
    
    if (!audioFile) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.json({
      success: true,
      audio: audioFile
    });
    
  } catch (error) {
    console.error('Error getting audio details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audio details'
    });
  }
});

// Delete audio endpoint
router.delete('/delete/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads/audio'), category: 'uploaded' },
      { path: path.join(__dirname, '../public/audio'), category: 'public' },
      { path: path.join(__dirname, '../kokoro'), category: 'kokoro' },
      { path: path.join(__dirname, '../af_heart'), category: 'af_heart' },
      { path: path.join(__dirname, '../is'), category: 'is' },
      { path: path.join(__dirname, '../this'), category: 'this' }
    ];
    
    let deleted = false;
    
    // Try to delete from all directories
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(audioId) && file.match(/\.(wav|mp3|ogg|m4a|aac)$/i)) {
            await fs.unlink(path.join(dir.path, file));
            deleted = true;
            break;
          }
        }
        if (deleted) break;
      } catch (error) {
        // Directory doesn't exist or can't be read, continue
        continue;
      }
    }
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Audio file deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audio file'
    });
  }
});

// Play audio endpoint (for streaming)
router.get('/play/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;
    const directories = [
      { path: path.join(__dirname, '../uploads/audio'), category: 'uploaded' },
      { path: path.join(__dirname, '../public/audio'), category: 'public' },
      { path: path.join(__dirname, '../kokoro'), category: 'kokoro' },
      { path: path.join(__dirname, '../af_heart'), category: 'af_heart' },
      { path: path.join(__dirname, '../is'), category: 'is' },
      { path: path.join(__dirname, '../this'), category: 'this' }
    ];
    
    let audioPath = null;
    
    // Find audio file
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir.path);
        for (const file of files) {
          if (file.includes(audioId) && file.match(/\.(wav|mp3|ogg|m4a|aac)$/i)) {
            audioPath = path.join(dir.path, file);
            break;
          }
        }
        if (audioPath) break;
      } catch (error) {
        continue;
      }
    }
    
    if (!audioPath) {
      return res.status(404).json({
        success: false,
        error: 'Audio file not found'
      });
    }
    
    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Stream the audio file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);
    
  } catch (error) {
    console.error('Error playing audio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to play audio'
    });
  }
});

module.exports = router;



