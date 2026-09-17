// Whitelist Admin Dashboard Controller (shadcn/ui & Morphicon Edition)
const defaultOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file:'))
    ? window.location.origin
    : 'http://103.186.30.230';
let serverUrl = localStorage.getItem('ricoh_server_url') || defaultOrigin;
let adminSecret = localStorage.getItem('ricoh_admin_secret') || '';

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const serverUrlInput = document.getElementById('server-url-input');
const secretInput = document.getElementById('admin-secret-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const connectedServerLabel = document.getElementById('connected-server-label');

const navItems = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const pageTitle = document.getElementById('page-title');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');

const openGenModalBtn = document.getElementById('open-gen-modal-btn');
const genModal = document.getElementById('gen-modal');
const closeGenModal = document.getElementById('close-gen-modal');
const genKeyForm = document.getElementById('gen-key-form');
const genResult = document.getElementById('gen-result');
const genKeysList = document.getElementById('gen-keys-list');

const keysTableBody = document.getElementById('keys-table-body');
const keysSearchInput = document.getElementById('keys-search-input');
const keysStatusFilter = document.getElementById('keys-status-filter');
const keysTierFilter = document.getElementById('keys-tier-filter');

const globalKeyForm = document.getElementById('global-key-form');
const gkEnableSwitch = document.getElementById('gk-enable-switch');
const gkKeyInput = document.getElementById('gk-key-input');
const gkFeaturesInput = document.getElementById('gk-features-input');
const gkNoteInput = document.getElementById('gk-note-input');
const copyGlobalKeyBtn = document.getElementById('copy-global-key-btn');

const logsTableBody = document.getElementById('logs-table-body');

// Confirm Modal Elements
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmAcceptBtn = document.getElementById('confirm-accept-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const closeConfirmModal = document.getElementById('close-confirm-modal');

// Toast Notification Container
const toastContainer = document.getElementById('toast-container');

// Set initial input values
if (serverUrl && serverUrlInput) serverUrlInput.value = serverUrl;

// Clean base URL
function getBaseUrl() {
    let url = (serverUrl || '').trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    return url;
}

// --------------------------------------------------------------------------
// shadcn/ui Toast Notification System
// --------------------------------------------------------------------------
function showToast({ title, message = '', type = 'info', duration = 3500 }) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="morph-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-500)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="morph-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--rose-500)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
        iconSvg = `<svg class="morph-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <div style="flex-shrink:0; margin-top:2px;">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').onclick = () => removeToast(toast);
    toastContainer.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
}

function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.95)';
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
}

// --------------------------------------------------------------------------
// shadcn/ui Modal Confirmation Dialog
// --------------------------------------------------------------------------
let confirmResolve = null;

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        confirmModalTitle.textContent = title;
        confirmModalMessage.textContent = message;
        confirmModal.classList.add('active');
    });
}

function closeConfirm(result) {
    confirmModal.classList.remove('active');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}

confirmAcceptBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
closeConfirmModal.addEventListener('click', () => closeConfirm(false));

// --------------------------------------------------------------------------
// API Calls & Authentication
// --------------------------------------------------------------------------
async function apiCall(endpoint, method = 'GET', body = null) {
    const fullUrl = `${getBaseUrl()}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(fullUrl, options);
    if (res.status === 401) {
        showLogin();
        throw new Error('Unauthorized');
    }
    return res.json();
}

function showLogin() {
    loginModal.classList.add('active');
}

function hideLogin() {
    loginModal.classList.remove('active');
    try {
        const u = new URL(getBaseUrl());
        connectedServerLabel.textContent = `${u.hostname}:${u.port || '80'}`;
    } catch {
        connectedServerLabel.textContent = 'Connected';
    }
}

async function initAuth() {
    if (!adminSecret || !serverUrl) {
        showLogin();
        return;
    }

    try {
        const res = await apiCall('/api/v1/admin/auth/verify', 'POST');
        if (res.success) {
            hideLogin();
            loadOverview();
            showToast({ title: 'Connected', message: 'Successfully authenticated with VPS backend', type: 'success' });
        } else {
            showLogin();
        }
    } catch {
        showLogin();
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    serverUrl = serverUrlInput.value.trim();
    adminSecret = secretInput.value.trim();
    loginError.classList.add('hidden');

    try {
        const res = await apiCall('/api/v1/admin/auth/verify', 'POST');
        if (res.success) {
            localStorage.setItem('ricoh_server_url', serverUrl);
            localStorage.setItem('ricoh_admin_secret', adminSecret);
            hideLogin();
            loadOverview();
            showToast({ title: 'Welcome Back', message: 'Dashboard unlocked successfully.', type: 'success' });
        } else {
            loginError.textContent = 'Invalid secret password or rejected by server.';
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        loginError.textContent = `Connection failed: Could not reach ${serverUrl}. Ensure the VPS API server is online and CORS is allowed.`;
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ricoh_admin_secret');
    adminSecret = '';
    showToast({ title: 'Disconnected', message: 'Admin session terminated.', type: 'info' });
    showLogin();
});

// --------------------------------------------------------------------------
// Tab Navigation
// --------------------------------------------------------------------------
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        const tab = item.getAttribute('data-tab');
        const activePanel = document.getElementById(`tab-${tab}`);
        if (activePanel) activePanel.classList.add('active');

        const titles = {
            'overview': 'Dashboard Overview',
            'keys': 'License Keys Management',
            'global-key': 'Global Key Configuration',
            'logs': 'Verification Activity Logs'
        };
        pageTitle.textContent = titles[tab] || 'Dashboard';

        if (tab === 'overview') loadOverview();
        if (tab === 'keys') loadKeys();
        if (tab === 'global-key') loadGlobalKey();
        if (tab === 'logs') loadLogs();
    });
});

// Refresh button handler
refreshBtn.addEventListener('click', async () => {
    refreshIcon.style.transition = 'transform 0.6s ease';
    refreshIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        refreshIcon.style.transition = 'none';
        refreshIcon.style.transform = 'rotate(0deg)';
    }, 600);

    const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || 'overview';
    if (activeTab === 'overview') await loadOverview();
    if (activeTab === 'keys') await loadKeys();
    if (activeTab === 'global-key') await loadGlobalKey();
    if (activeTab === 'logs') await loadLogs();

    showToast({ title: 'Refreshed', message: 'Dashboard telemetry updated', type: 'info', duration: 2000 });
});

// --------------------------------------------------------------------------
// 1. Overview Tab & Charts Visualization
// --------------------------------------------------------------------------
let activityChartInstance = null;
let statusChartInstance = null;
let tierChartInstance = null;

function renderOverviewCharts(stats) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js library not loaded.');
        return;
    }

    Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
    Chart.defaults.color = '#a1a1aa';

    renderActivityChart(stats);
    renderStatusChart(stats);
    renderTierChart(stats);
}

function renderActivityChart(stats) {
    const canvas = document.getElementById('overview-activity-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let timeline = stats.activityTimeline;
    if (!timeline || !timeline.length) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        timeline = days.map((d, i) => ({
            label: d,
            verificationsSuccess: Math.max(0, Math.round((stats.recentLogsCount || 0) * (0.2 + i * 0.1))),
            verificationsFailed: 0,
            keysCreated: i === 6 ? (stats.totalKeys || 0) : 0
        }));
    }

    const labels = timeline.map(t => t.label || t.date);
    const successData = timeline.map(t => t.verificationsSuccess || 0);
    const deniedData = timeline.map(t => t.verificationsFailed || 0);
    const keysCreatedData = timeline.map(t => t.keysCreated || 0);

    const gradSuccess = ctx.createLinearGradient(0, 0, 0, 240);
    gradSuccess.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradSuccess.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const gradDenied = ctx.createLinearGradient(0, 0, 0, 240);
    gradDenied.addColorStop(0, 'rgba(244, 63, 94, 0.35)');
    gradDenied.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    const gradKeys = ctx.createLinearGradient(0, 0, 0, 240);
    gradKeys.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
    gradKeys.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    if (activityChartInstance) {
        activityChartInstance.destroy();
    }

    activityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Success Verifications',
                    data: successData,
                    borderColor: '#10b981',
                    backgroundColor: gradSuccess,
                    borderWidth: 2.2,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10b981'
                },
                {
                    label: 'Denied Attempts',
                    data: deniedData,
                    borderColor: '#f43f5e',
                    backgroundColor: gradDenied,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f43f5e'
                },
                {
                    label: 'Keys Created',
                    data: keysCreatedData,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradKeys,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#8b5cf6'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    titleColor: '#ffffff',
                    bodyColor: '#d4d4d8',
                    padding: 10,
                    boxPadding: 4,
                    cornerRadius: 8,
                    usePointStyle: true
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#71717a', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 5,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#71717a',
                        font: { size: 11 },
                        precision: 0
                    }
                }
            }
        }
    });
}

function renderStatusChart(stats) {
    const canvas = document.getElementById('overview-status-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const statusData = stats.statusBreakdown || {
        active: stats.activeKeys || 0,
        expired: 0,
        revoked: 0
    };

    const active = statusData.active || 0;
    const expired = statusData.expired || 0;
    const revoked = statusData.revoked || 0;
    const total = active + expired + revoked;

    const activePct = total > 0 ? Math.round((active / total) * 100) : (stats.activeKeys ? 100 : 0);
    const activePctElem = document.getElementById('chart-active-pct');
    if (activePctElem) activePctElem.textContent = `${activePct}%`;

    const elActive = document.getElementById('legend-status-active');
    const elExpired = document.getElementById('legend-status-expired');
    const elRevoked = document.getElementById('legend-status-revoked');
    if (elActive) elActive.textContent = active;
    if (elExpired) elExpired.textContent = expired;
    if (elRevoked) elRevoked.textContent = revoked;

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    const chartValues = (total === 0) ? [1] : [active, expired, revoked];
    const chartColors = (total === 0)
        ? ['rgba(255, 255, 255, 0.1)']
        : ['#10b981', '#f59e0b', '#f43f5e'];

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: total === 0 ? ['No Data'] : ['Active', 'Expired', 'Revoked'],
            datasets: [{
                data: chartValues,
                backgroundColor: chartColors,
                borderColor: 'hsl(240, 10%, 4.9%)',
                borderWidth: 3,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '74%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: total > 0,
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            }
        }
    });
}

function renderTierChart(stats) {
    const canvas = document.getElementById('overview-tier-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const tierData = stats.tierBreakdown || {};
    const premium = tierData['premium'] || stats.activeKeys || 0;
    const other = Math.max(0, (stats.totalKeys || 0) - premium);
    const claimed = stats.claimedKeys || 0;
    const total = stats.totalKeys || 0;

    const claimedPct = total > 0 ? Math.round((claimed / total) * 100) : 0;
    const claimedPctElem = document.getElementById('chart-claimed-pct');
    if (claimedPctElem) claimedPctElem.textContent = `${claimedPct}%`;

    const elPremium = document.getElementById('legend-tier-premium');
    const elOther = document.getElementById('legend-tier-other');
    const elClaimed = document.getElementById('legend-tier-claimed');
    if (elPremium) elPremium.textContent = premium;
    if (elOther) elOther.textContent = other;
    if (elClaimed) elClaimed.textContent = claimed;

    if (tierChartInstance) {
        tierChartInstance.destroy();
    }

    const chartValues = (total === 0) ? [1] : [premium, other];
    const chartColors = (total === 0)
        ? ['rgba(255, 255, 255, 0.1)']
        : ['#8b5cf6', '#3b82f6'];

    tierChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: total === 0 ? ['No Keys'] : ['Premium Tier', 'Other Tiers'],
            datasets: [{
                data: chartValues,
                backgroundColor: chartColors,
                borderColor: 'hsl(240, 10%, 4.9%)',
                borderWidth: 3,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '74%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: total > 0,
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            }
        }
    });
}

async function loadOverview() {
    try {
        const res = await apiCall('/api/v1/admin/stats');
        if (res.success && res.stats) {
            document.getElementById('stat-total-keys').textContent = res.stats.totalKeys;
            document.getElementById('stat-active-keys').textContent = res.stats.activeKeys;
            document.getElementById('stat-claimed-keys').textContent = res.stats.claimedKeys;
            document.getElementById('stat-bindings').textContent = res.stats.totalBindings;

            const pill = document.getElementById('overview-global-pill');
            const codeBox = document.getElementById('overview-global-key-code');
            codeBox.textContent = res.stats.globalKeyName || 'GLOBAL-FREE-2026';

            if (res.stats.globalKeyEnabled) {
                pill.textContent = 'Global Key: Active';
                pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                pill.style.color = 'var(--emerald-500)';
            } else {
                pill.textContent = 'Global Key: Disabled';
                pill.style.borderColor = 'rgba(244, 63, 94, 0.4)';
                pill.style.color = 'var(--rose-500)';
            }

            // Render Overview Charts
            renderOverviewCharts(res.stats);
        }
    } catch (err) {
        console.error('Failed to load overview:', err);
    }
}

// Copy Global Key
if (copyGlobalKeyBtn) {
    copyGlobalKeyBtn.addEventListener('click', () => {
        const codeBox = document.getElementById('overview-global-key-code');
        const key = codeBox.textContent.trim();
        navigator.clipboard.writeText(key);

        const btnSpan = copyGlobalKeyBtn.querySelector('span');
        const originalText = btnSpan.textContent;
        btnSpan.textContent = 'Copied!';
        copyGlobalKeyBtn.classList.add('copy-success-icon');
        showToast({ title: 'Copied to Clipboard', message: `Global key "${key}" ready to paste`, type: 'success' });

        setTimeout(() => {
            btnSpan.textContent = originalText;
            copyGlobalKeyBtn.classList.remove('copy-success-icon');
        }, 2000);
    });
}

// --------------------------------------------------------------------------
// 2. Keys Tab
// --------------------------------------------------------------------------
async function loadKeys() {
    keysTableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem; color: hsl(var(--muted-foreground));">Loading keys...</td></tr>';
    const search = keysSearchInput.value.trim();
    const status = keysStatusFilter.value;
    const tier = keysTierFilter.value;

    const url = `/api/v1/admin/keys?search=${encodeURIComponent(search)}&status=${status}&tier=${tier}`;
    try {
        const res = await apiCall(url);
        if (!res.success || !res.keys.length) {
            keysTableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem; color: hsl(var(--muted-foreground));">No matching keys found.</td></tr>';
            return;
        }

        keysTableBody.innerHTML = res.keys.map(k => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <strong class="font-mono">${k.keyPrefix}</strong>
                        <button class="btn-action-ghost" style="padding: 2px 6px;" onclick="copyText('${k.keyPrefix}')" title="Copy Prefix">
                            <svg class="morph-icon-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                </td>
                <td><span class="badge ${k.tier}">${k.tier}</span></td>
                <td><span class="badge ${k.status}">${k.status}</span></td>
                <td>${k.discordId ? `<code class="font-mono" style="background:hsl(var(--card)); padding:2px 6px; border-radius:4px; border:1px solid hsl(var(--border)); font-size:0.75rem;">${k.discordId}</code>` : '<span class="text-muted">Unclaimed</span>'}</td>
                <td><span style="font-weight:600;">${k.bindingsCount}</span> <span class="text-muted">/ ${k.maxClients}</span></td>
                <td>${k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Lifetime'}</td>
                <td>
                    <div style="display:flex; gap:0.35rem;">
                        <button class="btn-action-ghost" onclick="resetKeyHwid('${k.id}', '${k.keyPrefix}')">Reset HWID</button>
                        ${k.status === 'active' ? `<button class="btn-danger-ghost" onclick="revokeKey('${k.id}', '${k.keyPrefix}')">Revoke</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        keysTableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem; color: var(--rose-500);">Error connecting to API server.</td></tr>';
    }
}

window.copyText = function(text) {
    navigator.clipboard.writeText(text);
    showToast({ title: 'Copied', message: text, type: 'success', duration: 2000 });
};

keysSearchInput.addEventListener('input', debounce(loadKeys, 300));
keysStatusFilter.addEventListener('change', loadKeys);
keysTierFilter.addEventListener('change', loadKeys);

window.resetKeyHwid = async function(id, prefix) {
    const confirmed = await showConfirmDialog(
        'Reset Device Bindings',
        `Are you sure you want to reset all bound devices/HWID for key "${prefix}"? The user will be able to bind a new device on next login.`
    );
    if (!confirmed) return;

    try {
        const res = await apiCall(`/api/v1/admin/keys/${id}/reset`, 'POST');
        showToast({ title: 'HWID Reset', message: res.message, type: 'success' });
        loadKeys();
    } catch (e) {
        showToast({ title: 'Error', message: 'Failed to reset device bindings.', type: 'error' });
    }
};

window.revokeKey = async function(id, prefix) {
    const confirmed = await showConfirmDialog(
        'Revoke License Key',
        `Are you sure you want to immediately revoke key "${prefix}"? Any scripts actively running with this key will fail subsequent verification.`
    );
    if (!confirmed) return;

    try {
        await apiCall(`/api/v1/admin/keys/${id}/revoke`, 'POST');
        showToast({ title: 'Key Revoked', message: `License key ${prefix} is now revoked.`, type: 'info' });
        loadKeys();
    } catch (e) {
        showToast({ title: 'Error', message: 'Failed to revoke key.', type: 'error' });
    }
};

// --------------------------------------------------------------------------
// 3. Global Key Tab
// --------------------------------------------------------------------------
async function loadGlobalKey() {
    try {
        const res = await apiCall('/api/v1/admin/global-key');
        if (res.success && res.globalKey) {
            const gk = res.globalKey;
            gkEnableSwitch.checked = gk.enabled;
            gkKeyInput.value = gk.key;
            gkFeaturesInput.value = (gk.features || []).join(', ');
            gkNoteInput.value = gk.note || '';
        }
    } catch (err) {
        console.error('Failed to load global key:', err);
    }
}

globalKeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        enabled: gkEnableSwitch.checked,
        key: gkKeyInput.value.trim(),
        features: gkFeaturesInput.value.split(',').map(s => s.trim()).filter(Boolean),
        note: gkNoteInput.value.trim()
    };

    try {
        const res = await apiCall('/api/v1/admin/global-key', 'PUT', payload);
        if (res.success) {
            showToast({ title: 'Settings Saved', message: 'Global Key updated successfully.', type: 'success' });
            loadGlobalKey();
        }
    } catch {
        showToast({ title: 'Save Failed', message: 'Unable to update Global Key settings.', type: 'error' });
    }
});

// --------------------------------------------------------------------------
// 4. Logs Tab
// --------------------------------------------------------------------------
async function loadLogs() {
    logsTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem; color: hsl(var(--muted-foreground));">Loading telemetry logs...</td></tr>';
    try {
        const res = await apiCall('/api/v1/admin/logs/verification');
        if (!res.success || !res.logs.length) {
            logsTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem; color: hsl(var(--muted-foreground));">No verification logs recorded yet.</td></tr>';
            return;
        }

        logsTableBody.innerHTML = res.logs.map(l => `
            <tr>
                <td class="text-muted font-mono" style="font-size:0.75rem;">${new Date(l.createdAt).toLocaleTimeString()}</td>
                <td><code class="font-mono" style="font-weight:600;">${l.keyPrefix || 'UNKNOWN'}</code></td>
                <td><span class="badge ${l.success ? 'active' : 'revoked'}">${l.success ? 'Verified' : 'Rejected'}</span></td>
                <td style="font-size:0.8125rem;">${l.reason}</td>
                <td><span class="badge ${l.tier}">${l.tier}</span></td>
                <td><code class="font-mono text-muted" style="font-size:0.75rem;">${l.clientIdHash ? l.clientIdHash.substring(0, 14) + '...' : '-'}</code></td>
            </tr>
        `).join('');
    } catch {
        logsTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--rose-500);">Error fetching verification logs.</td></tr>';
    }
}

// --------------------------------------------------------------------------
// Key Generator Modal
// --------------------------------------------------------------------------
openGenModalBtn.addEventListener('click', () => {
    genModal.classList.add('active');
    genResult.classList.add('hidden');
});

closeGenModal.addEventListener('click', () => {
    genModal.classList.remove('active');
});

genKeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        tier: document.getElementById('gen-tier').value,
        durationDays: parseInt(document.getElementById('gen-duration').value, 10),
        maxClients: parseInt(document.getElementById('gen-max-clients').value, 10),
        count: parseInt(document.getElementById('gen-qty').value, 10),
        note: document.getElementById('gen-note').value.trim()
    };

    const submitBtn = document.getElementById('submit-gen-btn');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';

    try {
        const res = await apiCall('/api/v1/admin/keys', 'POST', payload);
        if (res.success && res.keys) {
            genKeysList.innerHTML = res.keys.map(k => `
                <div class="key-pill">
                    <span style="letter-spacing:0.04em;">${k.plainKey}</span>
                    <button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText('${k.plainKey}'); this.querySelector('span').textContent='Copied!'; showToast({title:'Key Copied', message:'${k.plainKey}', type:'success'});">
                        <span>Copy</span>
                    </button>
                </div>
            `).join('');
            genResult.classList.remove('hidden');
            showToast({ title: 'Success', message: `Generated ${res.keys.length} license key(s).`, type: 'success' });
            loadOverview();
        }
    } catch {
        showToast({ title: 'Error', message: 'Failed to generate keys.', type: 'error' });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
    }
});

// Helper: Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Start application
initAuth();
