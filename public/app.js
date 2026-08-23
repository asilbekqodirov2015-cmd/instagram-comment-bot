// State Management
let activeKeywords = [];
let allLogs = [];

// Check Authentication
const token = localStorage.getItem('jwtToken');
if (!token) {
  window.location.href = 'login.html';
}

// Helper: Authenticated Fetch Wrapper
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
      // Session expired or unauthorized
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

// DOM Elements
const configForm = document.getElementById('configForm');
const triggerTypeRadios = document.getElementsByName('triggerType');
const keywordsContainer = document.getElementById('keywordsContainer');
const keywordsInput = document.getElementById('keywordsInput');
const keywordsBadges = document.getElementById('keywordsBadges');

const dmTypeSelect = document.getElementById('dmType');
const mediaUrlContainer = document.getElementById('mediaUrlContainer');
const dmTextContainer = document.getElementById('dmTextContainer');
const dmMediaUrl = document.getElementById('dmMediaUrl');
const dmText = document.getElementById('dmText');

const pageAccessToken = document.getElementById('pageAccessToken');
const verifyToken = document.getElementById('verifyToken');
const facebookPageId = document.getElementById('facebookPageId'); // Page ID element

const logsTableBody = document.getElementById('logsTableBody');
const logsSearchInput = document.getElementById('logsSearchInput');
const logsStatusFilter = document.getElementById('logsStatusFilter');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const testUsername = document.getElementById('testUsername');
const testComment = document.getElementById('testComment');
const triggerTestBtn = document.getElementById('triggerTestBtn');
const testResultAlert = document.getElementById('testResultAlert');

// Dynamic Inputs Elements
const replyVariantsContainer = document.getElementById('replyVariantsContainer');
const addReplyVariantBtn = document.getElementById('addReplyVariantBtn');

// Live Preview Elements
const tabBtnComments = document.getElementById('tabBtnComments');
const tabBtnDirect = document.getElementById('tabBtnDirect');
const mockViewComments = document.getElementById('mockViewComments');
const mockViewDirect = document.getElementById('mockViewDirect');
const mockReplyTextBubble = document.getElementById('mockReplyTextBubble');
const mockCommentReplyItem = document.getElementById('mockCommentReplyItem');
const mockDmMediaBubble = document.getElementById('mockDmMediaBubble');
const mockDmMediaPreview = document.getElementById('mockDmMediaPreview');
const mockDmTextBubble = document.getElementById('mockDmTextBubble');
const mockDmTextContent = document.getElementById('mockDmTextContent');

// Auth elements
const userEmailDisplay = document.getElementById('userEmailDisplay');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Display User Email
  const userEmail = localStorage.getItem('userEmail');
  if (userEmailDisplay) {
    userEmailDisplay.textContent = userEmail || 'Foydalanuvchi';
  }

  // Bind Logout Button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userEmail');
      window.location.href = 'login.html';
    });
  }

  // Load Theme Preference
  initTheme();

  // Load Initial Configurations and logs
  loadConfig();
  loadLogs();
  loadStats();
  
  // Start polling logs and stats every 4 seconds
  setInterval(() => {
    loadLogs();
    loadStats();
  }, 4000);
  
  // Event Listeners for trigger type toggle
  triggerTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleKeywordsVisibility);
  });
  
  // Event Listener for DM type toggle
  dmTypeSelect.addEventListener('change', () => {
    toggleDmFieldsVisibility();
    updateLivePreview();
  });
  
  // Live Preview input syncs
  dmText.addEventListener('input', updateLivePreview);
  dmMediaUrl.addEventListener('input', updateLivePreview);
  
  // Keyword badge inputs
  keywordsInput.addEventListener('keydown', handleKeywordInput);
  keywordsInput.addEventListener('blur', addKeywordFromInput);
  
  // Dynamic Reply add button
  addReplyVariantBtn.addEventListener('click', () => {
    addReplyInput('');
    updateLivePreview();
  });

  // Preview Tabs Switcher
  tabBtnComments.addEventListener('click', () => switchPreviewTab('comments'));
  tabBtnDirect.addEventListener('click', () => switchPreviewTab('direct'));

  // Log Search and Filter Event Listeners
  logsSearchInput.addEventListener('input', filterAndRenderLogs);
  logsStatusFilter.addEventListener('change', filterAndRenderLogs);
  
  // Form submission
  configForm.addEventListener('submit', saveConfig);
  
  // Clear Logs
  clearLogsBtn.addEventListener('click', clearLogs);
  
  // Trigger mock webhook test
  triggerTestBtn.addEventListener('click', runWebhookTest);
});

// --- THEME MANAGEMENT ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'theme-sunset';
  document.body.className = savedTheme;
  
  // Mark active theme button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-theme') === savedTheme) {
      btn.classList.add('active');
    }
    
    // Bind click listener
    btn.addEventListener('click', (e) => {
      const selectedTheme = e.target.getAttribute('data-theme');
      document.body.className = selectedTheme;
      localStorage.setItem('theme', selectedTheme);
      
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
}

// --- DYNAMIC REPLY INPUTS ---
function addReplyInput(text = '') {
  const row = document.createElement('div');
  row.className = 'reply-variant-row';
  
  row.innerHTML = `
    <input type="text" class="reply-input" placeholder="Javob matni varianti..." value="${escapeHtml(text)}" required>
    <button type="button" class="btn-remove-variant" title="O'chirish">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  
  // Bind change events to sync preview dynamically
  const input = row.querySelector('.reply-input');
  input.addEventListener('input', updateLivePreview);
  
  // Bind remove button
  row.querySelector('.btn-remove-variant').addEventListener('click', () => {
    row.remove();
    updateLivePreview();
  });
  
  replyVariantsContainer.appendChild(row);
}

function getReplyVariants() {
  const inputs = replyVariantsContainer.querySelectorAll('.reply-input');
  return Array.from(inputs).map(inp => inp.value.trim()).filter(val => val.length > 0);
}

// --- LIVE PREVIEW RENDERING ---
function switchPreviewTab(tab) {
  if (tab === 'comments') {
    tabBtnComments.classList.add('active');
    tabBtnDirect.classList.remove('active');
    mockViewComments.classList.add('active');
    mockViewDirect.classList.remove('active');
  } else {
    tabBtnComments.classList.remove('active');
    tabBtnDirect.classList.add('active');
    mockViewComments.classList.remove('active');
    mockViewDirect.classList.add('active');
  }
}

function updateLivePreview() {
  // 1. Comment Reply Preview
  const variants = getReplyVariants();
  const firstVariant = variants.length > 0 ? variants[0] : 'Javobingizni lizingizga (DM) yubordik! 📩';
  mockReplyTextBubble.textContent = firstVariant;

  // Add a slight pop animation when preview text changes
  mockCommentReplyItem.style.animation = 'none';
  // Trigger reflow
  void mockCommentReplyItem.offsetWidth;
  mockCommentReplyItem.style.animation = 'replyPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

  // 2. DM Preview
  const type = dmTypeSelect.value;
  const textValue = dmText.value.trim() || "Salom! So'ragan ma'lumotingiz yuborildi.";
  const mediaUrlValue = dmMediaUrl.value.trim();

  // Reset displays
  mockDmMediaBubble.style.display = 'none';
  mockDmTextBubble.style.display = 'none';

  if (type === 'text') {
    mockDmTextBubble.style.display = 'flex';
    mockDmTextContent.textContent = textValue;
  } else if (type === 'image') {
    mockDmMediaBubble.style.display = 'flex';
    renderMediaPreview('image', mediaUrlValue);
  } else if (type === 'video') {
    mockDmMediaBubble.style.display = 'flex';
    renderMediaPreview('video', mediaUrlValue);
  } else if (type === 'text_image') {
    mockDmMediaBubble.style.display = 'flex';
    mockDmTextBubble.style.display = 'flex';
    renderMediaPreview('image', mediaUrlValue);
    mockDmTextContent.textContent = textValue;
  } else if (type === 'text_video') {
    mockDmMediaBubble.style.display = 'flex';
    mockDmTextBubble.style.display = 'flex';
    renderMediaPreview('video', mediaUrlValue);
    mockDmTextContent.textContent = textValue;
  }
}

function renderMediaPreview(type, url) {
  if (!url) {
    mockDmMediaPreview.innerHTML = `
      <div class="media-placeholder-icon">
        <i class="fa-regular fa-${type === 'image' ? 'image' : 'file-video'}"></i>
      </div>
    `;
    return;
  }

  if (type === 'image') {
    mockDmMediaPreview.innerHTML = `<img src="${escapeHtml(url)}" onerror="handleMediaError(this, 'image')">`;
  } else {
    mockDmMediaPreview.innerHTML = `<video src="${escapeHtml(url)}" muted loop autoplay playsinline onerror="handleMediaError(this, 'video')"></video>`;
  }
}

function handleMediaError(element, type) {
  element.style.display = 'none';
  element.parentNode.innerHTML = `
    <div class="media-placeholder-icon" style="color: var(--danger);">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
  `;
}

// --- CONFIGURATION LOGIC ---

// Load config from server
async function loadConfig() {
  try {
    const response = await authenticatedFetch('/api/config');
    const config = await response.json();
    
    // Set fields
    facebookPageId.value = config.facebookPageId || '';
    pageAccessToken.value = config.pageAccessToken || '';
    verifyToken.value = config.verifyToken || '';
    
    // Set trigger type
    const triggerVal = config.triggerType || 'all';
    document.querySelector(`input[name="triggerType"][value="${triggerVal}"]`).checked = true;
    
    // Set keywords
    activeKeywords = config.keywords || [];
    renderKeywordBadges();
    toggleKeywordsVisibility();
    
    // Load reply variants
    replyVariantsContainer.innerHTML = '';
    const replies = config.commentReplies || [config.commentReplyText || 'Javobingizni lizingizga (DM) yubordik! 📩'];
    replies.forEach(rep => addReplyInput(rep));
    
    // Set DM settings
    dmTypeSelect.value = config.dmType || 'text';
    dmText.value = config.dmText || '';
    dmMediaUrl.value = config.dmMediaUrl || '';
    toggleDmFieldsVisibility();

    // Trigger Initial Preview Draw
    updateLivePreview();
    
  } catch (error) {
    console.error('Error loading config:', error);
    showNotification('Sozlamalarni yuklashda xatolik yuz berdi.', 'error');
  }
}

// Save config to server
async function saveConfig(e) {
  e.preventDefault();
  
  const triggerType = document.querySelector('input[name="triggerType"]:checked').value;
  const commentReplies = getReplyVariants();
  
  const payload = {
    facebookPageId: facebookPageId.value.trim(),
    pageAccessToken: pageAccessToken.value.trim(),
    verifyToken: verifyToken.value.trim(),
    triggerType,
    keywords: activeKeywords,
    commentReplyText: commentReplies.length > 0 ? commentReplies[0] : 'Javobingizni lizingizga (DM) yubordik! 📩',
    commentReplies,
    dmType: dmTypeSelect.value,
    dmText: dmText.value,
    dmMediaUrl: dmMediaUrl.value.trim()
  };
  
  try {
    const response = await authenticatedFetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    if (result.success) {
      showNotification('Sozlamalar muvaffaqiyatli saqlandi! ✔️', 'success');
      loadStats();
    } else {
      showNotification('Xatolik: ' + result.message, 'error');
    }
  } catch (error) {
    showNotification('Tarmoq xatosi tufayli sozlamalarni saqlab bo\'lmadi.', 'error');
  }
}

// --- STATS LOGIC ---
async function loadStats() {
  try {
    const response = await authenticatedFetch('/api/stats');
    const stats = await response.json();
    
    // Update dashboard numbers
    updateStatsCounter('statTotal', stats.totalComments);
    updateStatsCounter('statReplies', stats.successReplies);
    updateStatsCounter('statDMs', stats.successDMs);
    updateStatsCounter('statFailed', stats.failedCount);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateStatsCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  const startVal = parseInt(el.textContent) || 0;
  if (startVal === targetValue) return;

  // Small increment animation
  const duration = 800; // ms
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing formula
    const easeProgress = progress * (2 - progress);
    const currentVal = Math.floor(startVal + (targetValue - startVal) * easeProgress);
    
    el.textContent = currentVal;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      el.textContent = targetValue;
    }
  }
  requestAnimationFrame(animate);
}

// --- LOGGING AND FILTERING LOGIC ---

// Load logs from server
async function loadLogs() {
  try {
    const response = await authenticatedFetch('/api/logs');
    allLogs = await response.json();
    
    filterAndRenderLogs();
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

// Filter and render logs table
function filterAndRenderLogs() {
  const searchText = logsSearchInput.value.trim().toLowerCase();
  const statusFilter = logsStatusFilter.value;
  
  const filtered = allLogs.filter(log => {
    // 1. Search Query filter (matches username or comment text)
    const matchesSearch = 
      log.commenterUsername.toLowerCase().includes(searchText) || 
      log.commentText.toLowerCase().includes(searchText);
      
    // 2. Status Select filter
    let matchesStatus = true;
    if (statusFilter === 'success') {
      matchesStatus = log.replyStatus === 'success' && log.dmStatus === 'success';
    } else if (statusFilter === 'failed') {
      matchesStatus = log.replyStatus === 'failed' || log.dmStatus === 'failed';
    }
    
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    logsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Saralash shartlariga mos faollik tarixi topilmadi.</td>
      </tr>
    `;
    return;
  }
  
  logsTableBody.innerHTML = filtered.map(log => {
    const timeStr = formatTimestamp(log.timestamp);
    const replyClass = log.replyStatus === 'success' ? 'success' : (log.replyStatus === 'failed' ? 'failed' : 'skipped');
    const dmClass = log.dmStatus === 'success' ? 'success' : (log.dmStatus === 'failed' ? 'failed' : 'pending');
    
    let statusText = 'Muvaffaqiyatli';
    let statusClass = 'success';
    
    if (log.replyStatus === 'failed' || log.dmStatus === 'failed') {
      statusText = 'Xatolik bor';
      statusClass = 'failed';
    }
    
    return `
      <tr>
        <td><span class="log-time">${timeStr}</span></td>
        <td><span class="log-user">@${log.commenterUsername}</span></td>
        <td><div class="log-comment" title="${log.commentText}">${log.commentText}</div></td>
        <td><span class="status-badge ${replyClass}">${log.replyStatus}</span></td>
        <td><span class="status-badge ${dmClass}">${log.dmStatus}</span></td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
          ${log.error ? `<div class="log-error-col error-text" title="${log.error}">${log.error}</div>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// Clear logs
async function clearLogs() {
  if (!confirm('Haqiqatdan ham barcha jurnallarni tozalab tashlamoqchimisiz?')) return;
  
  try {
    const response = await authenticatedFetch('/api/logs/clear', { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      loadLogs();
      loadStats();
      showNotification('Jurnallar tozalandi.', 'success');
    }
  } catch (error) {
    showNotification('Jurnallarni tozalab bo\'lmadi.', 'error');
  }
}

// Trigger Webhook Mock Test (Routed dynamic SaaS payload)
async function runWebhookTest() {
  const username = testUsername.value.trim() || 'test_user';
  const text = testComment.value.trim() || 'narx';
  const activePageId = facebookPageId.value.trim();

  if (!activePageId) {
    alert('Simulyatsiya qilish uchun avval Facebook Page ID maydonini to\'ldiring va sozlamalarni saqlang.');
    return;
  }
  
  triggerTestBtn.disabled = true;
  triggerTestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';
  
  const mockPayload = {
    object: 'instagram',
    entry: [
      {
        id: activePageId, // Uses the user's configured Page ID to test routing
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'comments',
            value: {
              from: {
                id: 'mock_commenter_id_999',
                username: username
              },
              id: 'mock_comment_id_' + Math.random().toString(36).substr(2, 9),
              text: text,
              media: {
                id: 'mock_media_id_555'
              }
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch('/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload)
    });
    
    if (response.ok) {
      testResultAlert.style.display = 'block';
      testResultAlert.className = 'alert-box success';
      testResultAlert.innerHTML = `<strong>Muvaffaqiyatli:</strong> Test xabari yuborildi! Sahifani tekshiring, jurnalda yangi yozuv paydo bo'lishi kerak.`;
      loadLogs();
      loadStats();
    } else {
      testResultAlert.style.display = 'block';
      testResultAlert.className = 'alert-box error';
      testResultAlert.innerHTML = `<strong>Xatolik:</strong> Server webhookni qabul qilmadi. Xato kodi: ${response.status}`;
    }
  } catch (error) {
    testResultAlert.style.display = 'block';
    testResultAlert.className = 'alert-box error';
    testResultAlert.innerHTML = `<strong>Xatolik:</strong> Tarmoq ulanishida muammo yuz berdi.`;
  } finally {
    triggerTestBtn.disabled = false;
    triggerTestBtn.innerHTML = '<i class="fa-solid fa-play"></i> Testni Ishga Tushirish';
    
    setTimeout(() => {
      testResultAlert.style.display = 'none';
    }, 8000);
  }
}

// Toggle Visibility Helpers
function toggleKeywordsVisibility() {
  const selectedType = document.querySelector('input[name="triggerType"]:checked').value;
  if (selectedType === 'keywords') {
    keywordsContainer.style.display = 'block';
  } else {
    keywordsContainer.style.display = 'none';
  }
}

function toggleDmFieldsVisibility() {
  const type = dmTypeSelect.value;
  
  // Reset visibility
  mediaUrlContainer.style.display = 'none';
  dmTextContainer.style.display = 'none';
  
  if (type === 'text') {
    dmTextContainer.style.display = 'block';
  } else if (type === 'image' || type === 'video') {
    mediaUrlContainer.style.display = 'block';
  } else if (type === 'text_image' || type === 'text_video') {
    mediaUrlContainer.style.display = 'block';
    dmTextContainer.style.display = 'block';
  }
}

// Keyword tags input management
function handleKeywordInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addKeywordFromInput();
  }
}

function addKeywordFromInput() {
  const val = keywordsInput.value.trim();
  if (!val) return;
  
  const tags = val.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  
  tags.forEach(tag => {
    if (!activeKeywords.includes(tag)) {
      activeKeywords.push(tag);
    }
  });
  
  keywordsInput.value = '';
  renderKeywordBadges();
}

function removeKeyword(keyword) {
  activeKeywords = activeKeywords.filter(k => k !== keyword);
  renderKeywordBadges();
}

function renderKeywordBadges() {
  keywordsBadges.innerHTML = activeKeywords.map(keyword => `
    <span class="badge">
      ${keyword}
      <i class="fa-solid fa-xmark remove-tag" onclick="removeKeyword('${keyword}')"></i>
    </span>
  `).join('');
}

// Helper password visibility
function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  const eye = document.getElementById(fieldId + '-eye');
  if (field.type === 'password') {
    field.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    field.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
}

// Helper formatting timestamp
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const pad = (n) => n.toString().padStart(2, '0');
  
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear().toString().substr(-2);
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
}

// Helper show custom alert notification
function showNotification(message, type) {
  const toast = document.createElement('div');
  toast.className = `alert-box ${type}`;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '1000';
  toast.style.marginTop = '0';
  toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
  toast.style.minWidth = '300px';
  toast.style.animation = 'slideIn 0.3s ease-out';
  
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> &nbsp; ${message}`;
  
  if (!document.getElementById('toast-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-styles';
    styleSheet.innerHTML = `
      @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      toast.remove();
    }, 280);
  }, 4000);
}

// Helper escape HTML strings
function escapeHtml(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(string).replace(/[&<>"']/g, function(m) { return map[m]; });
}
