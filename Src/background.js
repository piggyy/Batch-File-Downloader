/**
 * Background Service Worker (Manifest V3)
 * Download queue management, referer injection, notifications
 */
importScripts('i18n.js');

/* Init i18n for background */
(function() {
  var nav = (typeof navigator !== 'undefined') ? (navigator.language || 'en') : 'en';
  I18N.setLang(I18N.detectLang ? I18N.detectLang() : 'en');
  try {
    chrome.storage.local.get(['userLang'], function(r) {
      if (r && r.userLang) I18N.setLang(r.userLang);
    });
  } catch(e) {}
})();

/* ---- Referer Management ---- */
var ruleIdCounter = 1;
var activeRules = new Map();

/* ---- Download Queue ---- */
var queue = {
  status: 'idle',
  files: [],
  settings: {},
  idx: 0,
  completed: 0,
  failed: 0,
  total: 0,
  logs: [],
  activeWorkers: 0,
  pauseResolvers: []
};

/* ---- Message Router ---- */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (sender.id !== chrome.runtime.id) return;
  var act = message.action;
  if (act === 'startQueue') {
    startQueue(message.files, message.settings);
    sendResponse({ ok: true });
  } else if (act === 'appendQueue') {
    appendToQueue(message.files, message.settings);
    sendResponse({ ok: true });
  } else if (act === 'pauseQueue') {
    pauseQueue();
    sendResponse({ ok: true });
  } else if (act === 'resumeQueue') {
    resumeQueue();
    sendResponse({ ok: true });
  } else if (act === 'stopQueue') {
    stopQueue();
    sendResponse({ ok: true });
  } else if (act === 'getQueueStatus') {
    sendResponse(getQueueStatus());
  }
  return false;
});

/* ---- Queue Log ---- */
function addQueueLog(msg, type) {
  var t = new Date().toLocaleTimeString('en-US', { hour12: false });
  queue.logs.push({ time: t, msg: msg, type: type });
  if (queue.logs.length > 500) queue.logs = queue.logs.slice(-300);
}

function getQueueStatus() {
  return {
    status: queue.status,
    completed: queue.completed,
    failed: queue.failed,
    total: queue.total,
    logs: queue.logs
  };
}

/* ---- Start Queue ---- */
function startQueue(files, settings) {
  if (queue.status !== 'idle') {
    queue.status = 'idle';
    var old = queue.pauseResolvers.splice(0);
    old.forEach(function(r) { r(); });
  }

  queue.files = files.slice();

  var seen = {};
  queue.files = queue.files.filter(function(f) {
    if (seen[f.url]) return false;
    seen[f.url] = true;
    return true;
  });

  queue.settings = settings;
  queue.idx = 0;
  queue.completed = 0;
  queue.failed = 0;
  queue.total = files.length;
  queue.logs = [];
  queue.activeWorkers = 0;
  queue.pauseResolvers = [];
  queue.status = 'downloading';

  if (settings.shuffle) {
    for (var i = queue.files.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = queue.files[i];
      queue.files[i] = queue.files[j];
      queue.files[j] = tmp;
    }
    addQueueLog(I18N.t('bgShuffled'), 'info');
  }

  addQueueLog(I18N.fmt('bgStartDl', files.length, settings.concurrency || 2), 'info');

  try { chrome.downloads.setUiOptions({ enabled: false }); } catch(e) {}

  processQueue();
}

/* ---- Append to Queue ---- */
function appendToQueue(files, settings) {
  if (queue.status !== 'downloading' && queue.status !== 'paused') {
    startQueue(files, settings);
    return;
  }

  var existingUrls = {};
  queue.files.forEach(function(f) { existingUrls[f.url] = true; });
  var newFiles = files.filter(function(f) { return !existingUrls[f.url]; });

  if (newFiles.length < files.length) {
    var skipped = files.length - newFiles.length;
    addQueueLog(I18N.fmt('bgSkipDup', skipped), 'info');
  }
  if (newFiles.length === 0) {
    addQueueLog(I18N.t('bgAllDup'), 'info');
    return;
  }

  if (settings.shuffle) {
    for (var i = newFiles.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = newFiles[i]; newFiles[i] = newFiles[j]; newFiles[j] = tmp;
    }
  }

  queue.files = queue.files.concat(newFiles);
  queue.total += newFiles.length;

  if (settings.subFolder) {
    queue.settings.subFolder = settings.subFolder;
  }

  addQueueLog(I18N.fmt('bgAppended', newFiles.length, queue.total), 'info');
}

/* ---- Process Queue ---- */
async function processQueue() {
  var c = queue.settings.concurrency || 2;
  var workers = [];
  for (var w = 0; w < c; w++) {
    workers.push(runWorker());
  }
  await Promise.all(workers);

  if (queue.status === 'downloading') {
    onQueueComplete();
  } else if (queue.status === 'idle') {
    try { chrome.downloads.setUiOptions({ enabled: true }); } catch(e) {}
  }
}

async function runWorker() {
  queue.activeWorkers++;
  try {
    while (true) {
      while (queue.status === 'paused') {
        await new Promise(function(resolve) {
          queue.pauseResolvers.push(resolve);
        });
      }
      if (queue.status === 'idle') break;

      var fileIdx = queue.idx++;
      if (fileIdx >= queue.files.length) break;

      var file = queue.files[fileIdx];

      if (queue.settings.delay && (queue.completed + queue.failed) > 0) {
        var delayMs = randomBetween(queue.settings.delayMin || 300, queue.settings.delayMax || 1500);
        addQueueLog(I18N.fmt('bgWait', (delayMs / 1000).toFixed(1)), 'info');
        await sleep(delayMs);
        while (queue.status === 'paused') {
          await new Promise(function(resolve) {
            queue.pauseResolvers.push(resolve);
          });
        }
        if (queue.status === 'idle') break;
      }

      try {
        var subFolder = queue.settings.subFolder ? queue.settings.subFolder.replace(/[\\\\/]+$/, '') + '/' : '';
        var safeName = sanitizeFilename(subFolder + file.name, true);

        if (queue.settings.referer && file.pageUrl) {
          await setRefererRule(file.url, file.pageUrl);
        }

        await doDownload(file.url, safeName);
        queue.completed++;
        addQueueLog('\u2713 ' + file.name, 'success');
      } catch (err) {
        queue.failed++;
        addQueueLog('\u2717 ' + file.name + ': ' + (err.message || 'Unknown'), 'error');
      }
    }
  } finally {
    queue.activeWorkers--;
  }
}

function doDownload(url, filename) {
  return new Promise(function(resolve, reject) {
    if (!/^https?:\/\//i.test(url)) {
      reject(new Error('Invalid URL scheme, only http/https allowed'));
      return;
    }
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (downloadId === undefined) {
        reject(new Error('Download failed'));
      } else {
        setTimeout(function() { cleanupRefererRule(url); }, 10000);
        resolve(downloadId);
      }
    });
  });
}

/* ---- Pause / Resume / Stop ---- */
function pauseQueue() {
  if (queue.status === 'downloading') {
    queue.status = 'paused';
    addQueueLog(I18N.t('bgPaused'), 'info');
  }
}

function resumeQueue() {
  if (queue.status === 'paused') {
    queue.status = 'downloading';
    addQueueLog(I18N.t('bgResumed'), 'info');
    var resolvers = queue.pauseResolvers.splice(0);
    resolvers.forEach(function(r) { r(); });
  }
}

function stopQueue() {
  var wasActive = queue.status !== 'idle';
  queue.status = 'idle';
  var resolvers = queue.pauseResolvers.splice(0);
  resolvers.forEach(function(r) { r(); });
  if (wasActive) {
    addQueueLog(I18N.fmt('bgStopped', queue.completed, queue.total), 'error');
  }
  try { chrome.downloads.setUiOptions({ enabled: true }); } catch(e) {}
}

function onQueueComplete() {
  queue.status = 'idle';
  var msg = I18N.fmt('bgComplete', queue.completed, queue.failed);
  addQueueLog(msg, queue.completed > 0 ? 'success' : 'error');

  try { chrome.downloads.setUiOptions({ enabled: true }); } catch(e) {}

  try {
    chrome.notifications.create('dl-done-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: I18N.t('bgNotifTitle'),
      message: I18N.fmt('bgNotifMsg', queue.completed, queue.failed)
    });
  } catch (e) {
    /* Notification error silenced for production */
  }
}

/* ---- Referer Management ---- */
async function setRefererRule(url, referer) {
  var ruleId = ruleIdCounter++;
  if (ruleIdCounter > 1000000) ruleIdCounter = 1;

  /* Avoid ID collision with active rules */
  var existingIds = new Set(activeRules.values());
  var attempts = 0;
  while (existingIds.has(ruleId) && attempts < 100) {
    ruleId = ruleIdCounter++;
    if (ruleIdCounter > 1000000) ruleIdCounter = 1;
    attempts++;
  }

  await cleanupRefererRule(url);
  activeRules.set(url, ruleId);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: ruleId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: referer },
            { header: 'Origin', operation: 'set', value: new URL(referer).origin }
          ]
        },
        condition: {
          regexFilter: url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          resourceTypes: ['other', 'xmlhttprequest', 'image', 'media', 'font', 'stylesheet', 'script']
        }
      }],
      removeRuleIds: [ruleId]
    });
  } catch (e) {
    /* Referer rule error silenced for production */
  }
}

async function cleanupRefererRule(url) {
  var ruleId = activeRules.get(url);
  if (ruleId) {
    activeRules.delete(url);
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [ruleId] });
    } catch(e) {}
  }
}

setInterval(async function() {
  try {
    var rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (rules.length > 50) {
      var ids = rules.slice(0, rules.length - 10).map(function(r) { return r.id; });
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
    }
  } catch(e) {}
}, 60000);

/* ---- Utilities ---- */
function sanitizeFilename(name, keepPath) {
  if (!name) return 'download';
  if (keepPath) {
    var parts = name.replace(/\\/g, '/').split('/');
    var cleaned = parts.map(function(p) {
      p = p.split('?')[0].split('#')[0];
      try { p = decodeURIComponent(p); } catch(e) {}
      return p.replace(/[<>:"|?*]/g, '_');
    }).filter(function(p) { return p && p !== '..' && p !== '.'; });
    if (!cleaned.length) return 'download';
    var last = cleaned.pop();
    if (last.length > 200) {
      var ext = last.split('.').pop();
      last = last.substring(0, 190) + '.' + ext;
    }
    cleaned.push(last);
    return cleaned.join('/');
  }
  name = name.split('/').pop().split('\\').pop();
  name = name.split('?')[0].split('#')[0];
  try { name = decodeURIComponent(name); } catch(e) {}
  name = name.replace(/[<>:"/\\|?*]/g, '_');
  if (name.length > 200) {
    var ext2 = name.split('.').pop();
    name = name.substring(0, 190) + '.' + ext2;
  }
  return name || 'download';
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

chrome.downloads.onChanged.addListener(function(delta) {
  /* Download state tracking (logs removed for production security) */
});

chrome.runtime.onInstalled.addListener(async function() {
  try {
    var rules = await chrome.declarativeNetRequest.getDynamicRules();
    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(function(r) { return r.id; })
      });
    }
  } catch(e) {}
});
