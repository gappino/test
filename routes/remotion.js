const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();

// Video composition with subtitles endpoint
router.post('/compose-video-with-subtitles', async (req, res) => {
  try {
    const { scenes, audioResults, subtitleResults } = req.body;
    
    console.log('🎬 Starting video composition with subtitles...');
    console.log(`   Scenes: ${scenes ? scenes.length : 'undefined'}`);
    console.log(`   Audio results: ${audioResults ? audioResults.length : 'undefined'}`);
    console.log(`   Subtitle results: ${subtitleResults ? subtitleResults.length : 'undefined'}`);
    
    if (!scenes || !Array.isArray(scenes)) {
      console.error('❌ Scenes array is required');
      return res.status(400).json({
        success: false,
        error: 'Scenes array is required'
      });
    }

    // Create output directory
    const outputDir = path.join(__dirname, '../output');
    await fs.ensureDir(outputDir);
    console.log(`📁 Output directory: ${outputDir}`);
    
    const videoId = Date.now();
    const finalOutputPath = path.join(outputDir, `video-${videoId}.mp4`);
    console.log(`🎥 Final video path: ${finalOutputPath}`);
    
    // Create video with subtitles using ffmpeg
    console.log('🔄 Creating video with subtitles...');
    await createVideoWithSubtitles(scenes, audioResults, subtitleResults, finalOutputPath);
    console.log('✅ Video creation completed');
    
    const videoData = {
      video_url: `/api/remotion/download/video-${videoId}.mp4`,
      duration: scenes.reduce((total, scene) => total + (scene.audio_duration || 5), 0),
      scenes_count: scenes.length,
      resolution: '1080x1920',
      status: 'completed',
      video_id: videoId
    };

    console.log('🎉 Video composition successful:', videoData);
    res.json({
      success: true,
      data: videoData
    });

  } catch (error) {
    console.error('❌ Error composing video with subtitles:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to compose video with subtitles',
      details: error.message
    });
  }
});

// Create video with subtitles using ffmpeg
async function createVideoWithSubtitles(scenes, audioResults, subtitleResults, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🔄 Starting video creation process...');
      
      // Create temporary directory for video segments
      const tempDir = path.join(__dirname, '../temp');
      await fs.ensureDir(tempDir);
      console.log(`📁 Temp directory: ${tempDir}`);
      
      const videoSegments = [];
      const audioSegments = [];
      const subtitleFiles = [];
      
      // Process each scene
      for (let i = 0; i < scenes.length; i++) {
        console.log(`🎬 Processing scene ${i + 1}/${scenes.length}...`);
        
        const scene = scenes[i];
        const audioResult = audioResults.find(audio => audio.sceneIndex === i);
        const subtitleResult = subtitleResults.find(sub => sub && sub.sceneIndex === i);
        
        console.log(`   Scene ${i + 1}:`, {
          hasImage: !!scene.image_url,
          hasAudio: !!(audioResult && audioResult.audioUrl),
          hasSubtitles: !!(subtitleResult && subtitleResult.segments && subtitleResult.segments.length > 0),
          duration: audioResult ? audioResult.duration : 5,
          audioResult: audioResult
        });
        
        try {
          // Create image path (download from Pollinations.ai if needed)
          const imagePath = await downloadImage(scene.image_url, path.join(tempDir, `scene-${i}.jpg`));
          console.log(`   ✅ Image downloaded: ${imagePath}`);
          
          // Create audio path
          let audioPath = null;
          if (audioResult && audioResult.audioUrl) {
            console.log(`   📥 Attempting to download audio: ${audioResult.audioUrl}`);
            try {
              audioPath = await downloadAudio(audioResult.audioUrl, path.join(tempDir, `audio-${i}.wav`));
              console.log(`   ✅ Audio downloaded: ${audioPath}`);
            } catch (audioError) {
              console.error(`   ❌ Audio download failed:`, audioError);
              console.log(`   ⚠️ Continuing without audio for scene ${i + 1}`);
            }
          } else {
            console.log(`   ⚠️ No audio URL for scene ${i + 1}`);
            console.log(`   🔍 Audio result details:`, audioResult);
          }
          
          // Create subtitle file if available
          let subtitlePath = null;
          if (subtitleResult && subtitleResult.segments && subtitleResult.segments.length > 0) {
            subtitlePath = await createSubtitleFile(subtitleResult.segments, path.join(tempDir, `subtitles-${i}.srt`));
            console.log(`   ✅ Subtitles created: ${subtitlePath}`);
          }
          
          // Get actual duration from audio
          const duration = audioResult ? audioResult.duration : 5;
          
          // Create video segment for this scene with subtitles
          const segmentPath = path.join(tempDir, `segment-${i}.mp4`);
          console.log(`   🎥 Creating video segment: ${segmentPath}`);
          await createVideoSegmentWithSubtitles(imagePath, audioPath, subtitlePath, segmentPath, duration, i);
          console.log(`   ✅ Video segment created: ${segmentPath}`);
          
          videoSegments.push(segmentPath);
          if (audioPath) {
            audioSegments.push(audioPath);
          }
          if (subtitlePath) {
            subtitleFiles.push(subtitlePath);
          }
          
        } catch (sceneError) {
          console.error(`   ❌ Error processing scene ${i + 1}:`, sceneError);
          throw sceneError;
        }
      }
      
      console.log(`🔄 Concatenating ${videoSegments.length} video segments...`);
      // Concatenate all video segments
      await concatenateVideos(videoSegments, outputPath);
      console.log(`✅ Video concatenation completed: ${outputPath}`);
      
      // Clean up temporary files
      console.log('🧹 Cleaning up temporary files...');
      await fs.remove(tempDir);
      console.log('✅ Cleanup completed');
      
      resolve();
      
    } catch (error) {
      console.error('❌ Error in createVideoWithSubtitles:', error);
      reject(error);
    }
  });
}

// Create video from scenes using ffmpeg
async function createVideoFromScenes(scenes, audioResults, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temporary directory for video segments
      const tempDir = path.join(__dirname, '../temp');
      await fs.ensureDir(tempDir);
      
      const videoSegments = [];
      const audioSegments = [];
      
      // Process each scene
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const audioResult = audioResults.find(audio => audio.sceneIndex === i);
        
        // Create image path (download from Pollinations.ai if needed)
        const imagePath = await downloadImage(scene.image_url, path.join(tempDir, `scene-${i}.jpg`));
        
        // Create audio path
        let audioPath = null;
        if (audioResult && audioResult.audioUrl) {
          audioPath = await downloadAudio(audioResult.audioUrl, path.join(tempDir, `audio-${i}.mp3`));
        }
        
        // Create video segment for this scene (5 seconds)
        const segmentPath = path.join(tempDir, `segment-${i}.mp4`);
        await createVideoSegment(imagePath, audioPath, segmentPath, 5);
        
        videoSegments.push(segmentPath);
        if (audioPath) {
          audioSegments.push(audioPath);
        }
      }
      
      // Concatenate all video segments
      await concatenateVideos(videoSegments, outputPath);
      
      // Clean up temporary files
      await fs.remove(tempDir);
      
      resolve();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Download image from URL
async function downloadImage(imageUrl, outputPath) {
  try {
    console.log(`   📥 Downloading image: ${imageUrl}`);
    const axios = require('axios');
    const response = await axios.get(imageUrl, { 
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`   ✅ Image downloaded: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', (error) => {
        console.error(`   ❌ Image download error:`, error);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`   ❌ Error downloading image:`, error);
    throw error;
  }
}

// Download audio from URL
async function downloadAudio(audioUrl, outputPath) {
  try {
    console.log(`   📥 Downloading audio: ${audioUrl}`);
    
    // Handle relative URLs by reading from local filesystem
    if (audioUrl.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', audioUrl);
      console.log(`   📁 Reading local audio file: ${localPath}`);
      
      if (fs.existsSync(localPath)) {
        // Copy file to output path
        fs.copyFileSync(localPath, outputPath);
        console.log(`   ✅ Audio copied: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error(`Audio file not found: ${localPath}`);
      }
    }
    
    // Handle absolute URLs with axios
    const axios = require('axios');
    const response = await axios.get(audioUrl, { 
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`   ✅ Audio downloaded: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', (error) => {
        console.error(`   ❌ Audio download error:`, error);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`   ❌ Error downloading audio:`, error);
    throw error;
  }
}

// Create subtitle file from segments
async function createSubtitleFile(segments, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      let srtContent = '';
      segments.forEach((segment, index) => {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end);
        srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
      });
      
      fs.writeFileSync(outputPath, srtContent, 'utf8');
      resolve(outputPath);
    } catch (error) {
      reject(error);
    }
  });
}

// Format time for SRT format
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

// Create subtitle file from segments with 3-word chunks
async function createSubtitleFile(segments, outputPath) {
  try {
    console.log(`   📝 Creating subtitle file: ${outputPath}`);
    console.log(`   📝 Segments count: ${segments ? segments.length : 0}`);
    
    if (!segments || segments.length === 0) {
      console.log(`   ⚠️ No segments provided for subtitle file`);
      return null;
    }
    
    let srtContent = '';
    let subtitleIndex = 1;
    
    segments.forEach((segment, segmentIndex) => {
      const text = (segment.text || '').trim();
      const duration = (segment.end || segment.start + 2) - (segment.start || 0);
      
      if (text) {
        // Split text into 3-word chunks
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const chunks = [];
        
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(' ');
          if (chunk.trim()) {
            chunks.push(chunk.trim());
          }
        }
        
        console.log(`   📝 Text: "${text}"`);
        console.log(`   📝 Split into ${chunks.length} chunks:`, chunks);
        
        // Create subtitles for each chunk
        chunks.forEach((chunk, chunkIndex) => {
          const chunkDuration = duration / chunks.length;
          const chunkStart = (segment.start || 0) + (chunkIndex * chunkDuration);
          const chunkEnd = chunkStart + chunkDuration;
          
          const startTime = formatTime(chunkStart);
          const endTime = formatTime(chunkEnd);
          
          srtContent += `${subtitleIndex}\n`;
          srtContent += `${startTime} --> ${endTime}\n`;
          srtContent += `${chunk}\n\n`;
          
          subtitleIndex++;
        });
      }
    });
    
    if (srtContent.trim()) {
      await fs.writeFile(outputPath, srtContent, 'utf8');
      console.log(`   ✅ Subtitle file created with ${subtitleIndex - 1} subtitle chunks: ${outputPath}`);
      return outputPath;
    } else {
      console.log(`   ⚠️ No valid subtitle content generated`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error creating subtitle file:`, error);
    return null;
  }
}

// Create video segment with subtitles and zoom effects
async function createVideoSegmentWithSubtitles(imagePath, audioPath, subtitlePath, outputPath, duration, sceneIndex = 0) {
  return new Promise((resolve, reject) => {
    console.log(`   🎬 Creating video segment with subtitles...`);
    console.log(`      Image: ${imagePath}`);
    console.log(`      Audio: ${audioPath || 'none'}`);
    console.log(`      Subtitles: ${subtitlePath || 'none'}`);
    console.log(`      Duration: ${duration}s`);
    console.log(`      Output: ${outputPath}`);
    console.log(`      Scene Index: ${sceneIndex}`);
    
    let command = ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1', `-t ${duration}`])
      .videoCodec('libx264')
      .size('1080x1920')
      .fps(30);
    
    if (audioPath) {
      command = command.input(audioPath);
    }
    
    // Build video filters
    let videoFilters = [];
    
    // Add simple scale effect for now (zoom effects can slow down rendering)
    // We'll use basic scale to ensure fast rendering
    videoFilters.push('scale=1080x1920');
    
    const isEvenScene = sceneIndex % 2 === 0;
    console.log(`   📹 Scene ${sceneIndex + 1} - ${isEvenScene ? 'Even (will have Zoom In when enabled)' : 'Odd (will have Zoom Out when enabled)'}`);
    
    // TODO: Add zoom effects back when performance is optimized
    // if (isEvenScene) {
    //   // Even scenes: Zoom In effect
    //   const zoomFilter = `zoompan=z='min(1+0.0008*t,1.15)':d=${Math.round(duration * 30)}`;
    //   videoFilters.push(zoomFilter);
    // } else {
    //   // Odd scenes: Zoom Out effect
    //   const zoomFilter = `zoompan=z='max(1.15-0.0008*t,1)':d=${Math.round(duration * 30)}`;
    //   videoFilters.push(zoomFilter);
    // }
    
    if (subtitlePath) {
      // Escape subtitle path for FFmpeg (Windows path handling)
      const escapedSubtitlePath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      console.log(`   📝 Using subtitle file: ${escapedSubtitlePath}`);
      
      // Create subtitle filter with attractive styling (smaller font for 3-word chunks)
      const subtitleFilter = `subtitles='${escapedSubtitlePath}':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Shadow=1,Alignment=2,MarginV=30'`;
      videoFilters.push(subtitleFilter);
    }
    
    // Apply video filters
    if (videoFilters.length > 0) {
      command = command.outputOptions(['-vf', videoFilters.join(',')]);
    }
    
    command
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .outputOptions(['-c:a aac'])
      .output(outputPath);
    
    command
      .on('start', (commandLine) => {
        console.log(`   🔄 FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`   📊 Progress: ${progress.percent}%`);
      })
      .on('end', () => {
        console.log(`   ✅ Video segment created successfully`);
        resolve();
      })
      .on('error', (error) => {
        console.error(`   ❌ FFmpeg error:`, error);
        reject(error);
      })
      .run();
  });
}

// Create video segment from image and audio
async function createVideoSegment(imagePath, audioPath, outputPath, duration) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1', `-t ${duration}`])
      .videoCodec('libx264')
      .size('1080x1920')
      .fps(30);
    
    if (audioPath) {
      command = command.input(audioPath);
    }
    
    command
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

// Concatenate video segments
async function concatenateVideos(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    // Create concat file for ffmpeg
    const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = segmentPaths.map(segment => `file '${segment}'`).join('\n');
    fs.writeFileSync(concatFile, concatContent);
    
    ffmpeg()
      .input(concatFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', () => {
        fs.removeSync(concatFile);
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

// Get video composition status
router.get('/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Mock status (replace with actual status tracking)
    const status = {
      video_id: videoId,
      status: 'completed',
      progress: 100,
      output_url: `/output/video-${videoId}.mp4`,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video status',
      details: error.message
    });
  }
});

// Download generated video
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../output', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Video file not found'
      });
    }

    res.download(filePath, filename);

  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download video',
      details: error.message
    });
  }
});

module.exports = router;
