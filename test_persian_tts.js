#!/usr/bin/env node
/**
 * Test script for Persian TTS functionality
 * This script tests the Persian text-to-speech with different voices
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';

async function testPersianTTS() {
  console.log('🧪 Testing Persian TTS Functionality');
  console.log('=' .repeat(50));
  
  const persianTexts = [
    'سلام! من یک سیستم تبدیل متن به گفتار هستم.',
    'هوش مصنوعی در حال تغییر دنیای ما است.',
    'امروز هوا بسیار زیبا است و آسمان آبی است.',
    'فناوری اطلاعات و ارتباطات نقش مهمی در زندگی ما دارد.'
  ];
  
  const persianVoices = [
    'fa_IR-amir-medium',
    'fa_IR-ganji-medium',
    'fa_IR-ganji_adabi-medium',
    'fa_IR-gyro-medium',
    'fa_IR-reza_ibrahim-medium'
  ];
  
  try {
    // Test 1: Basic Persian TTS
    console.log('🎤 Test 1: Basic Persian TTS...');
    
    const response = await axios.post(`${BASE_URL}/api/kokoro/text-to-speech`, {
      text: persianTexts[0],
      voice: persianVoices[0]
    });

    const result = response.data;
    console.log('✅ Persian TTS test successful');
    console.log(`   Text: ${result.data.text}`);
    console.log(`   Voice: ${result.data.voice}`);
    console.log(`   Duration: ${result.data.duration} seconds`);
    console.log(`   Audio URL: ${result.data.audio_url}`);
    
    // Test 2: Different voices
    console.log('\n🎤 Test 2: Testing different Persian voices...');
    
    for (let i = 0; i < Math.min(3, persianVoices.length); i++) {
      const voice = persianVoices[i];
      const text = persianTexts[i % persianTexts.length];
      
      console.log(`   Testing voice: ${voice}`);
      
      try {
        const voiceResponse = await axios.post(`${BASE_URL}/api/kokoro/text-to-speech`, {
          text: text,
          voice: voice
        });
        
        const voiceResult = voiceResponse.data;
        console.log(`   ✅ ${voice}: ${voiceResult.data.duration}s audio generated`);
      } catch (error) {
        console.log(`   ❌ ${voice}: Failed - ${error.message}`);
      }
    }
    
    // Test 3: Get available voices
    console.log('\n🎤 Test 3: Getting available voices...');
    
    try {
      const voicesResponse = await axios.get(`${BASE_URL}/api/kokoro/voices`);
      const voicesResult = voicesResponse.data;
      const persianVoicesList = voicesResult.data.voices.filter(v => v.language === 'فارسی');
      
      console.log(`   ✅ Found ${persianVoicesList.length} Persian voices:`);
      persianVoicesList.forEach(voice => {
        console.log(`      - ${voice.name} (${voice.id})`);
      });
    } catch (error) {
      console.log('   ❌ Failed to get voices:', error.message);
    }
    
    console.log('\n🎉 Persian TTS testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Persian TTS test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testPersianTTS();
}

module.exports = { testPersianTTS };
