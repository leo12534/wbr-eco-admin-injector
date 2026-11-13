let blocks = [];
let running = false;
let stopRequested = false;

const SECTIONS = ['page_content','header_top','header_left','header_right','header_bottom','aside_content'];

const sectionChecks = document.getElementById('sectionChecks');
const disableBtn = document.getElementById('disableBtn');
const disableStopBtn = document.getElementById('disableStopBtn');
const disableStatusBar = document.getElementById('disableStatusBar');
const disableProgressWrap = document.getElementById('disableProgressWrap');
const disableProgressBar = document.getElementById('disableProgressBar');

SECTIONS.forEach(s => {
  const item = document.createElement('label');
  item.className = 'section-check-item';
  item.innerHTML = `<input type="checkbox" class="section-check" value="${s}" checked> ${s}`;
  sectionChecks.appendChild(item);
});

function setDisableStatus(msg, type) {
  disableStatusBar.textContent = msg;
  disableStatusBar.className = 'status-bar ' + type;
}

function updateDisableProgress(done, total) {
  disableProgressWrap.style.display = 'block';
  disableProgressBar.style.width = ((done / total) * 100) + '%';
}

const enableBtn = document.getElementById('enableBtn');
const deleteBtn = document.getElementById('deleteBtn');
const exportBtn = document.getElementById('exportBtn');

let disableRunning = false;
let disableStopRequested = false;

disableBtn.addEventListener('click', async () => {
  if (disableRunning) return;
  const checked = [...document.querySelectorAll('.section-check:checked')].map(c => c.value);
  if (!checked.length) { setDisableStatus('Select at least one section.', 'warning'); return; }

  disableRunning = true;
  disableStopRequested = false;
  disableBtn.disabled = true;
  enableBtn.disabled = true;
  disableStopBtn.style.display = 'inline-block';
  disableProgressWrap.style.display = 'none';
  disableProgressBar.style.width = '0%';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await runInPage(tab.id, getBlockCountsForSections, [checked]);
  const counts = result[0]?.result || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    setDisableStatus('No existing blocks found in selected sections. In the new editor, open the page\'s Regions tab first.', 'warning');
    disableRunning = false;
    disableBtn.disabled = false;
    enableBtn.disabled = false;
    disableStopBtn.style.display = 'none';
    return;
  }

  setDisableStatus(`Disabling ${total} block${total > 1 ? 's' : ''} across ${checked.length} section${checked.length > 1 ? 's' : ''}...`, 'info');

  let done = 0, errors = 0;

  for (const section of checked) {
    if (disableStopRequested) break;
    const count = counts[section] || 0;
    for (let i = 0; i < count; i++) {
      if (disableStopRequested) break;
      const res = await runInPage(tab.id, disableBlockAtIndex, [section, i]);
      const outcome = res[0]?.result;
      if (outcome?.success) { done++; await logAction({ action: 'disable', section, name: outcome.name }); } else { errors++; }
      updateDisableProgress(done + errors, total);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  disableRunning = false;
  disableBtn.disabled = false;
  enableBtn.disabled = false;
  disableStopBtn.style.display = 'none';
  disableStopBtn.disabled = false;
  disableStopBtn.textContent = 'Stop';

  if (disableStopRequested) {
    setDisableStatus(`Stopped. ${done} disabled.`, 'warning');
  } else if (errors === 0) {
    setDisableStatus(`Done — ${done} block${done !== 1 ? 's' : ''} disabled.`, 'success');
  } else {
    setDisableStatus(`Done — ${done} disabled, ${errors} failed.`, 'warning');
  }
});

enableBtn.addEventListener('click', async () => {
  if (disableRunning) return;
  const checked = [...document.querySelectorAll('.section-check:checked')].map(c => c.value);
  if (!checked.length) { setDisableStatus('Select at least one section.', 'warning'); return; }

  disableRunning = true;
  disableStopRequested = false;
  disableBtn.disabled = true;
  enableBtn.disabled = true;
  disableStopBtn.style.display = 'inline-block';
  disableProgressWrap.style.display = 'none';
  disableProgressBar.style.width = '0%';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await runInPage(tab.id, getBlockCountsForSections, [checked]);
  const counts = result[0]?.result || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    setDisableStatus('No existing blocks found in selected sections. In the new editor, open the page\'s Regions tab first.', 'warning');
    disableRunning = false;
    disableBtn.disabled = false;
    enableBtn.disabled = false;
    disableStopBtn.style.display = 'none';
    return;
  }

  setDisableStatus(`Enabling ${total} block${total > 1 ? 's' : ''} across ${checked.length} section${checked.length > 1 ? 's' : ''}...`, 'info');

  let done = 0, errors = 0;

  for (const section of checked) {
    if (disableStopRequested) break;
    const count = counts[section] || 0;
    for (let i = 0; i < count; i++) {
      if (disableStopRequested) break;
      const res = await runInPage(tab.id, enableBlockAtIndex, [section, i]);
      const outcome = res[0]?.result;
      if (outcome?.success) { done++; await logAction({ action: 'enable', section, name: outcome.name }); } else { errors++; }
      updateDisableProgress(done + errors, total);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  disableRunning = false;
  disableBtn.disabled = false;
  enableBtn.disabled = false;
  disableStopBtn.style.display = 'none';
  disableStopBtn.disabled = false;
  disableStopBtn.textContent = 'Stop';

  if (disableStopRequested) {
    setDisableStatus(`Stopped. ${done} enabled.`, 'warning');
  } else if (errors === 0) {
    setDisableStatus(`Done — ${done} block${done !== 1 ? 's' : ''} enabled.`, 'success');
  } else {
    setDisableStatus(`Done — ${done} enabled, ${errors} failed.`, 'warning');
  }
});

disableStopBtn.addEventListener('click', () => {
  disableStopRequested = true;
  disableStopBtn.disabled = true;
  disableStopBtn.textContent = 'Stopping...';
});

deleteBtn.addEventListener('click', async () => {
  if (disableRunning) return;
  const checked = [...document.querySelectorAll('.section-check:checked')].map(c => c.value);
  if (!checked.length) { setDisableStatus('Select at least one section.', 'warning'); return; }

  if (!confirm(`Delete all live (non-disabled) blocks in the selected sections?\n\nThis cannot be undone.`)) return;

  disableRunning = true;
  disableStopRequested = false;
  deleteBtn.disabled = true;
  disableBtn.disabled = true;
  enableBtn.disabled = true;
  disableStopBtn.style.display = 'inline-block';
  disableProgressWrap.style.display = 'none';
  disableProgressBar.style.width = '0%';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const countResult = await runInPage(tab.id, getLiveBlockCountsForSections, [checked]);
  const counts = countResult[0]?.result || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    setDisableStatus('No live blocks found in selected sections. In the new editor, open the page\'s Regions tab first.', 'warning');
    disableRunning = false;
    deleteBtn.disabled = false;
    disableBtn.disabled = false;
    enableBtn.disabled = false;
    disableStopBtn.style.display = 'none';
    return;
  }

  setDisableStatus(`Deleting ${total} live block${total > 1 ? 's' : ''}...`, 'info');
  let done = 0, errors = 0;

  for (const section of checked) {
    if (disableStopRequested) break;
    const count = counts[section] || 0;
    for (let i = 0; i < count; i++) {
      if (disableStopRequested) break;
      const res = await runInPage(tab.id, deleteFirstLiveBlock, [section]);
      const outcome = res[0]?.result;
      if (outcome?.success) { done++; await logAction({ action: 'delete', section, name: outcome.name, html: outcome.html }); } else { errors++; }
      updateDisableProgress(done + errors, total);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  disableRunning = false;
  deleteBtn.disabled = false;
  disableBtn.disabled = false;
  enableBtn.disabled = false;
  disableStopBtn.style.display = 'none';
  disableStopBtn.disabled = false;
  disableStopBtn.textContent = 'Stop';

  if (disableStopRequested) setDisableStatus(`Stopped. ${done} deleted.`, 'warning');
  else if (errors === 0) setDisableStatus(`Done — ${done} block${done !== 1 ? 's' : ''} deleted.`, 'success');
  else setDisableStatus(`Done — ${done} deleted, ${errors} failed.`, 'warning');
});

exportBtn.addEventListener('click', async () => {
  const checked = [...document.querySelectorAll('.section-check:checked')].map(c => c.value);
  if (!checked.length) { setDisableStatus('Select at least one section.', 'warning'); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await runInPage(tab.id, exportBlocksFromSections, [checked]);

  const data = result[0]?.result || {};
  let totalBlocks = 0;
  let html = '';

  for (const section of checked) {
    const views = data[section];
    if (!views || !views.length) continue;
    html += `\n<!-- ========== ${section.toUpperCase()} ========== -->\n`;
    for (const view of views) {
      html += `\n<!-- block: ${view.name}${view.disabled ? ' [disabled]' : ''} -->\n`;
      html += view.html + '\n';
      totalBlocks++;
    }
  }

  if (!totalBlocks) { setDisableStatus('No blocks found in selected sections. In the new editor, open the page\'s Regions tab first.', 'warning'); return; }

  const blob = new Blob([html.trim()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eco-blocks-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setDisableStatus(`Exported ${totalBlocks} block${totalBlocks !== 1 ? 's' : ''} to HTML.`, 'success');
});

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'avif', 'bmp', 'ico'];
const FONT_EXTS = ['woff', 'woff2', 'ttf', 'otf', 'eot'];
const MIME_EXTS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/bmp': 'bmp', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico'
};

const imgSectionSelect = document.getElementById('imgSectionSelect');
const imgBlockSelect = document.getElementById('imgBlockSelect');
const imgRefreshBtn = document.getElementById('imgRefreshBtn');
const imgZipBtn = document.getElementById('imgZipBtn');
const imgStatusBar = document.getElementById('imgStatusBar');
const imgProgressWrap = document.getElementById('imgProgressWrap');
const imgProgressBar = document.getElementById('imgProgressBar');

let imgViews = [];
let imgLoadToken = 0;
let imgZipRunning = false;

imgSectionSelect.innerHTML = SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
imgSectionSelect.addEventListener('change', loadImageBlocks);
imgRefreshBtn.addEventListener('click', () => { if (!imgZipRunning) loadImageBlocks(); });
imgZipBtn.addEventListener('click', downloadBlockImages);

async function runInPage(tabId, func, args = []) {
  await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['page-v2.js'] });
  return chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
}

function closeAnyModal() {
  window.ecoV2?.closeModal();
  document.querySelector('.modal.in button.close, .modal[style*="display: block"] button.close')?.click();
}

function exportBlocksFromSections(sectionNames) {
  if (window.ecoV2?.active()) {
    const result = {};
    sectionNames.forEach(name => { const r = window.ecoV2.views(name); if (r.views?.length) result[name] = r.views; });
    return result;
  }
  function getViews(li) {
    for (const el of [...li.querySelectorAll('*')]) {
      const vk = Object.keys(el).find(k => k.startsWith('__vue'));
      if (!vk) continue;
      let v = el[vk];
      for (let d = 0; d < 10 && v; d++, v = v.$parent) {
        if (v.$data?.views?.length) return v.$data.views;
      }
    }
    return null;
  }
  const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
  const result = {};
  sectionNames.forEach(name => {
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      return h && [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase() === name.toLowerCase();
    });
    if (!li) return;
    const views = getViews(li);
    if (!views) return;
    result[name] = views.map(v => ({ name: v.name || '', html: v.html || '', disabled: !!v.disabled }));
  });
  return result;
}

function getLiveBlockCountsForSections(sectionNames) {
  if (window.ecoV2?.active()) {
    const counts = {};
    sectionNames.forEach(name => { counts[name] = (window.ecoV2.views(name).views || []).filter(v => !v.disabled).length; });
    return counts;
  }
  function getViews(li) {
    for (const el of [...li.querySelectorAll('*')]) {
      const vk = Object.keys(el).find(k => k.startsWith('__vue'));
      if (!vk) continue;
      let v = el[vk];
      for (let d = 0; d < 10 && v; d++, v = v.$parent) {
        if (v.$data?.views?.length) return v.$data.views;
      }
    }
    return null;
  }
  const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
  const counts = {};
  sectionNames.forEach(name => {
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      return h && [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase() === name.toLowerCase();
    });
    const views = li ? getViews(li) : null;
    counts[name] = views ? views.filter(v => !v.disabled).length : 0;
  });
  return counts;
}

async function deleteFirstLiveBlock(sectionName) {
  if (window.ecoV2?.active()) return window.ecoV2.deleteFirstLive(sectionName);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function getViews(li) {
    for (const el of [...li.querySelectorAll('*')]) {
      const vk = Object.keys(el).find(k => k.startsWith('__vue'));
      if (!vk) continue;
      let v = el[vk];
      for (let d = 0; d < 10 && v; d++, v = v.$parent) {
        if (v.$data?.views?.length) return v.$data.views;
      }
    }
    return null;
  }
  const origConfirm = window.confirm;
  try {
    const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      return h && [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase() === sectionName.toLowerCase();
    });
    if (!li) return { success: false, error: `Section "${sectionName}" not found` };

    const views = getViews(li);
    if (!views) return { success: false, error: 'Could not find views data' };

    const firstLiveIdx = views.findIndex(v => !v.disabled);
    if (firstLiveIdx === -1) return { success: false, error: 'No live blocks found' };

    const deleteBtns = [...li.querySelectorAll('a.btn-danger')];
    const btn = deleteBtns[firstLiveIdx];
    if (!btn) return { success: false, error: `Delete button not found at index ${firstLiveIdx}` };

    const name = views[firstLiveIdx].name || '';
    const html = views[firstLiveIdx].html || '';

    window.confirm = () => true;
    btn.click();
    await sleep(1000);
    window.confirm = origConfirm;
    return { success: true, name, html };
  } catch (err) {
    window.confirm = origConfirm;
    return { success: false, error: err.message };
  }
}

function getBlockCountsForSections(sectionNames) {
  if (window.ecoV2?.active()) {
    const counts = {};
    sectionNames.forEach(name => { counts[name] = (window.ecoV2.views(name).views || []).length; });
    return counts;
  }
  const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
  const counts = {};
  sectionNames.forEach(name => {
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      if (!h) return false;
      const text = [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase();
      return text === name.toLowerCase();
    });
    counts[name] = li ? li.querySelectorAll('a.btn-warning').length : 0;
  });
  return counts;
}

async function disableBlockAtIndex(sectionName, index) {
  if (window.ecoV2?.active()) return window.ecoV2.setDisabled(sectionName, index, true);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function getModal() { return document.querySelector('.modal.in, .modal[style*="display: block"], .modal[style*="display:block"]'); }

  try {
    const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      if (!h) return false;
      const text = [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase();
      return text === sectionName.toLowerCase();
    });
    if (!li) return { success: false, error: `Section "${sectionName}" not found` };

    const editBtns = [...li.querySelectorAll('a.btn-warning')];
    const btn = editBtns[index];
    if (!btn) return { success: false, error: `No edit button at index ${index}` };

    btn.click();
    let modal = null;
    for (let t = 0; t < 25; t++) { await sleep(120); modal = getModal(); if (modal) break; }
    if (!modal) return { success: false, error: 'Modal did not open' };

    const vm = modal.__vue__?.$parent?.$parent;
    if (!vm?.$data?.view_to_edit_clone) return { success: false, error: 'Could not access Vue edit component' };

    const name = vm.$data.view_to_edit?.name || '';
    vm.$data.view_to_edit.disabled = 1;
    vm.$data.view_to_edit_clone.disabled = 1;
    await sleep(300);

    const saveBtn = modal.querySelector('button.btn-primary:not(.note-btn):not(.note-color-btn)');
    if (!saveBtn) return { success: false, error: 'Save button not found' };
    saveBtn.click();

    let closed = false;
    for (let t = 0; t < 35; t++) { await sleep(150); if (!getModal()) { closed = true; break; } }
    if (!closed) return { success: false, error: 'Modal did not close after save' };

    return { success: true, name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function enableBlockAtIndex(sectionName, index) {
  if (window.ecoV2?.active()) return window.ecoV2.setDisabled(sectionName, index, false);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function getModal() { return document.querySelector('.modal.in, .modal[style*="display: block"], .modal[style*="display:block"]'); }

  try {
    const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
    const li = lis.find(el => {
      const h = el.querySelector('div.panel-heading');
      if (!h) return false;
      const text = [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase();
      return text === sectionName.toLowerCase();
    });
    if (!li) return { success: false, error: `Section "${sectionName}" not found` };

    const editBtns = [...li.querySelectorAll('a.btn-warning')];
    const btn = editBtns[index];
    if (!btn) return { success: false, error: `No edit button at index ${index}` };

    btn.click();
    let modal = null;
    for (let t = 0; t < 25; t++) { await sleep(120); modal = getModal(); if (modal) break; }
    if (!modal) return { success: false, error: 'Modal did not open' };

    const vm = modal.__vue__?.$parent?.$parent;
    if (!vm?.$data?.view_to_edit_clone) return { success: false, error: 'Could not access Vue edit component' };

    const name = vm.$data.view_to_edit?.name || '';
    vm.$data.view_to_edit.disabled = 0;
    vm.$data.view_to_edit_clone.disabled = 0;
    await sleep(300);

    const saveBtn = modal.querySelector('button.btn-primary:not(.note-btn):not(.note-color-btn)');
    if (!saveBtn) return { success: false, error: 'Save button not found' };
    saveBtn.click();

    let closed = false;
    for (let t = 0; t < 35; t++) { await sleep(150); if (!getModal()) { closed = true; break; } }
    if (!closed) return { success: false, error: 'Modal did not close after save' };

    return { success: true, name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

const htmlInput = document.getElementById('htmlInput');
const parseBtn = document.getElementById('parseBtn');
const clearBtn = document.getElementById('clearBtn');
const blockList = document.getElementById('blockList');
const blockItems = document.getElementById('blockItems');
const blockCount = document.getElementById('blockCount');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const statusBar = document.getElementById('statusBar');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const mainContent = document.getElementById('mainContent');
const notCms = document.getElementById('notCms');
const pageStatus = document.getElementById('pageStatus');
const logItems = document.getElementById('logItems');
const logEmpty = document.getElementById('logEmpty');
const logClearBtn = document.getElementById('logClearBtn');

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (url.includes('ecoadmin.wbresearch.com')) {
    mainContent.style.display = 'block';
    pageStatus.textContent = `ECO Admin ✓ · v${chrome.runtime.getManifest().version}`;
    loadImageBlocks();
  } else {
    notCms.style.display = 'block';
    pageStatus.textContent = 'wrong page';
  }
});

const LOG_KEY = 'ecoActionLog';
const LOG_MAX = 150;

async function logAction(entry) {
  try {
    const full = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), ts: new Date().toISOString(), ...entry };
    const stored = await chrome.storage.local.get(LOG_KEY);
    const log = stored[LOG_KEY] || [];
    log.unshift(full);
    if (log.length > LOG_MAX) log.length = LOG_MAX;
    await chrome.storage.local.set({ [LOG_KEY]: log });
    renderLog(log);
  } catch (err) {
    console.error('Activity log write failed:', err);
  }
}

async function loadLog() {
  try {
    const stored = await chrome.storage.local.get(LOG_KEY);
    renderLog(stored[LOG_KEY] || []);
  } catch (err) {
    console.error('Activity log load failed:', err);
  }
}

function formatLogTime(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderLog(log) {
  if (!log.length) {
    logItems.innerHTML = '';
    logEmpty.style.display = 'block';
    return;
  }
  logEmpty.style.display = 'none';
  logItems.innerHTML = log.map(entry => `
    <div class="log-item log-type-${entry.action}">
      <div class="log-main">
        <span class="log-badge">${entry.action}</span>
        <span class="log-name">${escapeHtml(entry.name || '(unnamed)')}</span>
        <span class="log-section">${entry.section || ''}</span>
      </div>
      <div class="log-meta">
        <span>${formatLogTime(entry.ts)}</span>
        ${entry.action === 'delete' && entry.html ? `<span class="log-restore-btn" data-id="${entry.id}">Restore</span>` : ''}
      </div>
    </div>
  `).join('');
  logItems.querySelectorAll('.log-restore-btn').forEach(btn => {
    btn.addEventListener('click', () => restoreLogEntry(btn.dataset.id));
  });
}

async function restoreLogEntry(id) {
  const stored = await chrome.storage.local.get(LOG_KEY);
  const log = stored[LOG_KEY] || [];
  const entry = log.find(e => e.id === id);
  if (!entry || !entry.html) return;
  if (!confirm(`Re-add "${entry.name}" to ${entry.section}? This creates a new block with the saved HTML.`)) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await runInPage(tab.id, injectBlock, [entry.name, entry.html, entry.section]);
  const outcome = result[0]?.result;
  if (outcome?.success) {
    setDisableStatus(`Restored "${entry.name}" to ${entry.section}.`, 'success');
    await logAction({ action: 'restore', section: entry.section, name: entry.name, html: entry.html });
  } else {
    setDisableStatus(`Restore failed: ${outcome?.error || 'unknown error'}`, 'error');
  }
}

logClearBtn.addEventListener('click', async () => {
  if (!confirm('Clear the activity log? This cannot be undone.')) return;
  await chrome.storage.local.set({ [LOG_KEY]: [] });
  renderLog([]);
});

loadLog();

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);
}

function autoName(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const heading = doc.querySelector('h1, h2, h3, h4');
  if (heading && heading.textContent.trim()) return slugify(heading.textContent.trim());
  const firstText = doc.body.textContent.trim().split(/\s+/).slice(0, 5).join(' ');
  if (firstText) return slugify(firstText);
  return 'block-' + Math.random().toString(36).substring(2, 6);
}

function parseBlocks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const all = [...doc.querySelectorAll('div.container, div.container-fluid')];
  const seen = new Set();
  const result = [];
  all.forEach(el => {
    let isTop = true;
    let p = el.parentElement;
    while (p && p.tagName !== 'BODY') {
      if (p.classList.contains('container') || p.classList.contains('container-fluid')) { isTop = false; break; }
      p = p.parentElement;
    }
    if (!isTop) return;
    const outer = el.outerHTML.trim();
    if (seen.has(outer)) return;
    seen.add(outer);
    result.push({ html: outer, name: autoName(outer), section: 'page_content', status: 'pending' });
  });
  return result;
}

parseBtn.addEventListener('click', () => {
  const html = htmlInput.value.trim();
  if (!html) { setStatus('Paste some HTML first.', 'error'); return; }
  blocks = parseBlocks(html);
  if (blocks.length === 0) {
    setStatus('No .container or .container-fluid blocks found.', 'warning');
    blockList.style.display = 'none';
    return;
  }
  renderBlockList();
  blockList.style.display = 'block';
  runBtn.disabled = false;
  setStatus(`Found ${blocks.length} block${blocks.length > 1 ? 's' : ''}. Review names then click Run.`, 'info');
});

function renderBlockList() {
  blockCount.textContent = `${blocks.length} block${blocks.length > 1 ? 's' : ''}`;
  blockItems.innerHTML = '';
  blocks.forEach((block, i) => {
    const item = document.createElement('div');
    item.className = 'block-item' + (block.status !== 'pending' ? ' ' + block.status : '');
    item.id = 'block-' + i;
    const typeLabel = block.html.startsWith('<div class="container-fluid') || block.html.startsWith("<div class='container-fluid") ? 'container-fluid' : 'container';
    const preview = block.html.length > 120 ? block.html.substring(0, 120) + '...' : block.html;
    const sections = ['page_content','header_top','header_left','header_right','header_bottom','aside_content'];
    const sectionOptions = sections.map(s => `<option value="${s}"${s === block.section ? ' selected' : ''}>${s}</option>`).join('');
    item.innerHTML = `
      <div class="block-num">${i + 1}</div>
      <div class="block-info">
        <input class="block-name-input" type="text" value="${escapeAttr(block.name)}" data-index="${i}" placeholder="block name" />
        <select class="block-section-select" data-index="${i}">${sectionOptions}</select>
        <div class="block-meta">${typeLabel} · ${block.html.length} chars ${block.status !== 'pending' ? '· ' + block.status : ''}</div>
        <div class="block-preview" id="preview-${i}">${escapeHtml(preview)}</div>
      </div>
      <span class="block-toggle" data-index="${i}">preview</span>
    `;
    blockItems.appendChild(item);
  });
  blockItems.querySelectorAll('.block-name-input').forEach(input => {
    input.addEventListener('change', e => { blocks[e.target.dataset.index].name = e.target.value.trim(); });
  });
  blockItems.querySelectorAll('.block-section-select').forEach(select => {
    select.addEventListener('change', e => { blocks[e.target.dataset.index].section = e.target.value; });
  });
  blockItems.querySelectorAll('.block-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      const idx = e.target.dataset.index;
      const preview = document.getElementById('preview-' + idx);
      const visible = preview.style.display === 'block';
      preview.style.display = visible ? 'none' : 'block';
      e.target.textContent = visible ? 'preview' : 'hide';
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeAttr(str) {
  return str.replace(/"/g,'&quot;');
}

function setStatus(msg, type) {
  statusBar.textContent = msg;
  statusBar.className = 'status-bar ' + type;
}

function setBlockStatus(index, status) {
  blocks[index].status = status;
  const item = document.getElementById('block-' + index);
  if (!item) return;
  item.className = 'block-item ' + (status !== 'pending' ? status : '');
  const typeLabel = blocks[index].html.startsWith('<div class="container-fluid') ? 'container-fluid' : 'container';
  item.querySelector('.block-meta').textContent = `${typeLabel} · ${blocks[index].html.length} chars · ${status}`;
  const num = item.querySelector('.block-num');
  if (status === 'done') num.textContent = '✓';
  else if (status === 'error') num.textContent = '✗';
  else if (status === 'active') num.textContent = '→';
}

function updateProgress(done, total) {
  progressWrap.style.display = 'block';
  progressBar.style.width = ((done / total) * 100) + '%';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

runBtn.addEventListener('click', async () => {
  if (running) return;
  running = true;
  stopRequested = false;
  runBtn.disabled = true;
  stopBtn.style.display = 'inline-block';
  parseBtn.disabled = true;
  let doneCount = 0, errorCount = 0;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  for (let i = 0; i < blocks.length; i++) {
    if (stopRequested) { setStatus(`Stopped. ${doneCount} added.`, 'warning'); break; }
    const block = blocks[i];
    await runInPage(tab.id, closeAnyModal).catch(()=>{});
    await sleep(400);
    setBlockStatus(i, 'active');
    setStatus(`Adding block ${i + 1} of ${blocks.length}: "${block.name}"...`, 'info');
    document.getElementById('block-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const result = await runInPage(tab.id, injectBlock, [block.name, block.html, block.section]);
      const outcome = result[0]?.result;
      if (outcome?.success) {
        setBlockStatus(i, 'done');
        doneCount++;
        await logAction({ action: 'add', section: block.section, name: block.name, html: block.html });
      } else {
        setBlockStatus(i, 'error');
        errorCount++;
        setStatus(`Error on block ${i + 1}: ${outcome?.error || 'unknown'}`, 'error');
        await runInPage(tab.id, closeAnyModal);
        await sleep(600);
        if (!confirm(`Error on "${block.name}": ${outcome?.error}\n\nContinue with remaining blocks?`)) break;
      }
    } catch (err) {
      setBlockStatus(i, 'error');
      errorCount++;
      setStatus(`Script error on block ${i + 1}: ${err.message}`, 'error');
      await runInPage(tab.id, closeAnyModal);
        await sleep(600);
        if (!confirm(`Script error on "${block.name}". Continue?`)) break;
    }
    updateProgress(i + 1, blocks.length);
    await sleep(1000);
  }

  running = false;
  runBtn.disabled = false;
  stopBtn.style.display = 'none';
  stopBtn.disabled = false;
  stopBtn.textContent = 'Stop';
  parseBtn.disabled = false;

  if (!stopRequested && doneCount > 0) {
    setStatus('Sorting blocks — live first, disabled last...', 'info');
    const usedSections = [...new Set(blocks.filter(b => b.status === 'done').map(b => b.section))];
    for (const section of usedSections) {
      await runInPage(tab.id, sortSectionBlocks, [section]);
      await sleep(800);
    }
  }

  if (!stopRequested) {
    if (errorCount === 0) setStatus(`All ${doneCount} blocks added and sorted successfully!`, 'success');
    else setStatus(`Done — ${doneCount} succeeded, ${errorCount} failed.`, 'warning');
  }
});

stopBtn.addEventListener('click', () => {
  stopRequested = true;
  stopBtn.disabled = true;
  stopBtn.textContent = 'Stopping...';
});

clearBtn.addEventListener('click', () => {
  htmlInput.value = '';
  blocks = [];
  blockList.style.display = 'none';
  blockItems.innerHTML = '';
  statusBar.className = 'status-bar';
  progressWrap.style.display = 'none';
  progressBar.style.width = '0%';
  runBtn.disabled = true;
});

async function sortSectionBlocks(sectionName) {
  if (window.ecoV2?.active()) return window.ecoV2.sortLiveFirst(sectionName);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getViewsComponent(li) {
    for (const el of [...li.querySelectorAll('*')]) {
      const vk = Object.keys(el).find(k => k.startsWith('__vue'));
      if (!vk) continue;
      let v = el[vk];
      for (let d = 0; d < 10 && v; d++, v = v.$parent) {
        if (v.$data?.views?.length) return v;
      }
    }
    return null;
  }

  const lis = [...document.querySelectorAll('ul.list-group > li.list-unstyled')];
  const li = lis.find(el => {
    const h = el.querySelector('div.panel-heading');
    return h && [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase() === sectionName.toLowerCase();
  });
  if (!li) return { success: false, error: `Section "${sectionName}" not found` };

  const comp = getViewsComponent(li);
  if (!comp) return { success: false, error: 'Vue component not found' };

  const views = comp.$data.views;
  const live = views.filter(v => !v.disabled);
  const disabled = views.filter(v => v.disabled);

  if (!disabled.length || !live.length) return { success: true };

  // Step 1: reorder the array in $data so viewSort reads the new order
  comp.$data.views.splice(0, views.length, ...live, ...disabled);
  await sleep(300);

  // Step 2: call viewSort() — reads from $data.views and persists to the API
  comp.viewSort();
  await sleep(1500);

  return { success: true };
}

async function injectBlock(name, html, section) {
  if (window.ecoV2?.active()) return window.ecoV2.add(section, name, html);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getModal() {
    return document.querySelector('.modal.in, .modal[style*="display: block"], .modal[style*="display:block"]');
  }

  function findAddViewBtn(targetSection) {
    const target = (targetSection || 'page_content').toLowerCase();
    const headings = [...document.querySelectorAll('div.panel-heading')];
    for (const h of headings) {
      const textNodes = [...h.childNodes].filter(n => n.nodeType === 3);
      const text = textNodes.map(n => n.textContent.trim()).join('').toLowerCase();
      if (text === target) {
        const btn = h.querySelector('a');
        if (btn && btn.textContent.trim() === 'Add View') return btn;
      }
    }
    for (const h of headings) {
      if (h.textContent.trim().toLowerCase().startsWith(target)) {
        const btn = h.querySelector('a');
        if (btn && btn.textContent.trim() === 'Add View') return btn;
      }
    }
    return null;
  }

  try {
    const addViewBtn = findAddViewBtn(section);
    if (!addViewBtn) return { success: false, error: `Could not find "${section || 'page_content'}" Add View button` };
    addViewBtn.click();

    let modal = null;
    for (let t = 0; t < 25; t++) { await sleep(120); modal = getModal(); if (modal) break; }
    if (!modal) return { success: false, error: 'Modal did not open' };

    // Set form fields directly on Vue $data — modal.__vue__.$parent is the form component
    const formVm = modal.__vue__ && modal.__vue__.$parent;
    if (!formVm || !formVm.$data) return { success: false, error: 'Could not access Vue form component' };

    formVm.$data.name = name;
    formVm.$data.view_file = 'html';
    formVm.$data.html = html;
    await sleep(300);

    const addBtn = modal.querySelector('button.btn-primary:not(.note-btn)');
    if (!addBtn) return { success: false, error: 'Add button not found' };
    addBtn.click();

    let modalClosed = false;
    for (let t = 0; t < 35; t++) { await sleep(150); if (!getModal()) { modalClosed = true; break; } }
    if (!modalClosed) return { success: false, error: 'Modal did not close after submit — form may have failed validation' };

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
function setImgStatus(msg, type) {
  imgStatusBar.textContent = msg;
  imgStatusBar.className = 'status-bar ' + type;
}

function setImgControlsDisabled(disabled) {
  imgSectionSelect.disabled = disabled;
  imgBlockSelect.disabled = disabled || !imgViews.length;
  imgZipBtn.disabled = disabled || !imgViews.length;
}

async function loadImageBlocks() {
  const token = ++imgLoadToken;
  const section = imgSectionSelect.value;
  imgViews = [];
  imgBlockSelect.innerHTML = '<option>Loading...</option>';
  setImgControlsDisabled(false);

  let views = [];
  let error = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await runInPage(tab.id, getSectionBlocks, [section]);
    const outcome = result[0]?.result;
    if (outcome?.error) error = outcome.error;
    else views = outcome?.views || [];
  } catch (err) {
    error = err.message;
  }
  if (token !== imgLoadToken) return;

  imgViews = views;
  if (error) {
    imgBlockSelect.innerHTML = '<option>Could not read blocks</option>';
    setImgStatus(error, 'error');
  } else {
    imgBlockSelect.innerHTML = imgViews.length
      ? imgViews.map((v, i) => `<option value="${i}">${i + 1}. ${escapeHtml(v.name || '(unnamed)')}${v.disabled ? ' [disabled]' : ''}</option>`).join('')
      : '<option>No blocks in this section</option>';
    if (imgStatusBar.classList.contains('error')) imgStatusBar.className = 'status-bar';
  }
  setImgControlsDisabled(false);
}

function getSectionBlocks(sectionName) {
  const target = sectionName.toLowerCase();
  const toBlock = v => ({ name: v.name || v.file || '', html: v.html || '', disabled: !!Number(v.disabled) });

  if (window.ecoV2?.active()) return window.ecoV2.views(sectionName);

  const headings = [...document.querySelectorAll('div.panel-heading')];
  const ownText = h => [...h.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').toLowerCase();
  const heading = headings.find(h => ownText(h) === target) || headings.find(h => h.textContent.trim().toLowerCase().startsWith(target));
  if (!heading) return { error: `Couldn't find the "${sectionName}" section on this page.` };

  const vueOf = el => el.__vue__ || el[Object.keys(el).find(k => k.startsWith('__vue'))];
  const viewsUp = (vm, needItems) => {
    for (let d = 0; d < 12 && vm; d++, vm = vm.$parent) {
      const views = vm.$data?.views;
      if (Array.isArray(views) && (!needItems || views.length)) return views;
    }
    return null;
  };

  let views = null;
  const box = heading.closest('li.list-unstyled, li, .panel, .card') || heading.parentElement;
  for (const el of [box, ...box.querySelectorAll('*')]) {
    const vm = vueOf(el);
    if (vm) { views = viewsUp(vm, true); if (views) break; }
  }
  if (!views) {
    for (let el = heading; el && el !== document.body; el = el.parentElement) {
      const vm = vueOf(el);
      if (vm) { views = viewsUp(vm, false); if (views) break; }
    }
  }
  if (!views) return { error: `Found "${sectionName}" but couldn't read its block list.` };
  return { views: views.map(toBlock) };
}

async function downloadBlockImages() {
  if (imgZipRunning) return;
  const view = imgViews[imgBlockSelect.value];
  if (!view) { setImgStatus('Select a block first.', 'warning'); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const urls = extractImageUrls(view.html, tab.url);
  if (!urls.length) { setImgStatus(`No images found in "${view.name || '(unnamed)'}".`, 'warning'); return; }

  imgZipRunning = true;
  setImgControlsDisabled(true);
  imgProgressWrap.style.display = 'block';
  imgProgressBar.style.width = '0%';
  setImgStatus(`Fetching ${urls.length} image${urls.length !== 1 ? 's' : ''}...`, 'info');

  try {
    let fetched = 0;
    const results = await mapWithLimit(urls, 6, async url => {
      const res = await fetchImage(url);
      fetched++;
      imgProgressBar.style.width = ((fetched / urls.length) * 100) + '%';
      return res;
    });

    const zip = new JSZip();
    const usedNames = new Set();
    const failed = [];
    let added = 0;
    results.forEach((r, i) => {
      if (r.error) { failed.push(`${r.url}  —  ${r.error}`); return; }
      zip.file(uniqueFileName(r.name || `image-${i + 1}.${r.ext}`, usedNames), r.blob);
      added++;
    });

    if (!added) {
      setImgStatus(`Could not fetch any of the ${urls.length} images. ${failed[0] || ''}`, 'error');
      return;
    }
    if (failed.length) zip.file('failed.txt', failed.join('\n') + '\n');

    setImgStatus('Building ZIP...', 'info');
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `block-images-${new Date().toISOString().split('T')[0]}.zip`;
    const counts = `${added} image${added !== 1 ? 's' : ''}${failed.length ? `, ${failed.length} failed (see failed.txt)` : ''}`;
    const shown = await offerZipOnPage(blob, filename);
    if (shown) setImgStatus(`ZIP ready — ${counts}. Click "Save ${filename}" at the bottom-right of the ECO Admin page.`, failed.length ? 'warning' : 'success');
    else setImgStatus('Zipped the images, but couldn\'t show the Save button on the page. Reload the page and try again.', 'error');
  } catch (err) {
    setImgStatus(`ZIP failed: ${err.message}`, 'error');
  } finally {
    imgZipRunning = false;
    setImgControlsDisabled(false);
  }
}

function extractImageUrls(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const raw = [];

  doc.querySelectorAll('img').forEach(el => {
    raw.push(el.getAttribute('src'), el.getAttribute('data-src'));
  });
  doc.querySelectorAll('[srcset], [data-srcset]').forEach(el => {
    raw.push(...parseSrcset(el.getAttribute('srcset') || ''), ...parseSrcset(el.getAttribute('data-srcset') || ''));
  });
  doc.querySelectorAll('video[poster]').forEach(el => raw.push(el.getAttribute('poster')));
  doc.querySelectorAll('image').forEach(el => raw.push(el.getAttribute('href') || el.getAttribute('xlink:href')));
  doc.querySelectorAll('[style]').forEach(el => raw.push(...parseCssUrls(el.getAttribute('style'))));
  doc.querySelectorAll('style').forEach(el => raw.push(...parseCssUrls(el.textContent)));

  const seen = new Set();
  const urls = [];
  raw.forEach(u => {
    if (!u || !u.trim() || u.trim().startsWith('#')) return;
    let resolved;
    try { resolved = new URL(u.trim(), baseUrl); } catch { return; }
    if (!['http:', 'https:', 'data:'].includes(resolved.protocol)) return;
    if (resolved.protocol !== 'data:' && FONT_EXTS.includes(urlExtension(resolved.href))) return;
    if (seen.has(resolved.href)) return;
    seen.add(resolved.href);
    urls.push(resolved.href);
  });
  return urls;
}

function parseSrcset(value) {
  const urls = [];
  let rest = value;
  while (rest) {
    rest = rest.replace(/^[\s,]+/, '');
    const m = rest.match(/^\S+/);
    if (!m) break;
    let url = m[0];
    rest = rest.slice(url.length);
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      const i = rest.indexOf(',');
      rest = i === -1 ? '' : rest.slice(i + 1);
    }
    if (url) urls.push(url);
  }
  return urls;
}

function parseCssUrls(css) {
  return [...(css || '').matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map(m => m[2]);
}

function urlExtension(url) {
  try {
    const m = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { url, error: `HTTP ${res.status}` };
    const blob = await res.blob();
    const mime = (blob.type || '').split(';')[0].trim().toLowerCase();
    const isData = url.startsWith('data:');
    const urlExt = isData ? '' : urlExtension(url);
    if (!IMAGE_EXTS.includes(urlExt) && !mime.startsWith('image/')) return { url, error: `Not an image (${mime || 'unknown type'})` };
    const ext = IMAGE_EXTS.includes(urlExt) ? urlExt : (MIME_EXTS[mime] || mime.replace('image/', '').replace(/[^a-z0-9]/g, '') || 'img');
    return { url, blob, ext, name: isData ? '' : imageFileName(url, urlExt, ext) };
  } catch (err) {
    return { url, error: err.name === 'TimeoutError' ? 'Timed out' : err.message };
  }
}

function imageFileName(url, urlExt, ext) {
  let last = new URL(url).pathname.split('/').pop() || '';
  try { last = decodeURIComponent(last); } catch {}
  let stem = urlExt ? last.slice(0, -(urlExt.length + 1)) : last;
  stem = stem.replace(/[^\w.\-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').substring(0, 80);
  return stem ? `${stem}.${ext}` : '';
}

function uniqueFileName(name, used) {
  const dot = name.lastIndexOf('.');
  const stem = name.slice(0, dot);
  const ext = name.slice(dot);
  let candidate = name;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function offerZipOnPage(blob, filename) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const base64 = await blobToBase64(blob);
  const result = await runInPage(tab.id, showZipSaveButton, [base64, filename]);
  return !!result[0]?.result;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function showZipSaveButton(base64, filename) {
  try {
    document.getElementById('eco-zip-save')?.remove();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/zip' });

    const wrap = document.createElement('div');
    wrap.id = 'eco-zip-save';
    wrap.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:10px 12px;background:#1a6e9f;color:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.3);font:500 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
    const label = document.createElement('span');
    label.textContent = 'Image ZIP ready';
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = `Save ${filename}`;
    save.style.cssText = 'border:0;border-radius:6px;padding:6px 12px;background:#fff;color:#1a6e9f;font:600 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss');
    close.style.cssText = 'border:0;background:transparent;color:#fff;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', () => wrap.remove());

    save.addEventListener('click', async () => {
      try {
        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }] });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 120000);
        }
        label.textContent = 'Saved ✓';
        save.remove();
        setTimeout(() => wrap.remove(), 3000);
      } catch (err) {
        if (err.name !== 'AbortError') label.textContent = `Save failed: ${err.message}`;
      }
    });

    wrap.append(label, save, close);
    document.body.appendChild(wrap);
    return true;
  } catch (err) {
    return false;
  }
}
