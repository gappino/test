# پیاده‌سازی سیستم صف‌بندی Piper TTS

## خلاصه تغییرات

این پروژه اکنون از یک سیستم صف‌بندی برای درخواست‌های Piper TTS استفاده می‌کند تا از فشار همزمان به CPU/RAM جلوگیری کند.

## فایل‌های جدید

### `tts-queue-manager.js`
یک سیستم صف پیشرفته برای مدیریت درخواست‌های TTS:

**ویژگی‌ها:**
- محدودیت همزمانی قابل تنظیم (پیش‌فرض: 2 درخواست همزمان)
- صف خودکار و پردازش ترتیبی
- لاگ‌گذاری کامل و tracking
- آمارگیری (تعداد موفق، ناموفق، در حال پردازش)
- Event emitter برای مانیتورینگ

**استفاده:**
```javascript
const ttsQueueManager = require('./tts-queue-manager');

// اضافه کردن TTS به صف
const result = await ttsQueueManager.addTTSTask(
  () => generatePiperTTS(text, voice),
  'unique-task-id'
);

// دریافت وضعیت صف
const status = ttsQueueManager.getStatus();
console.log(status);
// {
//   activeTasks: 2,
//   queuedTasks: 5,
//   maxConcurrent: 2,
//   processedCount: 10,
//   failedCount: 1
// }

// تغییر تعداد همزمانی
ttsQueueManager.setMaxConcurrent(3);

// پاک کردن صف
ttsQueueManager.clearQueue();
```

## فایل‌های تغییر یافته

### 1. `routes/video.js`
تغییرات در 3 مکان:

#### الف) `/generate-complete-video` (خطوط ~484-566)
```javascript
// قبل: Promise.all() - همه همزمان
const audioPromises = script.scenes.map(async (scene, index) => {...});
const finalAudioResults = await Promise.all(audioPromises);

// بعد: صف‌بندی شده - کنترل شده
const finalAudioResults = [];
for (let index = 0; index < script.scenes.length; index++) {
  const result = await ttsQueueManager.addTTSTask(
    () => generatePiperTTS(textForTTS, voice),
    `complete-video-scene-${index}`
  );
  finalAudioResults.push(result);
}
```

#### ب) `/generate-custom-video` (خطوط ~742-818)
همان الگو - جایگزینی Promise.all با صف

#### ج) `generateLongFormVideoContent()` (خطوط ~1044-1126)
همان الگو - جایگزینی Promise.all با صف

### 2. `routes/kokoro.js`
تغییرات کامل endpoint:

- اضافه شدن تابع کمکی `runPiperTTS()` (خطوط 71-227)
- ساده‌سازی endpoint `/text-to-speech` برای استفاده از صف (خطوط 229-266)

```javascript
// قبل: اجرای مستقیم
const pythonProcess = spawn(PYTHON_CMD, ...);
// کد طولانی برای مدیریت process

// بعد: استفاده از صف
const result = await ttsQueueManager.addTTSTask(
  () => runPiperTTS(text, voice, outputDir),
  `kokoro-tts-${Date.now()}`
);
res.json(result);
```

## مزایای پیاده‌سازی جدید

### 1. کنترل منابع
- محدود کردن تعداد TTS همزمان (پیش‌فرض: 2)
- جلوگیری از فشار به CPU/RAM
- پایداری بهتر سیستم

### 2. قابلیت ردیابی
- لاگ کامل هر درخواست
- زمان انتظار در صف
- زمان پردازش
- آمار موفقیت/شکست

### 3. مقیاس‌پذیری
- امکان تنظیم تعداد همزمانی
- مدیریت صف خودکار
- Event-driven architecture

### 4. قابلیت اطمینان
- خطاگیری بهتر
- Fallback مکانیزم‌ها
- پردازش ترتیبی در صورت نیاز

## لاگ‌های جدید

با پیاده‌سازی جدید، لاگ‌های زیر را خواهید دید:

```
🎵 [TTS Queue] Added task "complete-video-scene-0" to queue. Queue length: 1
🔄 [TTS Queue] Starting task "complete-video-scene-0"
   📊 Active: 1/2 | Queue: 0 | Wait time: 5ms
✅ [TTS Queue] Completed task "complete-video-scene-0" in 2341ms
   📈 Stats: 1 completed, 0 failed

🎵 [TTS Queue] Added task "complete-video-scene-1" to queue. Queue length: 1
🔄 [TTS Queue] Starting task "complete-video-scene-1"
   📊 Active: 2/2 | Queue: 0 | Wait time: 3ms
✅ [TTS Queue] Completed task "complete-video-scene-1" in 2156ms
   📈 Stats: 2 completed, 0 failed

📋 [TTS Queue] Current Status:
   🔄 Active Tasks: 2/2
   ⏳ Queued Tasks: 3
   ✅ Completed: 2
   ❌ Failed: 0
   📊 Total: 7
```

## تنظیمات

### تغییر تعداد همزمانی

در `tts-queue-manager.js` خط 101:
```javascript
const ttsQueueManager = new TTSQueueManager(2); // تغییر عدد 2 به عدد دلخواه
```

یا به صورت پویا:
```javascript
ttsQueueManager.setMaxConcurrent(3);
```

### غیرفعال کردن لاگ‌های دوره‌ای

در `tts-queue-manager.js` خطوط 207-212:
```javascript
// کامنت کردن این بخش برای غیرفعال کردن لاگ هر 30 ثانیه
// setInterval(() => {
//   const status = ttsQueueManager.getStatus();
//   if (status.activeTasks > 0 || status.queuedTasks > 0) {
//     ttsQueueManager.logStatus();
//   }
// }, 30000);
```

## تست

برای تست سیستم صف:

1. سرور را اجرا کنید:
```bash
node server.js
```

2. یک ویدیو با چندین صحنه بسازید (مثلاً 5-10 صحنه)

3. لاگ‌ها را مشاهده کنید:
   - باید ببینید که TTS ها به صف اضافه می‌شوند
   - حداکثر 2 TTS همزمان در حال پردازش هستند
   - بقیه منتظر در صف می‌مانند

4. مصرف CPU/RAM را مقایسه کنید:
   - قبل: همه TTS همزمان → فشار زیاد
   - بعد: کنترل شده → مصرف پایدار

## نکات مهم

1. **ترتیب پردازش**: TTS ها به ترتیب اضافه شدن به صف پردازش می‌شوند (FIFO)

2. **Fallback**: در صورت خطا، همچنان fallback audio تولید می‌شود

3. **Performance**: با 2 TTS همزمان، سرعت مناسبی دارید بدون فشار زیاد

4. **سازگاری**: کد قدیمی بدون تغییر کار می‌کند، فقط از صف استفاده می‌شود

## توسعه آینده

پیشنهادات برای بهبود:

- [ ] اضافه کردن priority به tasks
- [ ] timeout برای tasks طولانی
- [ ] retry مکانیزم برای خطاها
- [ ] dashboard وب برای مانیتورینگ صف
- [ ] cache برای TTS های تکراری
- [ ] load balancing برای چند سرور

## مشکلات احتمالی

### صف خیلی طولانی می‌شود
**راه‌حل**: تعداد همزمانی را افزایش دهید
```javascript
ttsQueueManager.setMaxConcurrent(4);
```

### TTS ها خیلی کند پردازش می‌شوند
**علت**: محدودیت CPU/RAM سیستم
**راه‌حل**: 
- تعداد همزمانی را کاهش دهید
- سیستم را ارتقا دهید

### Memory leak
**علت نادر**: صف پاک نمی‌شود
**راه‌حل**: 
```javascript
ttsQueueManager.clearQueue();
ttsQueueManager.resetStats();
```

## تماس و پشتیبانی

در صورت مشکل، لاگ‌های کامل را بررسی کنید و وضعیت صف را چک کنید:
```javascript
console.log(ttsQueueManager.getStatus());
```

---

**تاریخ پیاده‌سازی**: 2025-10-10
**نسخه**: 1.0.0

