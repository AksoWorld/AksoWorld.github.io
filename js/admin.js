// ============================================
// НОВОСТИ - ДАННЫЕ
// ============================================
const tagMap = {
    update: {label: 'Обновление', cls: ''},
    patch: {label: 'Патч', cls: 'patch'},
    event: {label: 'Ивент', cls: 'event'}
};

let newsData = [];
let newsPhotos = [];
let currentFilter = 'all';

// Загрузка новостей из localStorage
try {
    const saved = localStorage.getItem('akso_news');
    if (saved) {
        newsData = JSON.parse(saved);
    } else {
        newsData = [
            {tag: 'update', date: '2025-01-01', title: '🎉 Открытие сервера Akso World!', body: 'Мы рады объявить об официальном открытии сервера. Первые игроки уже строят базы. Добро пожаловать в наше уютное сообщество!', photos: []},
            {tag: 'event', date: '2025-01-10', title: '🎄 Новогодний ивент — снежная битва', body: 'С 10 по 20 января на спавне работает арена снежных сражений. Победители получат уникальные косметические ранги и призы!', photos: []},
            {tag: 'patch', date: '2025-01-15', title: '🔧 Патч 1.1 — исправления и улучшения', body: 'Скорректированы цены в магазине, исправлен баг с дублированием предметов. Обновлена система привата /claim. Добавлены новые команды для игроков.', photos: []},
        ];
        localStorage.setItem('akso_news', JSON.stringify(newsData));
    }
} catch(e) {
    newsData = [];
}

// ============================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК АДМИНКИ
// ============================================
function switchAdminTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // Убираем active с кнопок
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    // Показываем нужную вкладку
    document.getElementById(`admin-tab-${tabName}`).classList.add('active');
    event.target.closest('.admin-tab').classList.add('active');
    
    // Если вкладка новостей - обновляем список управления
    if (tabName === 'news') {
        renderNewsManageList();
    }
    // Если вкладка статистики - загружаем текущие значения
    if (tabName === 'stats') {
        loadStatsToForm();
    }
    // Если вкладка ссылок - загружаем текущие ссылки
    if (tabName === 'links') {
        loadLinksToForm();
    }
    // Если вкладка сервера - загружаем настройки
    if (tabName === 'server') {
        loadServerSettings();
    }
}

// ============================================
// РЕНДЕР НОВОСТЕЙ
// ============================================
function renderNews() {
    const c = document.getElementById('news-container');
    if (!c) return;
    
    let filteredNews = newsData;
    if (currentFilter !== 'all') {
        filteredNews = newsData.filter(n => n.tag === currentFilter);
    }
    
    if (!filteredNews.length) {
        c.innerHTML = '<p style="color:var(--muted); text-align:center; padding:3rem;"><i class="fas fa-newspaper"></i> Новостей пока нет</p>';
        return;
    }
    
    c.innerHTML = [...filteredNews].reverse().map((n, index) => {
        const t = tagMap[n.tag] || tagMap.update;
        let photosHtml = '';
        if (n.photos && n.photos.length > 0) {
            photosHtml = `<div class="news-photos">`;
            n.photos.forEach(photo => {
                photosHtml += `<img src="${photo}" alt="Новость" onclick="openLightbox(this.src)">`;
            });
            photosHtml += `</div>`;
        }
        
        const originalIndex = newsData.indexOf(n);
        
        return `
        <div class="news-card">
            <div class="news-meta">
                <span class="news-tag ${t.cls}">${t.label}</span>
                <span class="news-date"><i class="far fa-calendar-alt"></i> ${n.date}</span>
                ${adminAuthorized ? `<button class="delete-news-btn" style="background:rgba(99,102,241,0.15);color:#818cf8;margin-right:4px;" onclick="editNews(${originalIndex})" title="Редактировать"><i class="fas fa-pen"></i></button><button class="delete-news-btn" onclick="deleteNews(${originalIndex})" title="Удалить"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            <h3>${n.title}</h3>
            <p>${n.body.replace(/\n/g, '<br>')}</p>
            ${photosHtml}
        </div>`;
    }).join('');
}

// ============================================
// ФИЛЬТР НОВОСТЕЙ
// ============================================
function filterNews(tag) {
    currentFilter = tag;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tag) || (tag === 'all' && btn.textContent === 'Все')) {
            btn.classList.add('active');
        }
    });
    renderNews();
}

// ============================================
// ЗАГРУЗКА ФОТО ДЛЯ НОВОСТИ
// ============================================
function handleNewsPhotoUpload(input) {
    const preview = document.getElementById('news-photo-preview');
    if (!preview) return;
    
    const files = Array.from(input.files);
    
    files.forEach(file => {
        if (newsPhotos.length >= 3) {
            alert('Максимум 3 фотографии для новости');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой (макс. 5MB)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = e.target.result;
            newsPhotos.push(photoData);
            
            const item = document.createElement('div');
            item.className = 'photo-preview-item';
            item.innerHTML = `
                <img src="${photoData}">
                <button class="remove-photo" onclick="removeNewsPhoto(this, '${photoData}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
    
    input.value = '';
}

function removeNewsPhoto(btn, photoData) {
    newsPhotos = newsPhotos.filter(p => p !== photoData);
    btn.parentElement.remove();
}

// ============================================
// ДОБАВЛЕНИЕ НОВОСТИ
// ============================================
function addNews() {
    if (!adminAuthorized) {
        alert('⛔ Нет доступа');
        return;
    }
    
    const title = document.getElementById('n-title')?.value.trim();
    const body = document.getElementById('n-body')?.value.trim();
    const tag = document.getElementById('n-tag')?.value;
    const date = document.getElementById('n-date')?.value || new Date().toISOString().slice(0, 10);
    
    if (!title || !body) {
        alert('Заполни заголовок и текст');
        return;
    }
    
    newsData.push({
        tag, 
        date, 
        title, 
        body,
        photos: [...newsPhotos]
    });
    
    localStorage.setItem('akso_news', JSON.stringify(newsData));
    
    renderNews();
    renderNewsManageList();
    
    // Очистка формы
    document.getElementById('n-title').value = '';
    document.getElementById('n-body').value = '';
    document.getElementById('news-photo-preview').innerHTML = '';
    newsPhotos = [];
    
    // Отправка в Telegram
    let telegramText = `📰 <b>НОВАЯ НОВОСТЬ</b>\n\n<b>${title}</b>\n${body}\n\n📅 ${date}`;
    if (typeof sendTG === 'function') {
        sendTG(telegramText, newsPhotos);
    }
    
    showNotification('✅ Новость опубликована!');
}

// ============================================
// РЕДАКТИРОВАНИЕ НОВОСТИ
// ============================================
function editNews(index) {
    if (!adminAuthorized) return;

    const n = newsData[index];
    if (!n) return;

    const titleEl = document.getElementById('n-title');
    const bodyEl = document.getElementById('n-body');
    const tagEl = document.getElementById('n-tag');
    const dateEl = document.getElementById('n-date');

    if (titleEl) titleEl.value = n.title;
    if (bodyEl) bodyEl.value = n.body;
    if (tagEl) tagEl.value = n.tag;
    if (dateEl) dateEl.value = n.date;

    const btn = document.querySelector('[onclick="addNews()"]');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
        btn.setAttribute('onclick', `saveEditNews(${index})`);
    }

    titleEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showNotification('✏️ Редактирование новости');
}

function saveEditNews(index) {
    if (!adminAuthorized) return;

    const title = document.getElementById('n-title')?.value.trim();
    const body = document.getElementById('n-body')?.value.trim();
    const tag = document.getElementById('n-tag')?.value;
    const date = document.getElementById('n-date')?.value;

    if (!title || !body) {
        alert('Заполни заголовок и текст');
        return;
    }

    newsData[index] = { ...newsData[index], title, body, tag, date };
    localStorage.setItem('akso_news', JSON.stringify(newsData));

    renderNews();
    renderNewsManageList();

    document.getElementById('n-title').value = '';
    document.getElementById('n-body').value = '';
    const btn = document.querySelector(`[onclick="saveEditNews(${index})"]`);
    if (btn) {
        btn.innerHTML = '<i class="fas fa-plus"></i> Опубликовать';
        btn.setAttribute('onclick', 'addNews()');
    }

    showNotification('✅ Новость обновлена!');
}

// ============================================
// УДАЛЕНИЕ НОВОСТИ
// ============================================
function deleteNews(index) {
    if (!adminAuthorized) return;
    
    if (confirm('Удалить эту новость?')) {
        newsData.splice(index, 1);
        localStorage.setItem('akso_news', JSON.stringify(newsData));
        renderNews();
        renderNewsManageList();
        showNotification('🗑️ Новость удалена');
    }
}

// ============================================
// СПИСОК НОВОСТЕЙ ДЛЯ УПРАВЛЕНИЯ
// ============================================
function renderNewsManageList() {
    const container = document.getElementById('news-manage-list');
    if (!container) return;
    
    if (!newsData.length) {
        container.innerHTML = '<p style="color:var(--muted);">Новостей нет</p>';
        return;
    }
    
    container.innerHTML = newsData.map((n, i) => `
        <div class="news-manage-item">
            <div>
                <strong>${n.title}</strong>
                <span class="news-tag ${tagMap[n.tag]?.cls || ''}">${tagMap[n.tag]?.label || n.tag}</span>
                <span style="color:var(--muted); font-size:0.8rem;">${n.date}</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="delete-news-btn" style="background:rgba(99,102,241,0.15);color:#818cf8;" onclick="editNews(${i})" title="Редактировать">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="delete-news-btn" onclick="deleteNews(${i})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// ДИЗАЙН - ПЕРЕКЛЮЧЕНИЕ ТИПА ФОНА
// ============================================
function toggleBgInput() {
    const type = document.getElementById('bg-type').value;
    document.getElementById('bg-gradient-input').style.display = type === 'gradient' ? 'block' : 'none';
    document.getElementById('bg-image-input').style.display = type === 'image' ? 'block' : 'none';
    document.getElementById('bg-video-input').style.display = type === 'video' ? 'block' : 'none';
}

function uploadBgImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('bg-image').value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function applyDesign() {
    const bgType = document.getElementById('bg-type').value;
    const accentColor = document.getElementById('accent-color').value;
    const secondaryColor = document.getElementById('secondary-color').value;
    
    const design = { bgType, accentColor, secondaryColor };
    
    if (bgType === 'gradient') {
        design.gradient = document.getElementById('bg-gradient').value;
    } else if (bgType === 'image') {
        design.image = document.getElementById('bg-image').value;
    } else if (bgType === 'video') {
        design.video = document.getElementById('bg-video').value;
    }
    
    localStorage.setItem('akso_design', JSON.stringify(design));
    
    // Применяем цвета
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--accent2', secondaryColor);
    
    showNotification('🎨 Дизайн применён!');
}

function resetDesign() {
    localStorage.removeItem('akso_design');
    document.documentElement.style.setProperty('--accent', '#00f5a0');
    document.documentElement.style.setProperty('--accent2', '#00d4ff');
    showNotification('🔄 Дизайн сброшен');
}

// ============================================
// СТАТИСТИКА
// ============================================
function loadStatsToForm() {
    const saved = localStorage.getItem('akso_stats');
    if (saved) {
        const stats = JSON.parse(saved);
        document.getElementById('edit-version').value = stats.version || '';
        document.getElementById('edit-version-label').value = stats.versionLabel || '';
        document.getElementById('edit-mode').value = stats.mode || '';
        document.getElementById('edit-mode-label').value = stats.modeLabel || '';
        document.getElementById('edit-online').value = stats.online || '';
        document.getElementById('edit-online-label').value = stats.onlineLabel || '';
        document.getElementById('edit-test').value = stats.test || '';
        document.getElementById('edit-test-label').value = stats.testLabel || '';
    }
}

function saveStats() {
    const stats = {
        version: document.getElementById('edit-version').value,
        versionLabel: document.getElementById('edit-version-label').value,
        mode: document.getElementById('edit-mode').value,
        modeLabel: document.getElementById('edit-mode-label').value,
        online: document.getElementById('edit-online').value,
        onlineLabel: document.getElementById('edit-online-label').value,
        test: document.getElementById('edit-test').value,
        testLabel: document.getElementById('edit-test-label').value
    };
    
    localStorage.setItem('akso_stats', JSON.stringify(stats));
    showNotification('📊 Статистика сохранена! Обновите главную страницу.');
}

// ============================================
// ССЫЛКИ
// ============================================
function loadLinksToForm() {
    const saved = localStorage.getItem('akso_links');
    if (saved) {
        const links = JSON.parse(saved);
        document.getElementById('edit-discord').value = links.discord || '';
        document.getElementById('edit-telegram').value = links.telegram || '';
        document.getElementById('edit-boosty').value = links.boosty || '';
        document.getElementById('edit-youtube').value = links.youtube || '';
        document.getElementById('edit-vk').value = links.vk || '';
    }
}

function saveLinks() {
    const links = {
        discord: document.getElementById('edit-discord').value,
        telegram: document.getElementById('edit-telegram').value,
        boosty: document.getElementById('edit-boosty').value,
        youtube: document.getElementById('edit-youtube').value,
        vk: document.getElementById('edit-vk').value
    };
    
    localStorage.setItem('akso_links', JSON.stringify(links));
    showNotification('🔗 Ссылки сохранены!');
}

// ============================================
// НАСТРОЙКИ СЕРВЕРА
// ============================================
function loadServerSettings() {
    const ip = localStorage.getItem('akso_ip') || 'aksoworldii.joinserver.xyz';
    const status = localStorage.getItem('akso_status') || 'Сервер онлайн';
    const uptime = localStorage.getItem('akso_uptime') || '24/7';
    
    document.getElementById('edit-server-ip').value = ip;
    document.getElementById('edit-server-status').value = status;
    document.getElementById('edit-server-uptime').value = uptime;
}

function saveServerSettings() {
    const ip = document.getElementById('edit-server-ip').value;
    const status = document.getElementById('edit-server-status').value;
    const uptime = document.getElementById('edit-server-uptime').value;
    
    localStorage.setItem('akso_ip', ip);
    localStorage.setItem('akso_status', status);
    localStorage.setItem('akso_uptime', uptime);
    
    showNotification('🖥️ Настройки сервера сохранены!');
}

// ============================================
// ЛАЙТБОКС ДЛЯ ФОТО
// ============================================
function openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <span class="lightbox-close" onclick="this.parentElement.remove()">&times;</span>
        <img src="${src}" alt="Просмотр">
    `;
    lightbox.onclick = (e) => {
        if (e.target === lightbox) lightbox.remove();
    };
    document.body.appendChild(lightbox);
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Установка даты по умолчанию
    const dateInput = document.getElementById('n-date');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    
    // Рендер новостей
    renderNews();
    
    // Загрузка сохранённого дизайна
    const savedDesign = localStorage.getItem('akso_design');
    if (savedDesign) {
        const design = JSON.parse(savedDesign);
        if (design.accentColor) {
            document.documentElement.style.setProperty('--accent', design.accentColor);
        }
        if (design.secondaryColor) {
            document.documentElement.style.setProperty('--accent2', design.secondaryColor);
        }
    }
    
    // Загрузка статистики на главной
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        const savedStats = localStorage.getItem('akso_stats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            if (stats.version) {
                const el = document.getElementById('stat-version');
                if (el) el.textContent = stats.version;
            }
            if (stats.versionLabel) {
                const el = document.getElementById('stat-version-label');
                if (el) el.textContent = stats.versionLabel;
            }
            if (stats.mode) {
                const el = document.getElementById('stat-mode');
                if (el) el.textContent = stats.mode;
            }
            if (stats.modeLabel) {
                const el = document.getElementById('stat-mode-label');
                if (el) el.textContent = stats.modeLabel;
            }
            if (stats.online) {
                const el = document.getElementById('stat-online');
                if (el) el.textContent = stats.online;
            }
            if (stats.onlineLabel) {
                const el = document.getElementById('stat-online-label');
                if (el) el.textContent = stats.onlineLabel;
            }
            if (stats.test) {
                const el = document.getElementById('stat-test');
                if (el) el.textContent = stats.test;
            }
            if (stats.testLabel) {
                const el = document.getElementById('stat-test-label');
                if (el) el.textContent = stats.testLabel;
            }
        }
    }
});

// ============================================
// УВЕДОМЛЕНИЕ
// ============================================
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        z-index: 9999;
        animation: slideIn 0.3s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}