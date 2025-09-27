#!/usr/bin/env node

/**
 * Test script for the complete video pipeline
 * Tests: Script generation -> Image generation -> Audio generation -> Video composition
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testCompletePipeline() {
    console.log('🎬 Testing Complete Video Pipeline...\n');
    
    try {
        // Step 1: Generate script
        console.log('📝 Step 1: Generating script...');
        const scriptResponse = await axios.post(`${BASE_URL}/api/gemini/generate-script`);
        
        if (!scriptResponse.data.success) {
            throw new Error('Failed to generate script');
        }
        
        const script = scriptResponse.data.data;
        console.log(`✅ Script generated: "${script.title}"`);
        console.log(`   Scenes: ${script.scenes.length}`);
        
        // Step 2: Generate images for first 2 scenes (to save time)
        console.log('\n🖼️  Step 2: Generating images...');
        const images = [];
        
        for (let i = 0; i < Math.min(2, script.scenes.length); i++) {
            const scene = script.scenes[i];
            
            // Generate image prompt
            const promptResponse = await axios.post(`${BASE_URL}/api/gemini/generate-image-prompt`, {
                visual_description: scene.visual_description
            });
            
            if (!promptResponse.data.success) {
                console.log(`❌ Failed to generate prompt for scene ${i + 1}`);
                continue;
            }
            
            const imagePrompt = promptResponse.data.data.prompt_image.prompt;
            
            // Generate image
            const imageResponse = await axios.post(`${BASE_URL}/api/flax/generate-image-url`, {
                prompt: imagePrompt
            });
            
            if (!imageResponse.data.success) {
                console.log(`❌ Failed to generate image for scene ${i + 1}`);
                continue;
            }
            
            images.push({
                sceneIndex: i,
                imageUrl: imageResponse.data.data.image_url,
                prompt: imagePrompt,
                scene: scene
            });
            
            console.log(`✅ Image generated for scene ${i + 1}`);
        }
        
        if (images.length === 0) {
            throw new Error('No images were generated');
        }
        
        // Step 3: Generate audio using Kokoro
        console.log('\n🎵 Step 3: Generating audio with Kokoro...');
        const audioResults = [];
        
        for (let i = 0; i < images.length; i++) {
            const scene = script.scenes[i];
            
            try {
                const audioResponse = await axios.post(`${BASE_URL}/api/kokoro/text-to-speech`, {
                    text: scene.speaker_text,
                    voice: 'af_heart'
                });
                
                if (!audioResponse.data.success) {
                    console.log(`❌ Failed to generate audio for scene ${i + 1}`);
                    continue;
                }
                
                audioResults.push({
                    sceneIndex: i,
                    audioUrl: audioResponse.data.data.audio_url,
                    duration: audioResponse.data.data.duration,
                    text: audioResponse.data.data.text,
                    voice: audioResponse.data.data.voice,
                    engine: audioResponse.data.data.engine
                });
                
                console.log(`✅ Audio generated for scene ${i + 1} (${audioResponse.data.data.duration.toFixed(1)}s)`);
                
            } catch (error) {
                console.log(`❌ Error generating audio for scene ${i + 1}: ${error.message}`);
            }
        }
        
        if (audioResults.length === 0) {
            throw new Error('No audio was generated');
        }
        
        // Step 4: Generate subtitles using Whisper
        console.log('\n📝 Step 4: Generating subtitles with Whisper...');
        const subtitleResults = [];
        
        for (let i = 0; i < audioResults.length; i++) {
            const audioData = audioResults[i];
            
            try {
                const subtitleResponse = await axios.post(`${BASE_URL}/api/whisper/transcribe-with-timestamps`, {
                    audioUrl: audioData.audioUrl,
                    language: 'en'
                });
                
                if (!subtitleResponse.data.success) {
                    console.log(`❌ Failed to generate subtitles for scene ${i + 1}`);
                    continue;
                }
                
                subtitleResults.push({
                    sceneIndex: i,
                    segments: subtitleResponse.data.data.segments || [],
                    text: subtitleResponse.data.data.text || ''
                });
                
                console.log(`✅ Subtitles generated for scene ${i + 1}`);
                
            } catch (error) {
                console.log(`❌ Error generating subtitles for scene ${i + 1}: ${error.message}`);
            }
        }
        
        // Step 5: Generate complete video
        console.log('\n🎬 Step 5: Generating complete video...');
        
        const videoData = {
            script: script,
            images: images,
            audioSettings: { voice: 'af_heart' }
        };
        
        const videoResponse = await axios.post(`${BASE_URL}/api/video/generate-complete-video`, videoData);
        
        if (!videoResponse.data.success) {
            throw new Error(`Failed to generate video: ${videoResponse.data.error}`);
        }
        
        const videoResult = videoResponse.data.data;
        console.log('✅ Video generated successfully!');
        console.log(`   Duration: ${videoResult.duration} seconds`);
        console.log(`   Scenes: ${videoResult.scenes_count}`);
        console.log(`   Resolution: ${videoResult.resolution}`);
        console.log(`   Video URL: ${videoResult.video_url}`);
        
        // Summary
        console.log('\n📊 Pipeline Summary:');
        console.log(`   Script: ✅ "${script.title}"`);
        console.log(`   Images: ✅ ${images.length}/${script.scenes.length}`);
        console.log(`   Audio: ✅ ${audioResults.length}/${images.length}`);
        console.log(`   Subtitles: ✅ ${subtitleResults.length}/${audioResults.length}`);
        console.log(`   Video: ✅ Complete`);
        
        console.log('\n🎉 Complete pipeline test successful!');
        
    } catch (error) {
        console.error('\n❌ Pipeline test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testCompletePipeline();
}

module.exports = { testCompletePipeline };


