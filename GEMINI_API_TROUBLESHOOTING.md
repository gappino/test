# راهنمای حل مشکل Gemini API

## مشکل فعلی: خطای 403 Forbidden

### علت‌های احتمالی:

1. **API فعال نشده**
2. **Billing Account تنظیم نشده**
3. **محدودیت‌های IP**
4. **API Key نامعتبر**

## راه‌حل‌های مرحله‌ای:

### مرحله 1: بررسی API Key
1. به https://aistudio.google.com/ بروید
2. وارد حساب Google خود شوید
3. روی "Get API key" کلیک کنید
4. مطمئن شوید API key صحیح کپی شده

### مرحله 2: فعال‌سازی API
1. به https://console.cloud.google.com/ بروید
2. پروژه خود را انتخاب کنید
3. "APIs & Services" > "Library" را انتخاب کنید
4. "Generative Language API" را جستجو کنید
5. روی "Enable" کلیک کنید

### مرحله 3: تنظیم Billing Account
1. در Google Cloud Console
2. "Billing" را انتخاب کنید
3. یک billing account ایجاد یا انتخاب کنید
4. پروژه خود را به billing account متصل کنید

### مرحله 4: بررسی محدودیت‌ها
1. در Google AI Studio
2. روی API key کلیک کنید
3. "Edit" را انتخاب کنید
4. مطمئن شوید محدودیت IP ندارید

## تست API Key جدید:

```bash
# فایل تست را اجرا کنید
node test_api_key_input.js
```

## جایگزین‌های موقت:

### 1. استفاده از Mock API
```javascript
// در server.js
app.use('/api/gemini', mockGeminiRoutes);
```

### 2. استفاده از API Key عمومی (با محدودیت)
```javascript
// API key های رایگان با محدودیت روزانه
const freeApiKeys = [
  'AIzaSyDGpIKaSSqiimWgqWPqkhgsvUEm4BY2yb4',
  // ... سایر API key های رایگان
];
```

## تماس با پشتیبانی:

1. **Google AI Studio Help**: https://aistudio.google.com/help
2. **Google Cloud Support**: https://cloud.google.com/support
3. **Stack Overflow**: جستجوی "Gemini API 403 Forbidden"

## نکات مهم:

- API key های رایگان محدودیت روزانه دارند
- برای استفاده تجاری نیاز به billing account است
- برخی کشورها ممکن است محدودیت داشته باشند
- VPN ممکن است مشکل ایجاد کند

## تست نهایی:

```bash
# بعد از تنظیم API key جدید
npm start
# سپس در مرورگر: http://localhost:3003
```

