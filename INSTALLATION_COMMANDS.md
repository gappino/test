# دستورات نصب - Installation Commands

## 🚀 نصب سریع (یک خط)

### کامند کامل نصب:
```bash
cd /opt && git clone https://github.com/gappino/test.git videomakerfree_v2 && cd videomakerfree_v2 && sudo bash install-security.sh
```

---

## 📋 نصب گام به گام

### 1. Clone پروژه
```bash
cd /opt
git clone https://github.com/gappino/test.git videomakerfree_v2
cd videomakerfree_v2
```

### 2. نصب سیستم امنیتی
```bash
sudo bash install-security.sh
```

این کار انجام می‌دهد:
- ✅ نصب dependencies (jq, openssl, inotify-tools, auditd, etc.)
- ✅ کپی اسکریپت‌های امنیتی به `/usr/local/bin/`
- ✅ ایجاد سرویس‌های systemd
- ✅ تولید کلید رمزنگاری
- ✅ رمزنگاری فایل‌های حساس
- ✅ ایجاد fingerprint سخت‌افزاری
- ✅ ایجاد password baseline
- ✅ راه‌اندازی سرویس‌های نظارتی
- ⚠️ **سیستم در Safe Mode راه‌اندازی می‌شود** (فقط لاگ، بدون تخریب)

### 3. بررسی وضعیت
```bash
# وضعیت کلی
sudo /usr/local/bin/project-guardian.sh status

# وضعیت سرویس‌ها
sudo systemctl status guardian-main
sudo systemctl status guardian-backup
sudo systemctl status guardian-process
sudo systemctl status guardian-files

# مشاهده لاگ زنده
sudo tail -f /var/log/guardian.log
```

### 4. تست سیستم (Safe Mode)
```bash
# اجرای تمام تست‌ها
sudo ./security/test-security.sh all

# در Safe Mode می‌توانید تست کنید:
sudo tar -czf /tmp/test-backup.tar.gz /opt/videomakerfree_v2
# ✅ فقط log می‌شود، پروژه پاک نمی‌شود

# مشاهده لاگ
sudo tail -20 /var/log/guardian.log
```

### 5. فعال‌سازی Full Protection (بعد از اطمینان)
```bash
sudo /usr/local/bin/enable-protection.sh
```

⚠️ **توجه**: بعد از این مرحله، هر تلاش برای کپی/بکاپ/تغییر → **پروژه پاک می‌شود!**

---

## 🔍 دستورات مدیریت

### چک کردن حالت فعلی
```bash
# مشاهده حالت (log یا destruct)
cat /etc/project-guardian/config.json | jq '.alert_mode'
```

### مشاهده لاگ‌ها
```bash
# لاگ guardian
sudo tail -f /var/log/guardian.log

# لاگ systemd
sudo journalctl -u guardian-main -f

# 100 خط آخر
sudo journalctl -u guardian-main -n 100
```

### Restart سرویس‌ها
```bash
# Restart تمام سرویس‌ها
sudo systemctl restart guardian-main guardian-backup guardian-process guardian-files

# یا جداگانه
sudo systemctl restart guardian-main
```

### تغییر به حالت Log (برای تست)
```bash
# تغییر config
sudo jq '.alert_mode = "log"' /etc/project-guardian/config.json > /tmp/config.json
sudo mv /tmp/config.json /etc/project-guardian/config.json

# Restart
sudo systemctl restart guardian-main
```

### فعال کردن مجدد Destruct Mode
```bash
sudo /usr/local/bin/enable-protection.sh
```

---

## 🆘 عیب‌یابی

### سرویس‌ها start نمی‌شوند
```bash
# بررسی دقیق
sudo systemctl status guardian-main -l
sudo journalctl -u guardian-main -n 50

# نصب dependencies
sudo apt-get update
sudo apt-get install -y jq openssl inotify-tools auditd bc curl lsof dmidecode

# Restart
sudo systemctl restart guardian-main
```

### خطای Permission
```bash
# اطمینان از executable بودن
sudo chmod +x /usr/local/bin/*.sh
sudo chmod +x /usr/local/bin/.systemd-timesyncd-helper

# Reload systemd
sudo systemctl daemon-reload
```

### پروژه پاک شد!
```bash
# مشاهده علت در لاگ
sudo cat /var/log/guardian-destruction.log

# مشاهده marker
cat /tmp/project-destroyed
```

---

## 🗑️ حذف کامل (اگر نیاز دارید)

```bash
cd /opt/videomakerfree_v2
sudo bash uninstall-security.sh
```

⚠️ **توجه**: این همه محافظت‌ها را حذف می‌کند!

---

## 📊 ساختار فایل‌ها

### اسکریپت‌های نصب شده در `/usr/local/bin/`:
- `project-guardian.sh` - نظارت اصلی
- `process-monitor.sh` - نظارت بر commandها
- `file-access-monitor.sh` - نظارت بر فایل‌ها
- `password-monitor.sh` - نظارت بر passwordها
- `snapshot-detector.sh` - شناسایی snapshot
- `self-destruct.sh` - پاک‌سازی
- `encryption-manager.sh` - مدیریت رمزنگاری
- `check-services.sh` - بررسی سلامت سرویس‌ها
- `enable-protection.sh` - فعال‌سازی حالت تخریب
- `.systemd-timesyncd-helper` - Hidden watchdog

### سرویس‌های systemd در `/etc/systemd/system/`:
- `guardian-main.service`
- `guardian-backup.service`
- `guardian-process.service`
- `guardian-files.service`
- `project-app.service`

### فایل‌های پیکربندی:
- `/etc/project-guardian/config.json` - تنظیمات اصلی
- `/etc/audit/rules.d/guardian.rules` - قوانین audit
- `/etc/cron.d/project-guardian` - Cron jobs

### فایل‌های State:
- `/var/lib/project-guardian/fingerprint.json` - Fingerprint سخت‌افزار
- `/var/lib/project-guardian/shadow.baseline` - Baseline password
- `/var/lib/project-guardian/encryption.key` - کلید رمزنگاری

### لاگ‌ها:
- `/var/log/guardian.log` - لاگ اصلی
- `/var/log/guardian-cron.log` - لاگ cron jobs
- `/var/log/guardian-destruction.log` - لاگ تخریب (در صورت trigger)

---

## ✅ Checklist نصب موفق

- [ ] پروژه در `/opt/videomakerfree_v2` clone شده
- [ ] `install-security.sh` بدون خطا اجرا شده
- [ ] تمام سرویس‌ها active هستند
- [ ] لاگ‌ها بدون خطا هستند
- [ ] تست‌ها passed شده‌اند
- [ ] حالت Safe Mode تایید شده (log می‌شود)
- [ ] در صورت نیاز، Full Protection فعال شده

---

## 🎯 سناریوهای محافظت شده

| سناریو | Safe Mode | Destruct Mode |
|---------|-----------|---------------|
| `tar -czf backup.tar.gz /opt/videomakerfree_v2` | ✅ Log | ❌ Destroy |
| `cp -r /opt/videomakerfree_v2 /tmp/` | ✅ Log | ❌ Destroy |
| `rsync -av /opt/videomakerfree_v2 /backup/` | ✅ Log | ❌ Destroy |
| `passwd root` | ✅ Log | ❌ Destroy |
| `systemctl stop guardian-main` | ✅ Log + Restart | ❌ Restart → Destroy |
| VM Snapshot → Restore | ✅ Log | ❌ Destroy |
| `rm -rf /usr/local/bin/project-guardian.sh` | ❌ Destroy (فوری!) | ❌ Destroy (فوری!) |

⚠️ **توجه مهم**: حتی در Safe Mode، اگر فایل‌های security پاک شوند، Hidden Watchdog فوراً پروژه را پاک می‌کند!

---

## 🔗 لینک‌های مفید

- **مخزن گیت‌هاب**: https://github.com/gappino/test
- **راهنمای سریع**: `QUICK_START.md`
- **راهنمای کامل فارسی**: `SECURITY_INSTALLATION_GUIDE.md`
- **مستندات تکنیکال**: `security/README.md`

---

**آماده برای استفاده! 🚀**

نصب و راه‌اندازی در Safe Mode → تست کامل → فعال‌سازی Full Protection

