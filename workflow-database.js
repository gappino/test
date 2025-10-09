const fs = require('fs');
const path = require('path');

class WorkflowDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'workflows.json');
    this.workflows = this.loadWorkflows();
    console.log(`📁 Workflow database path: ${this.dbPath}`);
  }

  loadWorkflows() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
    return [];
  }

  saveWorkflows() {
    try {
      // اطمینان از وجود پوشه
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dbPath, JSON.stringify(this.workflows, null, 2));
      console.log(`💾 Workflows saved to: ${this.dbPath}`);
      return true;
    } catch (error) {
      console.error('Error saving workflows:', error);
      return false;
    }
  }

  // ایجاد workflow جدید
  createWorkflow(workflowData) {
    const workflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: workflowData.name || 'Workflow بدون نام',
      prompt: workflowData.prompt,
      voice: workflowData.voice || 'fa_IR-amir-medium',
      backgroundMusic: workflowData.backgroundMusic || '',
      schedule: workflowData.schedule, // { type: 'daily', time: '09:00', days: ['monday', 'tuesday'] }
      settings: {
        videoType: workflowData.videoType || 'short', // short, long-form, custom
        orientation: workflowData.orientation || 'vertical',
        scenes: workflowData.scenes || 2,
        ...workflowData.settings
      },
      customScenes: workflowData.customScenes || null, // برای workflow های سفارشی
      customSettings: workflowData.customSettings || null, // تنظیمات سفارشی
      status: 'active', // active, paused, disabled
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: null,
      nextRun: this.calculateNextRun(workflowData.schedule),
      totalRuns: 0,
      videos: [] // آرایه ویدیوهای تولید شده
    };

    this.workflows.push(workflow);
    this.saveWorkflows();
    return workflow;
  }

  // محاسبه زمان اجرای بعدی
  calculateNextRun(schedule) {
    if (!schedule || !schedule.type) return null;

    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.type) {
      case 'daily':
        const [hours, minutes] = schedule.time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        
        // اگر زمان گذشته، برای فردا تنظیم کن
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDays = schedule.days || [];
        const [scheduleHours, scheduleMinutes] = schedule.time.split(':').map(Number);
        
        // پیدا کردن نزدیک‌ترین روز
        let found = false;
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(now.getDate() + i);
          const dayName = dayNames[checkDate.getDay()];
          
          if (targetDays.includes(dayName)) {
            checkDate.setHours(scheduleHours, scheduleMinutes, 0, 0);
            if (checkDate > now) {
              nextRun.setTime(checkDate.getTime());
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // اگر هیچ روزی پیدا نشد، برای هفته بعد تنظیم کن
          nextRun.setDate(now.getDate() + 7);
          nextRun.setHours(scheduleHours, scheduleMinutes, 0, 0);
        }
        break;

      case 'hourly':
        nextRun.setMinutes(nextRun.getMinutes() + (schedule.interval || 1) * 60);
        break;

      default:
        return null;
    }

    return nextRun.toISOString();
  }

  // دریافت تمام workflow ها
  getAllWorkflows() {
    return this.workflows;
  }

  // دریافت workflow بر اساس ID
  getWorkflowById(id) {
    return this.workflows.find(w => w.id === id);
  }

  // به‌روزرسانی workflow
  updateWorkflow(id, updateData) {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return null;

    const workflow = this.workflows[index];
    const updatedWorkflow = {
      ...workflow,
      ...updateData,
      updatedAt: new Date().toISOString(),
      id: workflow.id // حفظ ID اصلی
    };

    // محاسبه مجدد زمان اجرای بعدی اگر schedule تغییر کرده
    if (updateData.schedule) {
      updatedWorkflow.nextRun = this.calculateNextRun(updateData.schedule);
    }

    this.workflows[index] = updatedWorkflow;
    this.saveWorkflows();
    return updatedWorkflow;
  }

  // حذف workflow
  deleteWorkflow(id) {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.workflows.splice(index, 1);
    this.saveWorkflows();
    return true;
  }

  // دریافت workflow های آماده برای اجرا
  getWorkflowsReadyToRun() {
    const now = new Date();
    return this.workflows.filter(workflow => {
      return workflow.status === 'active' && 
             workflow.nextRun && 
             new Date(workflow.nextRun) <= now;
    });
  }

  // به‌روزرسانی زمان اجرای بعدی پس از اجرا
  markWorkflowAsRun(id, videoData = null) {
    const workflow = this.getWorkflowById(id);
    if (!workflow) return null;

    const now = new Date().toISOString();
    
    // اضافه کردن ویدیو به لیست ویدیوها
    if (videoData) {
      workflow.videos.push({
        id: videoData.id || `video_${Date.now()}`,
        url: videoData.url,
        title: videoData.title,
        createdAt: now,
        duration: videoData.duration,
        scenes: videoData.scenes
      });
    }

    // به‌روزرسانی اطلاعات اجرا
    workflow.lastRun = now;
    workflow.totalRuns = (workflow.totalRuns || 0) + 1;
    workflow.nextRun = this.calculateNextRun(workflow.schedule);
    workflow.updatedAt = now;

    this.saveWorkflows();
    return workflow;
  }

  // تغییر وضعیت workflow
  toggleWorkflowStatus(id) {
    const workflow = this.getWorkflowById(id);
    if (!workflow) return null;

    workflow.status = workflow.status === 'active' ? 'paused' : 'active';
    workflow.updatedAt = new Date().toISOString();
    
    this.saveWorkflows();
    return workflow;
  }

  // دریافت آمار workflow ها
  getWorkflowStats() {
    const stats = {
      total: this.workflows.length,
      active: this.workflows.filter(w => w.status === 'active').length,
      paused: this.workflows.filter(w => w.status === 'paused').length,
      totalVideos: this.workflows.reduce((sum, w) => sum + (w.videos ? w.videos.length : 0), 0),
      totalRuns: this.workflows.reduce((sum, w) => sum + (w.totalRuns || 0), 0)
    };

    return stats;
  }
}

module.exports = new WorkflowDatabase();
