const express = require('express');
const router = express.Router();

// Helper function to generate script using Pollinations AI
async function generateScriptWithPollinations(userIdea, sceneCount = 30) {
  try {
    console.log('🤖 Using Pollinations AI as fallback for script generation...');
    
    // Create comprehensive prompt for Pollinations AI
    const pollinationsPrompt = `Create a comprehensive long-form YouTube video script based on the user's idea: "${userIdea}"

PRIORITY FOCUS:
- Follow the user's exact idea and concept (fun, scary, entertaining, etc.)
- Create content that matches the user's intended tone and style
- Build upon the user's creative vision rather than making it educational
- Honor the user's specific request for content type and mood

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene should have detailed speaker text (minimum 30 words)
- All content must be in English
- Create engaging, entertaining content based on user's idea suitable for long-form viewing
- Each scene should build upon the previous one for cohesive narrative
- Focus on hooks, engagement, and viral potential

Return ONLY valid JSON in this exact format:
{
  "title": "Video Title Based on User's Idea",
  "description": "SEO-optimized description with strong hook",
  "tags": ["viral", "entertainment", "engaging", "user-idea"],
  "estimated_duration": "${Math.ceil(sceneCount * 4)}-${Math.ceil(sceneCount * 6)} seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-6 seconds",
      "speaker_text": "Powerful English narrator text with at least 30 words that hooks viewers based on user's specific idea",
      "visual_description": "What should be shown on screen",
      "image_prompt": "Detailed English prompt for horizontal AI image generation (16:9 aspect ratio) that matches user's creative vision"
    }
  ],
  "content_type": "long-form entertainment content based on user's idea",
  "engagement_strategy": "How content maintains engagement through hooks and CTAs",
  "viral_potential": "High/Medium/Low with explanation of shareability"
}`;

    console.log('📝 Sending prompt to Pollinations AI...');
    const encodedPrompt = encodeURIComponent(pollinationsPrompt);
    const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}`;

    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 45000 // 45 seconds timeout for long responses
    });

    if (!response.ok) {
      throw new Error(`Pollinations AI HTTP error! status: ${response.status}`);
    }

    const aiResponse = await response.text();
    console.log('✅ Received response from Pollinations AI');
    console.log('📄 Response length:', aiResponse.length);
    
    // Clean up the response
    let cleanedResponse = aiResponse.trim();
    
    // Remove any HTML tags
    cleanedResponse = cleanedResponse.replace(/<[^>]*>/g, '').trim();
    
    // Try to extract JSON from the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        // Clean JSON string - remove control characters and fix common issues
        let jsonString = jsonMatch[0];
        
        // Remove control characters except newlines and tabs
        jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Fix common JSON issues
        jsonString = jsonString
          .replace(/\n/g, '\\n')  // Escape newlines
          .replace(/\r/g, '\\r')  // Escape carriage returns
          .replace(/\t/g, '\\t')  // Escape tabs
          .replace(/\\/g, '\\\\') // Escape backslashes
          .replace(/\n/g, '\\n')  // Fix any remaining newlines
          .replace(/\r/g, '\\r'); // Fix any remaining carriage returns
        
        // Try to fix unescaped quotes in strings
        jsonString = jsonString.replace(/"([^"]*)"([^",}\]]*)"([^"]*)"/g, '"$1\\"$2\\"$3"');
        
        console.log('🧹 Cleaned JSON string length:', jsonString.length);
        console.log('🧹 JSON preview:', jsonString.substring(0, 200) + '...');
        
        const scriptData = JSON.parse(jsonString);
        console.log('✅ Successfully parsed JSON from Pollinations AI');
        return scriptData;
        
      } catch (parseError) {
        console.error('❌ Failed to parse JSON from Pollinations AI:', parseError);
        console.log('📄 Problematic JSON:', jsonMatch[0].substring(14050, 14070)); // Show the problematic area
        
        // Try alternative parsing methods
        try {
          console.log('🔄 Trying alternative JSON parsing...');
          
          // Try to fix the JSON by replacing problematic characters
          let fixedJson = jsonMatch[0];
          
          // Remove all control characters
          fixedJson = fixedJson.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          
          // Fix common JSON issues
          fixedJson = fixedJson
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2') // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2') // Double fix
            .replace(/\n/g, '\\n')  // Escape newlines
            .replace(/\r/g, '\\r')  // Escape carriage returns
            .replace(/\t/g, '\\t'); // Escape tabs
          
          const scriptData = JSON.parse(fixedJson);
          console.log('✅ Successfully parsed JSON with alternative method');
          return scriptData;
          
        } catch (alternativeError) {
          console.error('❌ Alternative parsing also failed:', alternativeError);
          throw new Error('Failed to parse JSON response from Pollinations AI after multiple attempts');
        }
      }
    } else {
      throw new Error('No JSON found in Pollinations AI response');
    }
    
  } catch (error) {
    console.error('❌ Error with Pollinations AI:', error);
    throw error;
  }
}

// Smart Gemini API integration - Gemini 2.0 Flash only
async function callGeminiAPI(prompt, retryCount = 0) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in environment variables');
        throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Use only Gemini 2.0 Flash
    const model = 'gemini-2.0-flash';
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
    
    console.log(`🌐 Making request to Gemini API (attempt ${retryCount + 1})...`);
    console.log('📤 Model:', model);
    console.log('📤 Prompt length:', prompt.length);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(90000) // 90 seconds timeout
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Gemini API Error (${model}):`, response.status, errorText);
            
            // Handle specific error cases with retry
            if (response.status === 503 && retryCount < 3) {
                console.log(`⏳ Model ${model} is overloaded, retrying in ${(retryCount + 1) * 5} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 5000)); // 5, 10, 15 seconds
                return callGeminiAPI(prompt, retryCount + 1);
            } else if (response.status === 429 && retryCount < 2) {
                console.log(`⏳ Rate limit hit, waiting ${(retryCount + 1) * 10} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 10000)); // 10, 20 seconds
                return callGeminiAPI(prompt, retryCount + 1);
            }
            
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }
        
        console.log(`✅ Success with model: ${model}`);
        return data.candidates[0].content.parts[0].text;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`⏰ Request timeout for model ${model}`);
        } else {
            console.log(`❌ Request failed for model ${model}:`, error.message);
        }
        
        // Retry if it's a timeout and we haven't exceeded max retries
        if (error.name === 'AbortError' && retryCount < 2) {
            console.log(`🔄 Retrying due to timeout...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return callGeminiAPI(prompt, retryCount + 1);
        }
        
        throw error;
    }
}

// Generate creative YouTube script directly from user idea
router.post('/generate-creative-script', async (req, res) => {
    try {
        const { userIdea } = req.body;
        
        if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User idea is required and must be a non-empty string'
            });
        }
        
        console.log('🤖 Calling Gemini API for creative script generation...');
        console.log('💡 User idea:', userIdea.trim());
        
        const prompt = `Based on the user's idea: "${userIdea.trim()}"

Create a viral, engaging YouTube script that PRIORITIZES the user's specific idea and vision. The content should be:

PRIORITY FOCUS:
- Follow the user's exact idea and concept (fun, scary, entertaining, etc.)
- Create content that matches the user's intended tone and style
- Build upon the user's creative vision rather than making it educational

ENGAGEMENT ELEMENTS:
- Start with a powerful hook that immediately grabs attention
- Include compelling call-to-action elements
- Create shareable, viral-worthy content
- Focus on entertainment value and viewer engagement
- Make content that people want to watch and share

IMPORTANT: Respond with ONLY valid JSON. No markdown formatting, code blocks, or additional text.

Critical Requirements:
1. All speaker_text (narrator voice) must be in ENGLISH and highly engaging
2. All image_prompt descriptions must be in ENGLISH and extremely detailed
3. Create exactly 8 scenes for the video
4. Each image prompt must perfectly match and synchronize with the narrator text
5. Content must hook viewers from the very first second
6. Include compelling call-to-action elements throughout

Provide the response in this JSON format:
{
  "title": "Viral and Engaging Video Title Based on User's Idea",
  "description": "SEO-optimized video description with strong hook",
  "tags": ["viral", "entertainment", "engaging", "hook", "cta"],
  "estimated_duration": "60-90 seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-8 seconds",
      "speaker_text": "Powerful English hook that immediately grabs attention based on user's idea",
      "visual_description": "Description of what should be shown on screen",
      "image_prompt": "Extremely detailed English prompt for AI image generation that perfectly matches the narrator text and user's vision"
    }
  ],
  "hook_strategy": "How the opening hooks viewers based on user's idea",
  "call_to_action": "Compelling CTA elements included",
  "viral_potential": "High/Medium/Low with explanation of shareability"
}

Make sure:
- Content follows the user's exact idea and creative vision
- Each scene builds engagement and maintains viewer interest
- Image prompts in English are very detailed and match user's concept
- Content is optimized for sharing and viral potential
- Uses strong hooks and compelling CTAs effectively
- All text (speaker_text, descriptions, etc.) is in English for global appeal
- Focus on entertainment and engagement rather than education`;
        
        let scriptData;
        
        try {
            const response = await callGeminiAPI(prompt);
            console.log('✅ Received creative script from Gemini');
            console.log('📄 Raw response:', response.substring(0, 200) + '...');
            
            // Enhanced JSON parsing with multiple fallback strategies
        let cleanResponse = response.trim();
            
            try {
                // Strategy 1: Try parsing as-is
                scriptData = JSON.parse(cleanResponse);
            } catch (parseError1) {
                console.log('⚠️ First parse attempt failed, trying to clean response...');
                
                try {
                    // Strategy 2: Remove markdown code blocks
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
                    scriptData = JSON.parse(cleanResponse);
                } catch (parseError2) {
                    console.log('⚠️ Second parse attempt failed, trying to extract JSON...');
                    
                    try {
                        // Strategy 3: Extract JSON from text using regex
                        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            cleanResponse = jsonMatch[0];
                            scriptData = JSON.parse(cleanResponse);
                        } else {
                            throw new Error('No JSON found in response');
                        }
                    } catch (parseError3) {
                        console.log('⚠️ All parse attempts failed, will use fallback...');
                        throw new Error('Could not parse Gemini response');
                    }
                }
            }
            
        } catch (apiError) {
            console.log('⚠️ Gemini API failed, trying Pollinations AI as fallback...');
            console.log('❌ API Error:', apiError.message);
            
            try {
                // Use Pollinations AI as fallback
                scriptData = await generateScriptWithPollinations(userIdea.trim(), 8); // Default to 8 scenes for regular script
                console.log('✅ Using Pollinations AI fallback script');
            } catch (pollinationsError) {
                console.error('❌ Pollinations AI fallback also failed:', pollinationsError);
                throw new Error(`Both Gemini and Pollinations AI failed: Gemini: ${apiError.message}, Pollinations: ${pollinationsError.message}`);
            }
        }
        
        // Validate the parsed data
        if (!scriptData || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
            throw new Error('Invalid script data structure received');
        }
        
        // Ensure all required fields exist
        scriptData.title = scriptData.title || `محتوای جذاب درباره ${userIdea.trim()}`;
        scriptData.description = scriptData.description || `ویدیو جالب و آموزنده درباره ${userIdea.trim()}`;
        scriptData.tags = scriptData.tags || ["جالب", "آموزشی", "ویرال"];
        scriptData.estimated_duration = scriptData.estimated_duration || "60-90 ثانیه";
        scriptData.hook_factor = scriptData.hook_factor || "محتوای جذاب";
        scriptData.viral_potential = scriptData.viral_potential || "بالا";
        
        console.log('✅ Successfully processed creative script');
        console.log('📊 Generated scenes count:', scriptData.scenes.length);
        
        res.json({
            success: true,
            data: scriptData,
            source: 'gemini-ai'
        });
        
    } catch (error) {
        console.error('❌ Error generating creative script:', error);
        
        // Return error if all AI services fail
        res.status(500).json({
            success: false,
            error: 'Failed to generate script with both Gemini and Pollinations AI',
            details: error.message
        });
    }
});

// Generate long form script
router.post('/generate-long-form-script', async (req, res) => {
    const { userIdea, sceneCount = 20 } = req.body;
    
    try {
        
        if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User idea is required and must be a non-empty string'
            });
        }
        
        console.log('🤖 Calling Gemini API for long form script generation...');
        console.log('💡 User idea:', userIdea.trim());
        console.log('📊 Scene count:', sceneCount);
        
        const prompt = `Based on the user's idea: "${userIdea.trim()}"

Create a comprehensive YouTube video script that PRIORITIZES the user's specific idea and vision:

PRIORITY FOCUS:
- Follow the user's exact idea and concept (fun, scary, entertaining, etc.)
- Create content that matches the user's intended tone and style
- Build upon the user's creative vision rather than making it educational
- Honor the user's specific request for content type and mood

ENGAGEMENT ELEMENTS:
- Start with a powerful hook that immediately grabs attention
- Include compelling call-to-action elements throughout
- Create shareable, viral-worthy content
- Focus on entertainment value and viewer engagement
- Maintain high engagement throughout the extended duration

IMPORTANT: Respond with ONLY valid JSON. No markdown formatting, code blocks, or additional text.

Critical Requirements:
1. All speaker_text (narrator voice) must be in ENGLISH and highly engaging (minimum 30 words per scene)
2. All image_prompt descriptions must be in ENGLISH and extremely detailed for horizontal/landscape images
3. Create exactly ${sceneCount} scenes for the video
4. Each image prompt must be optimized for horizontal/landscape format (16:9 aspect ratio)
5. Content must be engaging and entertaining throughout the duration based on user's idea
6. Each scene should build upon the previous one to create a cohesive narrative

Provide the response in this JSON format:
{
  "title": "Comprehensive Long-Form Video Title Based on User's Idea",
  "description": "Detailed SEO-optimized video description with strong hook for long-form content",
  "tags": ["longform", "viral", "entertainment", "engaging", "user-idea"],
  "estimated_duration": "${Math.ceil(sceneCount * 4)}-${Math.ceil(sceneCount * 6)} seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-6 seconds",
      "speaker_text": "Powerful English narrator text with at least 30 words that hooks viewers based on user's specific idea",
      "visual_description": "Description of what should be shown on screen for horizontal format",
      "image_prompt": "Extremely detailed English prompt for horizontal AI image generation (16:9 aspect ratio) that perfectly matches the narrator text and user's creative vision"
    }
  ],
  "content_type": "long-form entertainment/engaging content based on user's idea",
  "engagement_strategy": "How this long-form content maintains viewer engagement through hooks and CTAs",
  "viral_potential": "High/Medium/Low with explanation of shareability and entertainment value"
}

Make sure:
- Content follows the user's exact idea and creative vision throughout
- Each scene connects to the next naturally with smooth transitions
- Image prompts are optimized for horizontal/landscape format (16:9)
- Content provides substantial entertainment value for long-form viewing
- Uses storytelling techniques effectively for extended duration
- All text (speaker_text, descriptions, etc.) is in English for global appeal
- Each scene maintains high engagement and follows user's specific concept
- Focus on entertainment and engagement rather than education`;

        let scriptData;
        let response;
        
        try {
            response = await callGeminiAPI(prompt);
            console.log('✅ Received response from Gemini for long form script');
            console.log('📄 Response length:', response.length);
            console.log('📄 Response preview:', response.substring(0, 200) + '...');
            
            scriptData = JSON.parse(response);
            console.log('✅ Successfully parsed JSON from Gemini for long form script');
            console.log('📊 Generated long form script:', {
                title: scriptData.title,
                scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
                estimatedDuration: scriptData.estimated_duration
            });
            
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.log('📄 Raw response that failed to parse:', response || 'No response available');
            
            // Try to extract JSON from the response
            const jsonMatch = (response || '').match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    scriptData = JSON.parse(jsonMatch[0]);
                    console.log('✅ Successfully extracted and parsed JSON from response');
                } catch (extractError) {
                    console.error('❌ Failed to parse extracted JSON:', extractError);
                    throw new Error('Failed to parse JSON response from Gemini');
                }
            } else {
                throw new Error('No JSON found in Gemini response');
            }
        }
        
        // Validate the script data
        if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
            throw new Error('Invalid script data structure from Gemini');
        }
        
        // Ensure we have the minimum number of scenes
        if (scriptData.scenes.length < sceneCount) {
            console.log(`⚠️ Generated ${scriptData.scenes.length} scenes, but requested ${sceneCount}. Using generated scenes.`);
        }
        
        res.json({
            success: true,
            data: scriptData
        });
        
    } catch (error) {
        console.error('❌ Error generating long form script with Gemini:', error);
        
        console.log('⚠️ Gemini API failed, trying Pollinations AI as fallback...');
        
        try {
            // Use Pollinations AI as fallback
            const scriptData = await generateScriptWithPollinations(userIdea.trim(), sceneCount);
            
            // Validate the script data
            if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
                throw new Error('Invalid script data structure from Pollinations AI');
            }
            
            // Ensure we have the minimum number of scenes
            if (scriptData.scenes.length < sceneCount) {
                console.log(`⚠️ Pollinations AI generated ${scriptData.scenes.length} scenes, but requested ${sceneCount}. Using generated scenes.`);
            }
            
            console.log('✅ Successfully generated script using Pollinations AI fallback');
            console.log('📊 Generated script:', {
                title: scriptData.title,
                scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
                estimatedDuration: scriptData.estimated_duration
            });
            
            res.json({
                success: true,
                data: scriptData,
                fallback: 'pollinations',
                source: 'Pollinations AI (Gemini unavailable)'
            });
            
        } catch (pollinationsError) {
            console.error('❌ Pollinations AI fallback also failed:', pollinationsError);
            
            // Return error if both fail
            res.status(500).json({
                success: false,
                error: 'Failed to generate script with both Gemini and Pollinations AI',
                details: {
                    gemini: error.message,
                    pollinations: pollinationsError.message
                }
            });
        }
    }
});

module.exports = router;
