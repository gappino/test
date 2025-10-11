const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');

/**
 * Video Queue Manager
 * مدیریت صف یکپارچه برای همه انواع ویدیوها (کوتاه، بلند، سفارشی)
 * فقط یک ویدیو در هر لحظه با الویت FIFO
 */
class VideoQueueManager extends EventEmitter {
    constructor() {
        super();
        this.maxConcurrentVideos = 1; // فقط یک ویدیو همزمان
        this.activeVideos = 0;
        this.queue = [];
        this.history = [];
        this.queueFilePath = path.join(__dirname, 'video-queue.json');
        this.processedCount = 0;
        this.failedCount = 0;
        this.cancelledVideos = new Set();
        
        // بارگذاری صف از فایل
        this.loadQueue();
    }

    /**
     * اضافه کردن ویدیو به صف
     * @param {Function} taskFunction - تابعی که ویدیو را می‌سازد
     * @param {Object} videoData - اطلاعات ویدیو
     * @returns {Promise} نتیجه ساخت ویدیو
     */
    async addVideoTask(taskFunction, videoData) {
        return new Promise((resolve, reject) => {
            const video = {
                id: videoData.videoId || `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: videoData.type || 'unknown', // short, long, custom
                title: videoData.title || 'بدون عنوان',
                function: taskFunction,
                resolve,
                reject,
                status: 'pending', // pending, processing, completed, failed, cancelled
                progress: 0,
                addedTime: Date.now(),
                startTime: null,
                endTime: null,
                metadata: videoData.metadata || {},
                error: null
            };

            this.queue.push(video);
            this.saveQueue();
            
            console.log(`📹 [Video Queue] Added "${video.title}" (${video.type}) to queue`);
            console.log(`   📊 Queue length: ${this.queue.length} | Active: ${this.activeVideos}`);
            
            this.emit('videoAdded', {
                videoId: video.id,
                type: video.type,
                title: video.title,
                queueLength: this.queue.length,
                activeVideos: this.activeVideos
            });

            // شروع پردازش صف
            this.processQueue();
        });
    }

    /**
     * پردازش صف ویدیوها
     */
    async processQueue() {
        // اگر ظرفیت پر است یا صف خالی است، خروج
        if (this.activeVideos >= this.maxConcurrentVideos || this.queue.length === 0) {
            return;
        }

        const video = this.queue.shift();
        
        // چک کردن اگر ویدیو لغو شده
        if (this.cancelledVideos.has(video.id)) {
            this.cancelledVideos.delete(video.id);
            console.log(`⏭️ [Video Queue] Skipping cancelled video "${video.title}"`);
            this.processQueue(); // پردازش بعدی
            return;
        }

        this.activeVideos++;
        video.status = 'processing';
        video.startTime = Date.now();
        
        const waitTime = video.startTime - video.addedTime;
        console.log(`🔄 [Video Queue] Starting "${video.title}" (${video.type})`);
        console.log(`   📊 Active: ${this.activeVideos}/${this.maxConcurrentVideos} | Queue: ${this.queue.length} | Wait: ${Math.round(waitTime/1000)}s`);

        this.saveQueue();
        this.emit('videoStarted', {
            videoId: video.id,
            type: video.type,
            title: video.title,
            activeVideos: this.activeVideos,
            queueLength: this.queue.length,
            waitTime
        });

        try {
            const result = await video.function();
            
            video.status = 'completed';
            video.progress = 100;
            video.endTime = Date.now();
            const processingTime = video.endTime - video.startTime;
            this.processedCount++;
            
            console.log(`✅ [Video Queue] Completed "${video.title}" in ${Math.round(processingTime/1000)}s`);
            console.log(`   📈 Stats: ${this.processedCount} completed, ${this.failedCount} failed`);
            
            // اضافه به تاریخچه
            this.history.unshift({
                ...video,
                function: undefined, // حذف function برای ذخیره
                resolve: undefined,
                reject: undefined,
                result
            });
            
            // محدود کردن تاریخچه به 50 آیتم
            if (this.history.length > 50) {
                this.history = this.history.slice(0, 50);
            }
            
            this.emit('videoCompleted', {
                videoId: video.id,
                type: video.type,
                title: video.title,
                processingTime,
                totalProcessed: this.processedCount,
                result
            });
            
            video.resolve(result);
            
        } catch (error) {
            video.status = 'failed';
            video.endTime = Date.now();
            video.error = error.message;
            const processingTime = video.endTime - video.startTime;
            this.failedCount++;
            
            console.error(`❌ [Video Queue] Failed "${video.title}" after ${Math.round(processingTime/1000)}s:`, error.message);
            console.log(`   📉 Stats: ${this.processedCount} completed, ${this.failedCount} failed`);
            
            // اضافه به تاریخچه
            this.history.unshift({
                ...video,
                function: undefined,
                resolve: undefined,
                reject: undefined
            });
            
            if (this.history.length > 50) {
                this.history = this.history.slice(0, 50);
            }
            
            this.emit('videoFailed', {
                videoId: video.id,
                type: video.type,
                title: video.title,
                error: error.message,
                totalFailed: this.failedCount
            });
            
            video.reject(error);
            
        } finally {
            this.activeVideos--;
            this.saveQueue();
            
            // پردازش ویدیو بعدی در صف
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * به‌روزرسانی پیشرفت ویدیو
     * @param {String} videoId - شناسه ویدیو
     * @param {Number} progress - درصد پیشرفت (0-100)
     * @param {String} currentStep - مرحله فعلی
     */
    updateProgress(videoId, progress, currentStep = null) {
        // جستجو در صف فعال
        const video = this.queue.find(v => v.id === videoId);
        
        // یا در تاریخچه برای ویدیوی در حال پردازش
        const historyVideo = this.history.find(v => v.id === videoId && v.status === 'processing');
        
        const target = video || historyVideo;
        
        if (target) {
            target.progress = progress;
            if (currentStep) {
                target.currentStep = currentStep;
            }
            
            this.emit('progressUpdate', {
                videoId,
                progress,
                currentStep
            });
            
            this.saveQueue();
        }
    }

    /**
     * لغو ویدیو
     * @param {String} videoId - شناسه ویدیو
     * @returns {Boolean} موفقیت لغو
     */
    cancelVideo(videoId) {
        const videoIndex = this.queue.findIndex(v => v.id === videoId);
        
        if (videoIndex !== -1) {
            const video = this.queue[videoIndex];
            this.queue.splice(videoIndex, 1);
            this.cancelledVideos.add(videoId);
            
            console.log(`🚫 [Video Queue] Cancelled "${video.title}"`);
            
            this.emit('videoCancelled', {
                videoId,
                title: video.title,
                type: video.type
            });
            
            this.saveQueue();
            
            // رد کردن promise
            video.reject(new Error('Video cancelled by user'));
            
            return true;
        }
        
        return false;
    }

    /**
     * دریافت وضعیت کامل صف
     * @returns {Object} وضعیت صف
     */
    getQueueStatus() {
        // ویدیوی در حال پردازش از تاریخچه
        const processingVideo = this.history.find(v => v.status === 'processing');
        
        return {
            activeVideo: processingVideo || null,
            queue: this.queue.map(v => ({
                id: v.id,
                type: v.type,
                title: v.title,
                status: v.status,
                progress: v.progress,
                addedTime: v.addedTime,
                metadata: v.metadata
            })),
            stats: {
                activeVideos: this.activeVideos,
                queuedVideos: this.queue.length,
                maxConcurrent: this.maxConcurrentVideos,
                processedCount: this.processedCount,
                failedCount: this.failedCount,
                totalVideos: this.processedCount + this.failedCount + this.activeVideos + this.queue.length
            }
        };
    }

    /**
     * دریافت تاریخچه ویدیوها
     * @param {Number} limit - تعداد آیتم‌های برگشتی
     * @returns {Array} تاریخچه
     */
    getHistory(limit = 50) {
        return this.history.slice(0, limit).map(v => ({
            id: v.id,
            type: v.type,
            title: v.title,
            status: v.status,
            progress: v.progress,
            addedTime: v.addedTime,
            startTime: v.startTime,
            endTime: v.endTime,
            error: v.error,
            metadata: v.metadata,
            duration: v.endTime && v.startTime ? v.endTime - v.startTime : null
        }));
    }

    /**
     * پاک کردن صف
     */
    clearQueue() {
        const clearedCount = this.queue.length;
        
        this.queue.forEach(video => {
            video.reject(new Error('Queue cleared by system'));
        });
        
        this.queue = [];
        this.saveQueue();
        
        console.log(`🧹 [Video Queue] Cleared ${clearedCount} videos from queue`);
        
        this.emit('queueCleared', { clearedCount });
        
        return clearedCount;
    }

    /**
     * پاک کردن تاریخچه
     */
    clearHistory() {
        const clearedCount = this.history.length;
        this.history = [];
        this.saveQueue();
        
        console.log(`🧹 [Video Queue] Cleared ${clearedCount} items from history`);
        
        return clearedCount;
    }

    /**
     * ریست کردن آمار
     */
    resetStats() {
        this.processedCount = 0;
        this.failedCount = 0;
        console.log('📊 [Video Queue] Statistics reset');
    }

    /**
     * ذخیره صف در فایل
     */
    async saveQueue() {
        try {
            const data = {
                queue: this.queue.map(v => ({
                    id: v.id,
                    type: v.type,
                    title: v.title,
                    status: v.status,
                    progress: v.progress,
                    addedTime: v.addedTime,
                    startTime: v.startTime,
                    metadata: v.metadata
                })),
                history: this.history,
                stats: {
                    processedCount: this.processedCount,
                    failedCount: this.failedCount
                },
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeJson(this.queueFilePath, data, { spaces: 2 });
        } catch (error) {
            console.error('❌ Error saving queue to file:', error.message);
        }
    }

    /**
     * بارگذاری صف از فایل
     */
    async loadQueue() {
        try {
            if (await fs.pathExists(this.queueFilePath)) {
                const data = await fs.readJson(this.queueFilePath);
                
                // بارگذاری تاریخچه
                this.history = data.history || [];
                
                // بارگذاری آمار
                if (data.stats) {
                    this.processedCount = data.stats.processedCount || 0;
                    this.failedCount = data.stats.failedCount || 0;
                }
                
                console.log(`📂 [Video Queue] Loaded queue from file`);
                console.log(`   📊 History items: ${this.history.length}`);
                console.log(`   📊 Stats: ${this.processedCount} completed, ${this.failedCount} failed`);
            }
        } catch (error) {
            console.error('❌ Error loading queue from file:', error.message);
        }
    }

    /**
     * چاپ لاگ کامل وضعیت
     */
    logStatus() {
        const status = this.getQueueStatus();
        console.log('📋 [Video Queue] Current Status:');
        if (status.activeVideo) {
            console.log(`   🎬 Processing: "${status.activeVideo.title}" (${status.activeVideo.type}) - ${status.activeVideo.progress}%`);
        }
        console.log(`   ⏳ Queued: ${status.stats.queuedVideos} videos`);
        console.log(`   ✅ Completed: ${status.stats.processedCount}`);
        console.log(`   ❌ Failed: ${status.stats.failedCount}`);
        console.log(`   📊 Total: ${status.stats.totalVideos}`);
    }
}

// ایجاد instance سراسری
const videoQueueManager = new VideoQueueManager();

// لاگ وضعیت هر 60 ثانیه اگر صف فعال باشد
setInterval(() => {
    const status = videoQueueManager.getQueueStatus();
    if (status.activeVideo || status.queue.length > 0) {
        videoQueueManager.logStatus();
    }
}, 60000);

module.exports = videoQueueManager;


