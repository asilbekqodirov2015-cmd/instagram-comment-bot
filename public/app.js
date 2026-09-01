/**
 * InstaResponse - Complete SaaS Dashboard & Admin Management Engine
 * Supports Multi-tenant Bot Config, Gemini AI, Billing Checkout (Payme/Click/Card), Logs & Super Admin
 */

// Global State
let currentUser = null;
let activeKeywords = [];
let allLogs = [];
let selectedCheckoutPlan = 'pro';
let selectedCheckoutProvider = 'payme';
let selectedAdminEditUserId = null;

// Post Picker State
let selectedTargetMediaId = '';
let selectedTargetMediaUrl = '';
let selectedTargetMediaCaption = '';
let selectedTargetMediaThumbnail = '';

// Verify Auth Token on load
const token = localStorage.getItem('jwtToken');
if (!token) {
  window.location.href = 'login.html';
}

// Authenticated Fetch Helper
async function authenticatedFetch(url, options = {}) {
  const jwtToken = localStorage.getItem('jwtToken');
  if (!jwtToken) {
    window.location.href = 'login.html';
    return Promise.reject('Token topilmadi');
  }

  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${jwtToken}`
  };

  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userEmail');
      window.location.href = 'login.html';
      throw new Error('Seans muddati tugagan. Qaytadan kiring.');
    }
    return response;
  } catch (err) {
    console.error(`Fetch error on ${url}:`, err.message);
    throw err;
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  initThemeSwitcher();
  initSidebarTabs();
  initLogout();
  initPreviewTabs();
  initPaymentProviders();

  // Load User Profile & Role
  await loadUserProfile();

  // Load initial Tab data
  initAutoConnectHandlers();
  await loadBotConfig();
  await loadStats();
  await loadLogs();
  await loadBillingData();
});

/* ==========================================================
   1. USER PROFILE & ROLE MANAGEMENT
   ========================================================== */
async function loadUserProfile() {
  try {
    const res = await authenticatedFetch('/api/auth/me');
    const data = await res.json();

    if (res.ok && data.success) {
      currentUser = data.user;
      renderUserHeaderAndSidebar(currentUser);

      // Show Admin Tab if user is super admin
      const adminNavBtn = document.getElementById('adminNavBtn');
      if (currentUser.role === 'admin') {
        if (adminNavBtn) adminNavBtn.style.display = 'flex';
      } else {
        if (adminNavBtn) adminNavBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('Could not load /api/auth/me, using stored token info');
    const storedEmail = localStorage.getItem('userEmail') || 'user@gmail.com';
    renderUserHeaderAndSidebar({ email: storedEmail, role: 'user', subscription: { tier: 'free' } });
  }
}

function renderUserHeaderAndSidebar(user) {
  const userEmail = user.email || 'user@gmail.com';
  const role = user.role || 'user';
  const tier = (user.subscription && user.subscription.tier) ? user.subscription.tier.toUpperCase() : 'FREE';

  // Sidebar widgets
  const sidebarEmail = document.getElementById('sidebarUserEmail');
  const sidebarRole = document.getElementById('sidebarUserRole');
  const sidebarAvatar = document.getElementById('userAvatarChar');
  const sidebarBadge = document.getElementById('sidebarPlanBadge');

  if (sidebarEmail) sidebarEmail.textContent = userEmail;
  if (sidebarRole) sidebarRole.textContent = role === 'admin' ? '👑 Super Admin' : 'Foydalanuvchi';
  if (sidebarAvatar) sidebarAvatar.textContent = userEmail.charAt(0).toUpperCase();
  if (sidebarBadge) {
    sidebarBadge.textContent = tier;
    sidebarBadge.className = `plan-badge-dynamic ${tier.toLowerCase()}`;
  }

  // Settings tab info
  const settingsEmail = document.getElementById('settingsEmailDisplay');
  const settingsRole = document.getElementById('settingsRoleDisplay');
  if (settingsEmail) settingsEmail.value = userEmail;
  if (settingsRole) settingsRole.value = role === 'admin' ? 'Super Administrator' : 'Oddiy Foydalanuvchi';
}

/* ==========================================================
   2. SIDEBAR TAB NAVIGATION
   ========================================================== */
function initSidebarTabs() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('pageTitleHeading');
  const pageSubtitle = document.getElementById('pageSubtitleText');

  const tabTitles = {
    'tab-bot': { title: 'Bot Boshqaruvi', subtitle: 'Instagram Meta API va avtomatik javob sozlamalari' },
    'tab-ai': { title: 'Gemini AI Agenti', subtitle: 'Sun\'iy intellekt orqali mijozlarga avtomatlashtirilgan javoblar' },
    'tab-billing': { title: 'Tariflar & To\'lovlar', subtitle: 'Obuna holati, to\'lov o\'tkazish (Payme/Click) va kvitansiyalar' },
    'tab-logs': { title: 'Analitika & Faollik Tarixi', subtitle: 'Kommentariyalar va Direct xabarlar statistikasi' },
    'tab-admin': { title: '👑 Super Admin Paneli', subtitle: 'Foydalanuvchilar bazasi, platforma daromadlari va tizim nazorati' },
    'tab-settings': { title: 'Profil & Xavfsizlik', subtitle: 'Akkaunt ma\'lumotlari va parolni yangilash' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', async () => {
      const targetTabId = item.dataset.tab;
      if (!targetTabId) return;

      // Update Nav active classes
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update Tab Pane active classes
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === targetTabId) {
          pane.classList.add('active');
        }
      });

      // Update Titles
      if (tabTitles[targetTabId]) {
        if (pageTitle) pageTitle.textContent = tabTitles[targetTabId].title;
        if (pageSubtitle) pageSubtitle.textContent = tabTitles[targetTabId].subtitle;
      }

      // Tab specific data loads
      if (targetTabId === 'tab-billing') {
        await loadBillingData();
      } else if (targetTabId === 'tab-admin') {
        await loadAdminData();
      } else if (targetTabId === 'tab-logs') {
        await loadLogs();
        await loadStats();
      }
    });
  });
}

/* ==========================================================
   3. BOT CONFIGURATION & META SETUP (TAB 1)
   ========================================================== */
const configForm = document.getElementById('configForm');
const triggerTypeRadios = document.getElementsByName('triggerType');
const keywordsContainer = document.getElementById('keywordsContainer');
const keywordsInput = document.getElementById('keywordsInput');
const keywordsBadges = document.getElementById('keywordsBadges');

const dmTypeSelect = document.getElementById('dmType');
const mediaUrlContainer = document.getElementById('mediaUrlContainer');
const dmMediaUrl = document.getElementById('dmMediaUrl');
const dmText = document.getElementById('dmText');
const pageAccessToken = document.getElementById('pageAccessToken');
const verifyToken = document.getElementById('verifyToken');
const facebookPageId = document.getElementById('facebookPageId');
const replyVariantsContainer = document.getElementById('replyVariantsContainer');
const addReplyVariantBtn = document.getElementById('addReplyVariantBtn');

// Load Config
async function loadBotConfig() {
  try {
    const res = await authenticatedFetch('/api/config');
    if (!res.ok) return;
    const config = await res.json();

    if (facebookPageId) facebookPageId.value = config.facebookPageId || '';
    if (pageAccessToken) pageAccessToken.value = config.pageAccessToken || '';
    if (verifyToken) verifyToken.value = config.verifyToken || '';
    if (dmTypeSelect) dmTypeSelect.value = config.dmType || 'text';
    if (dmText) dmText.value = config.dmText || '';
    if (dmMediaUrl) dmMediaUrl.value = config.dmMediaUrl || '';

    // Trigger Type
    if (triggerTypeRadios) {
      triggerTypeRadios.forEach(r => {
        r.checked = (r.value === (config.triggerType || 'all'));
      });
      toggleKeywordsVisibility();
    }

    // Post Scope (All vs Specific Post)
    const postScopeRadios = document.getElementsByName('postScope');
    if (postScopeRadios) {
      postScopeRadios.forEach(r => {
        r.checked = (r.value === (config.postScope || 'all'));
      });
      togglePostScopeVisibility();
    }

    // Mention User (@atmetka) toggle
    const mentionToggle = document.getElementById('mentionUserToggle');
    if (mentionToggle) {
      mentionToggle.checked = (config.mentionUser !== false);
    }

    // Selected Post Data
    if (config.targetMediaId) {
      selectedTargetMediaId = config.targetMediaId;
      selectedTargetMediaUrl = config.targetMediaUrl || '';
      selectedTargetMediaCaption = config.targetMediaCaption || '';
      selectedTargetMediaThumbnail = config.targetMediaThumbnail || '';
      renderSelectedPostDisplay();
    } else {
      clearSelectedPostDisplay();
    }

    // Keywords
    activeKeywords = Array.isArray(config.keywords) ? config.keywords : [];
    renderKeywordBadges();

    // Reply Variants
    if (Array.isArray(config.commentReplies) && config.commentReplies.length > 0) {
      renderReplyVariants(config.commentReplies);
    } else if (config.commentReplyText) {
      renderReplyVariants([config.commentReplyText]);
    } else {
      renderReplyVariants(['Javobingizni lizingizga (DM) yubordik! 📩']);
    }

    // AI Form sync
    const aiToggle = document.getElementById('aiEnabledToggle');
    const aiTone = document.getElementById('aiToneSelect');
    const aiPrompt = document.getElementById('aiSystemPromptInput');
    if (aiToggle) aiToggle.checked = Boolean(config.aiEnabled);
    if (aiTone) aiTone.value = config.aiTone || 'friendly';
    if (aiPrompt) aiPrompt.value = config.aiSystemPrompt || '';

    // Smart Auto-Connect Banner State
    const connBanner = document.getElementById('connectedAccountBanner');
    const wizardBox = document.getElementById('connectWizardBox');
    const handleEl = document.getElementById('connectedInstaHandle');
    const pageTitleEl = document.getElementById('connectedPageTitle');

    if (config.isConnected || config.facebookPageId) {
      if (connBanner) connBanner.style.display = 'flex';
      if (wizardBox) wizardBox.style.display = 'none';
      if (handleEl) handleEl.textContent = config.instagramUsername ? `@${config.instagramUsername}` : (config.pageName ? `@${config.pageName}` : '@instagram_akkaunt');
      if (pageTitleEl) pageTitleEl.textContent = `Facebook Sahifa: ${config.pageName || 'Ulangan Sahifa'} (ID: ${config.facebookPageId})`;
    } else {
      if (connBanner) connBanner.style.display = 'none';
      if (wizardBox) wizardBox.style.display = 'block';
    }

    handleDmTypeChange();
    updateLivePreview();
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// Post Scope visibility toggle
function togglePostScopeVisibility() {
  const postScopeRadios = document.getElementsByName('postScope');
  let selected = 'all';
  postScopeRadios.forEach(r => { if (r.checked) selected = r.value; });

  const container = document.getElementById('specificPostContainer');
  if (container) {
    container.style.display = (selected === 'specific') ? 'block' : 'none';
  }
}
document.querySelectorAll('input[name="postScope"]').forEach(r => {
  r.addEventListener('change', togglePostScopeVisibility);
});

// Render Selected Post box
function renderSelectedPostDisplay() {
  const displayBox = document.getElementById('selectedPostDisplay');
  const noPostBox = document.getElementById('noPostSelectedBox');
  const captionEl = document.getElementById('selectedPostCaption');
  const idEl = document.getElementById('selectedPostIdText');
  const thumbEl = document.getElementById('selectedPostThumb');

  if (selectedTargetMediaId) {
    if (displayBox) displayBox.style.display = 'flex';
    if (noPostBox) noPostBox.style.display = 'none';
    if (captionEl) captionEl.textContent = selectedTargetMediaCaption || '(Izohsiz post)';
    if (idEl) idEl.textContent = `ID: ${selectedTargetMediaId}`;
    if (thumbEl) {
      if (selectedTargetMediaThumbnail) {
        thumbEl.innerHTML = `<img src="${escapeHtml(selectedTargetMediaThumbnail)}" alt="Post Thumb">`;
      } else {
        thumbEl.innerHTML = `<i class="fa-solid fa-photo-film"></i>`;
      }
    }
  } else {
    clearSelectedPostDisplay();
  }
}

function clearSelectedPostDisplay() {
  const displayBox = document.getElementById('selectedPostDisplay');
  const noPostBox = document.getElementById('noPostSelectedBox');
  if (displayBox) displayBox.style.display = 'none';
  if (noPostBox) noPostBox.style.display = 'block';
}

/* Smart Auto-Connect Handlers */
function initAutoConnectHandlers() {
  const autoResolveBtn = document.getElementById('autoResolveBtn');
  const autoTokenInput = document.getElementById('autoResolveTokenInput');
  const statusLog = document.getElementById('autoResolveStatusLog');
  const disconnectBtn = document.getElementById('disconnectMetaBtn');
  const toggleManualBtn = document.getElementById('toggleManualSettingsBtn');
  const manualCollapse = document.getElementById('manualSettingsCollapse');

  if (toggleManualBtn && manualCollapse) {
    toggleManualBtn.addEventListener('click', () => {
      const isHidden = manualCollapse.style.display === 'none';
      manualCollapse.style.display = isHidden ? 'block' : 'none';
      toggleManualBtn.innerHTML = isHidden 
        ? '<i class="fa-solid fa-chevron-up"></i> Qo\'lda Sozlamalarni Yashirish' 
        : '<i class="fa-solid fa-sliders"></i> Qo\'lda Kiritish (Kengaytirilgan)';
    });
  }

  if (autoResolveBtn) {
    autoResolveBtn.addEventListener('click', async () => {
      const tokenVal = autoTokenInput ? autoTokenInput.value.trim() : '';
      if (!tokenVal) {
        alert('Iltimos, Meta Access Tokenni kiriting!');
        return;
      }

      autoResolveBtn.disabled = true;
      autoResolveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Avtomatik aniqlanmoqda...';

      if (statusLog) {
        statusLog.style.display = 'block';
        statusLog.className = 'resolve-status-log loading';
        statusLog.innerHTML = '<i class="fa-solid fa-magnifying-glass fa-spin"></i> 1. Meta API orqali Facebook Sahifa va Instagram akkaunt tekshirilmoqda...';
      }

      try {
        const res = await authenticatedFetch('/api/meta/auto-resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenVal })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (statusLog) {
            statusLog.className = 'resolve-status-log success';
            statusLog.innerHTML = `<strong>✅ 100% Muvaffaqiyatli!</strong><br>Instagram: <strong>@${escapeHtml(data.details.instagramUsername || 'instagram_user')}</strong><br>Sahifa: <strong>${escapeHtml(data.details.pageName)}</strong> (ID: ${escapeHtml(data.details.pageId)})<br>⚡ Webhook obunasi: <strong>Avtomatik yoqildi</strong>`;
          }
          if (autoTokenInput) autoTokenInput.value = '';
          await loadBotConfig();
        } else {
          if (statusLog) {
            statusLog.className = 'resolve-status-log error';
            statusLog.innerHTML = `<strong>❌ Xatolik:</strong> ${escapeHtml(data.message || 'Token yaroqsiz')}`;
          }
        }
      } catch (err) {
        if (statusLog) {
          statusLog.className = 'resolve-status-log error';
          statusLog.innerHTML = '<strong>❌ Tarmoq xatoligi:</strong> Server bilan aloqa o\'rnatilmadi.';
        }
      } finally {
        autoResolveBtn.disabled = false;
        autoResolveBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> 🚀 Avtomatik Bog\'lash va Ishga Tushirish';
      }
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async () => {
      if (!confirm('Haqiqatan ham Instagram akkauntingizni tizimdan uzmoqchimisiz?')) return;
      try {
        const res = await authenticatedFetch('/api/meta/disconnect', { method: 'POST' });
        if (res.ok) {
          alert('Instagram akkaunt muvaffaqiyatli uzildi.');
          await loadBotConfig();
        }
      } catch (e) {
        alert('Akkauntni uzishda xatolik.');
      }
    });
  }
}

// Save Config
if (configForm) {
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = configForm.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saqlanmoqda...';

    // Collect reply variants
    const replyInputs = replyVariantsContainer ? replyVariantsContainer.querySelectorAll('input[type="text"]') : [];
    const commentReplies = Array.from(replyInputs).map(inp => inp.value.trim()).filter(Boolean);

    let selectedTrigger = 'all';
    triggerTypeRadios.forEach(r => { if (r.checked) selectedTrigger = r.value; });

    let selectedScope = 'all';
    const scopeRadios = document.getElementsByName('postScope');
    scopeRadios.forEach(r => { if (r.checked) selectedScope = r.value; });

    const mentionToggle = document.getElementById('mentionUserToggle');
    const mentionUser = mentionToggle ? mentionToggle.checked : true;

    const newConfig = {
      facebookPageId: facebookPageId ? facebookPageId.value.trim() : '',
      pageAccessToken: pageAccessToken ? pageAccessToken.value.trim() : '',
      verifyToken: verifyToken ? verifyToken.value.trim() : '',
      postScope: selectedScope,
      targetMediaId: selectedScope === 'specific' ? selectedTargetMediaId : '',
      targetMediaUrl: selectedScope === 'specific' ? selectedTargetMediaUrl : '',
      targetMediaCaption: selectedScope === 'specific' ? selectedTargetMediaCaption : '',
      targetMediaThumbnail: selectedScope === 'specific' ? selectedTargetMediaThumbnail : '',
      triggerType: selectedTrigger,
      keywords: activeKeywords,
      mentionUser: mentionUser,
      commentReplies: commentReplies.length > 0 ? commentReplies : ['Javobingizni lizingizga (DM) yubordik! 📩'],
      commentReplyText: commentReplies[0] || 'Javobingizni lizingizga (DM) yubordik! 📩',
      dmType: dmTypeSelect ? dmTypeSelect.value : 'text',
      dmText: dmText ? dmText.value.trim() : '',
      dmMediaUrl: dmMediaUrl ? dmMediaUrl.value.trim() : ''
    };

    try {
      const res = await authenticatedFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Sozlamalar muvaffaqiyatli saqlandi! ✅');
        updateLivePreview();
      } else {
        alert(data.message || 'Saqlashda xatolik yuz berdi.');
      }
    } catch (err) {
      alert('Tarmoq xatoligi: Sozlamalar saqlanmadi.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });
}

// Dynamic Reply Variants
function renderReplyVariants(variants) {
  if (!replyVariantsContainer) return;
  replyVariantsContainer.innerHTML = '';
  variants.forEach((text, index) => {
    addReplyVariantInput(text, index === 0);
  });
}

function addReplyVariantInput(value = '', isFirst = false) {
  if (!replyVariantsContainer) return;
  const item = document.createElement('div');
  item.className = 'dynamic-input-row';
  item.innerHTML = `
    <input type="text" placeholder="Masalan: Salom! Directingizni tekshiring 📩" value="${escapeHtml(value)}" required>
    ${!isFirst ? '<button type="button" class="btn-remove-variant" title="O\'chirish"><i class="fa-solid fa-xmark"></i></button>' : ''}
  `;
  if (!isFirst) {
    const removeBtn = item.querySelector('.btn-remove-variant');
    removeBtn.addEventListener('click', () => {
      item.remove();
      updateLivePreview();
    });
  }
  const input = item.querySelector('input');
  input.addEventListener('input', updateLivePreview);
  replyVariantsContainer.appendChild(item);
}

if (addReplyVariantBtn) {
  addReplyVariantBtn.addEventListener('click', () => {
    addReplyVariantInput('');
  });
}

// Trigger types & keywords
function toggleKeywordsVisibility() {
  let selected = 'all';
  triggerTypeRadios.forEach(r => { if (r.checked) selected = r.value; });
  if (keywordsContainer) {
    keywordsContainer.style.display = (selected === 'keywords') ? 'block' : 'none';
  }
}
triggerTypeRadios.forEach(r => r.addEventListener('change', toggleKeywordsVisibility));

if (keywordsInput) {
  keywordsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = keywordsInput.value.trim().toLowerCase().replace(',', '');
      if (val && !activeKeywords.includes(val)) {
        activeKeywords.push(val);
        renderKeywordBadges();
      }
      keywordsInput.value = '';
    }
  });
}

function renderKeywordBadges() {
  if (!keywordsBadges) return;
  keywordsBadges.innerHTML = '';
  activeKeywords.forEach((kw, index) => {
    const badge = document.createElement('span');
    badge.className = 'badge-chip';
    badge.innerHTML = `${escapeHtml(kw)} <i class="fa-solid fa-xmark remove-kw" data-index="${index}"></i>`;
    badge.querySelector('.remove-kw').addEventListener('click', () => {
      activeKeywords.splice(index, 1);
      renderKeywordBadges();
    });
    keywordsBadges.appendChild(badge);
  });
}

// DM Type change
function handleDmTypeChange() {
  if (!dmTypeSelect) return;
  const val = dmTypeSelect.value;
  if (mediaUrlContainer) {
    mediaUrlContainer.style.display = (val === 'image' || val === 'video' || val === 'text_image' || val === 'text_video') ? 'block' : 'none';
  }
}
if (dmTypeSelect) dmTypeSelect.addEventListener('change', () => {
  handleDmTypeChange();
  updateLivePreview();
});

/* ==========================================================
   4. LIVE INSTAGRAM PHONE PREVIEW (TAB 1)
   ========================================================== */
function initPreviewTabs() {
  const tabBtnComments = document.getElementById('tabBtnComments');
  const tabBtnDirect = document.getElementById('tabBtnDirect');
  const mockViewComments = document.getElementById('mockViewComments');
  const mockViewDirect = document.getElementById('mockViewDirect');

  if (tabBtnComments && tabBtnDirect) {
    tabBtnComments.addEventListener('click', () => {
      tabBtnComments.classList.add('active');
      tabBtnDirect.classList.remove('active');
      if (mockViewComments) mockViewComments.classList.add('active');
      if (mockViewDirect) mockViewDirect.classList.remove('active');
    });

    tabBtnDirect.addEventListener('click', () => {
      tabBtnDirect.classList.add('active');
      tabBtnComments.classList.remove('active');
      if (mockViewDirect) mockViewDirect.classList.add('active');
      if (mockViewComments) mockViewComments.classList.remove('active');
    });
  }
}

function updateLivePreview() {
  const mockReplyText = document.getElementById('mockReplyTextBubble');
  const mockDmText = document.getElementById('mockDmTextContent');
  const mockDmMedia = document.getElementById('mockDmMediaBubble');
  const mockDmMediaPrev = document.getElementById('mockDmMediaPreview');
  const mentionToggle = document.getElementById('mentionUserToggle');
  const shouldMention = mentionToggle ? mentionToggle.checked : true;

  // Preview reply with @mention
  const firstReplyInput = replyVariantsContainer ? replyVariantsContainer.querySelector('input') : null;
  if (mockReplyText && firstReplyInput) {
    let rawReply = firstReplyInput.value || 'Javobingizni lizingizga (DM) yubordik! 📩';
    if (rawReply.includes('{username}')) {
      rawReply = rawReply.replace(/\{username\}/gi, '@instatester');
    } else if (shouldMention) {
      rawReply = `@instatester ${rawReply}`;
    }
    mockReplyText.textContent = rawReply;
  }

  // Preview DM
  if (mockDmText && dmText) {
    let rawDm = dmText.value || 'Salom! Bizga kommentariya qoldirganingiz uchun rahmat.';
    rawDm = rawDm.replace(/\{username\}/gi, 'instatester');
    mockDmText.textContent = rawDm;
  }

  const dmType = dmTypeSelect ? dmTypeSelect.value : 'text';
  const mediaUrl = dmMediaUrl ? dmMediaUrl.value.trim() : '';

  if (mockDmMedia) {
    if (dmType === 'image' || dmType === 'video' || dmType === 'text_image' || dmType === 'text_video') {
      mockDmMedia.style.display = 'flex';
      if (mockDmMediaPrev) {
        if (mediaUrl) {
          mockDmMediaPrev.innerHTML = `<img src="${escapeHtml(mediaUrl)}" alt="DM Media" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src=''; this.parentElement.innerHTML='<i class=\\'fa-regular fa-image\\'></i>';">`;
        } else {
          mockDmMediaPrev.innerHTML = `<div class="media-placeholder-icon"><i class="fa-regular fa-image"></i></div>`;
        }
      }
    } else {
      mockDmMedia.style.display = 'none';
    }
  }
}

// Bind mention toggle change
const mentionToggleEl = document.getElementById('mentionUserToggle');
if (mentionToggleEl) {
  mentionToggleEl.addEventListener('change', updateLivePreview);
}

/* ==========================================================
   POST / REEL PICKER MODAL ENGINE
   ========================================================== */
window.switchPostPickerTab = function(tabName) {
  const btnGallery = document.getElementById('btnPostTabGallery');
  const btnUrl = document.getElementById('btnPostTabUrl');
  const viewGallery = document.getElementById('postPickerViewGallery');
  const viewUrl = document.getElementById('postPickerViewUrl');

  if (tabName === 'gallery') {
    if (btnGallery) btnGallery.classList.add('active');
    if (btnUrl) btnUrl.classList.remove('active');
    if (viewGallery) viewGallery.style.display = 'block';
    if (viewUrl) viewUrl.style.display = 'none';
  } else {
    if (btnUrl) btnUrl.classList.add('active');
    if (btnGallery) btnGallery.classList.remove('active');
    if (viewUrl) viewUrl.style.display = 'block';
    if (viewGallery) viewGallery.style.display = 'none';
  }
};

let cachedPickerPosts = [];

window.openPostPickerModal = async function() {
  const modal = document.getElementById('postPickerModal');
  const loading = document.getElementById('postPickerLoading');
  const grid = document.getElementById('postPickerGrid');
  const empty = document.getElementById('postPickerEmpty');
  const banner = document.getElementById('postPickerStatusBanner');
  const filterInput = document.getElementById('postSearchFilterInput');

  if (modal) modal.classList.add('open');
  if (filterInput) filterInput.value = '';
  switchPostPickerTab('gallery');

  if (loading) loading.style.display = 'block';
  if (grid) grid.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (banner) banner.style.display = 'none';

  try {
    const res = await authenticatedFetch('/api/meta/posts');
    const data = await res.json();

    if (loading) loading.style.display = 'none';

    if (res.ok && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
      cachedPickerPosts = data.posts;
      if (banner) {
        banner.style.display = 'block';
        if (data.isLive) {
          banner.innerHTML = `<div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 10px; padding: 0.6rem 0.85rem; font-size: 0.8rem; color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> 🟢 Sizning Instagram profilingizdagi jonli postlar (${data.posts.length} ta)</div>`;
        } else {
          banner.innerHTML = `<div style="background: rgba(0,242,254,0.1); border: 1px solid rgba(0,242,254,0.3); border-radius: 10px; padding: 0.6rem 0.85rem; font-size: 0.8rem; color: #00f2fe;"><i class="fa-solid fa-wand-magic-sparkles"></i> <strong>⚡ Namuna Postlar (Sinov uchun)</strong> — Jonli profilingiz chiqishi uchun Facebook Sahifangizga Instagramni ulang yoki yuqoridagi <strong>"Havola (URL)"</strong> bo'limiga post linkini tashlang.</div>`;
        }
      }

      if (grid) {
        grid.style.display = 'grid';
        renderPostPickerGrid(data.posts);
      }
    } else {
      if (empty) empty.style.display = 'block';
    }
  } catch (e) {
    if (loading) loading.style.display = 'none';
    if (empty) empty.style.display = 'block';
  }
};

window.filterPostPickerGrid = function(query) {
  const q = (query || '').trim().toLowerCase();
  const grid = document.getElementById('postPickerGrid');
  const empty = document.getElementById('postPickerEmpty');

  if (!q) {
    renderPostPickerGrid(cachedPickerPosts);
    if (grid) grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';
    return;
  }

  const filtered = cachedPickerPosts.filter(p => {
    const cap = (p.caption || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    return cap.includes(q) || id.includes(q);
  });

  if (filtered.length > 0) {
    renderPostPickerGrid(filtered);
    if (grid) grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';
  } else {
    if (grid) grid.style.display = 'none';
    if (empty) {
      empty.style.display = 'block';
      empty.innerHTML = `<p style="color: var(--text-muted);">"${escapeHtml(q)}" bo'yicha hech qanday post topilmadi.</p>`;
    }
  }
};

window.closePostPickerModal = function() {
  const modal = document.getElementById('postPickerModal');
  if (modal) modal.classList.remove('open');
};

function renderPostPickerGrid(posts) {
  const grid = document.getElementById('postPickerGrid');
  if (!grid) return;

  grid.innerHTML = posts.map(p => {
    const isVideo = p.mediaType === 'VIDEO';
    const typeIcon = isVideo ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-image"></i>';
    const thumb = p.thumbnailUrl || p.mediaUrl;
    const postDataEscaped = encodeURIComponent(JSON.stringify(p));

    return `
      <div class="insta-post-card" onclick="selectPostFromPicker('${postDataEscaped}')">
        <div class="insta-post-thumb-box">
          <img src="${escapeHtml(thumb)}" alt="Post Thumbnail" onerror="this.src=''; this.parentElement.innerHTML='<div style=\\'display:flex;height:100%;align-items:center;justify-content:center;color:#666;font-size:2rem;\\'>🎬</div>';">
          <div class="insta-post-type-icon">${typeIcon}</div>
        </div>
        <div class="insta-post-body">
          <div class="insta-post-caption">${escapeHtml(p.caption)}</div>
          <div class="insta-post-metrics">
            <span><i class="fa-regular fa-heart"></i> ${p.likeCount || 0}</span>
            <span><i class="fa-regular fa-comment"></i> ${p.commentsCount || 0}</span>
          </div>
          <button type="button" class="btn btn-primary btn-small btn-select-post">
            <i class="fa-solid fa-check"></i> Tanlash
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.selectPostFromPicker = function(encodedPostData) {
  try {
    const p = JSON.parse(decodeURIComponent(encodedPostData));
    selectedTargetMediaId = p.id;
    selectedTargetMediaUrl = p.permalink || '';
    selectedTargetMediaCaption = p.caption || '(Izohsiz post)';
    selectedTargetMediaThumbnail = p.thumbnailUrl || p.mediaUrl || '';

    renderSelectedPostDisplay();
    closePostPickerModal();
    alert(`✅ Post tanlandi: "${(p.caption || 'Tanlangan post').slice(0, 30)}..."`);
  } catch (e) {
    console.error('Error selecting post:', e);
  }
};

window.resolveAndSelectPostUrl = async function() {
  const urlInput = document.getElementById('directPostUrlInput');
  const btn = document.getElementById('btnResolveDirectUrl');
  const postUrl = urlInput ? urlInput.value.trim() : '';

  if (!postUrl) {
    alert('Iltimos, Instagram post yoki Reel havolasini kiriting!');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';

  try {
    const res = await authenticatedFetch('/api/meta/resolve-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postUrl })
    });
    const data = await res.json();

    if (res.ok && data.success && data.post) {
      selectedTargetMediaId = data.post.id;
      selectedTargetMediaUrl = data.post.permalink;
      selectedTargetMediaCaption = data.post.caption;
      selectedTargetMediaThumbnail = data.post.thumbnailUrl || '';

      renderSelectedPostDisplay();
      closePostPickerModal();
      if (urlInput) urlInput.value = '';
      alert(`✅ Post havolasi muvaffaqiyatli bog'landi! ID: ${data.post.id}`);
    } else {
      alert(data.message || 'Havolani tekshirishda xatolik.');
    }
  } catch (err) {
    alert('Tarmoq xatoligi.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Ushbu Postni Tanlash va Bog\'lash';
  }
};

window.selectManualPost = function() {
  const val = document.getElementById('manualPostIdInput').value.trim();
  if (!val) {
    alert('Iltimos, Post ID-ni kiriting!');
    return;
  }
  selectedTargetMediaId = val;
  selectedTargetMediaUrl = '';
  selectedTargetMediaCaption = `Qo'lda kiritilgan Post (ID: ${val})`;
  selectedTargetMediaThumbnail = '';

  renderSelectedPostDisplay();
  closePostPickerModal();
};

// Local simulation tester
const triggerTestBtn = document.getElementById('triggerTestBtn');
const testUsername = document.getElementById('testUsername');
const testComment = document.getElementById('testComment');
const testResultAlert = document.getElementById('testResultAlert');

if (triggerTestBtn) {
  triggerTestBtn.addEventListener('click', async () => {
    const user = testUsername ? testUsername.value.trim() : 'instatester';
    const comment = testComment ? testComment.value.trim() : 'narxi qancha?';

    triggerTestBtn.disabled = true;
    triggerTestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';

    try {
      const res = await authenticatedFetch('/api/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, comment: comment })
      });
      const data = await res.json();

      if (testResultAlert) {
        testResultAlert.style.display = 'block';
        if (res.ok && data.success) {
          testResultAlert.className = 'alert-box success';
          testResultAlert.innerHTML = `<strong>Muvaffaqiyatli!</strong> ${escapeHtml(data.message)}<br><small>Javob: "${escapeHtml(data.reply)}"</small>`;
        } else {
          testResultAlert.className = 'alert-box danger';
          testResultAlert.innerHTML = `<strong>Rad etildi:</strong> ${escapeHtml(data.message)}`;
        }
      }
      await loadStats();
      await loadLogs();
    } catch (err) {
      if (testResultAlert) {
        testResultAlert.style.display = 'block';
        testResultAlert.className = 'alert-box danger';
        testResultAlert.textContent = 'Test o\'tkazishda tarmoq xatoligi.';
      }
    } finally {
      triggerTestBtn.disabled = false;
      triggerTestBtn.innerHTML = '<i class="fa-solid fa-play"></i> Testni Ishga Tushirish';
    }
  });
}

/* ==========================================================
   5. GEMINI AI AGENT SETTINGS (TAB 2)
   ========================================================== */
const aiConfigForm = document.getElementById('aiConfigForm');
if (aiConfigForm) {
  aiConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = aiConfigForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saqlanmoqda...';

    const aiEnabled = document.getElementById('aiEnabledToggle').checked;
    const aiTone = document.getElementById('aiToneSelect').value;
    const aiSystemPrompt = document.getElementById('aiSystemPromptInput').value.trim();

    try {
      const res = await authenticatedFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled, aiTone, aiSystemPrompt })
      });
      if (res.ok) {
        alert('Gemini AI sozlamalari muvaffaqiyatli saqlandi! 🧠');
      } else {
        alert('AI sozlamalarini saqlashda xatolik yuz berdi.');
      }
    } catch (err) {
      alert('Tarmoq xatoligi.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> AI Sozlamalarini Saqlash';
    }
  });
}

/* ==========================================================
   6. BILLING & PAYMENT GATEWAY (TAB 3)
   ========================================================== */
async function loadBillingData() {
  try {
    const res = await authenticatedFetch('/api/billing/current');
    const data = await res.json();

    if (res.ok && data.success) {
      const sub = data.subscription || {};
      const tier = (sub.tier || 'free').toUpperCase();
      const expiresAt = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('uz-UZ') : 'Cheksiz';

      const tierTitle = document.getElementById('billingCurrentTierName');
      const expiryText = document.getElementById('billingExpiryDate');
      const usageText = document.getElementById('billingUsageNumbers');
      const usageFill = document.getElementById('billingUsageProgress');

      if (tierTitle) tierTitle.textContent = `${tier} Rejasi`;
      if (expiryText) expiryText.textContent = `Amal qilish muddati: ${expiresAt}`;

      const commentsCount = (data.usage && data.usage.commentsCount) ? data.usage.commentsCount : 14;
      const limit = (tier === 'PRO' || tier === 'BUSINESS') ? 'Cheksiz' : '100 ta';
      const pct = (tier === 'PRO' || tier === 'BUSINESS') ? 100 : Math.min(100, (commentsCount / 100) * 100);

      if (usageText) usageText.textContent = `${commentsCount} / ${limit}`;
      if (usageFill) usageFill.style.width = `${pct}%`;

      // Render Invoices Table
      renderInvoicesTable(sub.paymentHistory || []);
    }
  } catch (err) {
    console.error('Error loading billing:', err);
  }
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoicesTableBody');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Hozircha to\'lovlar mavjud emas.</td></tr>';
    return;
  }

  tbody.innerHTML = invoices.map(inv => `
    <tr>
      <td><code>${escapeHtml(inv.id)}</code></td>
      <td>${new Date(inv.date).toLocaleDateString('uz-UZ')}</td>
      <td><span class="admin-role-pill admin">${escapeHtml(inv.plan.toUpperCase())}</span></td>
      <td><span style="text-transform: uppercase; font-weight: 700;">${escapeHtml(inv.provider)}</span> (•• ${escapeHtml(inv.cardLast4 || '4455')})</td>
      <td><strong>${(inv.amount || 0).toLocaleString()} so'm</strong></td>
      <td><span class="status-active-pill"><i class="fa-solid fa-circle-check"></i> To'langan</span></td>
    </tr>
  `).join('');
}

// Payment Checkout Modal
window.openPaymentModal = function(plan = 'pro') {
  selectedCheckoutPlan = plan;
  const modal = document.getElementById('paymentModal');
  const title = document.getElementById('modalPlanTitle');
  const price = document.getElementById('modalPlanPrice');

  if (title) title.textContent = plan === 'business' ? 'Korporativ (AI) Reja' : 'Professional Reja';
  if (price) price.textContent = plan === 'business' ? '490,000 so\'m / oy' : '190,000 so\'m / oy';

  if (modal) modal.classList.add('open');
};

window.closePaymentModal = function() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.classList.remove('open');
};

function initPaymentProviders() {
  const pills = document.querySelectorAll('.provider-pill');
  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(item => item.classList.remove('active'));
      p.classList.add('active');
      selectedCheckoutProvider = p.dataset.provider || 'payme';
    });
  });

  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('paySubmitBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> To\'lov o\'tkazilmoqda...';

      const cardInput = document.getElementById('cardNumberInput');
      const cardLast4 = cardInput ? cardInput.value.slice(-4) : '4455';

      try {
        const res = await authenticatedFetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: selectedCheckoutPlan,
            provider: selectedCheckoutProvider,
            cardLast4: cardLast4
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          closePaymentModal();
          alert(`🎉 ${data.message}\nChek raqami: ${data.invoice.id}`);
          await loadUserProfile();
          await loadBillingData();
        } else {
          alert(data.message || 'To\'lovda xatolik yuz berdi.');
        }
      } catch (err) {
        alert('To\'lov tizimiga ulanishda xatolik.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock"></i> To\'lovni Tasdiqlash';
      }
    });
  }
}

/* ==========================================================
   7. ANALYTICS & LOGS (TAB 4)
   ========================================================== */
async function loadStats() {
  try {
    const res = await authenticatedFetch('/api/stats');
    if (!res.ok) return;
    const stats = await res.json();

    const statTotal = document.getElementById('statTotal');
    const statReplies = document.getElementById('statReplies');
    const statDMs = document.getElementById('statDMs');
    const statFailed = document.getElementById('statFailed');

    if (statTotal) statTotal.textContent = stats.totalComments || 0;
    if (statReplies) statReplies.textContent = stats.successReplies || 0;
    if (statDMs) statDMs.textContent = stats.successDMs || 0;
    if (statFailed) statFailed.textContent = stats.failedCount || 0;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadLogs() {
  try {
    const res = await authenticatedFetch('/api/logs');
    if (!res.ok) return;
    allLogs = await res.json();
    renderLogsTable(allLogs);
  } catch (err) {
    console.error('Error loading logs:', err);
  }
}

function renderLogsTable(logs) {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Hozircha faollik yo\'q.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
    const isSuccess = l.replyStatus === 'success' && l.dmStatus === 'success';
    const statusBadge = isSuccess
      ? '<span class="status-active-pill"><i class="fa-solid fa-check"></i> Yetkazildi</span>'
      : '<span class="status-blocked-pill"><i class="fa-solid fa-triangle-exclamation"></i> Xato</span>';

    return `
      <tr>
        <td>${timeStr}</td>
        <td><strong>@${escapeHtml(l.username || 'noma\'lum')}</strong></td>
        <td>${escapeHtml(l.commentText || '-')}</td>
        <td>${escapeHtml(l.replyText || '-')}</td>
        <td><span style="font-size: 0.75rem; text-transform: uppercase;">${escapeHtml(l.dmType || 'text')}</span></td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// Logs Search & Filter
const logsSearchInput = document.getElementById('logsSearchInput');
const logsStatusFilter = document.getElementById('logsStatusFilter');
const clearLogsBtn = document.getElementById('clearLogsBtn');

function filterLogs() {
  const query = logsSearchInput ? logsSearchInput.value.toLowerCase().trim() : '';
  const filter = logsStatusFilter ? logsStatusFilter.value : 'all';

  const filtered = allLogs.filter(log => {
    const matchesQuery = !query || (log.username && log.username.toLowerCase().includes(query)) || (log.commentText && log.commentText.toLowerCase().includes(query));
    let matchesStatus = true;
    if (filter === 'success') matchesStatus = (log.replyStatus === 'success' && log.dmStatus === 'success');
    if (filter === 'failed') matchesStatus = (log.replyStatus === 'failed' || log.dmStatus === 'failed');
    return matchesQuery && matchesStatus;
  });

  renderLogsTable(filtered);
}

if (logsSearchInput) logsSearchInput.addEventListener('input', filterLogs);
if (logsStatusFilter) logsStatusFilter.addEventListener('change', filterLogs);

if (clearLogsBtn) {
  clearLogsBtn.addEventListener('click', async () => {
    if (!confirm('Haqiqatan ham barcha loglarni tozalab tashlamoqchimisiz?')) return;
    try {
      const res = await authenticatedFetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        allLogs = [];
        renderLogsTable([]);
        await loadStats();
      }
    } catch (err) {
      alert('Loglarni tozalashda xatolik yuz berdi.');
    }
  });
}

/* ==========================================================
   8. SUPER ADMIN MANAGEMENT PANEL (TAB 5)
   ========================================================== */
async function loadAdminData() {
  try {
    // 1. Stats
    const statsRes = await authenticatedFetch('/api/admin/stats');
    const statsData = await statsRes.json();

    if (statsRes.ok && statsData.success) {
      const s = statsData.stats;
      document.getElementById('adminStatUsers').textContent = s.totalUsers || 0;
      document.getElementById('adminStatRevenue').textContent = `${(s.totalRevenue || 0).toLocaleString()} so'm`;
      document.getElementById('adminStatSubscriptions').textContent = s.activeSubscriptions || 0;
      document.getElementById('adminStatTotalLogs').textContent = s.totalCommentsProcessed || 0;
    }

    // 2. Users Table
    const usersRes = await authenticatedFetch('/api/admin/users');
    const usersData = await usersRes.json();

    if (usersRes.ok && usersData.success) {
      renderAdminUsersTable(usersData.users || []);
    }
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

const refreshAdminUsersBtn = document.getElementById('refreshAdminUsersBtn');
if (refreshAdminUsersBtn) {
  refreshAdminUsersBtn.addEventListener('click', loadAdminData);
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Foydalanuvchilar topilmadi.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const tier = (u.subscription && u.subscription.tier) ? u.subscription.tier.toUpperCase() : 'FREE';
    const roleBadge = u.role === 'admin' 
      ? '<span class="admin-role-pill admin">ADMIN</span>' 
      : '<span class="admin-role-pill user">USER</span>';
    const statusBadge = u.isActive !== false 
      ? '<span class="status-active-pill">Faol</span>' 
      : '<span class="status-blocked-pill">Bloklangan</span>';
    const pageId = (u.config && u.config.facebookPageId) ? u.config.facebookPageId : '<span style="color: #666;">Ulanmagan</span>';
    const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('uz-UZ') : '-';

    return `
      <tr>
        <td><strong>${escapeHtml(u.email)}</strong></td>
        <td>${roleBadge}</td>
        <td><span class="admin-role-pill admin">${tier}</span></td>
        <td><code>${pageId}</code></td>
        <td>${dateStr}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-secondary btn-small" onclick="openAdminTierModal('${u._id}', '${escapeHtml(u.email)}', '${tier.toLowerCase()}')" title="Tarifni o'zgartirish">
            <i class="fa-solid fa-pen"></i> Tarif
          </button>
          <button class="btn btn-secondary btn-small" onclick="toggleUserStatus('${u._id}', ${u.isActive !== false})" style="margin-left: 0.25rem;">
            ${u.isActive !== false ? '<i class="fa-solid fa-ban" style="color: #ef4444;"></i>' : '<i class="fa-solid fa-check" style="color: #10b981;"></i>'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Admin Change Tier Modal
window.openAdminTierModal = function(userId, email, currentTier) {
  selectedAdminEditUserId = userId;
  const modal = document.getElementById('adminTierModal');
  const emailText = document.getElementById('adminModalUserEmail');
  const selectTier = document.getElementById('adminSelectTier');

  if (emailText) emailText.textContent = `Foydalanuvchi: ${email}`;
  if (selectTier) selectTier.value = currentTier || 'free';
  if (modal) modal.classList.add('open');
};

window.closeAdminTierModal = function() {
  const modal = document.getElementById('adminTierModal');
  if (modal) modal.classList.remove('open');
};

const adminSaveTierBtn = document.getElementById('adminSaveTierBtn');
if (adminSaveTierBtn) {
  adminSaveTierBtn.addEventListener('click', async () => {
    if (!selectedAdminEditUserId) return;
    const tier = document.getElementById('adminSelectTier').value;

    adminSaveTierBtn.disabled = true;
    try {
      const res = await authenticatedFetch(`/api/admin/users/${selectedAdminEditUserId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        closeAdminTierModal();
        alert(data.message);
        await loadAdminData();
      } else {
        alert(data.message || 'Xatolik yuz berdi.');
      }
    } catch (err) {
      alert('Tarmoq xatoligi.');
    } finally {
      adminSaveTierBtn.disabled = false;
    }
  });
}

window.toggleUserStatus = async function(userId, currentActive) {
  const actionName = currentActive ? 'bloklamoqchimisiz' : 'faollashtirmoqchimisiz';
  if (!confirm(`Haqiqatan ham ushbu foydalanuvchini ${actionName}?`)) return;

  try {
    const res = await authenticatedFetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(data.message);
      await loadAdminData();
    }
  } catch (err) {
    alert('Holatni o\'zgartirishda xatolik.');
  }
};

/* ==========================================================
   9. SETTINGS & PASSWORD UPDATE (TAB 6)
   ========================================================= */
const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('newPassInput').value;
    const btn = changePasswordForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yangilanmoqda...';

    try {
      // Create a reset token request and apply it
      const forgotRes = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser ? currentUser.email : localStorage.getItem('userEmail') })
      });
      const forgotData = await forgotRes.json();

      if (forgotRes.ok && forgotData.resetToken) {
        const resetRes = await fetch(`/api/auth/reset-password/${forgotData.resetToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        });
        const resetData = await resetRes.json();

        if (resetRes.ok && resetData.success) {
          alert('Parolingiz muvaffaqiyatli yangilandi! 🔒');
          document.getElementById('newPassInput').value = '';
        } else {
          alert(resetData.message || 'Parolni o\'zgartirishda xatolik.');
        }
      } else {
        alert(forgotData.message || 'Xatolik yuz berdi.');
      }
    } catch (err) {
      alert('Tarmoq xatoligi.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> Parolni Saqlash';
    }
  });
}

/* ==========================================================
   10. THEME SWITCHER & UTILITIES
   ========================================================== */
function initThemeSwitcher() {
  const themeBtns = document.querySelectorAll('.theme-switcher-compact .theme-btn');
  const savedTheme = localStorage.getItem('theme') || 'theme-sunset';

  document.body.className = savedTheme;

  themeBtns.forEach(btn => {
    if (btn.dataset.theme === savedTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const chosenTheme = btn.dataset.theme;
      document.body.className = chosenTheme;
      localStorage.setItem('theme', chosenTheme);
    });
  });
}

function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Tizimdan chiqmoqchimisiz?')) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
      }
    });
  }
}

window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(inputId + '-eye');
  if (!input || !eye) return;

  if (input.type === 'password') {
    input.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

window.openGuideModal = function() {
  const modal = document.getElementById('guideModal');
  if (modal) modal.classList.add('open');
};

window.closeGuideModal = function() {
  const modal = document.getElementById('guideModal');
  if (modal) modal.classList.remove('open');
};
