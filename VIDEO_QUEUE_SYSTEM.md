# سیستم صف یکپارچه ویدیو

## خلاصه

این سیستم یک صف یکپارچه برای مدیریت ساخت همه انواع ویدیوها (کوتاه، بلند، سفارشی) ارائه می‌دهد. ویدیوها به صورت FIFO (اولین ورودی، اولین خروجی) پردازش می‌شوند و فقط یک ویدیو در هر لحظه ساخته می‌شود.

## ویژگی‌های کلیدی

### 1. صف FIFO یکپارچه
- همه انواع ویدیو (short/long/custom) در یک صف واحد
- پردازش به ترتیب زمان درخواست
- فقط یک ویدیو در هر لحظه

### 2. ذخیره‌سازی وضعیت
- ذخیره صف در `video-queue.json`
- ذخیره تاریخچه (تا 50 آیتم)
- حفظ آمار (موفق، ناموفق)

### 3. رابط کاربری مانیتورینگ
- نمایش زنده ویدیوی در حال پردازش
- لیست ویدیوهای در صف انتظار
- تاریخچه کامل با فیلتر وضعیت
- به‌روزرسانی خودکار هر 2 ثانیه

### 4. مدیریت کامل
- لغو ویدیو از صف
- پاک کردن صف
- پاک کردن تاریخچه
- آمارگیری دقیق

## معماری سیستم

```
Frontend (Any Page)
    ↓
    درخواست ساخت ویدیو
    ↓
routes/video.js
    ↓
video-queue-manager.js
    ↓
صف FIFO (فقط یک ویدیو همزمان)
    ↓
تابع ساخت ویدیو
    ↓
نتیجه (موفق/ناموفق)
```

## فایل‌های جدید

### 1. `video-queue-manager.js`
مدیریت صف ویدیوها با قابلیت‌های:
- `addVideoTask(taskFunction, videoData)` - اضافه کردن ویدیو به صف
- `getQueueStatus()` - دریافت وضعیت صف
- `getHistory(limit)` - دریافت تاریخچه
- `cancelVideo(videoId)` - لغو ویدیو
- `updateProgress(videoId, progress, step)` - به‌روزرسانی پیشرفت
- `clearQueue()` - پاک کردن صف
- `clearHistory()` - پاک کردن تاریخچه

### 2. `routes/video-queue.js`
API های مانیتورینگ:
- `GET /api/video-queue/status` - وضعیت کامل صف
- `GET /api/video-queue/history` - تاریخچه ویدیوها
- `POST /api/video-queue/cancel/:videoId` - لغو ویدیو
- `DELETE /api/video-queue/clear` - پاک کردن صف
- `DELETE /api/video-queue/history` - پاک کردن تاریخچه

### 3. `public/video-queue.html`
رابط کاربری با نمایش:
- آمار (در حال پردازش، در صف، تکمیل شده، ناموفق)
- ویدیوی در حال پردازش با progress bar
- لیست ویدیوهای در صف با قابلیت لغو
- تاریخچه کامل با badge وضعیت

## تغییرات در فایل‌های موجود

### `routes/video.js`
تغییرات در 3 endpoint:

#### 1. `/generate-complete-video` (ویدیوهای کوتاه)
```javascript
// قبل: اجرای مستقیم
const result = await generateCompleteVideoContent(...);
res.json(result);

// بعد: اضافه به صف
const videoId = `short-video-${Date.now()}`;
videoQueueManager.addVideoTask(
    async () => await generateCompleteVideoContent(...),
    {
        videoId,
        type: 'short',
        title: script.title,
        metadata: { ... }
    }
);
res.json({ videoId, status: 'queued', ... });
```

#### 2. `/generate-custom-video` (ویدیوهای سفارشی)
مشابه بالا با type: 'custom'

#### 3. `/generate-long-form-video` (ویدیوهای بلند)
```javascript
// قبل: استفاده از resourceManager
resourceManager.addTask(...)

// بعد: استفاده از videoQueueManager
videoQueueManager.addVideoTask(...)
```

### `server.js`
- اضافه شدن import: `const videoQueueRoutes = require('./routes/video-queue');`
- اضافه شدن route: `app.use('/api/video-queue', videoQueueRoutes);`
- اضافه شدن صفحه: `app.get('/video-queue', ...);`

### `public/ark-menu.js`
- اضافه شدن لینک "صف ویدیوها" به منو

## نحوه استفاده

### برای کاربران
1. ویدیو را از هر صفحه‌ای (کوتاه/بلند/سفارشی) درخواست دهید
2. یک `videoId` دریافت می‌کنید و ویدیو به صف اضافه می‌شود
3. به صفحه "صف ویدیوها" بروید تا پیشرفت را مشاهده کنید
4. وقتی ویدیو آماده شد، می‌توانید آن را دانلود کنید

### برای توسعه‌دهندگان
```javascript
// اضافه کردن ویدیو به صف
const videoQueueManager = require('./video-queue-manager');

videoQueueManager.addVideoTask(
    async () => {
        // منطق ساخت ویدیو
        return { success: true, data: { video_url: '...' } };
    },
    {
        videoId: 'unique-id',
        type: 'short', // یا 'long' یا 'custom'
        title: 'عنوان ویدیو',
        metadata: {
            scenes: 5,
            voice: 'fa_IR-amir-medium',
            // سایر اطلاعات...
        }
    }
);

// به‌روزرسانی پیشرفت (اختیاری)
videoQueueManager.updateProgress('video-id', 50, 'تولید صداها...');

// دریافت وضعیت صف
const status = videoQueueManager.getQueueStatus();
console.log(status);
// {
//   activeVideo: { ... },
//   queue: [ ... ],
//   stats: { activeVideos, queuedVideos, processedCount, failedCount }
// }
```

## Event Emitter

سیستم صف از EventEmitter استفاده می‌کند:

```javascript
videoQueueManager.on('videoAdded', (data) => {
    console.log('Video added:', data.videoId);
});

videoQueueManager.on('videoStarted', (data) => {
    console.log('Video started:', data.videoId);
});

videoQueueManager.on('videoCompleted', (data) => {
    console.log('Video completed:', data.videoId);
});

videoQueueManager.on('videoFailed', (data) => {
    console.error('Video failed:', data.videoId, data.error);
});

videoQueueManager.on('progressUpdate', (data) => {
    console.log('Progress:', data.videoId, data.progress + '%');
});
```

## ساختار داده

### Video Object
```javascript
{
    id: 'video-123',
    type: 'short', // یا 'long', 'custom'
    title: 'عنوان ویدیو',
    status: 'pending', // یا 'processing', 'completed', 'failed', 'cancelled'
    progress: 0-100,
    addedTime: 1234567890,
    startTime: 1234567890,
    endTime: 1234567890,
    metadata: {
        scenes: 5,
        voice: 'fa_IR-amir-medium',
        backgroundMusic: 'music.mp3',
        // سایر فیلدها...
    },
    error: null // یا رشته خطا
}
```

### Queue Status Response
```javascript
{
    success: true,
    data: {
        activeVideo: { ... }, // یا null
        queue: [ ... ], // آرایه ویدیوهای در انتظار
        stats: {
            activeVideos: 1,
            queuedVideos: 3,
            processedCount: 10,
            failedCount: 2,
            totalVideos: 16
        }
    }
}
```

## مزایا

### 1. جلوگیری از فشار منابع
- فقط یک ویدیو در هر لحظه پردازش می‌شود
- CPU/RAM به صورت کنترل شده استفاده می‌شود
- سیستم پایدار و بدون کرش

### 2. عدالت در پردازش
- تمام درخواست‌ها به ترتیب FIFO
- هیچ ویدیویی از دیگری جلو نمی‌زند
- کاربران می‌دانند چه زمانی نوبت آنهاست

### 3. شفافیت کامل
- نمایش زنده وضعیت
- پیشرفت دقیق هر ویدیو
- تاریخچه کامل

### 4. مدیریت آسان
- لغو ویدیوها از صف
- پاک کردن صف در صورت نیاز
- آمارگیری دقیق

## تفاوت با سیستم قبلی

### قبل:
- ✗ ویدیوهای کوتاه و سفارشی بدون صف
- ✗ فقط ویدیوهای بلند از `resourceManager` استفاده می‌کردند
- ✗ عدم هماهنگی بین انواع مختلف ویدیو
- ✗ احتمال اجرای همزمان چند ویدیو

### بعد:
- ✓ همه ویدیوها در یک صف یکپارچه
- ✓ فقط یک ویدیو در هر لحظه
- ✓ الویت FIFO برای همه
- ✓ رابط کاربری مانیتورینگ

## عملکرد

- **تعداد همزمان**: 1 ویدیو
- **الگوریتم صف**: FIFO
- **حداکثر تاریخچه**: 50 آیتم
- **به‌روزرسانی UI**: هر 2 ثانیه
- **ذخیره‌سازی**: `video-queue.json`

## نکات مهم

1. **سازگاری با کد قدیمی**: کد frontend قدیمی همچنان کار می‌کند، فقط به جای نتیجه فوری، `videoId` دریافت می‌کند

2. **Persistence**: صف در فایل ذخیره می‌شود، اما tasks فعال در restart از دست می‌روند

3. **Error Handling**: خطاها ثبت می‌شوند و ویدیو به تاریخچه با وضعیت 'failed' اضافه می‌شود

4. **Cancellation**: فقط ویدیوهای در صف قابل لغو هستند، نه ویدیوی در حال پردازش

## توسعه آینده

پیشنهادات برای بهبود:

- [ ] اضافه کردن الویت دستی به ویدیوها
- [ ] پشتیبانی از pause/resume
- [ ] WebSocket برای به‌روزرسانی real-time
- [ ] نوتیفیکیشن هنگام تکمیل ویدیو
- [ ] صف‌های جداگانه برای هر کاربر
- [ ] محدودیت تعداد ویدیو در صف
- [ ] تخمین زمان انتظار

## تست

برای تست سیستم:

1. سرور را اجرا کنید: `node server.js`
2. چند ویدیو (کوتاه، بلند، سفارشی) بسازید
3. به `/video-queue` بروید
4. مشاهده کنید که ویدیوها به ترتیب پردازش می‌شوند
5. یک ویدیو را لغو کنید
6. صف را پاک کنید

## پشتیبانی

در صورت مشکل، لاگ‌ها را بررسی کنید:
```
📹 [Video Queue] Added "..." to queue
🔄 [Video Queue] Starting "..."
✅ [Video Queue] Completed "..." in Xs
📋 [Video Queue] Current Status: ...
```

---

**تاریخ پیاده‌سازی**: 2025-10-10  
**نسخه**: 1.0.0  
**وضعیت**: ✅ کامل و آماده استفاده

