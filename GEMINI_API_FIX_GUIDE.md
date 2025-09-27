# راهنمای رفع مشکل Gemini API

## مشکل شناسایی شده

سیستم از **Mock Gemini** به جای **Gemini واقعی** استفاده می‌کرد.

## راه‌حل‌های پیاده‌سازی شده

### 1. ✅ تغییر مسیر API
**فایل:** `server.js`
```javascript
// قبل (اشتباه)
app.use('/api/gemini', mockGeminiRoutes);

// بعد (درست)
app.use('/api/gemini', geminiRoutes);
```

### 2. ✅ بهبود مدیریت خطا
**فایل:** `routes/gemini.js`

#### ویژگی‌های جدید:
- **لاگ‌گذاری کامل** برای تمام مراحل
- **بررسی API Key** قبل از فراخوانی
- **مدیریت خطای Quota** با fallback هوشمند
- **پشتیبانی از مدل صحیح** (`gemini-1.5-pro`)

#### کد نمونه:
```javascript
console.log('🤖 Calling real Gemini API for script generation...');

// Check if API key is available
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  throw new Error('Gemini API key not configured');
}

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
```

### 3. ✅ Fallback هوشمند
وقتی quota تمام شود، سیستم به صورت خودکار از داده‌های fallback استفاده می‌کند:

```javascript
// Check if it's a quota error
if (error.message.includes('quota') || error.message.includes('429')) {
  console.log('⚠️ Gemini quota exceeded, using fallback script');
  // استفاده از داده‌های fallback
}
```

## وضعیت فعلی

### ✅ **Gemini API فعال است**
- مسیر صحیح تنظیم شده
- مدل صحیح (`gemini-1.5-pro`) استفاده می‌شود
- API Key موجود است

### ⚠️ **Quota تمام شده**
- API Key معتبر است اما quota تمام شده
- سیستم به صورت خودکار از fallback استفاده می‌کند
- لاگ‌های کامل نمایش داده می‌شود

## نحوه تست

### 1. تست مستقیم API
```bash
node test_gemini_api.js
```

### 2. تست از طریق وب
1. به `http://localhost:3001` بروید
2. روی "شروع تولید محتوا" کلیک کنید
3. لاگ‌های ترمینال را بررسی کنید

## لاگ‌های مورد انتظار

### ✅ **موفقیت‌آمیز:**
```
🤖 Calling real Gemini API for script generation...
✅ API Key found
📝 Sending prompt to Gemini...
✅ Received response from Gemini
✅ Successfully parsed JSON response from Gemini
```

### ⚠️ **Quota تمام شده:**
```
🤖 Calling real Gemini API for script generation...
❌ Error generating script with Gemini: [429 Too Many Requests]
⚠️ Gemini quota exceeded, using fallback script
```

## راه‌حل‌های آینده

### 1. **افزایش Quota**
- ارتقاء به پلن پولی Gemini
- استفاده از API Key جدید

### 2. **بهینه‌سازی**
- کاهش طول prompt
- استفاده از مدل‌های ارزان‌تر
- Cache کردن پاسخ‌ها

### 3. **Backup API**
- اضافه کردن OpenAI API
- استفاده از سایر سرویس‌های AI

## فایل‌های تغییر یافته

1. **`server.js`** - تغییر مسیر از mock به real
2. **`routes/gemini.js`** - بهبود کامل مدیریت خطا
3. **`test_gemini_api.js`** - تست مستقیم API

## نتیجه‌گیری

✅ **مشکل اصلی برطرف شد** - حالا سیستم از Gemini واقعی استفاده می‌کند
⚠️ **Quota تمام شده** - اما سیستم با fallback کار می‌کند
📊 **لاگ‌گذاری کامل** - تمام مراحل قابل ردیابی است

---

**تاریخ:** $(date)
**وضعیت:** ✅ آماده برای استفاده (با fallback)


