#!/usr/bin/env node
/**
 * Complete test for Persian TTS functionality
 */

const axios = require('axios');

async function testAllPersianVoices() {
  try {
    console.log('🧪 Testing All Persian Voices...');
    
    const persianTexts = [
      'سلام! من یک سیستم تبدیل متن به گفتار هستم.',
      'هوش مصنوعی در حال تغییر دنیای ما است.',
      'امروز هوا بسیار زیبا است و آسمان آبی است.',
      'فناوری اطلاعات و ارتباطات نقش مهمی در زندگی ما دارد.',
      'این یک تست کامل برای همه صداهای فارسی است.'
    ];
    
    const persianVoices = [
      'fa_IR-amir-medium',
      'fa_IR-ganji-medium', 
      'fa_IR-ganji_adabi-medium',
      'fa_IR-gyro-medium',
      'fa_IR-reza_ibrahim-medium'
    ];
    
    console.log(`📋 Testing ${persianVoices.length} Persian voices with ${persianTexts.length} different texts...\n`);
    
    for (let i = 0; i < persianVoices.length; i++) {
      const voice = persianVoices[i];
      const text = persianTexts[i];
      
      console.log(`🎤 Test ${i + 1}: ${voice}`);
      console.log(`   Text: ${text}`);
      
      try {
        const response = await axios.post('http://localhost:3004/api/kokoro/text-to-speech', {
          text: text,
          voice: voice
        });
        
        if (response.data.success) {
          console.log(`   ✅ Success! Duration: ${response.data.data.duration}s`);
          console.log(`   📁 Audio: ${response.data.data.audio_url}`);
        } else {
          console.log(`   ❌ Failed: ${response.data.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎉 Persian TTS testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllPersianVoices();














