// 🎯 Ark Plus Navigation System
class ArkPlusMenu {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createMenuHTML();
        this.createBackButton();
        this.bindEvents();
        this.handleResize();
        
        // اضافه کردن listener برای تغییر اندازه صفحه
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    createBackButton() {
        // بررسی اینکه آیا در صفحه اصلی هستیم یا نه
        const currentPath = window.location.pathname;
        const isHomePage = currentPath === '/' || currentPath === '/index.html';
        
        if (!isHomePage) {
            const backButtonHTML = `
                <button class="ark-back-btn" id="arkBackBtn">
                    <span class="ark-back-icon">←</span>
                    <span>برگشت</span>
                </button>
            `;
            
            document.body.insertAdjacentHTML('afterbegin', backButtonHTML);
            this.bindBackButtonEvents();
        }
    }

    bindBackButtonEvents() {
        const backBtn = document.getElementById('arkBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
            
            // اضافه کردن منوی زمینه
            this.addContextMenu();
        }
    }

    goBack() {
        // بررسی تاریخچه مرورگر
        if (window.history.length > 1) {
            // اضافه کردن انیمیشن قبل از برگشت
            const backBtn = document.getElementById('arkBackBtn');
            if (backBtn) {
                backBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    window.history.back();
                }, 150);
            } else {
                window.history.back();
            }
        } else {
            // اگر تاریخچه وجود ندارد، به صفحه اصلی برو
            window.location.href = '/';
        }
    }

    // اضافه کردن قابلیت کلیک راست برای منوی زمینه
    addContextMenu() {
        const backBtn = document.getElementById('arkBackBtn');
        if (backBtn) {
            backBtn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showBackMenu(e);
            });
        }
    }

    showBackMenu(event) {
        // حذف منوی قبلی اگر وجود دارد
        const existingMenu = document.querySelector('.ark-back-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'ark-back-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            padding: 8px 0;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            min-width: 150px;
        `;

        const menuItems = [
            { text: 'برگشت به صفحه قبل', action: () => this.goBack() },
            { text: 'برو به صفحه اصلی', action: () => window.location.href = '/' },
            { text: 'تازه‌سازی صفحه', action: () => window.location.reload() }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 16px;
                color: var(--text-primary);
                cursor: pointer;
                font-family: 'Vazirmatn', sans-serif;
                font-size: 0.9rem;
                transition: background 0.2s ease;
            `;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'rgba(59, 130, 246, 0.2)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // بستن منو با کلیک خارج از آن
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    handleResize() {
        const popupMenu = document.getElementById('arkPopupMenu');
        if (!popupMenu) return;
        
        if (window.innerWidth <= 768) {
            // در موبایل: منو را قابل اسکرول کن
            popupMenu.style.alignItems = 'flex-start';
            popupMenu.style.paddingTop = '60px';
        } else {
            // در دسکتاپ: منو را وسط صفحه قرار بده
            popupMenu.style.alignItems = 'center';
            popupMenu.style.paddingTop = '20px';
        }
    }

    createMenuHTML() {
        const menuHTML = `
            <!-- Ark Plus Navigation -->
            <div class="ark-nav">
                <button class="ark-nav-toggle" id="arkNavToggle">
                    <span class="ark-nav-icon">🎯</span>
                    <span>ارک پلاس</span>
                </button>
            </div>

            <!-- Popup Menu -->
            <div class="ark-popup-menu" id="arkPopupMenu">
                <div class="ark-menu-container">
                    <button class="ark-menu-close" id="arkMenuClose">×</button>
                    
                    <div class="ark-menu-header">
                        <h1 class="ark-menu-title">ارک پلاس</h1>
                        <p class="ark-menu-subtitle">پلتفرم هوشمند تولید محتوا</p>
                    </div>

                    <div class="ark-menu-grid">
                        <!-- تبدیل متن به صدا -->
                        <a href="/test-tts.html" class="ark-menu-item tts-item">
                            <span class="ark-menu-icon">🎤</span>
                            <h3 class="ark-menu-item-title">تبدیل متن به صدا</h3>
                            <p class="ark-menu-item-desc">تبدیل متن فارسی و انگلیسی به صدای طبیعی</p>
                        </a>

                        <!-- ویدیوی سفارشی -->
                        <a href="/custom_video.html" class="ark-menu-item video-item">
                            <span class="ark-menu-icon">🎬</span>
                            <h3 class="ark-menu-item-title">ویدیوی سفارشی</h3>
                            <p class="ark-menu-item-desc">ساخت ویدیو با تنظیمات شخصی‌سازی شده</p>
                        </a>

                        <!-- ویدیوی کوتاه -->
                        <a href="/" class="ark-menu-item video-item">
                            <span class="ark-menu-icon">⚡</span>
                            <h3 class="ark-menu-item-title">ویدیوی کوتاه</h3>
                            <p class="ark-menu-item-desc">ساخت سریع ویدیوهای کوتاه و جذاب</p>
                        </a>

                        <!-- ویدیوی بلند -->
                        <a href="/long-form-video.html" class="ark-menu-item video-item">
                            <span class="ark-menu-icon">📺</span>
                            <h3 class="ark-menu-item-title">ویدیوی بلند</h3>
                            <p class="ark-menu-item-desc">تولید ویدیوهای طولانی و حرفه‌ای</p>
                        </a>

                        <!-- ساخت تصویر -->
                        <a href="/test-image-generation.html" class="ark-menu-item image-item">
                            <span class="ark-menu-icon">🎨</span>
                            <h3 class="ark-menu-item-title">ساخت تصویر</h3>
                            <p class="ark-menu-item-desc">تولید تصاویر با هوش مصنوعی</p>
                        </a>

                        <!-- تاریخچه تصاویر -->
                        <a href="/image-history.html" class="ark-menu-item history-item">
                            <span class="ark-menu-icon">🖼️</span>
                            <h3 class="ark-menu-item-title">تاریخچه تصاویر</h3>
                            <p class="ark-menu-item-desc">مشاهده و مدیریت تصاویر تولید شده</p>
                        </a>

                        <!-- تاریخچه ویدیوها -->
                        <a href="/video-history.html" class="ark-menu-item history-item">
                            <span class="ark-menu-icon">📹</span>
                            <h3 class="ark-menu-item-title">تاریخچه ویدیوها</h3>
                            <p class="ark-menu-item-desc">مشاهده و مدیریت ویدیوهای تولید شده</p>
                        </a>
                    </div>
                </div>
            </div>
        `;

        // اضافه کردن منو به ابتدای body
        document.body.insertAdjacentHTML('afterbegin', menuHTML);
    }

    bindEvents() {
        const toggleBtn = document.getElementById('arkNavToggle');
        const popupMenu = document.getElementById('arkPopupMenu');
        const closeBtn = document.getElementById('arkMenuClose');

        // باز کردن منو
        toggleBtn.addEventListener('click', () => {
            this.openMenu();
        });

        // بستن منو با دکمه X
        closeBtn.addEventListener('click', () => {
            this.closeMenu();
        });

        // بستن منو با کلیک روی پس‌زمینه
        popupMenu.addEventListener('click', (e) => {
            if (e.target === popupMenu) {
                this.closeMenu();
            }
        });

        // بستن منو با کلید Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // اضافه کردن افکت‌های اضافی به آیتم‌های منو
        this.addMenuItemEffects();
    }

    addMenuItemEffects() {
        const menuItems = document.querySelectorAll('.ark-menu-item');
        
        menuItems.forEach(item => {
            // افکت موج هنگام hover
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-3px) scale(1.01)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0) scale(1)';
            });

            // افکت کلیک
            item.addEventListener('mousedown', () => {
                item.style.transform = 'translateY(-1px) scale(0.99)';
            });

            item.addEventListener('mouseup', () => {
                item.style.transform = 'translateY(-3px) scale(1.01)';
            });
        });
    }

    openMenu() {
        const toggleBtn = document.getElementById('arkNavToggle');
        const popupMenu = document.getElementById('arkPopupMenu');

        this.isOpen = true;
        toggleBtn.classList.add('active');
        popupMenu.classList.add('active');

        // جلوگیری از اسکرول صفحه
        document.body.style.overflow = 'hidden';

        // اضافه کردن انیمیشن ورودی به آیتم‌ها
        this.animateMenuItems();
        
        // اسکرول به بالای منو در موبایل
        setTimeout(() => {
            if (window.innerWidth <= 768) {
                popupMenu.scrollTop = 0;
            }
        }, 100);
    }

    closeMenu() {
        const toggleBtn = document.getElementById('arkNavToggle');
        const popupMenu = document.getElementById('arkPopupMenu');

        this.isOpen = false;
        toggleBtn.classList.remove('active');
        popupMenu.classList.remove('active');

        // بازگرداندن اسکرول صفحه
        document.body.style.overflow = '';

        // پاک کردن انیمیشن‌ها
        this.clearMenuAnimations();
    }

    animateMenuItems() {
        const menuItems = document.querySelectorAll('.ark-menu-item');
        
        menuItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(15px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    clearMenuAnimations() {
        const menuItems = document.querySelectorAll('.ark-menu-item');
        
        menuItems.forEach(item => {
            item.style.transition = '';
            item.style.opacity = '';
            item.style.transform = '';
        });
    }
}

// راه‌اندازی منو هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    new ArkPlusMenu();
});

// اضافه کردن افکت‌های اضافی
document.addEventListener('DOMContentLoaded', () => {
    // افکت پارتیکل برای پس‌زمینه منو
    createMenuParticles();
});

function createMenuParticles() {
    const popupMenu = document.getElementById('arkPopupMenu');
    if (!popupMenu) return;

    // ایجاد ذرات شناور (کمتر و ظریف‌تر)
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            pointer-events: none;
            animation: float ${3 + Math.random() * 6}s ease-in-out infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 3}s;
        `;
        popupMenu.appendChild(particle);
    }
}
