# راه‌حل مشکل Quota Gemini API

## مشکل شناسایی شده
سیستم از Gemini واقعی استفاده می‌کند، اما quota API تمام شده است.

## راه‌حل‌های موجود

### 1. 🔑 **استفاده از API Key جدید (توصیه شده)**

#### مراحل:
1. به [Google AI Studio](https://aistudio.google.com/) بروید
2. یک پروژه جدید ایجاد کنید
3. API Key جدید دریافت کنید
4. فایل `.env` را به‌روزرسانی کنید

```bash
# فایل .env را ویرایش کنید
GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
```

### 2. ⏰ **انتظار برای بازگشت Quota**
- Quota روزانه در ساعت 00:00 UTC بازمی‌گردد
- Quota ساعتی هر ساعت بازمی‌گردد

### 3. 💳 **ارتقاء به پلن پولی**
- به Google Cloud Console بروید
- پلن پولی فعال کنید
- Quota بیشتر دریافت کنید

### 4. 🔄 **استفاده از API Key های متعدد**
- چندین API Key ایجاد کنید
- سیستم را برای استفاده از Key های مختلف تنظیم کنید

## تست سیستم

### بررسی وضعیت فعلی:
```bash
# تست مستقیم API
node test_gemini_api.js

# بررسی لاگ‌های سرور
# در ترمینال سرور باید این پیام‌ها را ببینید:
# 🤖 Calling real Gemini API for script generation...
# ❌ Error generating script with Gemini: [429 Too Many Requests]
# ⚠️ Gemini quota exceeded, using fallback script
```

### تست از طریق وب:
1. به `http://localhost:3001` بروید
2. روی "شروع تولید محتوا" کلیک کنید
3. سیستم از fallback استفاده می‌کند (متن‌های از پیش تعریف شده)

## وضعیت Fallback

سیستم به صورت هوشمند از داده‌های fallback استفاده می‌کند:

```javascript
// وقتی quota تمام شود، این داده‌ها نمایش داده می‌شود:
const fallbackScript = {
  title: "AI Technology Revolution",
  description: "Exploring cutting-edge AI developments",
  scenes: [
    {
      scene_number: 1,
      duration: "0-5 seconds",
      speaker_text: "Welcome to the future of AI technology",
      visual_description: "Futuristic AI interface with glowing elements",
      image_prompt: "Futuristic AI interface with glowing elements"
    }
    // ... سایر صحنه‌ها
  ]
};
```

## نتیجه‌گیری

✅ **سیستم صحیح کار می‌کند** - از Gemini واقعی استفاده می‌کند  
⚠️ **Quota تمام شده** - نیاز به API Key جدید یا انتظار  
🔄 **Fallback فعال** - سیستم بدون توقف کار می‌کند  

## اقدامات بعدی

1. **فوری:** API Key جدید دریافت کنید
2. **کوتاه‌مدت:** منتظر بازگشت quota بمانید  
3. **بلندمدت:** پلن پولی فعال کنید

---
**تاریخ:** $(date)  
**وضعیت:** ✅ مشکل شناسایی و راه‌حل ارائه شد


