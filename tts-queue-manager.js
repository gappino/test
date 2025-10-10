const EventEmitter = require('events');

/**
 * TTS Queue Manager
 * مدیریت صف درخواست‌های Piper TTS برای جلوگیری از فشار همزمان به CPU/RAM
 */
class TTSQueueManager extends EventEmitter {
    constructor(maxConcurrentTasks = 2) {
        super();
        this.maxConcurrentTasks = maxConcurrentTasks; // تعداد TTS همزمان
        this.activeTasks = 0;
        this.queue = [];
        this.processedCount = 0;
        this.failedCount = 0;
    }

    /**
     * اضافه کردن TTS task به صف
     * @param {Function} taskFunction - تابعی که TTS را تولید می‌کند
     * @param {String} taskId - شناسه یکتا برای task
     * @returns {Promise} نتیجه TTS
     */
    async addTTSTask(taskFunction, taskId) {
        return new Promise((resolve, reject) => {
            const task = {
                id: taskId || `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                function: taskFunction,
                resolve,
                reject,
                addedTime: Date.now(),
                startTime: null
            };

            this.queue.push(task);
            console.log(`🎵 [TTS Queue] Added task "${task.id}" to queue. Queue length: ${this.queue.length}`);
            
            this.emit('taskAdded', {
                taskId: task.id,
                queueLength: this.queue.length,
                activeTasks: this.activeTasks
            });

            // شروع پردازش صف
            this.processQueue();
        });
    }

    /**
     * پردازش صف TTS
     */
    async processQueue() {
        // اگر ظرفیت پر است یا صف خالی است، خروج
        if (this.activeTasks >= this.maxConcurrentTasks || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        this.activeTasks++;
        task.startTime = Date.now();
        
        const waitTime = task.startTime - task.addedTime;
        console.log(`🔄 [TTS Queue] Starting task "${task.id}"`);
        console.log(`   📊 Active: ${this.activeTasks}/${this.maxConcurrentTasks} | Queue: ${this.queue.length} | Wait time: ${waitTime}ms`);

        this.emit('taskStarted', {
            taskId: task.id,
            activeTasks: this.activeTasks,
            queueLength: this.queue.length,
            waitTime
        });

        try {
            const result = await task.function();
            
            const processingTime = Date.now() - task.startTime;
            this.processedCount++;
            
            console.log(`✅ [TTS Queue] Completed task "${task.id}" in ${processingTime}ms`);
            console.log(`   📈 Stats: ${this.processedCount} completed, ${this.failedCount} failed`);
            
            this.emit('taskCompleted', {
                taskId: task.id,
                processingTime,
                totalProcessed: this.processedCount
            });
            
            task.resolve(result);
            
        } catch (error) {
            this.failedCount++;
            
            const processingTime = Date.now() - task.startTime;
            console.error(`❌ [TTS Queue] Task "${task.id}" failed after ${processingTime}ms:`, error.message);
            console.log(`   📉 Stats: ${this.processedCount} completed, ${this.failedCount} failed`);
            
            this.emit('taskFailed', {
                taskId: task.id,
                error: error.message,
                totalFailed: this.failedCount
            });
            
            task.reject(error);
            
        } finally {
            this.activeTasks--;
            
            // پردازش task بعدی در صف
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * دریافت وضعیت فعلی صف
     * @returns {Object} وضعیت صف
     */
    getStatus() {
        return {
            activeTasks: this.activeTasks,
            queuedTasks: this.queue.length,
            maxConcurrent: this.maxConcurrentTasks,
            processedCount: this.processedCount,
            failedCount: this.failedCount,
            totalTasks: this.processedCount + this.failedCount + this.activeTasks + this.queue.length
        };
    }

    /**
     * تنظیم تعداد maximum همزمانی
     * @param {Number} max - تعداد maximum tasks همزمان
     */
    setMaxConcurrent(max) {
        if (max < 1) {
            console.warn('⚠️ [TTS Queue] Max concurrent must be at least 1');
            return;
        }
        
        console.log(`⚙️ [TTS Queue] Changing max concurrent from ${this.maxConcurrentTasks} to ${max}`);
        this.maxConcurrentTasks = max;
        
        // شروع پردازش tasks اضافی اگر ظرفیت افزایش یافته
        this.processQueue();
    }

    /**
     * پاک کردن صف و لغو تمام tasks منتظر
     */
    clearQueue() {
        const clearedCount = this.queue.length;
        
        this.queue.forEach(task => {
            task.reject(new Error('Queue cleared by system'));
        });
        
        this.queue = [];
        
        console.log(`🧹 [TTS Queue] Cleared ${clearedCount} tasks from queue`);
        
        this.emit('queueCleared', { clearedCount });
    }

    /**
     * ریست کردن آمار
     */
    resetStats() {
        this.processedCount = 0;
        this.failedCount = 0;
        console.log('📊 [TTS Queue] Statistics reset');
    }

    /**
     * چاپ لاگ کامل وضعیت
     */
    logStatus() {
        const status = this.getStatus();
        console.log('📋 [TTS Queue] Current Status:');
        console.log(`   🔄 Active Tasks: ${status.activeTasks}/${status.maxConcurrent}`);
        console.log(`   ⏳ Queued Tasks: ${status.queuedTasks}`);
        console.log(`   ✅ Completed: ${status.processedCount}`);
        console.log(`   ❌ Failed: ${status.failedCount}`);
        console.log(`   📊 Total: ${status.totalTasks}`);
    }
}

// ایجاد instance سراسری با محدودیت 2 TTS همزمان (قابل تنظیم)
const ttsQueueManager = new TTSQueueManager(2);

// لاگ وضعیت هر 30 ثانیه اگر صف فعال باشد
setInterval(() => {
    const status = ttsQueueManager.getStatus();
    if (status.activeTasks > 0 || status.queuedTasks > 0) {
        ttsQueueManager.logStatus();
    }
}, 30000);

module.exports = ttsQueueManager;

