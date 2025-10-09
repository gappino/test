const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();

// Video composition with subtitles endpoint
router.post('/compose-video-with-subtitles', async (req, res) => {
  try {
    const { scenes, audioResults, subtitleResults, backgroundMusic } = req.body;
    
    console.log('🎬 Starting video composition with subtitles...');
    console.log(`   Scenes: ${scenes ? scenes.length : 'undefined'}`);
    console.log(`   Audio results: ${audioResults ? audioResults.length : 'undefined'}`);
    console.log(`   Subtitle results: ${subtitleResults ? subtitleResults.length : 'undefined'}`);
    console.log(`   Background music: ${backgroundMusic || 'none'}`);
    console.log('🎵 Full request body:', req.body);
    console.log('🎵 backgroundMusic type:', typeof backgroundMusic);
    console.log('🎵 backgroundMusic value:', backgroundMusic);
    
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
    await createVideoWithSubtitles(scenes, audioResults, subtitleResults, finalOutputPath, backgroundMusic);
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

function resolveSceneIndex(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const stringValue = `${value}`.trim();
    if (!stringValue) {
      continue;
    }

    const parsed = Number(stringValue);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }

    const match = stringValue.match(/\d+/);
    if (match) {
      const fromMatch = Number(match[0]);
      if (!Number.isNaN(fromMatch) && Number.isFinite(fromMatch)) {
        return fromMatch;
      }
    }
  }

  return null;
}

function hasExplicitSceneIndex(scene) {
  if (!scene) {
    return false;
  }

  return (
    (scene.sceneIndex !== undefined && scene.sceneIndex !== null) ||
    (scene.scene_index !== undefined && scene.scene_index !== null) ||
    (scene.index !== undefined && scene.index !== null)
  );
}

function getSceneNumberValue(scene) {
  if (!scene) {
    return null;
  }

  return resolveSceneIndex(scene.sceneNumber, scene.scene_number);
}

function toZeroBasedIndex(value) {
  if (value === null || value === undefined) {
    return value;
  }

  return value > 0 ? value - 1 : value;
}

function normalizeTextForMatch(text) {
  if (!text) {
    return '';
  }

  return `${text}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCandidateText(candidate) {
  if (!candidate) {
    return '';
  }

  if (candidate.text) {
    return candidate.text;
  }

  if (Array.isArray(candidate.segments)) {
    return candidate.segments
      .map((segment) => (segment && segment.text ? segment.text : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return '';
}

function ensureSubtitleAlignment(
  subtitleResult,
  audioResult,
  subtitleLookup,
  scene,
  fallbackIndex,
  resolvedSceneIndex
) {
  if (!subtitleLookup || !audioResult) {
    return subtitleResult;
  }

  const tryResolveFromLookup = () => {
    const candidates = [];

    if (audioResult.sceneIndex !== null && audioResult.sceneIndex !== undefined) {
      const byIndexCandidate = subtitleLookup.bySceneIndex?.get(audioResult.sceneIndex);
      if (byIndexCandidate) {
        candidates.push(byIndexCandidate);
      }
    }

    const audioSceneIdCandidates = [audioResult.sceneId, audioResult.scene_id, audioResult.id];
    for (const id of audioSceneIdCandidates) {
      if (id !== null && id !== undefined && subtitleLookup.bySceneId?.has(id)) {
        candidates.push(subtitleLookup.bySceneId.get(id));
      }
    }

    if (resolvedSceneIndex !== null && resolvedSceneIndex !== undefined) {
      const resolvedCandidate = subtitleLookup.bySceneIndex?.get(resolvedSceneIndex);
      if (resolvedCandidate) {
        candidates.push(resolvedCandidate);
      }
    }

    if (fallbackIndex !== null && fallbackIndex !== undefined) {
      const fallbackCandidate = subtitleLookup.bySceneIndex?.get(fallbackIndex);
      if (fallbackCandidate) {
        candidates.push(fallbackCandidate);
      }
    }

    return candidates.filter(Boolean);
  };

  const expectedTexts = new Set();
  [audioResult.text, scene ? scene.subtitle_text : null, scene ? scene.speaker_text : null]
    .filter(Boolean)
    .forEach((value) => {
      const normalized = normalizeTextForMatch(value);
      if (normalized) {
        expectedTexts.add(normalized);
      }
    });

  const matchesExpectation = (candidate) => {
    if (!candidate) {
      return false;
    }
    if (expectedTexts.size === 0) {
      return Boolean(candidate.segments && candidate.segments.length);
    }

    const candidateText = extractCandidateText(candidate);
    if (!candidateText) {
      return false;
    }

    const normalizedCandidate = normalizeTextForMatch(candidateText);
    if (!normalizedCandidate) {
      return false;
    }

    if (expectedTexts.has(normalizedCandidate)) {
      return true;
    }

    if (normalizedCandidate.includes('...')) {
      for (const expected of expectedTexts) {
        if (normalizedCandidate.startsWith(expected) || expected.startsWith(normalizedCandidate)) {
          return true;
        }
      }
    }

    return false;
  };

  if (matchesExpectation(subtitleResult)) {
    return subtitleResult;
  }

  const preferredCandidates = tryResolveFromLookup();
  for (const candidate of preferredCandidates) {
    if (matchesExpectation(candidate)) {
      console.warn('   🔄 Realigned subtitles based on audio scene index/id');
      return candidate;
    }
  }

  const searchPool = subtitleLookup.ordered || [];
  for (const candidate of searchPool) {
    if (matchesExpectation(candidate)) {
      console.warn('   🔄 Realigned subtitles by matching text content');
      return candidate;
    }
  }

  if (!subtitleResult) {
    const fallbackText = audioResult.text || (scene ? scene.speaker_text : null) || null;
    if (fallbackText) {
      console.warn('   ⚠️ Creating fallback subtitles from audio text');
      return {
        sceneIndex: resolvedSceneIndex,
        sceneId: audioResult.sceneId || scene?.sceneId || scene?.scene_id || scene?.id || null,
        text: fallbackText,
        engine: 'Fallback (Audio Text)',
        segments: [
          {
            start: 0,
            end: audioResult.duration || scene?.audio_duration || 5,
            text: fallbackText
          }
        ]
      };
    }
  }

  return subtitleResult;
}

function getAssetSceneIndex(asset, fallbackIndex = null) {
  if (!asset) {
    return fallbackIndex;
  }

  if (typeof asset === 'number' && Number.isFinite(asset)) {
    return asset;
  }

  const explicitIndex = resolveSceneIndex(
    asset.sceneIndex,
    asset.scene_index,
    asset.index
  );

  if (explicitIndex !== null && explicitIndex !== undefined) {
    return explicitIndex;
  }

  const sceneNumberValue = resolveSceneIndex(asset.sceneNumber, asset.scene_number);
  if (sceneNumberValue !== null && sceneNumberValue !== undefined) {
    return toZeroBasedIndex(sceneNumberValue);
  }

  if (
    asset.sceneIndex === undefined &&
    asset.scene_index === undefined &&
    asset.index === undefined &&
    (asset.sceneNumber === undefined || asset.sceneNumber === null) &&
    (asset.scene_number === undefined || asset.scene_number === null)
  ) {
    return fallbackIndex;
  }

  return fallbackIndex;
}

function extractAudioFromScene(scene, resolvedSceneIndex) {
  if (!scene) {
    return null;
  }

  const audioUrl = scene.audio_url || scene.audioUrl;
  if (!audioUrl) {
    return null;
  }

  const duration =
    scene.audio_duration ||
    scene.audioDuration ||
    scene.duration ||
    null;

  const normalizedSceneIndex = getAssetSceneIndex(scene, resolvedSceneIndex);

  return {
    audioUrl,
    duration: duration || 5,
    text: scene.subtitle_text || scene.speaker_text || scene.text || '',
    sceneIndex: normalizedSceneIndex,
    sceneNumber: scene.sceneNumber || scene.scene_number || null,
    sceneId: scene.sceneId || scene.scene_id || scene.id || null
  };
}

function extractSubtitlesFromScene(scene, resolvedSceneIndex) {
  if (!scene) {
    return null;
  }

  const segments =
    scene.subtitles ||
    scene.subtitleResults ||
    scene.subtitle_segments ||
    null;

  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const normalizedSceneIndex = getAssetSceneIndex(scene, resolvedSceneIndex);

  return {
    segments,
    text: scene.subtitle_text || scene.speaker_text || scene.text || '',
    sceneIndex: normalizedSceneIndex,
    sceneNumber: scene.sceneNumber || scene.scene_number || null,
    sceneId: scene.sceneId || scene.scene_id || scene.id || null
  };
}

function buildSceneAssetLookup(results) {
  const ordered = [];
  const bySceneIndex = new Map();
  const bySceneId = new Map();
  let hasSceneIndex = false;
  let hasSceneId = false;

  if (!Array.isArray(results)) {
    return { ordered, bySceneIndex, bySceneId, hasSceneIndex, hasSceneId };
  }

  results.forEach((result, idx) => {
    if (!result) {
      ordered[idx] = null;
      return;
    }

    ordered[idx] = result;

    const normalizedSceneIndex = getAssetSceneIndex(result, idx);

    if (
      normalizedSceneIndex !== null &&
      normalizedSceneIndex !== undefined
    ) {
      if (!bySceneIndex.has(normalizedSceneIndex)) {
        bySceneIndex.set(normalizedSceneIndex, result);
      }
      hasSceneIndex = true;
    }

    if (!bySceneIndex.has(idx)) {
      bySceneIndex.set(idx, result);
    }

    const candidateIds = [result.sceneId, result.scene_id, result.id];
    candidateIds.forEach((id) => {
      if (id === undefined || id === null || bySceneId.has(id)) {
        return;
      }
      bySceneId.set(id, result);
      hasSceneId = true;
    });
  });

  return { ordered, bySceneIndex, bySceneId, hasSceneIndex, hasSceneId };
}

function findSceneAsset(lookup, scene, fallbackIndex, explicitSceneIndex = null) {
  if (!lookup) {
    return null;
  }

  const { bySceneId, bySceneIndex, ordered, hasSceneId, hasSceneIndex } = lookup;
  const sceneNumberValue = getSceneNumberValue(scene);
  const sceneHasExplicitIndex = hasExplicitSceneIndex(scene);

  if (hasSceneId && scene) {
    const candidateIds = [scene.sceneId, scene.scene_id, scene.id];
    for (const id of candidateIds) {
      if (id === undefined || id === null) {
        continue;
      }
      if (bySceneId.has(id)) {
        return bySceneId.get(id);
      }
    }
  }

  let sceneIndexValue = getAssetSceneIndex(
    scene,
    explicitSceneIndex !== null && explicitSceneIndex !== undefined
      ? explicitSceneIndex
      : fallbackIndex
  );

  const zeroBasedSceneNumber = toZeroBasedIndex(sceneNumberValue);
 
  if (
    !sceneHasExplicitIndex &&
    sceneIndexValue !== null &&
    sceneIndexValue !== undefined &&
    sceneNumberValue !== null &&
    sceneNumberValue !== undefined &&
    sceneIndexValue === sceneNumberValue
  ) {
    sceneIndexValue = zeroBasedSceneNumber;
  }

  const indexCandidates = [];

  if (sceneIndexValue !== null && sceneIndexValue !== undefined) {
    indexCandidates.push(sceneIndexValue);
  }

  if (
    zeroBasedSceneNumber !== null &&
    zeroBasedSceneNumber !== undefined &&
    !indexCandidates.includes(zeroBasedSceneNumber)
  ) {
    indexCandidates.push(zeroBasedSceneNumber);
  }

  if (
    fallbackIndex !== null &&
    fallbackIndex !== undefined &&
    !indexCandidates.includes(fallbackIndex)
  ) {
    indexCandidates.push(fallbackIndex);
  }

  for (const key of indexCandidates) {
    if (key === null || key === undefined) {
      continue;
    }

    if (bySceneIndex.has(key)) {
      const candidate = bySceneIndex.get(key);
      if (candidate) {
        return candidate;
      }
    }
  }

  const sequentialPreference =
    sceneIndexValue !== null && sceneIndexValue !== undefined
      ? sceneIndexValue
      : fallbackIndex;
 
  if (sequentialPreference !== null && sequentialPreference !== undefined) {
    let sequentialCandidate = ordered[sequentialPreference];
 
    if (!sequentialCandidate && fallbackIndex !== null && fallbackIndex !== undefined) {
      sequentialCandidate = ordered[fallbackIndex];
      if (sequentialCandidate) {
        console.warn(`   ⚠️ Using fallback index ${fallbackIndex} for sequential asset mapping (preferred index ${sequentialPreference} empty)`);
      }
    }
 
    if (!sequentialCandidate) {
      sequentialCandidate = ordered.find((candidate, idx) => {
        if (!candidate) return false;
        const candidateIndex = getAssetSceneIndex(candidate, idx);
        if (candidate.audioUrl && candidateIndex !== null && candidateIndex !== sequentialPreference) {
          console.warn(`   ⚠️ Sequential fallback using audio intended for scene index ${candidateIndex}`);
        }
        return Boolean(candidate);
      });
      if (sequentialCandidate) {
        console.warn('   ⚠️ Using first available asset as sequential fallback');
      }
    }
 
    if (sequentialCandidate) {
      const candidateSceneIndex = resolveSceneIndex(
        sequentialCandidate.sceneIndex,
        sequentialCandidate.scene_index,
        sequentialCandidate.index,
        sequentialCandidate.sceneNumber,
        sequentialCandidate.scene_number
      );

      if (
        !hasSceneIndex ||
        candidateSceneIndex === null ||
        candidateSceneIndex === sequentialPreference
      ) {
        return sequentialCandidate;
      }
    }
  }

  return null;
}

// Create video with subtitles using ffmpeg
async function createVideoWithSubtitles(scenes, audioResults, subtitleResults, outputPath, backgroundMusic = '') {
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

      const audioLookup = buildSceneAssetLookup(audioResults);
      const subtitleLookup = buildSceneAssetLookup(subtitleResults);
      
      // Process each scene
      for (let i = 0; i < scenes.length; i++) {
        console.log(`🎬 Processing scene ${i + 1}/${scenes.length}...`);
        
        const scene = scenes[i];
        const sceneNumberValue = getSceneNumberValue(scene);
        const explicitSceneIndex = hasExplicitSceneIndex(scene)
          ? resolveSceneIndex(
              scene ? scene.sceneIndex : undefined,
              scene ? scene.scene_index : undefined,
              scene ? scene.index : undefined
            )
          : null;

        const resolvedSceneIndex =
          explicitSceneIndex !== null && explicitSceneIndex !== undefined
            ? explicitSceneIndex
            : sceneNumberValue !== null && sceneNumberValue !== undefined
            ? toZeroBasedIndex(sceneNumberValue)
            : i;

        const sceneOrientation =
          (scene && scene.orientation)
            ? scene.orientation
            : (scene && (scene.isHorizontal || scene.video_type === 'long-form' || scene.videoType === 'long-form'))
            ? 'horizontal'
            : null;

        let audioResult = findSceneAsset(
          audioLookup,
          scene,
          i,
          resolvedSceneIndex
        );

        if (!audioResult) {
          audioResult = extractAudioFromScene(scene, resolvedSceneIndex);

          if (!audioResult) {
            console.warn(`   ⚠️ No audio asset found for scene ${i + 1}; falling back to sequential index ${i}`);
          }
        }

        if (audioResult && !audioResult.audioUrl) {
          console.warn(`   ⚠️ Audio asset found for scene ${i + 1} but missing audioUrl`);
        }

        if (audioResult) {
          if (audioResult.sceneIndex === null || audioResult.sceneIndex === undefined) {
            audioResult.sceneIndex = resolvedSceneIndex;
          }

          if (scene && (audioResult.sceneId === undefined || audioResult.sceneId === null)) {
            audioResult.sceneId = scene.sceneId || scene.scene_id || scene.id || null;
          }
        }

        let subtitleResult = findSceneAsset(
          subtitleLookup,
          scene,
          i,
          resolvedSceneIndex
        );

        if (!subtitleResult) {
          subtitleResult = extractSubtitlesFromScene(scene, resolvedSceneIndex);

          if (!subtitleResult) {
            console.warn(`   ⚠️ No subtitles found for scene ${i + 1}; continuing without subtitles.`);
          }
        }

        if (subtitleResult) {
          if (subtitleResult.sceneIndex === null || subtitleResult.sceneIndex === undefined) {
            subtitleResult.sceneIndex = resolvedSceneIndex;
          }

          if (scene && (subtitleResult.sceneId === undefined || subtitleResult.sceneId === null)) {
            subtitleResult.sceneId = scene.sceneId || scene.scene_id || scene.id || null;
          }
        }

        subtitleResult = ensureSubtitleAlignment(
          subtitleResult,
          audioResult,
          subtitleLookup,
          scene,
          i,
          resolvedSceneIndex
        );

        console.log(`   📝 Subtitle alignment for scene ${i + 1}:`, {
          audioText: audioResult ? audioResult.text : null,
          subtitleText: subtitleResult ? extractCandidateText(subtitleResult) : null,
          audioSceneIndex: audioResult ? audioResult.sceneIndex : null,
          subtitleSceneIndex: subtitleResult ? subtitleResult.sceneIndex : null
        });

        if (!subtitleResult || !subtitleResult.segments || subtitleResult.segments.length === 0) {
          console.warn(`   ⚠️ No subtitle segments aligned for scene ${i + 1}`);
        }

        console.log(`   Scene ${i + 1}:`, {
          hasImage: !!scene.image_url,
          hasAudio: !!(audioResult && audioResult.audioUrl),
          hasSubtitles: !!(subtitleResult && subtitleResult.segments && subtitleResult.segments.length > 0),
          duration: audioResult ? audioResult.duration : 5,
          resolvedSceneIndex,
          orientation: sceneOrientation || 'vertical',
          audioResultSceneIndex: audioResult ? resolveSceneIndex(audioResult.sceneIndex, audioResult.scene_index, audioResult.index) : 'none',
          audioText: audioResult ? audioResult.text : 'none'
        });
        
        try {
          // Create image path (download from Pollinations.ai if needed)
          let imagePath;
          if (scene.image_url) {
            imagePath = await downloadImage(scene.image_url, path.join(tempDir, `scene-${i}.jpg`));
            console.log(`   ✅ Image downloaded: ${imagePath}`);
          } else {
            // Generate fallback image using Pollinations.ai
            console.log(`   🖼️ No image URL provided, generating fallback image for scene ${i}`);
            const fallbackImageUrl = `https://pollinations.ai/p/${encodeURIComponent(scene.visual_description || 'abstract art')}?width=1080&height=1920&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
            imagePath = await downloadImage(fallbackImageUrl, path.join(tempDir, `scene-${i}.jpg`));
            console.log(`   ✅ Fallback image generated: ${imagePath}`);
          }
          
          // Create audio path
          let audioPath = null;
          if (audioResult && audioResult.audioUrl) {
            console.log(`   📥 Attempting to download audio: ${audioResult.audioUrl}`);
            try {
              audioPath = await downloadAudio(audioResult.audioUrl, path.join(tempDir, `audio-${i}.wav`));
              console.log(`   ✅ Audio downloaded: ${audioPath}`);
              
              // Verify audio file exists and has content
              if (fs.existsSync(audioPath)) {
                const stats = fs.statSync(audioPath);
                console.log(`   📊 Audio file size: ${stats.size} bytes`);
                if (stats.size < 1000) {
                  console.log(`   ⚠️ Audio file too small, might be corrupted`);
                  // Try to use the original file directly
                  const originalPath = audioResult.audioUrl.startsWith('/') ? 
                    path.resolve(process.cwd(), audioResult.audioUrl.substring(1)) : 
                    audioResult.audioUrl;
                  if (fs.existsSync(originalPath)) {
                    console.log(`   🔄 Using original audio file: ${originalPath}`);
                    await fs.copy(originalPath, audioPath);
                  }
                }
              } else {
                console.log(`   ❌ Audio file not found after download`);
                audioPath = null;
              }
            } catch (audioError) {
              console.error(`   ❌ Audio download failed:`, audioError);
              console.log(`   ⚠️ Continuing without audio for scene ${i + 1}`);
              audioPath = null;
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
          await createVideoSegmentWithSubtitles(
            imagePath,
            audioPath,
            subtitlePath,
            segmentPath,
            duration,
            i,
            sceneOrientation === 'horizontal',
            scene
          );
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
      // Concatenate all video segments with background music
      await concatenateVideos(videoSegments, outputPath, backgroundMusic);
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
      await concatenateVideos(videoSegments, outputPath, backgroundMusic);
      
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
    
    // Check if imageUrl is null or undefined
    if (!imageUrl) {
      throw new Error('Image URL is null or undefined');
    }
    
    // Check if it's a local URL (starts with /)
    if (imageUrl.startsWith('/')) {
      // It's a local file, copy it instead of downloading
      // Remove leading slash and build absolute path
      const cleanPath = imageUrl.substring(1);
      const localPath = path.resolve(process.cwd(), cleanPath);
      console.log(`   📁 Copying local image: ${localPath}`);
      
      // Check if file exists
      if (await fs.pathExists(localPath)) {
        await fs.copy(localPath, outputPath);
        console.log(`   ✅ Local image copied: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error(`Local image not found: ${localPath}`);
      }
    }
    
    // It's a remote URL, download it
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
    if (audioUrl.startsWith('/')) {
      const cleanPath = audioUrl.substring(1);
      const localPath = path.resolve(process.cwd(), cleanPath);
      console.log(`   📁 Reading local audio file: ${localPath}`);
      
      if (await fs.pathExists(localPath)) {
        // Check if the file is already in the correct format
        const stats = await fs.stat(localPath);
        console.log(`   📊 Original audio file size: ${stats.size} bytes`);
        
        // For Persian audio files, try to use them directly first
        if (localPath.includes('piper_tts_') || localPath.includes('fa_IR')) {
          console.log(`   🎵 Persian audio detected, using direct copy`);
          await fs.copy(localPath, outputPath);
          console.log(`   ✅ Persian audio copied directly: ${outputPath}`);
          return outputPath;
        } else {
          // Convert other audio files to WAV format
          await convertAudioToWav(localPath, outputPath);
          console.log(`   ✅ Audio converted to WAV: ${outputPath}`);
          return outputPath;
        }
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
    
    const tempPath = outputPath.replace('.wav', '_temp.wav');
    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        try {
          // Convert to proper WAV format
          await convertAudioToWav(tempPath, outputPath);
          await fs.remove(tempPath); // Clean up temp file
          console.log(`   ✅ Audio downloaded and converted: ${outputPath}`);
          resolve(outputPath);
        } catch (convertError) {
          console.error(`   ❌ Audio conversion error:`, convertError);
          reject(convertError);
        }
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

// Convert audio to WAV format with proper settings
async function convertAudioToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`   🔄 Converting audio: ${inputPath} -> ${outputPath}`);
    
    ffmpeg(inputPath)
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(22050)
      .audioBitrate('128k')
      .outputOptions(['-acodec', 'pcm_s16le'])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log(`   🔄 FFmpeg conversion command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`   📊 Conversion progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`   ✅ Audio converted to WAV: ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
        console.error(`   ❌ Audio conversion error:`, error);
        reject(error);
      })
      .run();
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
async function createVideoSegmentWithSubtitles(imagePath, audioPath, subtitlePath, outputPath, duration, sceneIndex = 0, isHorizontal = false, scene = null) {
  return new Promise((resolve, reject) => {
    const videoSize = isHorizontal ? '1920x1080' : '1080x1920';
    const orientation = isHorizontal ? 'افقی' : 'عمودی';
    
    console.log(`   🎬 Creating video segment with subtitles (${orientation})...`);
    console.log(`      Image: ${imagePath}`);
    console.log(`      Audio: ${audioPath || 'none'}`);
    console.log(`      Subtitles: ${subtitlePath || 'none'}`);
    console.log(`      Duration: ${duration}s`);
    console.log(`      Resolution: ${videoSize}`);
    console.log(`      Output: ${outputPath}`);
    console.log(`      Scene Index: ${sceneIndex}`);
    
    let command = ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1', `-t ${duration}`])
      .videoCodec('libx264')
      .size(videoSize)
      .fps(30);
    
    // Handle audio input
    if (audioPath && fs.existsSync(audioPath)) {
      console.log(`   🎵 Adding audio input: ${audioPath}`);
      const audioStats = fs.statSync(audioPath);
      console.log(`   📊 Audio file size: ${audioStats.size} bytes`);
      
      command = command.input(audioPath)
        .inputOptions([`-t ${duration}`])
        .audioCodec('aac')
        .audioBitrate('128k')
        .audioChannels(1)
        .audioFrequency(22050);
    } else {
      console.log(`   🔇 Creating silent audio track (no audio file found)`);
      // Create silent audio track
      command = command.inputOptions(['-f lavfi', '-i anullsrc=channel_layout=mono:sample_rate=22050'])
        .inputOptions([`-t ${duration}`])
        .audioCodec('aac')
        .audioBitrate('128k')
        .audioChannels(1)
        .audioFrequency(22050);
    }
    
    // Build video filters
    let videoFilters = [];
    
    // Add scale filter based on orientation
    const scaleResolution = isHorizontal ? 'scale=1920x1080' : 'scale=1080x1920';
    videoFilters.push(scaleResolution);
    
    // Add subtitle filter if available
    if (subtitlePath && fs.existsSync(subtitlePath)) {
      const escapedSubtitlePath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      console.log(`   📝 Adding subtitle filter: ${escapedSubtitlePath}`);
      
      // Get subtitle settings from scene or use defaults
      // For short videos (vertical orientation), use custom styling
      const isShortVideo = !isHorizontal; // Short videos are vertical
      const subtitleSettings = (scene && scene.subtitleSettings) ? scene.subtitleSettings : {
        font: 'Arial',
        size: isShortVideo ? 12 : 24, // Smaller font for short videos
        color: isShortVideo ? '#ffff00' : '#ffffff', // Yellow for short videos
        outline: 2,
        position: 2,
        margin: 30,
        backgroundColor: isShortVideo ? '#808080' : 'transparent' // Gray background for short videos
      };
      
      // Convert hex color to ASS format (&HAABBGGRR - note: BGR not RGB)
      const hexToAss = (hex) => {
        const r = hex.slice(1, 3);
        const g = hex.slice(3, 5);
        const b = hex.slice(5, 7);
        return `&H${b}${g}${r}`;
      };
      
      const primaryColor = hexToAss(subtitleSettings.color || '#ffffff');
      const outlineColor = hexToAss('#000000');
      const backgroundColor = subtitleSettings.backgroundColor ? hexToAss(subtitleSettings.backgroundColor) : '&H00000000'; // Transparent by default
      
      // Build subtitle filter with background support for short videos
      let subtitleFilter;
      if (isShortVideo && subtitleSettings.backgroundColor) {
        // For short videos with background, use a more complex filter
        subtitleFilter = `subtitles='${escapedSubtitlePath}':force_style='FontName=${subtitleSettings.font || 'Arial'},FontSize=${subtitleSettings.size || 12},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},Outline=${subtitleSettings.outline || 2},Shadow=1,Alignment=${subtitleSettings.position || 2},MarginV=${subtitleSettings.margin || 30},BackColour=${backgroundColor},BorderStyle=3'`;
      } else {
        // Standard subtitle filter for long videos
        subtitleFilter = `subtitles='${escapedSubtitlePath}':force_style='FontName=${subtitleSettings.font || 'Arial'},FontSize=${subtitleSettings.size || 24},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},Outline=${subtitleSettings.outline || 2},Shadow=1,Alignment=${subtitleSettings.position || 2},MarginV=${subtitleSettings.margin || 30}'`;
      }
      videoFilters.push(subtitleFilter);
    }
    
    // Apply video filters
    if (videoFilters.length > 0) {
      command = command.outputOptions(['-vf', videoFilters.join(',')]);
    }
    
    // Set output options
    command
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-preset fast', '-crf 23'])
      .outputOptions(['-c:a aac', '-b:a 128k', '-ar 22050', '-ac 1'])
      .outputOptions(['-movflags', '+faststart'])
      .output(outputPath);
    
    command
      .on('start', (commandLine) => {
        console.log(`   🔄 FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`   📊 Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`   ✅ Video segment created successfully: ${outputPath}`);
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
async function concatenateVideos(segmentPaths, outputPath, backgroundMusic = '') {
  return new Promise((resolve, reject) => {
    // Create concat file for ffmpeg
    const concatFile = path.join(path.dirname(outputPath), 'concat.txt');
    const concatContent = segmentPaths.map(segment => `file '${segment}'`).join('\n');
    fs.writeFileSync(concatFile, concatContent);
    
    let ffmpegCommand = ffmpeg()
      .input(concatFile)
      .inputOptions(['-f', 'concat', '-safe', '0']);
    
    // Add background music if specified
    if (backgroundMusic && backgroundMusic.trim() !== '') {
      const musicPath = path.join(__dirname, '../background_music', backgroundMusic);
      console.log(`🎵 Checking background music: ${backgroundMusic}`);
      console.log(`🎵 Music path: ${musicPath}`);
      console.log(`🎵 Music exists: ${fs.existsSync(musicPath)}`);
      
      if (fs.existsSync(musicPath)) {
        console.log(`🎵 Adding background music: ${backgroundMusic}`);
        ffmpegCommand = ffmpegCommand
          .input(musicPath)
          .inputOptions(['-stream_loop', '-1']) // Loop the music
          .complexFilter([
            '[0:a]volume=1.0[voice]',
            '[1:a]volume=0.3[music]',
            '[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]'
          ])
          .outputOptions(['-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k']);
      } else {
        console.log(`⚠️ Background music file not found: ${musicPath}`);
        ffmpegCommand = ffmpegCommand.outputOptions(['-c', 'copy']);
      }
    } else {
      console.log(`🎵 No background music specified`);
      ffmpegCommand = ffmpegCommand.outputOptions(['-c', 'copy']);
    }
    
    ffmpegCommand
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

// Long form video composition with resource limits
router.post('/compose-long-form-video-with-subtitles', async (req, res) => {
  try {
    const { scenes, audioResults, subtitleResults, videoType = 'long-form', backgroundMusic = '' } = req.body;
    
    console.log('🎬 Starting long form video composition with resource limits...');
    console.log(`   Video Type: ${videoType}`);
    console.log(`   Scenes: ${scenes ? scenes.length : 'undefined'}`);
    console.log(`   Audio results: ${audioResults ? audioResults.length : 'undefined'}`);
    console.log(`   Subtitle results: ${subtitleResults ? subtitleResults.length : 'undefined'}`);
    console.log(`   Background music: ${backgroundMusic || 'none'}`);
    console.log('🎵 Full request body:', req.body);
    console.log('🎵 backgroundMusic type:', typeof backgroundMusic);
    console.log('🎵 backgroundMusic value:', backgroundMusic);
    
    if (!scenes || !Array.isArray(scenes)) {
      console.error('❌ Scenes array is required');
      return res.status(400).json({
        success: false,
        error: 'Scenes array is required'
      });
    }

    // محدود کردن تعداد صحنه‌ها برای جلوگیری از کرش (حداکثر 100 صحنه)
    if (scenes.length > 100) {
      console.log(`⚠️ Limiting scenes to 100 (was ${scenes.length})`);
      scenes.splice(100);
    }

    // Create output directory
    const outputDir = path.join(__dirname, '../output');
    await fs.ensureDir(outputDir);
    console.log(`📁 Output directory: ${outputDir}`);
    
    const videoId = Date.now();
    const finalOutputPath = path.join(outputDir, `long-form-video-${videoId}.mp4`);
    console.log(`🎥 Final video path: ${finalOutputPath}`);
    
    // Create video with subtitles using ffmpeg
    console.log('🔄 Creating video with subtitles...');
    await createVideoWithSubtitles(scenes, audioResults, subtitleResults, finalOutputPath, backgroundMusic);
    console.log('✅ Video creation completed');
    
    const videoData = {
      video_url: `/api/remotion/download/long-form-video-${videoId}.mp4`,
      duration: scenes.reduce((total, scene) => total + (scene.audio_duration || 5), 0),
      scenes_count: scenes.length,
      resolution: '1920x1080',
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

module.exports = router;