# راهنمای حل مشکل TTS

## 🎬 سیستم Kokoro TTS آماده است!

### ✅ وضعیت فعلی:

1. **🎤 Kokoro TTS**: Python script کار می‌کند
2. **🔊 تولید صدا**: API endpoint کار می‌کند
3. **📁 فایل‌ها**: در پوشه `uploads/audio` موجود هستند
4. **🌐 سرور**: روی پورت 3004 در حال اجرا است

### 🚀 نحوه استفاده:

1. **سرور را اجرا کنید**:
```bash
npm start
```

2. **به آدرس زیر بروید**:
```
http://localhost:3004
```

3. **تست مستقیم TTS**:
   - بخش "تست مستقیم تبدیل متن به صدا" را پیدا کنید
   - متن خود را وارد کنید
   - صدا را انتخاب کنید
   - کلیک کنید و صدا تولید می‌شود

### 🔧 تست API:

```bash
# تولید صدا
Invoke-RestMethod -Uri "http://localhost:3004/api/whisper/text-to-speech" -Method POST -ContentType "application/json" -Body '{"text":"Hello world","voice":"default"}'

# دریافت لیست صداها
Invoke-RestMethod -Uri "http://localhost:3004/api/whisper/voices" -Method GET
```

### 📁 فایل‌های موجود:

- `uploads/audio/kokoro_audio_*.mp3` - فایل‌های صدا
- `kokoro_simple.py` - اسکریپت Python
- `requirements.txt` - وابستگی‌های Python

### 🎤 صداهای موجود:

- **Default Voice**: صدای پیش‌فرض
- **Female Voice**: صدای زن
- **Male Voice**: صدای مرد
- **Child Voice**: صدای کودک
- **Robot Voice**: صدای ربات
- **Whisper Voice**: صدای زمزمه

### 🔧 تکنولوژی‌های استفاده شده:

- **Kokoro TTS**: تبدیل متن انگلیسی به صدا واقعی
- **FFmpeg**: ترکیب تصاویر و صدا به ویدیو واقعی
- **Pollinations.ai**: تولید تصاویر با کیفیت بالا
- **HTML5 Audio**: پخش در مرورگر

### 🚨 نکات مهم:

1. **Python**: باید روی سیستم نصب باشد
2. **FFmpeg**: باید روی سیستم نصب باشد
3. **فضای دیسک**: برای ذخیره فایل‌ها
4. **اینترنت**: برای دانلود تصاویر

### 🎯 ویژگی‌های منحصر به فرد:

- **Kokoro TTS**: استفاده از تکنولوژی پیشرفته
- **تست مستقیم**: بخش جداگانه برای تست TTS
- **ترکیب کامل**: اسکریپت + تصاویر + صدا + ویدیو
- **رابط کاربری**: زیبا و کاربرپسند

### 🔄 API Endpoints:

- `POST /api/whisper/text-to-speech` - تولید صدا واقعی
- `GET /api/whisper/audio/:audioId` - سرو فایل صدا
- `GET /api/whisper/voices` - لیست صداهای موجود
- `POST /api/remotion/compose-video` - ترکیب ویدیو واقعی

### 🎵 نحوه کارکرد:

1. **متن فارسی** → ترجمه به انگلیسی
2. **متن انگلیسی** → Kokoro TTS → فایل WAV
3. **فایل WAV** → FFmpeg → فایل MP3
4. **فایل MP3** → پخش در مرورگر

---

**نکته**: سیستم کاملاً واقعی است و Kokoro TTS واقعی استفاده می‌کند!


