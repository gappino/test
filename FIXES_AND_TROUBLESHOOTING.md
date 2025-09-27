# راهنمای رفع مشکلات سیستم تولید ویدیو

## مشکلات شناسایی شده و راه‌حل‌ها

### 1. مشکل زبان متن برای کوکورو TTS

**مشکل:** متن ارسالی به کوکورو باید به زبان انگلیسی باشد.

**راه‌حل:**
- ✅ به‌روزرسانی پرامپت Gemini برای تولید متن انگلیسی
- ✅ اضافه کردن تابع ترجمه در `routes/video.js`
- ✅ بررسی خودکار زبان متن قبل از ارسال به کوکورو

**فایل‌های تغییر یافته:**
- `routes/gemini.js` - اضافه شدن دستورالعمل انگلیسی
- `routes/video.js` - اضافه شدن تابع `translateToEnglish()`

### 2. خطاهای تولید ویدیو در ترمینال

**مشکل:** خطاهای نامشخص در فرآیند تولید ویدیو.

**راه‌حل:**
- ✅ اضافه شدن لاگ‌گذاری کامل در تمام مراحل
- ✅ بهبود مدیریت خطا در FFmpeg
- ✅ اضافه شدن timeout برای دانلود فایل‌ها
- ✅ بهبود escape کردن مسیرهای فایل برای FFmpeg

**فایل‌های تغییر یافته:**
- `routes/remotion.js` - بهبود کامل مدیریت خطا و لاگ‌گذاری

## ویژگی‌های جدید اضافه شده

### 1. لاگ‌گذاری پیشرفته
```javascript
console.log('🎬 Starting video composition with subtitles...');
console.log(`   Scenes: ${scenes ? scenes.length : 'undefined'}`);
console.log(`   Audio results: ${audioResults ? audioResults.length : 'undefined'}`);
```

### 2. مدیریت خطای بهتر
```javascript
try {
  // عملیات
} catch (error) {
  console.error('❌ Error:', error);
  console.error('Stack trace:', error.stack);
  // مدیریت خطا
}
```

### 3. ترجمه خودکار متن
```javascript
async function translateToEnglish(text) {
  const englishPattern = /^[a-zA-Z0-9\s.,!?;:'"()-]+$/;
  if (englishPattern.test(text.trim())) {
    return text; // Already in English
  }
  // ترجمه متن فارسی به انگلیسی
}
```

### 4. بهبود FFmpeg
```javascript
command
  .on('start', (commandLine) => {
    console.log(`🔄 FFmpeg command: ${commandLine}`);
  })
  .on('progress', (progress) => {
    console.log(`📊 Progress: ${progress.percent}%`);
  })
  .on('error', (error) => {
    console.error(`❌ FFmpeg error:`, error);
  })
```

## نحوه تست سیستم

### 1. تست سریع
```bash
node test_fixes.js
```

### 2. تست کامل
```bash
node test_complete_pipeline.js
```

### 3. تست دستی
1. سرور را راه‌اندازی کنید: `npm start`
2. به `http://localhost:3001` بروید
3. روی "شروع تولید محتوا" کلیک کنید
4. مراحل تولید را دنبال کنید
5. لاگ‌های ترمینال را بررسی کنید

## لاگ‌های مهم برای بررسی

### لاگ‌های موفقیت‌آمیز:
```
🎬 Starting video composition with subtitles...
📁 Output directory: /path/to/output
🔄 Creating video with subtitles...
🎬 Processing scene 1/3...
   ✅ Image downloaded: /path/to/image.jpg
   ✅ Audio downloaded: /path/to/audio.wav
   ✅ Subtitles created: /path/to/subtitles.srt
   ✅ Video segment created: /path/to/segment.mp4
✅ Video creation completed
🎉 Video composition successful
```

### لاگ‌های خطا:
```
❌ Error composing video with subtitles: [error details]
❌ FFmpeg error: [ffmpeg error]
❌ Image download error: [download error]
```

## عیب‌یابی مشکلات رایج

### 1. خطای FFmpeg
**علت:** مسیر فایل‌ها یا تنظیمات نادرست
**راه‌حل:** بررسی لاگ‌های FFmpeg و مسیر فایل‌ها

### 2. خطای دانلود فایل
**علت:** مشکل شبکه یا URL نامعتبر
**راه‌حل:** بررسی اتصال اینترنت و URL فایل‌ها

### 3. خطای کوکورو TTS
**علت:** متن غیرانگلیسی یا مشکل نصب
**راه‌حل:** بررسی نصب کوکورو و زبان متن

### 4. خطای Whisper
**علت:** مشکل نصب یا کیفیت فایل صوتی
**راه‌حل:** بررسی نصب Whisper و کیفیت فایل

## پیش‌نیازهای سیستم

### نرم‌افزارهای مورد نیاز:
- ✅ Node.js و npm
- ✅ Python 3.8+
- ✅ FFmpeg (با پشتیبانی از subtitles)
- ✅ Kokoro TTS
- ✅ Whisper

### پکیج‌های Python:
- ✅ kokoro
- ✅ soundfile
- ✅ torch
- ✅ numpy
- ✅ whisper

### پکیج‌های Node.js:
- ✅ express
- ✅ fluent-ffmpeg
- ✅ axios
- ✅ fs-extra

## نکات مهم

1. **فضای دیسک:** اطمینان حاصل کنید فضای کافی برای فایل‌های موقت وجود دارد
2. **دسترسی فایل:** بررسی کنید که Node.js دسترسی نوشتن به پوشه‌های temp و output دارد
3. **FFmpeg:** اطمینان حاصل کنید که FFmpeg با پشتیبانی از subtitles نصب شده است
4. **کوکورو:** بررسی کنید که کوکورو TTS به درستی نصب و پیکربندی شده است

## پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های ترمینال را بررسی کنید
2. فایل‌های موقت را پاک کنید
3. سرور را مجدداً راه‌اندازی کنید
4. تست‌های موجود را اجرا کنید

---

**تاریخ به‌روزرسانی:** $(date)
**نسخه:** 2.0
**وضعیت:** ✅ آماده برای استفاده


