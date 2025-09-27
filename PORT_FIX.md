# راهنمای حل مشکل پورت

## مشکل: پورت 3000 در حال استفاده

### راه‌حل سریع:

#### در PowerShell:
```powershell
$env:PORT="3000"; npm start
```

#### در Command Prompt:
```cmd
set PORT=3000 && npm start
```

#### یا پورت دیگری استفاده کنید:
```powershell
$env:PORT="3001"; npm start
```

## وضعیت فعلی:

✅ **سرور**: روی پورت 3000 اجرا می‌شود  
✅ **Mock Data**: برای تولید اسکریپت  
✅ **Pollinations.ai**: برای تولید تصاویر  
✅ **رابط کاربری**: کامل و زیبا  

## تست کردن:

1. سرور را اجرا کنید:
```bash
npm start
```

2. به آدرس زیر بروید:
```
http://localhost:3000
```

3. روی "شروع تولید محتوا" کلیک کنید

## اگر پورت 3000 اشغال است:

### روش 1: متوقف کردن پروسه
```bash
# پیدا کردن PID
netstat -ano | findstr :3000

# متوقف کردن (به عنوان Administrator)
taskkill /PID [PID_NUMBER] /F
```

### روش 2: استفاده از پورت دیگر
```bash
$env:PORT="3001"; npm start
```

سپس به `http://localhost:3001` بروید.

---

**نکته**: پروژه حالا با mock data کار می‌کند و نیازی به Gemini API ندارد.


