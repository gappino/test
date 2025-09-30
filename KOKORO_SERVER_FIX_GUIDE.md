# راه‌حل مشکل Kokoro TTS در سرور

## مشکل شناسایی شده

خطای `could not create a primitive` در سرور شما به دلیل مشکلات سازگاری PyTorch با محیط سرور است. این مشکل معمولاً در موارد زیر رخ می‌دهد:

1. **نسخه ناسازگار PyTorch**: نسخه PyTorch 2.8.0 که نصب شده با محیط سرور سازگار نیست
2. **مشکلات CPU Instructions**: سرور ممکن است از دستورات CPU خاصی پشتیبانی نکند
3. **مشکلات Threading**: PyTorch ممکن است با تنظیمات threading سرور مشکل داشته باشد

## راه‌حل‌های ارائه شده

### 1. اسکریپت Kokoro سازگار با سرور

فایل `kokoro_server_fixed.py` ایجاد شده که شامل موارد زیر است:

- **بررسی سازگاری PyTorch**: قبل از اجرا، سازگاری PyTorch را بررسی می‌کند
- **تنظیمات سرور**: محدود کردن threads و استفاده از CPU-only
- **مدیریت خطا بهتر**: مدیریت بهتر خطاها و fallback options
- **Chunking کوچک‌تر**: تقسیم متن به قطعات کوچک‌تر برای پایداری سرور

### 2. اسکریپت تعمیر PyTorch

فایل `fix_pytorch_server.py` برای تعمیر نصب PyTorch:

- **حذف نسخه فعلی**: حذف PyTorch ناسازگار
- **نصب نسخه سازگار**: نصب نسخه‌های پایدار PyTorch (2.1.0, 2.0.1, یا 1.13.1)
- **تست نصب**: بررسی صحت نصب PyTorch

### 3. اسکریپت تعمیر کامل سرور

فایل `fix_kokoro_server.sh` برای تعمیر کامل سیستم:

- **نصب dependencies**: نصب تمام وابستگی‌های مورد نیاز
- **تنظیم محیط**: ایجاد virtual environment
- **نصب PyTorch سازگار**: نصب نسخه مناسب PyTorch
- **تست کامل**: تست تمام اجزای سیستم

## مراحل اجرای راه‌حل

### مرحله 1: اجرای اسکریپت تعمیر کامل

```bash
# در سرور خود اجرا کنید:
sudo chmod +x fix_kokoro_server.sh
sudo ./fix_kokoro_server.sh
```

### مرحله 2: تست اسکریپت جدید

```bash
# فعال کردن virtual environment
source venv/bin/activate

# تست اسکریپت جدید
python3 kokoro_server_fixed.py "Hello from server" af_heart ./uploads/audio
```

### مرحله 3: استفاده در پروژه

```bash
# استفاده از اسکریپت جدید به جای kokoro_fixed.py
python3 kokoro_server_fixed.py "متن شما" af_heart ./uploads/audio
```

## تغییرات اعمال شده

### در اسکریپت Kokoro:

1. **بررسی سازگاری PyTorch**:
   ```python
   def check_pytorch_compatibility():
       # بررسی نسخه و عملکرد PyTorch
   ```

2. **تنظیمات سرور**:
   ```python
   torch.set_num_threads(1)  # محدود کردن threads
   torch.set_num_interop_threads(1)
   ```

3. **مدیریت خطا بهتر**:
   ```python
   try:
       # تلاش اولیه
   except Exception:
       # fallback options
   ```

4. **Chunking کوچک‌تر**:
   ```python
   max_length = 50  # به جای 100
   ```

### در PyTorch:

1. **نسخه‌های سازگار**:
   - PyTorch 2.1.0+cpu (اولویت اول)
   - PyTorch 2.0.1+cpu (اولویت دوم)
   - PyTorch 1.13.1+cpu (اولویت سوم)

2. **NumPy سازگار**:
   ```bash
   pip install "numpy>=1.21.0,<1.25.0"
   ```

## تست و تأیید

### تست PyTorch:
```python
import torch
import numpy as np

# تست عملیات پایه
x = torch.randn(2, 2)
y = torch.mm(x, x.t())

# تست تبدیل به NumPy
x_np = x.numpy()
```

### تست Kokoro:
```python
from kokoro import KPipeline

# ایجاد pipeline
pipeline = KPipeline(lang_code='a', device='cpu')

# تست تولید صدا
_, tokens = pipeline.g2p("Hello")
```

## نکات مهم

1. **Virtual Environment**: همیشه از virtual environment استفاده کنید
2. **نسخه Python**: از Python 3.8-3.11 استفاده کنید (نه 3.12+)
3. **فضای دیسک**: اطمینان حاصل کنید فضای کافی وجود دارد
4. **دسترسی فایل**: بررسی کنید دسترسی نوشتن به پوشه‌ها وجود دارد

## عیب‌یابی

### اگر هنوز خطا دارید:

1. **بررسی لاگ‌ها**:
   ```bash
   journalctl -u your-service -f
   ```

2. **تست PyTorch**:
   ```bash
   python3 -c "import torch; print(torch.__version__)"
   ```

3. **تست Kokoro**:
   ```bash
   python3 -c "from kokoro import KPipeline; print('OK')"
   ```

4. **بررسی dependencies**:
   ```bash
   pip list | grep torch
   pip list | grep numpy
   ```

## نتیجه

با اجرای این راه‌حل‌ها، مشکل `could not create a primitive` باید حل شود و Kokoro TTS در سرور شما به درستی کار کند.

**فایل‌های ایجاد شده:**
- `kokoro_server_fixed.py` - اسکریپت Kokoro سازگار با سرور
- `fix_pytorch_server.py` - اسکریپت تعمیر PyTorch
- `fix_kokoro_server.sh` - اسکریپت تعمیر کامل سرور

**تاریخ ایجاد:** $(date)
**نسخه:** 1.0
**وضعیت:** ✅ آماده برای استفاده


