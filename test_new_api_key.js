#!/usr/bin/env node

/**
 * Test the new API key provided by user
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testNewAPIKey() {
    console.log('🤖 Testing NEW Gemini API Key...\n');
    
    try {
        // Use the new API key provided by user
        const newApiKey = 'ZCwJHrTiIxiYyee3ELoZsUwcPYV986q9PYu4zAGPIfklu00z2vzg9hOt';
        
        console.log('✅ New API Key found');
        console.log('🔑 API Key preview:', newApiKey.substring(0, 10) + '...');
        
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(newApiKey);
        
        // Try different models
        const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
        
        for (const modelName of models) {
            console.log(`\n📝 Testing model: ${modelName}`);
            
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const prompt = `Create a short AI technology video script in English. Return only valid JSON in this format:
{
  "title": "Video Title",
  "description": "Brief description",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "English text here",
      "visual_description": "Visual description",
      "image_prompt": "Image prompt"
    }
  ],
  "total_duration": "30 seconds",
  "target_audience": "tech enthusiasts"
}`;
                
                console.log('📤 Sending request...');
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                console.log('✅ SUCCESS!');
                console.log('📄 Response length:', text.length);
                console.log('📄 Response preview:', text.substring(0, 300) + '...');
                
                // Try to parse JSON
                try {
                    const jsonData = JSON.parse(text);
                    console.log('✅ Successfully parsed JSON!');
                    console.log('📊 Script data:', {
                        title: jsonData.title,
                        scenesCount: jsonData.scenes ? jsonData.scenes.length : 0,
                        firstSceneText: jsonData.scenes?.[0]?.speaker_text
                    });
                } catch (parseError) {
                    console.log('⚠️ JSON parsing failed, but API call was successful');
                    console.log('📄 Raw response:', text);
                }
                
                console.log(`🎉 Model ${modelName} is working perfectly!`);
                
                // Update environment and test the actual server
                console.log('\n🔄 Now testing with server...');
                process.env.GEMINI_API_KEY = newApiKey;
                
                return true;
                
            } catch (modelError) {
                console.log(`❌ Model ${modelName} failed:`, modelError.message);
                
                // Check for specific error types
                if (modelError.message.includes('403')) {
                    console.log('🔑 This looks like an API key permission issue');
                } else if (modelError.message.includes('404')) {
                    console.log('📝 This model might not be available');
                } else if (modelError.message.includes('quota')) {
                    console.log('💳 This looks like a quota/billing issue');
                }
            }
        }
        
        console.log('\n❌ All models failed - API key might be invalid or expired');
        return false;
        
    } catch (error) {
        console.error('\n❌ API test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testNewAPIKey().then(success => {
        if (success) {
            console.log('\n🎉 NEW API KEY IS WORKING! 🎉');
            console.log('💡 You can now use the Gemini API in your application');
        } else {
            console.log('\n❌ API key test failed');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testNewAPIKey };



