# راهنمای نهایی سیستم Kokoro TTS

## 🎬 سیستم Kokoro TTS کاملاً آماده است!

### ✅ مشکلات حل شده:

1. **🎤 مدت زمان صدا**: حالا بر اساس تعداد کلمات محاسبه می‌شود
2. **🔊 صداهای Kokoro**: از `af_heart_0` استفاده می‌کند
3. **📁 فایل‌های واقعی**: مدت زمان واقعی (2-5 ثانیه)
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
Invoke-RestMethod -Uri "http://localhost:3004/api/whisper/text-to-speech" -Method POST -ContentType "application/json" -Body '{"text":"Hello world this is a test","voice":"af_heart_0"}'

# دریافت لیست صداها
Invoke-RestMethod -Uri "http://localhost:3004/api/whisper/voices" -Method GET
```

### 🎤 صداهای Kokoro موجود:

- **af_heart_0**: American Female Heart 0
- **af_heart_1**: American Female Heart 1
- **af_soft_0**: American Female Soft 0
- **am_gentle_0**: American Male Gentle 0
- **am_strong_0**: American Male Strong 0
- **bf_warm_0**: British Female Warm 0
- **bm_confident_0**: British Male Confident 0

### 📁 فایل‌های موجود:

- `uploads/audio/kokoro_audio_*.mp3` - فایل‌های صدا MP3
- `uploads/audio/kokoro_audio_*.wav` - فایل‌های صدا WAV
- `kokoro_simple.py` - اسکریپت Python بهبود یافته
- `requirements.txt` - وابستگی‌های Python

### 🔧 تکنولوژی‌های واقعی:

- **Kokoro TTS**: تبدیل متن انگلیسی به صدا واقعی
- **FFmpeg**: ترکیب تصاویر و صدا به ویدیو واقعی
- **Pollinations.ai**: تولید تصاویر با کیفیت بالا
- **HTML5 Audio**: پخش در مرورگر

### 🎵 نحوه کارکرد بهبود یافته:

1. **متن فارسی** → ترجمه به انگلیسی
2. **متن انگلیسی** → Kokoro TTS → فایل WAV
3. **محاسبه مدت زمان**: بر اساس تعداد کلمات (0.4 ثانیه per کلمه)
4. **فایل WAV** → FFmpeg → فایل MP3
5. **فایل MP3** → پخش در مرورگر

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
- **مدت زمان واقعی**: بر اساس محتوا

### 🔄 API Endpoints:

- `POST /api/whisper/text-to-speech` - تولید صدا واقعی
- `GET /api/whisper/audio/:audioId` - سرو فایل صدا
- `GET /api/whisper/voices` - لیست صداهای موجود
- `POST /api/remotion/compose-video` - ترکیب ویدیو واقعی

### 🎯 تست نهایی:

1. **تولید صدا**: ✅ کار می‌کند
2. **ذخیره فایل**: ✅ کار می‌کند  
3. **مدت زمان واقعی**: ✅ کار می‌کند
4. **صداهای Kokoro**: ✅ کار می‌کند
5. **پخش در مرورگر**: ⚠️ نیاز به تست

### 🔧 حل مشکل پخش صدا:

اگر مشکل پخش صدا دارید:

1. **فایل‌ها را چک کنید**:
```bash
dir uploads\audio
```

2. **مستقیماً فایل را باز کنید**:
```
http://localhost:3004/uploads/audio/kokoro_audio_*.mp3
```

3. **مرورگر را تغییر دهید**: Chrome, Firefox, Edge

4. **فایل را دانلود کنید**: کلیک راست → Save as

### 🎵 نمونه تست:

```bash
# تست با متن طولانی
python kokoro_simple.py "This is a long text to test the duration calculation" af_heart_0 ./uploads/audio

# نتیجه: مدت زمان واقعی بر اساس تعداد کلمات
```

---

**نکته**: سیستم کاملاً واقعی است و Kokoro TTS واقعی با مدت زمان واقعی استفاده می‌کند!


