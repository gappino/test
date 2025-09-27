# راهنمای حل مشکلات

## مشکل: خطای Gemini API

### علت‌های احتمالی:
1. **Quota محدود**: کلید API شما محدودیت استفاده دارد
2. **مدل نامعتبر**: مدل `gemini-pro` دیگر در دسترس نیست
3. **کلید API نامعتبر**: کلید API صحیح نیست

### راه‌حل‌ها:

#### 1. استفاده از Mock Data (موقت)
پروژه حالا از mock data استفاده می‌کند که بدون نیاز به API کار می‌کند:

```bash
# سرور را اجرا کنید
npm start

# به آدرس زیر بروید
http://localhost:3001
```

#### 2. فعال‌سازی Gemini API
اگر می‌خواهید از Gemini واقعی استفاده کنید:

1. به [Google AI Studio](https://aistudio.google.com/) بروید
2. کلید API جدید دریافت کنید
3. در فایل `.env` قرار دهید:

```env
GEMINI_API_KEY=your_new_api_key_here
```

#### 3. تغییر مدل Gemini
در فایل `routes/gemini.js` مدل را تغییر دهید:

```javascript
// از این:
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// به این تغییر دهید:
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
```

### تست کردن API

```bash
# تست کلید API
node test-gemini.js

# لیست مدل‌های موجود
node list-models.js
```

## مشکل: پورت در حال استفاده

### راه‌حل:
```bash
# تغییر پورت
set PORT=3001 && npm start

# یا در PowerShell:
$env:PORT="3001"; npm start
```

## مشکل: تصاویر تولید نمی‌شوند

### بررسی‌ها:
1. اتصال اینترنت
2. دسترسی به Pollinations.ai
3. بررسی کنسول مرورگر برای خطاها

### تست مستقیم:
```bash
# تست Pollinations.ai
curl "https://image.pollinations.ai/prompt/test?width=100&height=100"
```

## وضعیت فعلی پروژه

✅ **کار می‌کند**: تولید اسکریپت با mock data  
✅ **کار می‌کند**: تولید تصاویر با Pollinations.ai  
✅ **کار می‌کند**: رابط کاربری و نمایش پیشرفت  
❌ **مشکل دارد**: Gemini API (quota محدود)  

## استفاده از پروژه

1. سرور را اجرا کنید: `npm start`
2. به `http://localhost:3001` بروید
3. روی "شروع تولید محتوا" کلیک کنید
4. منتظر تولید اسکریپت بمانید (mock data)
5. روی "تولید تصاویر" کلیک کنید
6. تصاویر با Pollinations.ai تولید می‌شوند

---

**نکته**: برای استفاده کامل از Gemini، باید کلید API معتبر و بدون محدودیت داشته باشید.


