const EventEmitter = require('events');

class ResourceManager extends EventEmitter {
    constructor() {
        super();
        this.maxConcurrentTasks = 1; // فقط یک پردازش همزمان
        this.activeTasks = 0;
        this.queue = [];
        this.resourceLimits = {
            maxMemory: 4 * 1024 * 1024 * 1024, // 4GB
            maxCpuCores: 3
        };
    }

    // اضافه کردن کار به صف
    async addTask(taskFunction, taskId) {
        return new Promise((resolve, reject) => {
            const task = {
                id: taskId,
                function: taskFunction,
                resolve,
                reject,
                startTime: Date.now()
            };

            this.queue.push(task);
            this.processQueue();
        });
    }

    // پردازش صف
    async processQueue() {
        if (this.activeTasks >= this.maxConcurrentTasks || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        this.activeTasks++;

        try {
            console.log(`🔄 Starting task ${task.id} (${this.activeTasks}/${this.maxConcurrentTasks} active)`);
            
            // محدود کردن منابع قبل از اجرا
            await this.limitResources();
            
            const result = await task.function();
            task.resolve(result);
            
            console.log(`✅ Completed task ${task.id} in ${Date.now() - task.startTime}ms`);
        } catch (error) {
            console.error(`❌ Task ${task.id} failed:`, error);
            task.reject(error);
        } finally {
            this.activeTasks--;
            this.processQueue(); // پردازش کار بعدی
        }
    }

    // محدود کردن منابع سیستم
    async limitResources() {
        try {
            // محدود کردن حافظه
            if (process.setMaxListeners) {
                process.setMaxListeners(0);
            }

            // محدود کردن CPU cores برای child processes
            const os = require('os');
            const totalCores = os.cpus().length;
            const maxCores = Math.min(this.resourceLimits.maxCpuCores, totalCores);
            
            console.log(`💾 Resource limits: Max ${maxCores} CPU cores, ${this.resourceLimits.maxMemory / (1024*1024*1024)}GB RAM`);
            
            return { maxCores, maxMemory: this.resourceLimits.maxMemory };
        } catch (error) {
            console.error('Error setting resource limits:', error);
            return { maxCores: 2, maxMemory: 2 * 1024 * 1024 * 1024 }; // fallback
        }
    }

    // دریافت وضعیت صف
    getStatus() {
        return {
            activeTasks: this.activeTasks,
            queuedTasks: this.queue.length,
            maxConcurrent: this.maxConcurrentTasks,
            resourceLimits: this.resourceLimits
        };
    }

    // پاک کردن صف
    clearQueue() {
        this.queue.forEach(task => {
            task.reject(new Error('Queue cleared'));
        });
        this.queue = [];
    }
}

// ایجاد instance سراسری
const resourceManager = new ResourceManager();

module.exports = resourceManager;






