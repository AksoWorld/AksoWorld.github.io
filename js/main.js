// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz6sItVxwj9Av_8APvipL_YMH_NRNf3boVtd1c0rA9aTfLwJVSyPTUeM8u-Z7_DJGl7KQ/exec',
  ADMIN_CODE: '322',
  STORAGE_KEYS: {
    AUTH: 'akso_auth',
    NEWS: 'akso_news',
    STATS: 'akso_stats',
    LINKS: 'akso_links',
    DESIGN: 'akso_design',
    SERVER: 'akso_server'
  }
};

// ============================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ============================================
const App = {
  adminAuthorized: false,
  newsData: [],
  newsPhotos: [],
  appPhotos: [],
  supportPhotos: [],
  currentFilter: 'all'
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAuth();
  initPageSpecific();
  loadStats();
  loadServerInfo();
  loadSocialLinks();
  loadDesign();
});

// ============================================
// НАВИГАЦИЯ
// ============================================
function initNavigation() {
  const toggle = document.getElementById('navToggle');
  const menu = document.querySelector('.nav-menu');
  
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('active');
    });
  }
  
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .nav-btn').forEach(link => {
    const href = link.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ============================================
// АВТОРИЗАЦИЯ
// ============================================
function initAuth() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.expires > Date.now() && data.code === CONFIG.ADMIN_CODE) {
        App.adminAuthorized = true;
        showAdminButton();
      }
    } catch(e) {}
  }
  
  let typed = '';
  let timer = null;
  
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (App.adminAuthorized) return;
    
    clearTimeout(timer);
    typed += e.key;
    timer = setTimeout(() => typed = '', 2000);
    
    if (typed.endsWith(CONFIG.ADMIN_CODE)) {
      typed = '';
      clearTimeout(timer);
      
      localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH, JSON.stringify({
        code: CONFIG.ADMIN_CODE,
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000)
      }));
      
      App.adminAuthorized = true;
      showAdminButton();
      
      console.log('%c✅ Доступ разрешён', 'color: #00f5a0; font-weight: bold');
      
      const panel = document.getElementById('adminPanel');
      if (panel) {
        panel.classList.add('open');
        initAdminPanel();
      }
    }
  });
}

function showAdminButton() {
  const btn = document.getElementById('adminFab');
  if (btn) btn.style.display = 'flex';
}

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================
function loadStats() {
  const stats = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.STATS) || '{}');
  
  const defaults = {
    version: '1.21.4', versionLabel: 'Версия',
    mode: 'Vanilla+', modeLabel: 'Режим',
    online: '24/7', onlineLabel: 'Онлайн',
    test: '1 неделя', testLabel: 'Тест-драйв'
  };
  
  updateElement('statVersion', stats.version || defaults.version);
  updateElement('statVersionLabel', stats.versionLabel || defaults.versionLabel);
  updateElement('statMode', stats.mode || defaults.mode);
  updateElement('statModeLabel', stats.modeLabel || defaults.modeLabel);
  updateElement('statOnline', stats.online || defaults.online);
  updateElement('statOnlineLabel', stats.onlineLabel || defaults.onlineLabel);
  updateElement('statTest', stats.test || defaults.test);
  updateElement('statTestLabel', stats.testLabel || defaults.testLabel);
}

function loadServerInfo() {
  const server = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SERVER) || '{}');
  const ip = server.ip || 'aksoworldii.joinserver.xyz';
  updateElement('serverIP', ip);
  checkServerStatus(ip);
}

async function checkServerStatus(ip) {
  const statusEl = document.getElementById('serverStatusText');
  const dotEl = document.querySelector('.pulse-dot');
  if (!statusEl) return;

  statusEl.textContent = 'Проверка...';

  // Попытка через mcsrvstat.us v3
  async function tryMcsrvstat() {
    const res = await fetch(`https://api.mcsrvstat.us/3/${ip}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('mcsrvstat error');
    const data = await res.json();
    return data;
  }

  // Попытка через mcstatus.io
  async function tryMcstatusIo() {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${ip}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('mcstatus.io error');
    const data = await res.json();
    return {
      online: data.online === true,
      players: { online: data.players?.online ?? 0, max: data.players?.max ?? 0 }
    };
  }

  const attempts = [tryMcsrvstat, tryMcstatusIo];

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      if (data.online) {
        const online = data.players?.online ?? 0;
        const max = data.players?.max ?? 0;
        statusEl.textContent = `Онлайн • ${online}/${max} игроков`;
        if (dotEl) {
          dotEl.style.background = '#00f5a0';
          dotEl.style.boxShadow = '0 0 15px #00f5a0';
        }
      } else {
        statusEl.textContent = 'Сервер офлайн';
        if (dotEl) {
          dotEl.style.background = '#ef4444';
          dotEl.style.boxShadow = '0 0 15px #ef4444';
        }
      }
      return; // успех — выходим
    } catch(e) {
      // пробуем следующий API
    }
  }

  // Все API недоступны
  statusEl.textContent = 'Статус неизвестен';
  if (dotEl) {
    dotEl.style.background = '#888';
    dotEl.style.boxShadow = '0 0 15px #888';
  }
}

function loadSocialLinks() {
  const links = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LINKS) || '{}');
  
  const defaults = {
    discord: 'https://discord.gg/v5YVpvjv',
    telegram: 'https://t.me/serverandlife',
    boosty: 'https://boosty.to/akso.world/donate'
  };
  
  const social = links.discord || links.telegram || links.boosty ? links : defaults;
  
  const footer = document.getElementById('footerSocial');
  if (footer) {
    footer.innerHTML = '';
    if (social.discord) footer.innerHTML += `<a href="${social.discord}" target="_blank"><i class="fab fa-discord"></i></a>`;
    if (social.telegram) footer.innerHTML += `<a href="${social.telegram}" target="_blank"><i class="fab fa-telegram"></i></a>`;
    if (social.boosty) footer.innerHTML += `<a href="${social.boosty}" target="_blank"><i class="fas fa-heart"></i></a>`;
  }
  
  const grid = document.getElementById('contactsGrid');
  if (grid) {
    grid.innerHTML = '';
    if (social.discord) grid.innerHTML += createContactCard('discord', 'Discord', social.discord, 'fab fa-discord');
    if (social.telegram) grid.innerHTML += createContactCard('telegram', 'Telegram', social.telegram, 'fab fa-telegram');
    if (social.boosty) grid.innerHTML += createContactCard('boosty', 'Boosty', social.boosty, 'fas fa-heart');
  }
}

function createContactCard(type, name, url, icon) {
  return `
    <a href="${url}" target="_blank" class="contact-card ${type}">
      <i class="${icon}"></i>
      <h4>${name}</h4>
      <span>Присоединиться</span>
    </a>
  `;
}

function loadDesign() {
  const design = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.DESIGN) || '{}');
  if (design.accent) document.documentElement.style.setProperty('--accent', design.accent);
  if (design.secondary) document.documentElement.style.setProperty('--accent-secondary', design.secondary);
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦ
// ============================================
function initPageSpecific() {
  const path = window.location.pathname;
  const page = path.split('/').pop();
  
  // Определяем страницу по любому варианту URL
  const isNews = page === 'news.html' || page === 'news' || page === '';
  const isApplication = page === 'application.html' || page === 'application' || document.getElementById('applicationForm') !== null;
  const isContacts = page === 'contacts.html' || page === 'contacts';

  if (isApplication) {
    initApplicationPage();
  } else if (isNews) {
    initNewsPage();
  } else if (isContacts) {
    initContactsPage();
  }
  
  const fab = document.getElementById('adminFab');
  if (fab) {
    fab.addEventListener('click', () => {
      const panel = document.getElementById('adminPanel');
      if (panel) {
        panel.classList.add('open');
        initAdminPanel();
      }
    });
  }
  
  const closeBtn = document.getElementById('adminPanelClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('adminPanel')?.classList.remove('open');
    });
  }
}

// ============================================
// СТРАНИЦА НОВОСТЕЙ
// ============================================
function initNewsPage() {
  App.newsData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.NEWS) || '[]');
  
  if (App.newsData.length === 0) {
    App.newsData = [
      {tag: 'update', date: '24-02-2026', title: '🎉 Открытие сервера!', body: 'Akso World официально открыт! Присоединяйтесь!', photos: []},
    ];
    localStorage.setItem(CONFIG.STORAGE_KEYS.NEWS, JSON.stringify(App.newsData));
  }
  
  renderNews();
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.currentFilter = btn.dataset.filter;
      renderNews();
    });
  });
  
  const copyBtn = document.getElementById('copyIPBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const ip = document.getElementById('serverIP')?.textContent || 'aksoworldii.joinserver.xyz';
      navigator.clipboard?.writeText(ip);
      const toast = document.getElementById('copyToast');
      if (toast) {
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 2000);
      }
    });
  }
}

function renderNews() {
  const container = document.getElementById('newsContainer');
  if (!container) return;
  
  let filtered = App.newsData;
  if (App.currentFilter !== 'all') {
    filtered = App.newsData.filter(n => n.tag === App.currentFilter);
  }
  
  if (!filtered.length) {
    container.innerHTML = '<div class="loading-placeholder">Новостей пока нет</div>';
    return;
  }
  
  const tagLabels = { update: 'Обновление', patch: 'Патч', event: 'Ивент' };
  const tagClasses = { update: '', patch: 'patch', event: 'event' };
  
  container.innerHTML = [...filtered].reverse().map((news, i) => {
    const originalIndex = App.newsData.indexOf(news);
    const deleteBtn = App.adminAuthorized ? 
      `<button class="news-delete" onclick="App.deleteNews(${originalIndex})"><i class="fas fa-trash"></i></button>` : '';
    
    let photosHtml = '';
    if (news.photos && news.photos.length) {
      photosHtml = '<div class="news-photos">';
      news.photos.forEach(p => {
        photosHtml += `<img src="${p}" onclick="App.openLightbox('${p}')">`;
      });
      photosHtml += '</div>';
    }
    
    return `
      <div class="news-card">
        <div class="news-meta">
          <span class="news-tag ${tagClasses[news.tag]}">${tagLabels[news.tag]}</span>
          <span class="news-date"><i class="far fa-calendar-alt"></i> ${news.date}</span>
          ${deleteBtn}
        </div>
        <h3>${news.title}</h3>
        <p>${news.body.replace(/\n/g, '<br>')}</p>
        ${photosHtml}
      </div>
    `;
  }).join('');
}

App.deleteNews = function(index) {
  if (!App.adminAuthorized) return;
  if (!confirm('Удалить новость?')) return;
  App.newsData.splice(index, 1);
  localStorage.setItem(CONFIG.STORAGE_KEYS.NEWS, JSON.stringify(App.newsData));
  renderNews();
  renderNewsManageList();
};

App.openLightbox = function(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<span class="lightbox-close" onclick="this.parentElement.remove()">&times;</span><img src="${src}">`;
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
};

// ============================================
// АДМИН-ПАНЕЛЬ
// ============================================
function initAdminPanel() {
  if (!App.adminAuthorized) return;
  
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tabName}`)?.classList.add('active');
      if (tabName === 'stats') loadStatsToForm();
      if (tabName === 'links') loadLinksToForm();
      if (tabName === 'server') loadServerToForm();
      if (tabName === 'news') renderNewsManageList();
    });
  });
  
  document.getElementById('addNewsBtn')?.addEventListener('click', addNews);
  document.getElementById('saveStatsBtn')?.addEventListener('click', saveStats);
  document.getElementById('saveLinksBtn')?.addEventListener('click', saveLinks);
  document.getElementById('saveServerBtn')?.addEventListener('click', saveServer);
  document.getElementById('applyDesignBtn')?.addEventListener('click', applyDesign);
  
  const uploadArea = document.getElementById('newsPhotoUpload');
  const photoInput = document.getElementById('newsPhotoInput');
  if (uploadArea && photoInput) {
    uploadArea.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', handleNewsPhotoUpload);
  }
  
  const dateInput = document.getElementById('newsDate');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  
  renderNewsManageList();
}

function handleNewsPhotoUpload(e) {
  const files = Array.from(e.target.files);
  const preview = document.getElementById('newsPhotoPreview');
  files.forEach(file => {
    if (App.newsPhotos.length >= 3) { alert('Максимум 3 фото'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Файл > 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      App.newsPhotos.push(ev.target.result);
      const item = document.createElement('div');
      item.className = 'photo-preview-item';
      item.innerHTML = `<img src="${ev.target.result}"><button onclick="this.parentElement.remove(); App.newsPhotos = App.newsPhotos.filter(p => p !== '${ev.target.result}')"><i class="fas fa-times"></i></button>`;
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function addNews() {
  if (!App.adminAuthorized) return;
  const title = document.getElementById('newsTitle')?.value.trim();
  const body = document.getElementById('newsBody')?.value.trim();
  const tag = document.getElementById('newsTag')?.value;
  const date = document.getElementById('newsDate')?.value || new Date().toISOString().slice(0, 10);
  if (!title || !body) { alert('Заполните заголовок и текст'); return; }
  App.newsData.push({ tag, date, title, body, photos: [...App.newsPhotos] });
  localStorage.setItem(CONFIG.STORAGE_KEYS.NEWS, JSON.stringify(App.newsData));
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsBody').value = '';
  document.getElementById('newsPhotoPreview').innerHTML = '';
  App.newsPhotos = [];
  renderNews();
  renderNewsManageList();
  alert('✅ Новость добавлена!');
}

function renderNewsManageList() {
  const container = document.getElementById('newsManageList');
  if (!container) return;
  if (!App.newsData.length) {
    container.innerHTML = '<div style="color: var(--text-muted);">Новостей нет</div>';
    return;
  }
  const tagLabels = { update: 'Обновление', patch: 'Патч', event: 'Ивент' };
  container.innerHTML = App.newsData.map((n, i) => `
    <div class="news-manage-item">
      <div>
        <strong>${n.title}</strong>
        <span class="news-tag">${tagLabels[n.tag]}</span>
        <span style="color: var(--text-muted); margin-left: 10px;">${n.date}</span>
      </div>
      <button onclick="App.deleteNews(${i})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

function loadStatsToForm() {
  const stats = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.STATS) || '{}');
  setValue('editVersion', stats.version);
  setValue('editVersionLabel', stats.versionLabel);
  setValue('editMode', stats.mode);
  setValue('editModeLabel', stats.modeLabel);
  setValue('editOnline', stats.online);
  setValue('editOnlineLabel', stats.onlineLabel);
  setValue('editTest', stats.test);
  setValue('editTestLabel', stats.testLabel);
}

function saveStats() {
  const stats = {
    version: getValue('editVersion'),
    versionLabel: getValue('editVersionLabel'),
    mode: getValue('editMode'),
    modeLabel: getValue('editModeLabel'),
    online: getValue('editOnline'),
    onlineLabel: getValue('editOnlineLabel'),
    test: getValue('editTest'),
    testLabel: getValue('editTestLabel')
  };
  localStorage.setItem(CONFIG.STORAGE_KEYS.STATS, JSON.stringify(stats));
  loadStats();
  alert('✅ Статистика сохранена!');
}

function loadLinksToForm() {
  const links = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LINKS) || '{}');
  setValue('editDiscord', links.discord);
  setValue('editTelegram', links.telegram);
  setValue('editBoosty', links.boosty);
}

function saveLinks() {
  const links = {
    discord: getValue('editDiscord'),
    telegram: getValue('editTelegram'),
    boosty: getValue('editBoosty')
  };
  localStorage.setItem(CONFIG.STORAGE_KEYS.LINKS, JSON.stringify(links));
  loadSocialLinks();
  alert('✅ Ссылки сохранены!');
}

function loadServerToForm() {
  const server = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SERVER) || '{}');
  setValue('editServerIP', server.ip);
  setValue('editServerStatus', server.status);
}

function saveServer() {
  const server = {
    ip: getValue('editServerIP'),
    status: getValue('editServerStatus')
  };
  localStorage.setItem(CONFIG.STORAGE_KEYS.SERVER, JSON.stringify(server));
  loadServerInfo();
  alert('✅ Настройки сохранены!');
}

function applyDesign() {
  const accent = getValue('accentColor');
  const secondary = getValue('secondaryColor');
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-secondary', secondary);
  localStorage.setItem(CONFIG.STORAGE_KEYS.DESIGN, JSON.stringify({ accent, secondary }));
  alert('✅ Дизайн применён!');
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function getValue(id) {
  return document.getElementById(id)?.value || '';
}

// ============================================
// СТРАНИЦА ЗАЯВКИ
// ============================================
function initApplicationPage() {
  const form = document.getElementById('applicationForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await sendApplication();
    });
  }
  
  const uploadArea = document.getElementById('appPhotoUpload');
  const photoInput = document.getElementById('appPhotoInput');
  if (uploadArea && photoInput) {
    uploadArea.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', handleAppPhotoUpload);
  }
}

function handleAppPhotoUpload(e) {
  const files = Array.from(e.target.files);
  const preview = document.getElementById('appPhotoPreview');
  files.forEach(file => {
    if (App.appPhotos.length >= 5) { alert('Максимум 5 фото'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Файл > 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      App.appPhotos.push(ev.target.result);
      const item = document.createElement('div');
      item.className = 'photo-preview-item';
      item.innerHTML = `<img src="${ev.target.result}"><button onclick="this.parentElement.remove(); App.appPhotos = App.appPhotos.filter(p => p !== '${ev.target.result}')"><i class="fas fa-times"></i></button>`;
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

async function sendApplication() {
  const nick = getValue('appNick');
  const age = getValue('appAge');
  const discord = getValue('appDiscord');
  const telegram = getValue('appTelegram');
  const source = getValue('appSource');
  const about = getValue('appAbout');
  const extra = getValue('appExtra');
  
  if (!nick || !age || !source || !about) {
    showMessage('appMessage', 'Заполните обязательные поля', false);
    return;
  }
  
  const text = `🎮 НОВАЯ ЗАЯВКА\n\n` +
    `👤 Ник: ${nick}\n` +
    `🎂 Возраст: ${age}\n` +
    `💬 Discord: ${discord || '—'}\n` +
    `📱 Telegram: ${telegram || '—'}\n` +
    `🔍 Откуда: ${source}\n\n` +
    `О себе:\n${about}\n\n` +
    `Дополнительно:\n${extra || '—'}`;
  
  const ok = await sendToTelegram(text, App.appPhotos);
  showMessage('appMessage', ok ? '✅ Заявка отправлена!' : '❌ Ошибка отправки', ok);
  
  if (ok) {
    document.getElementById('applicationForm').reset();
    document.getElementById('appPhotoPreview').innerHTML = '';
    App.appPhotos = [];
  }
}

// ============================================
// СТРАНИЦА КОНТАКТОВ
// ============================================
function initContactsPage() {
  const form = document.getElementById('supportForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await sendSupport();
    });
  }

  // Инициализация загрузки фото в поддержке
  const uploadArea = document.getElementById('supportPhotoUpload');
  const photoInput = document.getElementById('supportPhotoInput');
  if (uploadArea && photoInput) {
    uploadArea.addEventListener('click', () => photoInput.click());
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      handleSupportPhotoUpload({ target: { files: e.dataTransfer.files } });
    });
    photoInput.addEventListener('change', handleSupportPhotoUpload);
  }
}

function handleSupportPhotoUpload(e) {
  const files = Array.from(e.target.files);
  const preview = document.getElementById('supportPhotoPreview');
  files.forEach(file => {
    if (App.supportPhotos.length >= 3) { alert('Максимум 3 фото'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Файл > 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      App.supportPhotos.push(ev.target.result);
      const item = document.createElement('div');
      item.className = 'photo-preview-item';
      item.innerHTML = `<img src="${ev.target.result}"><button type="button" onclick="this.parentElement.remove(); App.supportPhotos = App.supportPhotos.filter(p => p !== '${ev.target.result}')"><i class="fas fa-times"></i></button>`;
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
}

async function sendSupport() {
  const contact = getValue('supportContact');
  const topic = getValue('supportTopic');
  const message = getValue('supportMessage');
  
  if (!contact || !message) {
    showMessage('supportMsg', 'Заполните обязательные поля', false);
    return;
  }
  
  const text = `🔧 ПОДДЕРЖКА\n\n` +
    `👤 Контакт: ${contact}\n` +
    `📂 Тема: ${topic}\n\n` +
    `Сообщение:\n${message}`;
  
  const ok = await sendToTelegram(text, App.supportPhotos);
  showMessage('supportMsg', ok ? '✅ Отправлено!' : '❌ Ошибка', ok);
  if (ok) {
    document.getElementById('supportForm').reset();
    document.getElementById('supportPhotoPreview').innerHTML = '';
    App.supportPhotos = [];
  }
}

// ============================================
// TELEGRAM
// ============================================
async function sendToTelegram(text, photos = []) {
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, photos })
    });
    return true;
  } catch(e) {
    console.error('Ошибка отправки:', e);
    return false;
  }
}

function showMessage(id, text, isSuccess) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `form-message ${isSuccess ? 'success' : 'error'}`;
  el.innerHTML = text;
  setTimeout(() => el.className = 'form-message', 5000);
}