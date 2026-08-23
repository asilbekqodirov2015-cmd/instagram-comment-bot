// State Management
let activeKeywords = [];

// DOM Elements
const configForm = document.getElementById('configForm');
const triggerTypeRadios = document.getElementsByName('triggerType');
const keywordsContainer = document.getElementById('keywordsContainer');
const keywordsInput = document.getElementById('keywordsInput');
const keywordsBadges = document.getElementById('keywordsBadges');
const commentReplyText = document.getElementById('commentReplyText');

const dmTypeSelect = document.getElementById('dmType');
const mediaUrlContainer = document.getElementById('mediaUrlContainer');
const dmTextContainer = document.getElementById('dmTextContainer');
const dmMediaUrl = document.getElementById('dmMediaUrl');
const dmText = document.getElementById('dmText');

const pageAccessToken = document.getElementById('pageAccessToken');
const verifyToken = document.getElementById('verifyToken');

const logsTableBody = document.getElementById('logsTableBody');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const testUsername = document.getElementById('testUsername');
const testComment = document.getElementById('testComment');
const triggerTestBtn = document.getElementById('triggerTestBtn');
const testResultAlert = document.getElementById('testResultAlert');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadLogs();
  
  // Start polling logs every 4 seconds
  setInterval(loadLogs, 4000);
  
  // Event Listeners for trigger type toggle
  triggerTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleKeywordsVisibility);
  });
  
  // Event Listener for DM type toggle
  dmTypeSelect.addEventListener('change', toggleDmFieldsVisibility);
  
  // Keyword badge inputs
  keywordsInput.addEventListener('keydown', handleKeywordInput);
  keywordsInput.addEventListener('blur', addKeywordFromInput);
  
  // Form submission
  configForm.addEventListener('submit', saveConfig);
  
  // Clear Logs
  clearLogsBtn.addEventListener('click', clearLogs);
  
  // Trigger mock webhook test
  triggerTestBtn.addEventListener('click', runWebhookTest);
});

// Load config from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    // Set fields
    pageAccessToken.value = config.pageAccessToken || '';
    verifyToken.value = config.verifyToken || '';
    commentReplyText.value = config.commentReplyText || '';
    
    // Set trigger type
    const triggerVal = config.triggerType || 'all';
    document.querySelector(`input[name="triggerType"][value="${triggerVal}"]`).checked = true;
    
    // Set keywords
    activeKeywords = config.keywords || [];
    renderKeywordBadges();
    toggleKeywordsVisibility();
    
    // Set DM settings
    dmTypeSelect.value = config.dmType || 'text';
    dmText.value = config.dmText || '';
    dmMediaUrl.value = config.dmMediaUrl || '';
    toggleDmFieldsVisibility();
    
  } catch (error) {
    console.error('Xatolik yuz berdi:', error);
    showNotification('Sozlamalarni yuklashda xatolik yuz berdi.', 'error');
  }
}

// Save config to server
async function saveConfig(e) {
  e.preventDefault();
  
  const triggerType = document.querySelector('input[name="triggerType"]:checked').value;
  
  const payload = {
    pageAccessToken: pageAccessToken.value.trim(),
    verifyToken: verifyToken.value.trim(),
    triggerType,
    keywords: activeKeywords,
    commentReplyText: commentReplyText.value,
    dmType: dmTypeSelect.value,
    dmText: dmText.value,
    dmMediaUrl: dmMediaUrl.value.trim()
  };
  
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    if (result.success) {
      showNotification('Sozlamalar muvaffaqiyatli saqlandi! ✔️', 'success');
    } else {
      showNotification('Xatolik: ' + result.message, 'error');
    }
  } catch (error) {
    showNotification('Tarmoq xatosi tufayli sozlamalarni saqlab bo\'lmadi.', 'error');
  }
}

// Load logs from server
async function loadLogs() {
  try {
    const response = await fetch('/api/logs');
    const logs = await response.json();
    
    renderLogs(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

// Render logs table
function renderLogs(logs) {
  if (!logs || logs.length === 0) {
    logsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Hozircha faollik tarixi bo'sh.</td>
      </tr>
    `;
    return;
  }
  
  logsTableBody.innerHTML = logs.map(log => {
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
    const response = await fetch('/api/logs/clear', { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      loadLogs();
      showNotification('Jurnallar tozalandi.', 'success');
    }
  } catch (error) {
    showNotification('Jurnallarni tozalab bo\'lmadi.', 'error');
  }
}

// Trigger Webhook Mock Test
async function runWebhookTest() {
  const username = testUsername.value.trim() || 'test_user';
  const text = testComment.value.trim() || 'narx';
  
  triggerTestBtn.disabled = true;
  triggerTestBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';
  
  const mockPayload = {
    object: 'instagram',
    entry: [
      {
        id: 'entry_id_' + Date.now(),
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
    
    // Hide alert after 8 seconds
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
  
  // Split on commas in case user pasted values
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
  // Create notification alert banner dynamically at top of screen
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
  
  // Add animation keyframes if not exist
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
