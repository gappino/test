# راهنمای کامل راه‌اندازی Gemini API

## مشکل فعلی
API key موجود کار نمی‌کند و خطای 403 Forbidden می‌دهد.

## راه‌حل: دریافت API Key معتبر

### مرحله 1: رفتن به Google AI Studio
1. به https://aistudio.google.com/ بروید
2. با حساب Google وارد شوید
3. روی "Get API key" کلیک کنید

### مرحله 2: ایجاد API Key
1. "Create API Key" را انتخاب کنید
2. یک پروژه جدید ایجاد کنید
3. API key را کپی کنید

### مرحله 3: فعال‌سازی API
1. به https://console.cloud.google.com/ بروید
2. پروژه خود را انتخاب کنید
3. "APIs & Services" > "Library" را انتخاب کنید
4. "Generative Language API" را جستجو و فعال کنید

### مرحله 4: تنظیم Billing (اختیاری)
- برای استفاده رایگان، نیازی به billing نیست
- اما برای استفاده بیشتر، ممکن است نیاز باشد

## تست API Key جدید

### روش 1: تست تعاملی
```bash
node test_api_key_input.js
```

### روش 2: تست مستقیم
```bash
# فایل .env را ایجاد کنید
echo GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE > .env
echo PORT=3003 >> .env
echo NODE_ENV=development >> .env

# سپس تست کنید
node test_pure_gemini.js
```

## استفاده از سیستم

### 1. سرور را راه‌اندازی کنید
```bash
npm start
```

### 2. به مرورگر بروید
```
http://localhost:3003
```

### 3. یک ایده برای ویدیو وارد کنید
- سیستم مستقیماً با Gemini AI ارتباط برقرار می‌کند
- هیچ Mock یا fallback استفاده نمی‌شود
- تمام محتوا توسط هوش مصنوعی تولید می‌شود

## ویژگی‌های سیستم

✅ **تولید اسکریپت ویدیو** - توسط Gemini AI
✅ **تولید image prompt** - برای تولید تصاویر
✅ **تولید niches** - برای انتخاب موضوع
✅ **تولید محتوای کامل** - 10+ صحنه با متن و تصویر

## مشکلات رایج

### خطای 403 Forbidden
- API key نامعتبر است
- API فعال نشده است
- محدودیت‌های پروژه

### خطای 429 (Quota Exceeded)
- محدودیت روزانه تمام شده
- API key جدید بگیرید

### خطای شبکه
- اتصال اینترنت را بررسی کنید
- VPN را خاموش کنید

## نکات مهم

1. **API Key را محرمانه نگه دارید**
2. **هر API key محدودیت روزانه دارد**
3. **برای استفاده تجاری، billing account تنظیم کنید**
4. **سیستم فقط از Gemini AI واقعی استفاده می‌کند**

## تماس با پشتیبانی

- Google AI Studio Help: https://aistudio.google.com/help
- Google Cloud Support: https://cloud.google.com/support

---

**نتیجه:** بعد از دریافت API key معتبر، سیستم کاملاً با Gemini AI کار می‌کند و تمام محتوا توسط هوش مصنوعی تولید می‌شود.
