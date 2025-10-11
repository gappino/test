# راهنمای نصب سیستم امنیتی

## 📖 معرفی

این سیستم امنیتی چند لایه برای محافظت از پروژه در برابر:
- کپی و بکاپ‌گیری غیرمجاز
- تغییر رمز عبور سرور
- دسترسی به فایل‌های حساس
- Snapshot و Clone کردن VM
- دستکاری در سیستم نظارتی

## 🚀 نصب سریع

### مرحله 1: آماده‌سازی سرور

```bash
# SSH به سرور
ssh root@your-server-ip

# Update سیستم
apt-get update && apt-get upgrade -y

# نصب dependencies اولیه
apt-get install -y git curl wget
```

### مرحله 2: کلون پروژه

```bash
# رفتن به دایرکتوری مناسب
cd /opt

# Clone پروژه
git clone https://github.com/gappino/test.git videomakerfree_v2

# ورود به دایرکتوری پروژه
cd videomakerfree_v2
```

### مرحله 3: نصب سیستم امنیتی

```bash
# اجرای نصب کننده امنیتی
chmod +x install-security.sh
./install-security.sh
```

**نصب کننده این کارها را انجام می‌دهد:**
1. ✅ نصب ابزارهای مورد نیاز
2. ✅ کپی اسکریپت‌های امنیتی
3. ✅ ایجاد سرویس‌های systemd
4. ✅ تولید کلید رمزنگاری
5. ✅ رمزنگاری فایل‌های حساس
6. ✅ ایجاد fingerprint سخت‌افزاری
7. ✅ راه‌اندازی سرویس‌های نظارتی

### مرحله 4: بررسی وضعیت

```bash
# چک کردن وضعیت
/usr/local/bin/project-guardian.sh status

# بررسی سرویس‌ها
systemctl status guardian-main
systemctl status guardian-backup
systemctl status guardian-process
systemctl status guardian-files

# مشاهده لاگ‌ها
tail -f /var/log/guardian.log
```

## 🔍 تست سیستم

```bash
# اجرای تمام تست‌ها
./security/test-security.sh all

# مشاهده نتایج
tail -20 /var/log/guardian-test.log
```

## ⚙️ پیکربندی

فایل پیکربندی: `/etc/project-guardian/config.json`

```json
{
  "project_path": "/opt/videomakerfree_v2",
  "alert_mode": "destruct",
  "grace_period": 0,
  "fingerprint_check": true,
  "timestamp_check": true
}
```

### تغییر تنظیمات

```bash
# ویرایش فایل config
nano /etc/project-guardian/config.json

# Restart سرویس‌ها
systemctl restart guardian-main
```

## 🎯 سناریوهای محافظت شده

### 1. تلاش برای بکاپ‌گیری
```bash
# این commandها پروژه را پاک می‌کنند:
tar -czf backup.tar.gz /opt/videomakerfree_v2
rsync -av /opt/videomakerfree_v2 /backup/
cp -r /opt/videomakerfree_v2 /tmp/
```

### 2. تغییر رمز عبور
```bash
# این command پروژه را پاک می‌کند:
passwd root
passwd any-user
```

### 3. توقف سرویس‌های Guardian
```bash
# این commandها پروژه را پاک می‌کنند:
systemctl stop guardian-main
systemctl disable guardian-backup
```

### 4. Snapshot/Clone VM
- اگر VM را Snapshot کنید و Restore کنید → پروژه پاک می‌شود
- اگر VM را Clone کنید → پروژه پاک می‌شود

## 🔧 عملیات روزمره

### مشاهده وضعیت

```bash
# وضعیت کلی
/usr/local/bin/project-guardian.sh status

# لاگ زنده
tail -f /var/log/guardian.log

# لاگ‌های سرویس‌ها
journalctl -u guardian-main -f
```

### Restart سرویس‌ها

```bash
# Restart تمام سرویس‌ها
systemctl restart guardian-main guardian-backup guardian-process guardian-files

# یا به صورت جداگانه
systemctl restart guardian-main
```

### Update کردن پروژه

برای update کردن کد پروژه:

```bash
# 1. توقف موقت سرویس‌ها (خطرناک!)
systemctl stop guardian-main guardian-backup guardian-process guardian-files

# 2. Update کد
cd /opt/videomakerfree_v2
git pull

# 3. Restart سرویس‌ها
systemctl start guardian-process guardian-files guardian-backup guardian-main
```

⚠️ **توجه**: در حین update، سیستم آسیب‌پذیر است!

## 🚨 مواقع اضطراری

### پروژه پاک شده است!

اگر پروژه پاک شد، به این معنی است که:
1. یک breach امنیتی شناسایی شد
2. سیستم به درستی کار کرد
3. فایل‌ها به صورت ایمن حذف شدند

**چک کردن علت:**
```bash
# مشاهده لاگ
tail -100 /var/log/guardian.log

# مشاهده لاگ Destruction
cat /var/log/guardian-destruction.log

# چک کردن Marker
cat /tmp/project-destroyed
```

### غیرفعال کردن موقت (فقط برای تست!)

```bash
# تغییر mode به log فقط
nano /etc/project-guardian/config.json
# تغییر "alert_mode": "destruct" به "alert_mode": "log"

# Restart
systemctl restart guardian-main
```

### حذف کامل سیستم امنیتی

⚠️ **خطرناک**: این تمام محافظت‌ها را حذف می‌کند!

```bash
cd /opt/videomakerfree_v2
./uninstall-security.sh
```

## 📊 عملکرد سیستم

- **CPU**: کمتر از 1% استفاده
- **RAM**: حدود 50MB
- **Disk**: حداقل فضای مورد نیاز
- **Network**: بدون استفاده از شبکه

## ✅ Checklist نصب

- [ ] سرور Ubuntu/Debian دارید
- [ ] دسترسی root دارید  
- [ ] پروژه در `/opt/videomakerfree_v2` است
- [ ] `install-security.sh` را اجرا کردید
- [ ] تمام سرویس‌ها running هستند
- [ ] تست‌ها را اجرا کردید
- [ ] فایل‌های حساس encrypt شده‌اند
- [ ] Fingerprint تولید شده
- [ ] Password baseline ایجاد شده

## 🆘 مشکلات رایج

### سرویس‌ها start نمی‌شوند

```bash
# بررسی دقیق
systemctl status guardian-main -l
journalctl -u guardian-main -n 100

# نصب مجدد dependencies
apt-get install -y jq openssl inotify-tools auditd bc curl lsof dmidecode
```

### خطای Encryption

```bash
# Decrypt دستی فایل‌ها
/usr/local/bin/encryption-manager.sh decrypt-pattern "routes/*.js" /opt/videomakerfree_v2
/usr/local/bin/encryption-manager.sh decrypt-pattern "server.js" /opt/videomakerfree_v2
```

### False Positive (اشتباه تشخیص)

```bash
# تغییر به حالت log فقط
nano /etc/project-guardian/config.json
# "alert_mode": "log"

# بررسی لاگ‌ها برای یافتن علت
tail -100 /var/log/guardian.log

# اضافه کردن به whitelist
# در config.json بخش "whitelist_processes" را ویرایش کنید
```

## 📞 راهنمای سریع Commands

```bash
# وضعیت
/usr/local/bin/project-guardian.sh status

# تست
./security/test-security.sh all

# لاگ‌ها
tail -f /var/log/guardian.log

# Restart
systemctl restart guardian-main

# توقف (خطرناک!)
systemctl stop guardian-*

# Uninstall (خطرناک!)
./uninstall-security.sh
```

## ⚠️ هشدارها

1. **هرگز** سرویس‌های guardian را بدون دلیل stop نکنید
2. **هرگز** فایل‌های در `/usr/local/bin/` را دستی تغییر ندهید
3. **هرگز** `/etc/project-guardian/` را backup نگیرید (trigger می‌شود!)
4. **هرگز** VM را snapshot نگیرید (پروژه پاک می‌شود!)

## 🎓 نکات مهم

- این سیستم برای جلوگیری از کپی **غیرمجاز** است
- اگر trigger شد، recovery وجود ندارد
- فایل‌ها با 3-pass shred پاک می‌شوند
- تمام رویدادها log می‌شوند
- سیستم خودکار restart می‌شود

## 📄 اسناد بیشتر

مطالعه کامل: `security/README.md`

---

**تاریخ آخرین به‌روزرسانی**: 1404/07/20 (2025-10-11)

