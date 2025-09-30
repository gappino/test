# راهنمای راه‌اندازی Gemini API

## مرحله 1: دریافت API Key معتبر

### 1.1 رفتن به Google AI Studio
1. به آدرس https://aistudio.google.com/ بروید
2. با حساب Google خود وارد شوید
3. روی "Get API key" کلیک کنید

### 1.2 ایجاد API Key جدید
1. روی "Create API Key" کلیک کنید
2. یک پروژه جدید ایجاد کنید یا پروژه موجود را انتخاب کنید
3. API key را کپی کنید

### 1.3 فعال‌سازی API
1. به Google Cloud Console بروید: https://console.cloud.google.com/
2. پروژه خود را انتخاب کنید
3. "APIs & Services" > "Library" را انتخاب کنید
4. "Generative Language API" را جستجو و فعال کنید
5. "Vertex AI API" را هم فعال کنید

## مرحله 2: تنظیم API Key در پروژه

### 2.1 ایجاد فایل .env
```bash
# فایل .env را در ریشه پروژه ایجاد کنید
GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
PORT=3003
NODE_ENV=development
```

### 2.2 تست API Key
```bash
node test_gemini_api.js
```

## مرحله 3: تست کامل سیستم

### 3.1 تست endpoint های مختلف
```bash
node test_server_endpoints.js
```

### 3.2 تست در مرورگر
1. به http://localhost:3003 بروید
2. یک ایده برای ویدیو وارد کنید
3. منتظر تولید محتوای AI باشید

## مشکلات رایج و راه‌حل

### خطای 403 Forbidden
- API key نامعتبر است
- API فعال نشده است
- محدودیت‌های billing

### خطای 429 (Quota Exceeded)
- API key محدودیت روزانه دارد
- از API key جدید استفاده کنید

### خطای شبکه
- اتصال اینترنت را بررسی کنید
- فایروال را بررسی کنید

## نکات مهم

1. **API Key را محرمانه نگه دارید** - هرگز در کد عمومی قرار ندهید
2. **محدودیت‌ها را در نظر بگیرید** - هر API key محدودیت روزانه دارد
3. **Billing Account** - ممکن است نیاز به تنظیم billing account باشد
4. **IP Restrictions** - ممکن است API key محدودیت IP داشته باشد

## تست API Key جدید

```javascript
// فایل test_new_api_key.js را با API key جدید اجرا کنید
const newApiKey = 'YOUR_NEW_API_KEY';
process.env.GEMINI_API_KEY = newApiKey;
```

## تماس با پشتیبانی

اگر مشکل ادامه داشت:
1. Google AI Studio Help: https://aistudio.google.com/help
2. Google Cloud Support: https://cloud.google.com/support



