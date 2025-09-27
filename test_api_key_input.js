#!/usr/bin/env node

/**
 * Interactive API key tester
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testAPIKeyInteractive() {
  console.log('🤖 Gemini API Key Tester\n');
  console.log('📝 Please enter your Gemini API key from https://aistudio.google.com/');
  console.log('💡 The API key should look like: AIzaSy... (about 39 characters)\n');
  
  const apiKey = await askQuestion('🔑 Enter your Gemini API Key: ');
  
  if (!apiKey || apiKey.length < 20) {
    console.log('❌ Invalid API key format. Please try again.');
    rl.close();
    return;
  }
  
  console.log('\n🧪 Testing your API key...');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test different models
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let workingModel = null;
    
    for (const modelName of models) {
      try {
        console.log(`📝 Testing model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = `Create a short video script about "AI Technology Revolution" in English. Return only valid JSON:
{
  "title": "Video Title",
  "description": "Brief description",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "English text here",
      "visual_description": "Visual description",
      "image_prompt": "Detailed image prompt"
    }
  ],
  "total_duration": "30 seconds",
  "target_audience": "tech enthusiasts"
}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ SUCCESS!');
        console.log('📄 Response length:', text.length);
        console.log('📄 Response preview:', text.substring(0, 200) + '...');
        
        // Try to parse JSON
        try {
          const jsonData = JSON.parse(text);
          console.log('✅ JSON parsed successfully!');
          console.log('📊 Generated content:', {
            title: jsonData.title,
            scenesCount: jsonData.scenes ? jsonData.scenes.length : 0,
            firstSceneText: jsonData.scenes?.[0]?.speaker_text
          });
        } catch (parseError) {
          console.log('⚠️ JSON parsing failed, but API call was successful');
        }
        
        workingModel = modelName;
        break;
        
      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed: ${modelError.message}`);
      }
    }
    
    if (workingModel) {
      console.log(`\n🎉 SUCCESS! Your API key works with model: ${workingModel}`);
      console.log('✅ You can now use Gemini AI for video script generation!');
      
      // Ask if user wants to save the API key
      const saveKey = await askQuestion('\n💾 Do you want to save this API key to .env file? (y/n): ');
      
      if (saveKey.toLowerCase() === 'y' || saveKey.toLowerCase() === 'yes') {
        const fs = require('fs');
        const envContent = `GEMINI_API_KEY=${apiKey}\nPORT=3003\nNODE_ENV=development\n`;
        
        try {
          fs.writeFileSync('.env', envContent);
          console.log('✅ API key saved to .env file!');
          console.log('🔄 Please restart your server with: npm start');
        } catch (writeError) {
          console.log('❌ Failed to save .env file:', writeError.message);
        }
      }
      
    } else {
      console.log('\n❌ All models failed. Your API key might be invalid or have restrictions.');
      console.log('💡 Please check:');
      console.log('   - API key is correct');
      console.log('   - Generative Language API is enabled');
      console.log('   - Billing account is set up');
      console.log('   - No IP restrictions');
    }
    
  } catch (error) {
    console.log('\n❌ API test failed:', error.message);
    console.log('💡 Please check your API key and try again.');
  }
  
  rl.close();
}

// Run the interactive test
if (require.main === module) {
  testAPIKeyInteractive().catch(console.error);
}

module.exports = { testAPIKeyInteractive };
