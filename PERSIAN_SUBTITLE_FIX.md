# 🔧 رفع مشکل زیرنویس فارسی

## ❌ مشکل

زمانی که از صدای فارسی استفاده می‌شد، زیرنویس‌ها به انگلیسی نمایش داده می‌شدند!

**علت:**
1. Whisper همیشه با `language: 'en'` فراخوانی می‌شد
2. متن فارسی برای TTS استفاده می‌شد، ولی برای زیرنویس ترجمه انگلیسی استفاده می‌شد

```javascript
// ❌ قبل (اشتباه)
body: JSON.stringify({
    audioUrl: audioData.audioUrl,
    language: 'en'  // همیشه انگلیسی!
})

// و در fallback:
text: audioData.text  // متن ترجمه شده انگلیسی
```

---

## ✅ راه‌حل

### 1. تشخیص زبان از روی صدا

```javascript
// ✅ حالا (صحیح)
const isPersianVoice = voice && voice.startsWith('fa_IR');
const subtitleLanguage = isPersianVoice ? 'fa' : 'en';
console.log(`📝 Subtitle language: ${subtitleLanguage} (voice: ${voice})`);
```

### 2. استفاده از متن اصلی صحنه

```javascript
// ✅ دریافت متن اصلی (بدون ترجمه)
const originalSceneText = scenes[index] ? scenes[index].speaker_text : '';

// ارسال به Whisper با زبان صحیح
body: JSON.stringify({
    audioUrl: audioData.audioUrl,
    language: subtitleLanguage  // ✅ 'fa' یا 'en'
})
```

### 3. Fallback با متن اصلی

```javascript
// ✅ در صورت خطا، از متن اصلی استفاده می‌شود
const fallbackSegments = [{
    start: 0,
    end: audioData.duration || 5,
    text: originalSceneText || audioData.text || 'No text available'
}];
```

---

## 📊 تغییرات در `routes/video.js`

### 1. در `/generate-complete-video` (خطوط 467-531)
```javascript
// Detect language from voice
const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
const subtitleLanguage = isPersianVoice ? 'fa' : 'en';

const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
    // Get original scene text
    const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
    
    // Send to Whisper with correct language
    body: JSON.stringify({
        audioUrl: audioData.audioUrl,
        language: subtitleLanguage  // ✅ 'fa' or 'en'
    })
    
    // Fallback with original text
    const fallbackSegments = [{
        text: originalSceneText || audioData.text || 'No text available'
    }];
});
```

### 2. در `/generate-custom-video` (خطوط 695-758)
```javascript
// Detect language from voice
const isPersianVoice = voice && voice.startsWith('fa_IR');
const subtitleLanguage = isPersianVoice ? 'fa' : 'en';

const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
    // Get original scene text (not translated)
    const originalSceneText = scenes[index] ? scenes[index].speaker_text : '';
    
    // Send to Whisper with correct language
    body: JSON.stringify({
        audioUrl: audioData.audioUrl,
        language: subtitleLanguage  // ✅
    })
});
```

### 3. در `generateLongFormVideoContent` (خطوط 992-1056)
```javascript
// Detect language from voice  
const isPersianVoice = audioSettings.voice && audioSettings.voice.startsWith('fa_IR');
const subtitleLanguage = isPersianVoice ? 'fa' : 'en';

const subtitlePromises = finalAudioResults.map(async (audioData, index) => {
    // Get original scene text
    const originalSceneText = script.scenes[index] ? script.scenes[index].speaker_text : '';
    
    // Use correct language
    language: subtitleLanguage  // ✅
});
```

---

## 🔄 فرآیند کامل

### قبل (اشتباه):
```
1. کاربر: متن فارسی "سلام خوش آمدید"
   ↓
2. Backend: تولید صدا با Piper TTS فارسی ✅
   ↓
3. Backend: ترجمه به انگلیسی "Hello welcome"
   ↓
4. Backend → Whisper: language='en' ❌
   ↓
5. زیرنویس: "Hello welcome" ❌ (انگلیسی!)
```

### حالا (صحیح):
```
1. کاربر: متن فارسی "سلام خوش آمدید"
   ↓
2. Backend: تشخیص صدا fa_IR-amir-medium
   ↓
3. Backend: language = 'fa' ✅
   ↓
4. Backend: تولید صدا با Piper TTS فارسی ✅
   ↓
5. Backend → Whisper: 
   - audioUrl
   - language='fa' ✅
   ↓
6. Whisper: استخراج زیرنویس فارسی ✅
   ↓
7. Fallback (در صورت خطا):
   - استفاده از متن اصلی فارسی ✅
   ↓
8. زیرنویس: "سلام خوش آمدید" ✅ (فارسی!)
```

---

## 🎯 مقایسه Before/After

### ❌ قبل
```javascript
// صدا: فارسی ✅
voice: 'fa_IR-amir-medium'

// Whisper: انگلیسی ❌
language: 'en'

// Fallback: متن ترجمه شده ❌
text: audioData.text  // "Hello welcome"

// نتیجه: زیرنویس انگلیسی! ❌
```

### ✅ بعد
```javascript
// صدا: فارسی ✅
voice: 'fa_IR-amir-medium'

// تشخیص زبان: ✅
const isPersianVoice = voice.startsWith('fa_IR');
const subtitleLanguage = isPersianVoice ? 'fa' : 'en';

// Whisper: فارسی ✅
language: subtitleLanguage  // 'fa'

// Fallback: متن اصلی ✅
text: originalSceneText  // "سلام خوش آمدید"

// نتیجه: زیرنویس فارسی! ✅
```

---

## 🧪 تست

### تست 1: صدای فارسی با متن فارسی
```javascript
Input:
  text: "سلام این یک تست است"
  voice: "fa_IR-amir-medium"

Expected:
  - Whisper با language='fa' فراخوانی شود ✅
  - زیرنویس فارسی باشد ✅

Result:
  subtitle: "سلام این یک تست است" ✅
```

### تست 2: صدای انگلیسی با متن فارسی (ترجمه شده)
```javascript
Input:
  text: "سلام این یک تست است"
  voice: "en_US-lessac-medium"

Expected:
  - متن به انگلیسی ترجمه شود
  - Whisper با language='en' فراخوانی شود ✅
  - زیرنویس انگلیسی باشد ✅

Result:
  subtitle: "Hello this is a test" ✅
```

### تست 3: Fallback برای صدای فارسی
```javascript
Input:
  text: "سلام خوش آمدید"
  voice: "fa_IR-gyro-medium"
  (فرض: Whisper خطا می‌دهد)

Expected:
  - Fallback با متن اصلی فارسی ✅

Result:
  subtitle: "سلام خوش آمدید" ✅
```

---

## 📁 فایل‌های تغییر یافته

```
routes/video.js
├─ خط 467-531: /generate-complete-video
│  ├─ تشخیص زبان از voice
│  ├─ استفاده از originalSceneText
│  └─ Fallback با متن اصلی
│
├─ خط 695-758: /generate-custom-video
│  ├─ تشخیص زبان از voice
│  ├─ استفاده از originalSceneText
│  └─ Fallback با متن اصلی
│
└─ خط 992-1056: generateLongFormVideoContent
   ├─ تشخیص زبان از voice
   ├─ استفاده از originalSceneText
   └─ Fallback با متن اصلی
```

---

## ✅ نتیجه

### قبل:
```
❌ صدا فارسی + زیرنویس انگلیسی (ناهماهنگ!)
❌ Whisper همیشه با language='en'
❌ Fallback با متن ترجمه شده
```

### بعد:
```
✅ صدا فارسی → زیرنویس فارسی (هماهنگ!)
✅ صدا انگلیسی → زیرنویس انگلیسی (هماهنگ!)
✅ Whisper با زبان صحیح ('fa' یا 'en')
✅ Fallback با متن اصلی صحنه
✅ سه endpoint اصلاح شدند
```

---

## 🚀 استفاده

### نمونه 1: ویدیوی فارسی
```javascript
صحنه: "سلام به شما خوش آمدید"
صدا: fa_IR-amir-medium
نتیجه:
  - صدا: فارسی ✅
  - زیرنویس: "سلام به شما خوش آمدید" ✅
```

### نمونه 2: ویدیوی انگلیسی
```javascript
صحنه: "Welcome to our channel"
صدا: en_US-lessac-medium
نتیجه:
  - صدا: انگلیسی ✅
  - زیرنویس: "Welcome to our channel" ✅
```

### نمونه 3: چند صحنه فارسی
```javascript
صحنه 1: "سلام دوستان"
صحنه 2: "در این ویدیو..."
صحنه 3: "با ما همراه باشید"
صدا: fa_IR-gyro-medium

نتیجه:
  - هر سه صحنه با زیرنویس فارسی ✅
```

---

## 💡 نکات مهم

1. **تشخیص زبان خودکار**: بر اساس صدا (`fa_IR-*` → فارسی، بقیه → انگلیسی)

2. **متن اصلی حفظ می‌شود**: برای زیرنویس از `scene.speaker_text` استفاده می‌شود، نه متن ترجمه شده

3. **Fallback امن**: اگر Whisper خطا داد، از متن اصلی استفاده می‌شود

4. **سازگار با تمام endpoints**: 
   - `/generate-complete-video` ✅
   - `/generate-custom-video` ✅
   - `generateLongFormVideoContent` ✅

---

**وضعیت:** ✅ مشکل برطرف شد  
**تست شده:** ✅ کار می‌کند  
**تاریخ:** اکتبر 2025





