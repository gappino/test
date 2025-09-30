#!/usr/bin/env node

/**
 * Test the new API key provided by user
 */

async function callGeminiAPI(prompt, model = 'gemini-2.0-flash') {
    const apiKey = 'AIzaSyDBo_ridz9dCwFHQ7ZnjZRPRqgYaeza5g8';
    
    console.log('🔑 Using NEW API Key:', apiKey.substring(0, 10) + '...');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
        }
    };
    
    console.log('📤 Sending request to Gemini API...');
    console.log('📤 Model:', model);
    console.log('📤 URL:', url);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📄 Response data structure:', {
            hasCandidates: !!data.candidates,
            candidatesLength: data.candidates?.length || 0,
            firstCandidate: data.candidates?.[0] ? 'exists' : 'missing'
        });
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }
        
        const text = data.candidates[0].content.parts[0].text;
        console.log('✅ SUCCESS! Response received');
        console.log('📄 Response length:', text.length);
        console.log('📄 Response preview:', text.substring(0, 300) + '...');
        
        return text;
        
    } catch (error) {
        console.error('❌ Network/API error:', error.message);
        throw error;
    }
}

async function testNewAPIKey() {
    console.log('🤖 Testing NEW Gemini API Key...\n');
    
    // Test with different models
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const model of models) {
        console.log(`\n📝 Testing model: ${model}`);
        console.log('─'.repeat(50));
        
        try {
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
            
            const response = await callGeminiAPI(prompt, model);
            
            console.log('🎉 SUCCESS!');
            
            // Try to parse JSON
            try {
                const jsonData = JSON.parse(response);
                console.log('✅ JSON parsed successfully!');
                console.log('📊 Generated content:', {
                    title: jsonData.title,
                    scenesCount: jsonData.scenes ? jsonData.scenes.length : 0,
                    firstSceneText: jsonData.scenes?.[0]?.speaker_text,
                    totalDuration: jsonData.total_duration
                });
                
                console.log(`\n🎉 Model ${model} is working perfectly!`);
                console.log('✅ API key is valid and functional!');
                
                // Test with a more complex prompt
                console.log('\n🧪 Testing with complex video script prompt...');
                const complexPrompt = `Create a viral Technology & AI video script that reveals cutting-edge developments. Focus on practical benefits viewers can use immediately. Include surprising insights about how AI is transforming daily life.

IMPORTANT: All speaker_text must be in English only.

Please provide the response in the following JSON format:
{
  "title": "Video Title",
  "description": "Brief description of the video",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "What the narrator says",
      "visual_description": "What should be shown on screen",
      "image_prompt": "Detailed description for image generation"
    }
  ],
  "total_duration": "60 seconds",
  "target_audience": "tech enthusiasts and early adopters"
}`;
                
                const complexResponse = await callGeminiAPI(complexPrompt, model);
                const complexJsonData = JSON.parse(complexResponse);
                
                console.log('✅ Complex prompt also works!');
                console.log('📊 Complex content:', {
                    title: complexJsonData.title,
                    scenesCount: complexJsonData.scenes?.length || 0,
                    targetAudience: complexJsonData.target_audience
                });
                
                console.log('\n🎉 API KEY IS FULLY WORKING! 🎉');
                console.log('💡 You can now use the system with real AI content generation');
                
                return true;
                
            } catch (parseError) {
                console.log('⚠️ JSON parsing failed, but API call was successful');
                console.log('📄 Raw response:', response);
                console.log('💡 This might be a formatting issue, but the API is working');
                return true;
            }
            
        } catch (error) {
            console.log(`❌ Model ${model} failed:`, error.message);
            
            // Check for specific error types
            if (error.message.includes('403')) {
                console.log('🔑 This looks like an API key permission issue');
            } else if (error.message.includes('404')) {
                console.log('📝 This model might not be available');
            } else if (error.message.includes('quota')) {
                console.log('💳 This looks like a quota/billing issue');
            } else if (error.message.includes('400')) {
                console.log('📝 Bad request - model might not support this format');
            }
        }
    }
    
    console.log('\n❌ All models failed');
    console.log('💡 Possible issues:');
    console.log('   - API key is invalid or expired');
    console.log('   - Generative Language API is not enabled');
    console.log('   - Billing account not set up');
    console.log('   - IP restrictions');
    
    return false;
}

// Run the test
if (require.main === module) {
    testNewAPIKey().then(success => {
        if (success) {
            console.log('\n🎉 NEW API KEY TEST SUCCESSFUL! 🎉');
            console.log('✅ The API key is working and ready to use');
            console.log('💡 You can now:');
            console.log('   1. Set GEMINI_API_KEY in your .env file');
            console.log('   2. Start the server with: npm start');
            console.log('   3. Use the system at: http://localhost:3003');
        } else {
            console.log('\n❌ API key test failed');
            console.log('💡 Please check the API key and try again');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testNewAPIKey };



