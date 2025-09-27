#!/usr/bin/env node
/**
 * Test script for the complete video generation pipeline with subtitles
 * This script tests the integration between Kokoro TTS, Whisper, and FFmpeg
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

async function testCompletePipeline() {
  console.log('🧪 Testing Complete Video Pipeline with Subtitles');
  console.log('=' .repeat(60));
  
  try {
    // Test data
    const testScript = {
      scenes: [
        {
          scene_number: 1,
          speaker_text: "Did you know that artificial intelligence is changing our world?",
          visual_description: "A futuristic city with AI robots and technology"
        },
        {
          scene_number: 2,
          speaker_text: "From face recognition to content generation, AI is everywhere",
          visual_description: "Various AI applications in daily life"
        },
        {
          scene_number: 3,
          speaker_text: "But what does the future hold for us?",
          visual_description: "A person looking into the future with question marks"
        }
      ]
    };

    const testImages = [
      {
        sceneIndex: 0,
        imageUrl: "https://pollinations.ai/p/artificial%20intelligence%20city%20futuristic"
      },
      {
        sceneIndex: 1,
        imageUrl: "https://pollinations.ai/p/AI%20applications%20daily%20life%20technology"
      },
      {
        sceneIndex: 2,
        imageUrl: "https://pollinations.ai/p/person%20looking%20future%20question%20marks"
      }
    ];

    const audioSettings = {
      voice: 'af_heart'
    };

    console.log('📝 Test script prepared with 3 scenes');
    console.log('🖼️ Test images prepared');
    console.log('🎤 Audio settings: af_heart voice');
    
    console.log('\n🚀 Starting video generation...');
    
    const response = await fetch(`${BASE_URL}/api/video/generate-complete-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        script: testScript,
        images: testImages,
        audioSettings: audioSettings
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Video generation successful!');
      console.log('📊 Results:');
      console.log(`   Video URL: ${result.data.video_url}`);
      console.log(`   Duration: ${result.data.duration} seconds`);
      console.log(`   Scenes: ${result.data.scenes_count}`);
      console.log(`   Resolution: ${result.data.resolution}`);
      console.log(`   Status: ${result.data.status}`);
      
      console.log('\n🎬 Scene details:');
      result.data.scenes.forEach((scene, index) => {
        console.log(`   Scene ${index + 1}:`);
        console.log(`     Text: ${scene.speaker_text}`);
        console.log(`     Has Audio: ${!!scene.audio_url}`);
        console.log(`     Has Subtitles: ${scene.subtitles && scene.subtitles.length > 0}`);
        console.log(`     Subtitle Count: ${scene.subtitles ? scene.subtitles.length : 0}`);
        if (scene.subtitles && scene.subtitles.length > 0) {
          console.log(`     First Subtitle: "${scene.subtitles[0].text}" (${scene.subtitles[0].start}s - ${scene.subtitles[0].end}s)`);
        }
      });
      
      console.log('\n🎤 Audio results:');
      result.data.audio_results.forEach((audio, index) => {
        console.log(`   Scene ${index + 1}: ${audio.engine} - ${audio.duration}s`);
      });
      
      console.log('\n📝 Subtitle results:');
      result.data.subtitle_results.forEach((subtitle, index) => {
        if (subtitle) {
          console.log(`   Scene ${index + 1}: ${subtitle.segments ? subtitle.segments.length : 0} segments`);
          if (subtitle.segments && subtitle.segments.length > 0) {
            console.log(`     First segment: "${subtitle.segments[0].text}" (${subtitle.segments[0].start}s - ${subtitle.segments[0].end}s)`);
          }
        } else {
          console.log(`   Scene ${index + 1}: No subtitles`);
        }
      });
      
      console.log('\n🎉 Test completed successfully!');
      console.log(`📹 You can view the video at: ${BASE_URL}${result.data.video_url}`);
      
    } else {
      console.error('❌ Video generation failed:', result.error);
      if (result.details) {
        console.error('Details:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCompletePipeline();
}

module.exports = { testCompletePipeline };



