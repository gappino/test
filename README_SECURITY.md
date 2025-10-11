# 🛡️ Project Guardian - سیستم امنیتی چند لایه

یک سیستم امنیتی پیشرفته برای محافظت کامل از پروژه در برابر کپی، بکاپ، و دسترسی غیرمجاز.

## 🚀 نصب سریع

```bash
cd /opt && git clone https://github.com/gappino/test.git videomakerfree_v2 && cd videomakerfree_v2 && sudo bash install-security.sh
```

## 🛡️ محافظت در برابر

- ✅ کپی و بکاپ‌گیری (`tar`, `cp`, `rsync`, `dd`, `scp`)
- ✅ تغییر password سرور
- ✅ دسترسی غیرمجاز به فایل‌ها
- ✅ VM Snapshot و Clone
- ✅ حذف فایل‌های security
- ✅ توقف سرویس‌های نظارتی

## 📋 ویژگی‌ها

### 7 لایه امنیتی:

1. **File Encryption** - رمزنگاری AES-256 فایل‌های حساس
2. **Multiple Watchdogs** - چند سرویس نظارتی که همدیگر را چک می‌کنند
3. **Process Monitoring** - نظارت realtime بر commandهای خطرناک
4. **File Access Monitoring** - نظارت با inotify بر دسترسی به فایل‌ها
5. **Password Detection** - شناسایی تغییرات `/etc/shadow`
6. **Snapshot Detection** - شناسایی VM clone با fingerprint
7. **Self-Destruct** - پاک‌سازی خودکار با `shred`

### محافظت از خود سیستم امنیتی:

- 🔒 **Hidden Watchdog** مخفی هر دقیقه چک می‌کند
- 🔒 اگر فایل‌های security پاک شوند → **فوری پروژه پاک می‌شود**
- 🔒 Cron jobs مستقل از سرویس‌های اصلی
- 🔒 auditd برای نظارت بر systemctl commands

## 📖 مستندات

| فایل | توضیح |
|------|--------|
| [QUICK_START.md](QUICK_START.md) | راهنمای سریع شروع |
| [INSTALLATION_COMMANDS.md](INSTALLATION_COMMANDS.md) | تمام دستورات نصب و مدیریت |
| [SECURITY_INSTALLATION_GUIDE.md](SECURITY_INSTALLATION_GUIDE.md) | راهنمای کامل فارسی |
| [FINAL_SUMMARY.md](FINAL_SUMMARY.md) | خلاصه کامل پروژه |
| [security/README.md](security/README.md) | مستندات تکنیکال |

## 🎯 استفاده

### نصب:
```bash
sudo bash install-security.sh
```

### بررسی وضعیت:
```bash
sudo /usr/local/bin/project-guardian.sh status
```

### مشاهده لاگ:
```bash
sudo tail -f /var/log/guardian.log
```

### فعال‌سازی Full Protection:
```bash
sudo /usr/local/bin/enable-protection.sh
```

⚠️ **نکته**: بعد از نصب، سیستم در **Safe Mode** است (فقط لاگ می‌گیرد). برای فعال‌سازی حالت تخریب خودکار، از دستور بالا استفاده کنید.

## 🔍 سناریوهای محافظت شده

```bash
# این commandها پروژه را پاک می‌کنند:
tar -czf backup.tar.gz /opt/videomakerfree_v2
cp -r /opt/videomakerfree_v2 /tmp/
rsync -av /opt/videomakerfree_v2 /backup/
passwd root
systemctl stop guardian-main
# VM Snapshot → Restore
# rm -rf /usr/local/bin/project-guardian.sh
```

## ⚙️ پیکربندی

فایل config: `/etc/project-guardian/config.json`

```json
{
  "project_path": "/opt/videomakerfree_v2",
  "alert_mode": "log",  // "log" یا "destruct"
  "grace_period": 0,
  "fingerprint_check": true,
  "timestamp_check": true
}
```

## 📊 آمار

- **خطوط کد**: 5000+
- **اسکریپت‌ها**: 12
- **سرویس‌های systemd**: 5
- **لایه‌های امنیتی**: 7
- **فایل‌های مستندات**: 5

## 🆘 پشتیبانی

### دستورات مفید:
```bash
# تست سیستم
sudo ./security/test-security.sh all

# Restart سرویس‌ها
sudo systemctl restart guardian-main

# حذف سیستم امنیتی
sudo bash uninstall-security.sh
```

## ⚠️ هشدار

- این سیستم برای محافظت جدی طراحی شده است
- بعد از trigger شدن، **هیچ recovery وجود ندارد**
- فایل‌ها با 3-pass shred پاک می‌شوند
- حتماً قبل از فعال‌سازی در Safe Mode تست کنید

## 🔗 لینک‌ها

- **GitHub**: https://github.com/gappino/test
- **Issues**: https://github.com/gappino/test/issues

## 📄 License

این پروژه تحت لایسنس MIT منتشر شده است.

## 👤 سازنده

برای سوالات یا پیشنهادات، یک Issue باز کنید.

---

**🚀 آماده برای محافظت از پروژه شما!**

```bash
cd /opt && git clone https://github.com/gappino/test.git videomakerfree_v2 && cd videomakerfree_v2 && sudo bash install-security.sh
```

