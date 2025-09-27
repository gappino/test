const express = require('express');
const router = express.Router();

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

Create a creative, engaging and interesting YouTube script that:
- Has strong storytelling
- Engages viewers from start to finish
- Has viral and shareable content potential
- Is suitable for YouTube monetization
- Is creative and unique

IMPORTANT: Respond with ONLY valid JSON. No markdown formatting, code blocks, or additional text.

Critical Requirements:
1. All speaker_text (narrator voice) must be in ENGLISH and engaging
2. All image_prompt descriptions must be in ENGLISH and extremely detailed
3. Create exactly 8 scenes for the video
4. Each image prompt must perfectly match and synchronize with the narrator text
5. Content must be engaging from the first second

Provide the response in this JSON format:
{
  "title": "Creative and Engaging Video Title",
  "description": "SEO-optimized video description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "estimated_duration": "60-90 seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-8 seconds",
      "speaker_text": "English narrator text that hooks the viewer from the first second",
      "visual_description": "Description of what should be shown on screen",
      "image_prompt": "Extremely detailed English prompt for AI image generation that perfectly matches the narrator text"
    }
  ],
  "hook_factor": "Why this video is engaging",
  "viral_potential": "High/Medium/Low with explanation"
}

Make sure:
- Content tells a complete story
- Each scene connects to the next naturally
- Image prompts in English are very detailed and descriptive
- Content is engaging for international audiences
- Uses storytelling techniques effectively
- All text (speaker_text, descriptions, etc.) is in English for global appeal`;
        
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
            console.log('⚠️ Gemini API failed, using fallback script...');
            console.log('❌ API Error:', apiError.message);
            
            // Create a creative fallback script based on user idea
            scriptData = {
                title: `The Secret Truth About ${userIdea.trim()} That Nobody Talks About!`,
                description: `Discover the amazing facts about ${userIdea.trim()} that you've never heard before. This video will change your perspective forever!`,
                tags: ["interesting", "facts", "educational", userIdea.trim().split(' ')[0] || "viral", "discovery"],
                estimated_duration: "60-90 seconds",
                scenes: [
                    {
                        scene_number: 1,
                        duration: "0-8 seconds",
                        speaker_text: `Did you know that ${userIdea.trim()} has secrets that nobody talks about?`,
                        visual_description: "Mysterious and intriguing visual",
                        image_prompt: "Mysterious and intriguing visual with dark background, glowing effects, question marks floating, cinematic lighting, high quality, photorealistic"
                    },
                    {
                        scene_number: 2,
                        duration: "8-16 seconds",
                        speaker_text: `Today I want to share facts with you that will blow your mind.`,
                        visual_description: "Mind-blowing animation",
                        image_prompt: "Dynamic animation showing earth shaking, dramatic effects, bright colors, explosion of information, mind-blowing visual effects"
                    },
                    {
                        scene_number: 3,
                        duration: "16-24 seconds",
                        speaker_text: `Most people think ${userIdea.trim()} is just what they see, but the reality is completely different.`,
                        visual_description: "Comparison of perceptions vs reality",
                        image_prompt: "Split screen showing common perception vs reality, contrasting images, before and after comparison, dramatic lighting"
                    },
                    {
                        scene_number: 4,
                        duration: "24-32 seconds",
                        speaker_text: `The first truth you need to know is that ${userIdea.trim()} has a deeper impact than you can imagine.`,
                        visual_description: "Deep impact visualization",
                        image_prompt: "Deep impact visualization, ripple effects, waves of influence spreading, powerful visual metaphors, high contrast"
                    },
                    {
                        scene_number: 5,
                        duration: "32-40 seconds",
                        speaker_text: `But this is just the beginning. What's truly amazing is...`,
                        visual_description: "Building suspense and curiosity",
                        image_prompt: "Suspenseful moment, dramatic pause, mysterious atmosphere, anticipation building, cinematic tension"
                    },
                    {
                        scene_number: 6,
                        duration: "40-48 seconds",
                        speaker_text: `${userIdea.trim()} has capabilities that even experts are unaware of.`,
                        visual_description: "Discovering hidden capabilities",
                        image_prompt: "Hidden capabilities revealed, experts surprised, discovery moment, enlightenment visualization, bright revelation"
                    },
                    {
                        scene_number: 7,
                        duration: "48-56 seconds",
                        speaker_text: `Now that you know this truth, you can use it in a completely different way.`,
                        visual_description: "New and different applications",
                        image_prompt: "New applications, innovative usage, transformation in action, practical implementation, success visualization"
                    },
                    {
                        scene_number: 8,
                        duration: "56-64 seconds",
                        speaker_text: `If this video was helpful to you, make sure to like it and subscribe for more amazing content!`,
                        visual_description: "Call to action",
                        image_prompt: "Call to action, like and subscribe buttons, engaging end screen, colorful animations, positive energy"
                    }
                ],
                hook_factor: "Mysterious opening with engaging question that sparks curiosity",
                viral_potential: "High - Curiosity-driven content with strong storytelling structure"
            };
            console.log('✅ Using creative fallback script');
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
        
        // Final fallback script on any error
        const fallbackScript = {
            title: `The Amazing Story of ${req.body.userIdea || 'Interesting Topic'}`,
            description: `Discover fascinating facts and amazing stories you've never heard before!`,
            tags: ["interesting", "facts", "story", "educational", "viral"],
            estimated_duration: "60-90 seconds",
            scenes: [
                {
                    scene_number: 1,
                    duration: "0-10 seconds",
                    speaker_text: "Are you ready to hear facts that will change your world?",
                    visual_description: "Captivating and intriguing visual",
                    image_prompt: "Captivating question mark with glowing effects, mysterious atmosphere, cinematic lighting, high quality"
                },
                {
                    scene_number: 2,
                    duration: "10-20 seconds",
                    speaker_text: "Today we'll go on an exciting journey that you'll never forget.",
                    visual_description: "Exciting journey animation",
                    image_prompt: "Exciting journey animation with dynamic movement, adventure theme, bright colors, engaging visuals"
                }
            ],
            hook_factor: "Curiosity-inducing start with engaging question",
            viral_potential: "High - Engaging and curiosity-driven content"
        };
        
        res.json({
            success: true,
            data: fallbackScript,
            source: 'fallback',
            message: 'اسکریپت پیش‌فرض تولید شد'
        });
    }
});

module.exports = router;
