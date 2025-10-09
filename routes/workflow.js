const express = require('express');
const router = express.Router();
const workflowDB = require('../workflow-database');
const cron = require('node-cron');

// Helper function to generate script using Pollinations AI
async function generateScriptWithPollinations(userIdea, sceneCount = 30) {
  try {
    console.log('🤖 Using Pollinations AI as fallback for script generation...');
    
    // Create comprehensive prompt for Pollinations AI
    const pollinationsPrompt = `Create a comprehensive long-form YouTube video script based on: "${userIdea}"

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene should have detailed speaker text (minimum 30 words)
- All content must be in English
- Create engaging, educational content suitable for long-form viewing
- Each scene should build upon the previous one for cohesive narrative

Return ONLY valid JSON in this exact format:
{
  "title": "Video Title",
  "description": "SEO-optimized description",
  "tags": ["tag1", "tag2", "tag3"],
  "estimated_duration": "${Math.ceil(sceneCount * 4)}-${Math.ceil(sceneCount * 6)} seconds",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-6 seconds",
      "speaker_text": "Detailed English narrator text with at least 30 words",
      "visual_description": "What should be shown on screen",
      "image_prompt": "Detailed English prompt for horizontal AI image generation (16:9 aspect ratio)"
    }
  ],
  "content_type": "long-form educational content",
  "engagement_strategy": "How content maintains engagement",
  "educational_value": "High/Medium/Low with explanation"
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

// دریافت تمام workflow ها
router.get('/workflows', (req, res) => {
  try {
    const workflows = workflowDB.getAllWorkflows();
    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت workflow ها',
      details: error.message
    });
  }
});

// دریافت workflow بر اساس ID
router.get('/workflows/:id', (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowDB.getWorkflowById(id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow یافت نشد'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت workflow',
      details: error.message
    });
  }
});

// ایجاد workflow جدید
router.post('/workflows', async (req, res) => {
  try {
    const { name, prompt, voice, schedule, settings } = req.body;

    // اعتبارسنجی ورودی‌ها
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'پرامپت الزامی است'
      });
    }

    if (!schedule || !schedule.type) {
      return res.status(400).json({
        success: false,
        error: 'زمان‌بندی الزامی است'
      });
    }

    // ایجاد workflow
    const workflow = workflowDB.createWorkflow({
      name: name || `Workflow ${new Date().toLocaleDateString('fa-IR')}`,
      prompt,
      voice: voice || 'fa_IR-amir-medium',
      schedule,
      settings: settings || {}
    });

    // تنظیم cron job برای workflow جدید
    await setupCronJob(workflow);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow با موفقیت ایجاد شد'
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در ایجاد workflow',
      details: error.message
    });
  }
});

// به‌روزرسانی workflow
router.put('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const workflow = workflowDB.updateWorkflow(id, updateData);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow یافت نشد'
      });
    }

    // به‌روزرسانی cron job
    await updateCronJob(workflow);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow با موفقیت به‌روزرسانی شد'
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در به‌روزرسانی workflow',
      details: error.message
    });
  }
});

// حذف workflow
router.delete('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // حذف cron job
    await removeCronJob(id);
    
    const deleted = workflowDB.deleteWorkflow(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Workflow یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'Workflow با موفقیت حذف شد'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در حذف workflow',
      details: error.message
    });
  }
});

// تغییر وضعیت workflow (فعال/غیرفعال)
router.post('/workflows/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowDB.toggleWorkflowStatus(id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow یافت نشد'
      });
    }

    // به‌روزرسانی cron job بر اساس وضعیت جدید
    if (workflow.status === 'active') {
      await setupCronJob(workflow);
    } else {
      await removeCronJob(id);
    }

    res.json({
      success: true,
      data: workflow,
      message: `Workflow ${workflow.status === 'active' ? 'فعال' : 'غیرفعال'} شد`
    });
  } catch (error) {
    console.error('Error toggling workflow status:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در تغییر وضعیت workflow',
      details: error.message
    });
  }
});

// اجرای دستی workflow
router.post('/workflows/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = workflowDB.getWorkflowById(id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow یافت نشد'
      });
    }

    // اجرای workflow
    const result = await executeWorkflow(workflow, req);
    
    // به‌روزرسانی اطلاعات اجرا
    workflowDB.markWorkflowAsRun(id, result);

    res.json({
      success: true,
      data: result,
      message: 'Workflow با موفقیت اجرا شد'
    });
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در اجرای workflow',
      details: error.message
    });
  }
});

// دریافت آمار workflow ها
router.get('/workflows-stats', (req, res) => {
  try {
    const stats = workflowDB.getWorkflowStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting workflow stats:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت آمار',
      details: error.message
    });
  }
});

// ایجاد workflow ویدیو بلند
router.post('/workflows/long-form', async (req, res) => {
  try {
    const { name, prompt, voice, backgroundMusic, schedule, settings } = req.body;

    // اعتبارسنجی ورودی‌ها
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ایده ویدیو الزامی است'
      });
    }

    if (!schedule || !schedule.type) {
      return res.status(400).json({
        success: false,
        error: 'زمان‌بندی الزامی است'
      });
    }

    // اعتبارسنجی فاصله زمانی برای hourly
    if (schedule.type === 'hourly' && schedule.interval < 5) {
      return res.status(400).json({
        success: false,
        error: 'حداقل فاصله زمانی 5 ساعت است'
      });
    }

    // ایجاد workflow ویدیو بلند
    const workflow = workflowDB.createWorkflow({
      name: name || `ویدیو بلند ${new Date().toLocaleDateString('fa-IR')}`,
      prompt,
      voice: voice || 'fa_IR-amir-medium',
      backgroundMusic: backgroundMusic || '',
      schedule,
      settings: {
        videoType: 'long-form',
        orientation: 'horizontal',
        scenes: settings?.scenes || 10,
        ...settings
      }
    });

    // تنظیم cron job برای workflow جدید
    await setupCronJob(workflow);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow ویدیو بلند با موفقیت ایجاد شد'
    });
  } catch (error) {
    console.error('Error creating long-form workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در ایجاد workflow ویدیو بلند',
      details: error.message
    });
  }
});

// ایجاد workflow سفارشی از ویدیوی سفارشی
router.post('/workflows/custom', async (req, res) => {
  try {
    const { name, scenes, voice, orientation, schedule, subtitleSettings = {} } = req.body;

    // اعتبارسنجی ورودی‌ها
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'حداقل یک صحنه الزامی است'
      });
    }

    if (!schedule || !schedule.type) {
      return res.status(400).json({
        success: false,
        error: 'زمان‌بندی الزامی است'
      });
    }

    // ایجاد workflow سفارشی
    const workflow = workflowDB.createWorkflow({
      name: name || `ویدیو سفارشی ${new Date().toLocaleDateString('fa-IR')}`,
      prompt: 'ویدیو سفارشی', // برای ویدیوهای سفارشی
      voice: voice || 'fa_IR-amir-medium',
      schedule,
      settings: {
        videoType: 'custom',
        orientation: orientation || 'vertical',
        scenes: scenes.length
      },
      customScenes: scenes,
      customSettings: {
        subtitleSettings,
        orientation
      }
    });

    // تنظیم cron job برای workflow جدید
    await setupCronJob(workflow);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow سفارشی با موفقیت ایجاد شد'
    });
  } catch (error) {
    console.error('Error creating custom workflow:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در ایجاد workflow سفارشی',
      details: error.message
    });
  }
});

// اجرای workflow - استفاده از سیستم موجود
async function executeWorkflow(workflow, req = null) {
  try {
    console.log(`🎬 اجرای workflow: ${workflow.name}`);
    
    // اگر req موجود نیست، از localhost استفاده کن
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3003';
    
    let videoResult;
    
    // بررسی نوع workflow
    if (workflow.settings.videoType === 'custom' && workflow.customScenes) {
      // اجرای ویدیو سفارشی
      console.log('🎥 اجرای ویدیو سفارشی...');
      const videoResponse = await fetch(`${baseUrl}/api/video/generate-custom-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workflow.name,
          scenes: workflow.customScenes,
          voice: workflow.voice,
          orientation: workflow.customSettings?.orientation || 'vertical',
          subtitleSettings: workflow.customSettings?.subtitleSettings || {}
        })
      });

      videoResult = await videoResponse.json();
    } else if (workflow.settings.videoType === 'long-form') {
      // اجرای ویدیو بلند - باید مراحل کامل را انجام دهیم
      console.log('🎬 اجرای ویدیو بلند...');
      
      // مرحله 1: تولید اسکریپت
      console.log('📝 تولید اسکریپت ویدیو بلند...');
      
      let script;
      let scriptSource = 'Gemini API';
      
      try {
        // ابتدا Gemini را امتحان می‌کنیم
        const scriptResponse = await fetch(`${baseUrl}/api/gemini/generate-long-form-script`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIdea: workflow.prompt,
            sceneCount: workflow.settings.scenes || 10
          })
        });

        const scriptResult = await scriptResponse.json();
        
        if (scriptResult.success) {
          script = scriptResult.data;
          scriptSource = scriptResult.fallback ? 'Pollinations AI (via Gemini fallback)' : 'Gemini API';
          console.log('✅ اسکریپت ویدیو بلند تولید شد با', scriptSource);
        } else {
          throw new Error(scriptResult.error || 'خطا در تولید اسکریپت ویدیو بلند');
        }
        
      } catch (geminiError) {
        console.log('⚠️ Gemini API failed, trying Pollinations AI directly...');
        console.error('Gemini error:', geminiError.message);
        
        try {
          // استفاده مستقیم از Pollinations AI
          script = await generateScriptWithPollinations(workflow.prompt, workflow.settings.scenes || 10);
          scriptSource = 'Pollinations AI (direct)';
          console.log('✅ اسکریپت ویدیو بلند تولید شد با Pollinations AI');
          
          // Validate the script data
          if (!script.title || !script.scenes || !Array.isArray(script.scenes)) {
            throw new Error('Invalid script data structure from Pollinations AI');
          }
          
        } catch (pollinationsError) {
          console.error('❌ Both Gemini and Pollinations AI failed:', pollinationsError.message);
          throw new Error(`هر دو سرویس AI ناموفق: Gemini: ${geminiError.message}, Pollinations: ${pollinationsError.message}`);
        }
      }

      // مرحله 2: تولید تصاویر
      console.log('🖼️ تولید تصاویر افقی...');
      const images = script.scenes.map((scene, index) => ({
        sceneIndex: index,
        imageUrl: `https://pollinations.ai/p/${encodeURIComponent(scene.visual_description)}?width=1920&height=1080&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`
      }));
      console.log('✅ تصاویر افقی تولید شدند');

      // مرحله 3: تولید صدا
      console.log('🎤 تولید صدا...');
      const audioSettings = {
        voice: workflow.voice,
        backgroundMusic: workflow.backgroundMusic || ''
      };

      // مرحله 4: تولید ویدیو کامل
      console.log('🎥 تولید ویدیو بلند...');
      const videoResponse = await fetch(`${baseUrl}/api/video/generate-long-form-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          images,
          audioSettings,
          audioResults: [],
          videoType: 'long-form',
          videoId: `workflow_${workflow.id}_${Date.now()}`
        })
      });

      videoResult = await videoResponse.json();
    } else {
      // اجرای ویدیو معمولی
      console.log('📝 تولید اسکریپت...');
      const scriptResponse = await fetch(`${baseUrl}/api/gemini/generate-creative-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdea: workflow.prompt
        })
      });

      const scriptResult = await scriptResponse.json();
      
      if (!scriptResult.success) {
        throw new Error(scriptResult.error || 'خطا در تولید اسکریپت');
      }

      const script = scriptResult.data;
      console.log('✅ اسکریپت تولید شد');

      // مرحله 2: تولید تصاویر
      console.log('🖼️ تولید تصاویر...');
      const images = script.scenes.map((scene, index) => ({
        sceneIndex: index,
        imageUrl: `https://pollinations.ai/p/${encodeURIComponent(scene.visual_description)}?width=1080&height=1920&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`
      }));
      console.log('✅ تصاویر تولید شدند');

      // مرحله 3: تولید ویدیو کامل
      console.log('🎥 تولید ویدیو...');
      const videoResponse = await fetch(`${baseUrl}/api/video/generate-complete-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          images,
          audioSettings: {
            voice: workflow.voice
          }
        })
      });

      videoResult = await videoResponse.json();
    }
    
    if (!videoResult.success) {
      throw new Error(videoResult.error || 'خطا در تولید ویدیو');
    }

    console.log('✅ ویدیو تولید شد');

    return {
      id: `video_${Date.now()}`,
      url: videoResult.data.video_url,
      title: `${workflow.name} - ${new Date().toLocaleDateString('fa-IR')}`,
      duration: videoResult.data.duration || 30,
      scenes: videoResult.data.scenes_count || 2,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

// تنظیم cron job برای workflow
async function setupCronJob(workflow) {
  try {
    const cronPattern = generateCronPattern(workflow.schedule);
    
    if (!cronPattern) {
      console.log(`⚠️ Cron pattern not generated for workflow ${workflow.id}`);
      return;
    }

    // حذف cron job قبلی اگر وجود دارد
    await removeCronJob(workflow.id);

    // ایجاد cron job جدید
    const task = cron.schedule(cronPattern, async () => {
      try {
        console.log(`⏰ اجرای خودکار workflow: ${workflow.name}`);
        const result = await executeWorkflow(workflow);
        workflowDB.markWorkflowAsRun(workflow.id, result);
        console.log(`✅ Workflow ${workflow.name} با موفقیت اجرا شد`);
      } catch (error) {
        console.error(`❌ خطا در اجرای خودکار workflow ${workflow.name}:`, error);
      }
    }, {
      scheduled: workflow.status === 'active',
      timezone: 'Asia/Tehran'
    });

    // ذخیره task برای مدیریت بعدی
    cronJobs.set(workflow.id, task);
    
    console.log(`✅ Cron job تنظیم شد برای workflow ${workflow.id}: ${cronPattern}`);
  } catch (error) {
    console.error('Error setting up cron job:', error);
    // اگر cron job تنظیم نشد، workflow را غیرفعال کن
    if (workflow.status === 'active') {
      workflowDB.updateWorkflow(workflow.id, { status: 'paused' });
      console.log(`⚠️ Workflow ${workflow.id} به دلیل خطا در cron job غیرفعال شد`);
    }
  }
}

// به‌روزرسانی cron job
async function updateCronJob(workflow) {
  await removeCronJob(workflow.id);
  if (workflow.status === 'active') {
    await setupCronJob(workflow);
  }
}

// حذف cron job
async function removeCronJob(workflowId) {
  try {
    const task = cronJobs.get(workflowId);
    if (task) {
      task.destroy();
      cronJobs.delete(workflowId);
      console.log(`🗑️ Cron job حذف شد برای workflow ${workflowId}`);
    } else {
      console.log(`⚠️ Cron job یافت نشد برای workflow ${workflowId}`);
    }
  } catch (error) {
    console.error('Error removing cron job:', error);
  }
}

// تولید cron pattern بر اساس schedule
function generateCronPattern(schedule) {
  if (!schedule || !schedule.type) return null;

  switch (schedule.type) {
    case 'daily':
      const [hours, minutes] = schedule.time.split(':').map(Number);
      return `${minutes} ${hours} * * *`; // هر روز در ساعت مشخص

    case 'weekly':
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayNumbers = schedule.days.map(day => dayNames.indexOf(day)).filter(num => num !== -1);
      const [scheduleHours, scheduleMinutes] = schedule.time.split(':').map(Number);
      
      if (dayNumbers.length === 0) return null;
      
      return `${scheduleMinutes} ${scheduleHours} * * ${dayNumbers.join(',')}`;

    case 'hourly':
      const interval = schedule.interval || 1;
      return `0 */${interval} * * *`; // هر X ساعت

    default:
      return null;
  }
}

// ذخیره cron jobs برای مدیریت
const cronJobs = new Map();

// Generate long form script using Pollinations AI directly
router.post('/generate-long-form-script-pollinations', async (req, res) => {
  try {
    const { userIdea, sceneCount = 30 } = req.body;
    
    if (!userIdea || typeof userIdea !== 'string' || userIdea.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User idea is required and must be a non-empty string'
      });
    }
    
    console.log('🤖 Generating long form script using Pollinations AI directly...');
    console.log('💡 User idea:', userIdea.trim());
    console.log('📊 Scene count:', sceneCount);
    
    try {
      const scriptData = await generateScriptWithPollinations(userIdea.trim(), sceneCount);
      
      // Validate the script data
      if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
        throw new Error('Invalid script data structure from Pollinations AI');
      }
      
      // Ensure we have the minimum number of scenes
      if (scriptData.scenes.length < sceneCount) {
        console.log(`⚠️ Pollinations AI generated ${scriptData.scenes.length} scenes, but requested ${sceneCount}. Using generated scenes.`);
      }
      
      console.log('✅ Successfully generated script using Pollinations AI');
      console.log('📊 Generated script:', {
        title: scriptData.title,
        scenesCount: scriptData.scenes ? scriptData.scenes.length : 0,
        estimatedDuration: scriptData.estimated_duration
      });
      
      res.json({
        success: true,
        data: scriptData,
        source: 'Pollinations AI (direct)'
      });
      
    } catch (pollinationsError) {
      console.error('❌ Pollinations AI failed:', pollinationsError);
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate script with Pollinations AI',
        details: pollinationsError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in long form script generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate long form script',
      details: error.message
    });
  }
});

// اضافه کردن console.log برای debug
console.log('🔧 Workflow routes loaded');

// راه‌اندازی cron jobs موجود در startup
async function initializeCronJobs() {
  try {
    const workflows = workflowDB.getAllWorkflows();
    
    for (const workflow of workflows) {
      if (workflow.status === 'active') {
        await setupCronJob(workflow);
      }
    }
    
    console.log(`✅ ${cronJobs.size} cron job راه‌اندازی شد`);
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
  }
}

// راه‌اندازی cron jobs در startup
initializeCronJobs();

module.exports = router;
