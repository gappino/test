const express = require('express');
const router = express.Router();

// Mock Gemini responses for testing when API quota is exceeded
const MOCK_SCRIPT = {
  "title": "AI Revolution in Daily Life",
  "description": "Discover how artificial intelligence is transforming our world",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-5 seconds",
      "speaker_text": "Did you know that artificial intelligence is changing our world?",
      "visual_description": "Modern AI technology with glowing elements and futuristic design",
      "image_prompt": "Modern AI technology with glowing elements and futuristic design"
    },
    {
      "scene_number": 2,
      "duration": "5-10 seconds",
      "speaker_text": "From face recognition to content generation, AI is everywhere",
      "visual_description": "Various AI applications in daily life scenarios",
      "image_prompt": "Various AI applications in daily life scenarios"
    },
    {
      "scene_number": 3,
      "duration": "10-15 seconds",
      "speaker_text": "But what does the future hold for us?",
      "visual_description": "Future technology with robots and smart cities",
      "image_prompt": "Future technology with robots and smart cities"
    },
    {
      "scene_number": 4,
      "duration": "15-20 seconds",
      "speaker_text": "AI not only makes our work easier, but also creates new opportunities",
      "visual_description": "People working with AI tools and interfaces",
      "image_prompt": "People working with AI tools and interfaces"
    },
    {
      "scene_number": 5,
      "duration": "20-25 seconds",
      "speaker_text": "Are you ready for a future where AI rules?",
      "visual_description": "Visionary image of AI-dominated world",
      "image_prompt": "Visionary image of AI-dominated world"
    }
  ],
  "total_duration": "25 seconds",
  "target_audience": "Technology enthusiasts and innovators"
};

const MOCK_IMAGE_PROMPTS = [
  {
    "prompt_image": {
      "prompt": "modern tech office setting, minimalist workspace | large HD display showing text 'AI Tech' in modern typography, professional people in business attire discussing around interactive screen ::8 | elegant typography, clear readable text, integrated naturally into scene ::7 | cinematic dramatic lighting, natural ambient light, professional studio setup ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2"
    }
  },
  {
    "prompt_image": {
      "prompt": "futuristic AI laboratory | holographic displays showing AI applications, scientists working with advanced technology ::8 | clean modern interface, floating data visualizations ::7 | bright laboratory lighting, blue and white color scheme ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2"
    }
  },
  {
    "prompt_image": {
      "prompt": "smart city of the future | flying cars, smart buildings, AI-controlled infrastructure ::8 | urban landscape with glowing elements, people using smart devices ::7 | golden hour lighting, warm and inviting atmosphere ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2"
    }
  },
  {
    "prompt_image": {
      "prompt": "modern workspace with AI tools | people collaborating with AI assistants, digital interfaces everywhere ::8 | clean office environment, multiple screens showing AI data ::7 | natural daylight, professional atmosphere ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2"
    }
  },
  {
    "prompt_image": {
      "prompt": "visionary AI future | abstract representation of AI consciousness, digital brain networks ::8 | ethereal light effects, floating geometric shapes ::7 | mystical lighting, purple and blue tones ::7 | 8k resolution, hyperrealistic, photorealistic quality, octane render, cinematic composition --ar 9:16 --s 1000 --q 2"
    }
  }
];

// Generate mock video script
router.post('/generate-script', async (req, res) => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      data: MOCK_SCRIPT
    });
    
  } catch (error) {
    console.error('Error generating mock script:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock video script',
      details: error.message
    });
  }
});

// Generate mock image prompt
router.post('/generate-image-prompt', async (req, res) => {
  try {
    const { visual_description } = req.body;
    
    if (!visual_description) {
      return res.status(400).json({
        success: false,
        error: 'Visual description is required'
      });
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a random mock prompt
    const randomPrompt = MOCK_IMAGE_PROMPTS[Math.floor(Math.random() * MOCK_IMAGE_PROMPTS.length)];
    
    res.json({
      success: true,
      data: randomPrompt
    });
    
  } catch (error) {
    console.error('Error generating mock image prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock image prompt',
      details: error.message
    });
  }
});

// Generate mock niches
router.post('/generate-niches', async (req, res) => {
  try {
    const { userIdea } = req.body;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockNiches = {
      niches: [
        {
          id: 1,
          title: "Tech Reviews & Tutorials",
          description: "In-depth reviews and tutorials about latest technology",
          potential_views: "High - Tech content consistently performs well",
          target_audience: "Tech enthusiasts, early adopters, professionals",
          content_style: "Educational, hands-on demonstrations"
        },
        {
          id: 2,
          title: "Lifestyle & Productivity Hacks",
          description: "Life optimization tips and productivity techniques",
          potential_views: "Very High - Evergreen content with broad appeal",
          target_audience: "Young professionals, students, entrepreneurs",
          content_style: "Quick tips, before/after, challenge videos"
        },
        {
          id: 3,
          title: "Entertainment & Pop Culture",
          description: "Trending topics, reactions, and cultural commentary",
          potential_views: "Extremely High - Viral potential",
          target_audience: "Gen Z, Millennials, pop culture fans",
          content_style: "Reactions, commentary, trend analysis"
        },
        {
          id: 4,
          title: "Educational Content",
          description: "Informative content that teaches valuable skills",
          potential_views: "High - Strong retention and sharing",
          target_audience: "Learners, students, professionals",
          content_style: "Step-by-step tutorials, explainer videos"
        },
        {
          id: 5,
          title: "Health & Wellness",
          description: "Fitness, mental health, and wellness tips",
          potential_views: "High - Growing market with engaged audience",
          target_audience: "Health-conscious individuals, fitness enthusiasts",
          content_style: "How-to guides, transformation stories"
        }
      ]
    };
    
    res.json({
      success: true,
      data: mockNiches
    });
    
  } catch (error) {
    console.error('Error generating mock niches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock niches',
      details: error.message
    });
  }
});

// Generate mock content
router.post('/generate-content', async (req, res) => {
  try {
    const { selectedNiche, userIdea } = req.body;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockContent = {
      title: `${selectedNiche?.title || 'AI Technology'}: ${userIdea || 'Revolution'}`,
      description: `Discover amazing insights about ${userIdea || 'AI technology'} in this engaging video`,
      tags: ["viral", "trending", "youtube", "content", "engaging"],
      estimated_duration: "60 seconds",
      scenes: [
        {
          scene_number: 1,
          duration: "0-6 seconds",
          speaker_text: "Welcome to an amazing discovery that will change everything you know",
          visual_description: "Eye-catching opening with dynamic text and visuals",
          image_prompt: "Dynamic opening scene with bold text overlay 'AMAZING DISCOVERY' in modern typography, vibrant colors, professional studio lighting, high-tech background with glowing elements, 8k resolution, cinematic composition --ar 9:16"
        },
        {
          scene_number: 2,
          duration: "6-12 seconds",
          speaker_text: "Today we're exploring something incredible that most people don't know about",
          visual_description: "Mysterious and intriguing visuals related to the topic",
          image_prompt: "Mysterious and intriguing scene showing hidden knowledge, professional person pointing at holographic display, futuristic interface, dramatic lighting, high-tech environment, photorealistic quality --ar 9:16"
        },
        {
          scene_number: 3,
          duration: "12-18 seconds",
          speaker_text: "This breakthrough has been changing lives across the world",
          visual_description: "Global impact visualization with world map and connections",
          image_prompt: "World map with glowing connection points, global network visualization, modern infographic style, professional presentation, clean design, high-tech overlay, cinematic lighting --ar 9:16"
        },
        {
          scene_number: 4,
          duration: "18-24 seconds",
          speaker_text: "Scientists and experts have been studying this phenomenon for years",
          visual_description: "Professional research environment with experts working",
          image_prompt: "Modern research laboratory with scientists working, professional equipment, clean white environment, focused researchers, high-tech displays showing data, professional photography --ar 9:16"
        },
        {
          scene_number: 5,
          duration: "24-30 seconds",
          speaker_text: "The results they discovered will absolutely shock you",
          visual_description: "Dramatic reveal with shocking statistics and data",
          image_prompt: "Dramatic data visualization with shocking statistics, bold numbers floating in 3D space, professional infographic design, vibrant colors, modern typography, cinematic presentation --ar 9:16"
        },
        {
          scene_number: 6,
          duration: "30-36 seconds",
          speaker_text: "But here's what makes this even more incredible",
          visual_description: "Building suspense with intriguing visuals",
          image_prompt: "Suspenseful scene with dramatic lighting, professional presenter gesturing, modern studio setup, high-tech background, mysterious atmosphere, cinematic quality --ar 9:16"
        },
        {
          scene_number: 7,
          duration: "36-42 seconds",
          speaker_text: "This technology is now available to everyone",
          visual_description: "Accessibility and availability demonstration",
          image_prompt: "Diverse group of people using technology, modern devices, inclusive representation, professional environment, natural lighting, contemporary setting, high-quality photography --ar 9:16"
        },
        {
          scene_number: 8,
          duration: "42-48 seconds",
          speaker_text: "And the best part is how simple it is to get started",
          visual_description: "Simple step-by-step process visualization",
          image_prompt: "Clean step-by-step infographic, numbered process, minimalist design, professional presentation, easy-to-follow visual guide, modern typography, bright lighting --ar 9:16"
        },
        {
          scene_number: 9,
          duration: "48-54 seconds",
          speaker_text: "Thousands of people are already experiencing amazing results",
          visual_description: "Success stories and positive outcomes",
          image_prompt: "Happy successful people celebrating, positive expressions, diverse group, professional photography, natural lighting, modern environment, authentic emotions --ar 9:16"
        },
        {
          scene_number: 10,
          duration: "54-60 seconds",
          speaker_text: "Don't miss out on this incredible opportunity - start your journey today",
          visual_description: "Strong call-to-action with engaging final message",
          image_prompt: "Powerful call-to-action scene with motivational text 'START TODAY', professional presenter, confident pose, modern studio, dramatic lighting, inspiring atmosphere, high-quality production --ar 9:16"
        }
      ],
      target_audience: selectedNiche?.target_audience || "tech enthusiasts",
      monetization_potential: "High - Engaging content with strong call-to-action and broad appeal"
    };
    
    res.json({
      success: true,
      data: mockContent
    });
    
  } catch (error) {
    console.error('Error generating mock content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock content',
      details: error.message
    });
  }
});

module.exports = router;
