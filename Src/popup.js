/* ============================================================
 * popup.js - Batch File Downloader (i18n + dark mode integrated)
 * ============================================================ */

/* ---- DOM References ---- */
var formatGrid     = document.getElementById('formatGrid');
var customExtInput = document.getElementById('customExt');
var addExtBtn      = document.getElementById('addExtBtn');
var tipBanner      = document.getElementById('tipBanner');
var closeTipBtn    = document.getElementById('closeTip');
var stealthDelay   = document.getElementById('stealthDelay');
var delayControl   = document.getElementById('delayControl');
var delayMin       = document.getElementById('delayMin');
var delayMax       = document.getElementById('delayMax');
var delayMinVal    = document.getElementById('delayMinVal');
var delayMaxVal    = document.getElementById('delayMaxVal');
var stealthShuffle = document.getElementById('stealthShuffle');
var stealthReferer = document.getElementById('stealthReferer');
var concurrency    = document.getElementById('concurrency');
var concurrencyVal = document.getElementById('concurrencyVal');
var subFolder      = document.getElementById('subFolder');
var filterInput    = document.getElementById('filterInput');
var fileCount      = document.getElementById('fileCount');
var selectAllBtn   = document.getElementById('selectAllBtn');
var deselectAllBtn = document.getElementById('deselectAllBtn');
var fileList       = document.getElementById('fileList');
var emptyState     = document.getElementById('emptyState');
var scanBtn        = document.getElementById('scanBtn');
var downloadBtn    = document.getElementById('downloadBtn');
var selectedCount  = document.getElementById('selectedCount');
var normalActions  = document.getElementById('normalActions');
var queueActions   = document.getElementById('queueActions');
var pauseBtn       = document.getElementById('pauseBtn');
var resumeBtn      = document.getElementById('resumeBtn');
var stopBtn        = document.getElementById('stopBtn');
var progressArea   = document.getElementById('progressArea');
var progressBar    = document.getElementById('progressBar');
var progressText   = document.getElementById('progressText');
var progressPercent= document.getElementById('progressPercent');
var logArea        = document.getElementById('logArea');
var langBtn        = document.getElementById('langBtn');
var langDropdown   = document.getElementById('langDropdown');
var currentLangSpn = document.getElementById('currentLangName');

/* Image filter elements */
var imageFilterSection = document.getElementById('imageFilterSection');
var imgMinWidth  = document.getElementById('imgMinWidth');
var imgMinHeight = document.getElementById('imgMinHeight');
var imgMaxWidth  = document.getElementById('imgMaxWidth');
var imgMaxHeight = document.getElementById('imgMaxHeight');

/* Filter toggle buttons */
var filterCaseSensitive = document.getElementById('filterCaseSensitive');
var filterWholeWord     = document.getElementById('filterWholeWord');
var filterRegex         = document.getElementById('filterRegex');
var filterError         = document.getElementById('filterError');

/* Tab & Settings elements */
var folderPickerBtn     = document.getElementById('folderPickerBtn');
var resetFiltersBtn     = document.getElementById('resetFiltersBtn');

/* ---- State ---- */
var allFiles = [];
var displayFiles = [];
var isScanning = false;
var isProbing = false;
var statusPolling = null;
var lastLogIdx = 0;
var hasImageFormats = false;

/* ============================================================
 * Initialization
 * ============================================================ */
I18N.init(function() {
  I18N.apply();
  rebindTipEvents();
  updateLangSelector();
  restoreSettings();
  updateImageFilterVisibility();
  checkQueueOnOpen();
});

/* ---- Language Selector ---- */
function updateLangSelector() {
  var langs = I18N.getList();
  var cur = I18N.getCur();
  currentLangSpn.textContent = (I18N.LANGS[cur] && I18N.LANGS[cur].name) || 'EN';
  langDropdown.innerHTML = '';
  langs.forEach(function(l) {
    var opt = document.createElement('div');
    opt.className = 'lang-option' + (l.code === cur ? ' active' : '');
    opt.textContent = l.name;
    if (l.code === cur) {
      opt.textContent = '';
      opt.appendChild(document.createTextNode(l.name + ' '));
      var check = document.createElement('span');
      check.className = 'check';
      check.textContent = '\u2713';
      opt.appendChild(check);
    }
    opt.addEventListener('click', function() {
      I18N.setLang(l.code);
      I18N.saveLang(l.code);
      I18N.apply();
      rebindTipEvents();
      updateLangSelector();
      langDropdown.classList.remove('open');
      /* Re-render file list with updated source labels */
      if (allFiles.length > 0) applyFilter();
    });
    langDropdown.appendChild(opt);
  });
}

langBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  langDropdown.classList.toggle('open');
});
document.addEventListener('click', function() {
  langDropdown.classList.remove('open');
  /* (no dropdown to close) */
});

/* ---- Tip banner events (must rebind after i18n apply) ---- */
function rebindTipEvents() {
  var link = document.getElementById('openSettings');
  if (link) {
    link.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) chrome.tabs.create({ url: 'chrome://settings/content/siteDetails?site=' + encodeURIComponent(new URL(tabs[0].url).origin) });
      });
    });
  }
  var close = document.getElementById('closeTip');
  if (close) {
    close.addEventListener('click', function() {
      tipBanner.style.display = 'none';
      chrome.storage.local.set({ tipClosed: true });
    });
  }
}
chrome.storage.local.get(['tipClosed'], function(r) {
  if (r.tipClosed) tipBanner.style.display = 'none';
});

/* ============================================================
 * Format Chips
 * ============================================================ */
formatGrid.addEventListener('click', function(e) {
  var chip = e.target.closest('.format-chip');
  if (!chip) return;
  chip.classList.toggle('active');
  updateImageFilterVisibility();
  saveSettings();
});

addExtBtn.addEventListener('click', function() {
  var val = customExtInput.value.trim().replace(/^\./, '').toLowerCase();
  if (!val) return;
  var exists = false;
  formatGrid.querySelectorAll('.format-chip').forEach(function(c) {
    if (c.dataset.ext === val) { c.classList.add('active'); exists = true; }
  });
  if (!exists) {
    var chip = document.createElement('span');
    chip.className = 'format-chip active';
    chip.dataset.ext = val;
    chip.textContent = val.toUpperCase();
    formatGrid.appendChild(chip);
  }
  customExtInput.value = '';
  updateImageFilterVisibility();
  saveSettings();
});

function getActiveExts() {
  var exts = [];
  formatGrid.querySelectorAll('.format-chip.active').forEach(function(c) {
    exts.push(c.dataset.ext.toLowerCase());
  });
  return exts;
}

function updateImageFilterVisibility() {
  var exts = getActiveExts();
  var imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tif', 'tiff', 'avif'];
  hasImageFormats = exts.some(function(e) { return imgExts.indexOf(e) >= 0; });
  imageFilterSection.style.display = hasImageFormats ? 'block' : 'none';
}

/* ============================================================
 * Stealth Controls
 * ============================================================ */
stealthDelay.addEventListener('change', function() {
  delayControl.style.display = stealthDelay.checked ? 'flex' : 'none';
  saveSettings();
});
delayMin.addEventListener('input', function() {
  if (parseInt(delayMin.value) > parseInt(delayMax.value)) delayMax.value = delayMin.value;
  delayMinVal.textContent = (delayMin.value / 1000).toFixed(1) + 's';
  delayMaxVal.textContent = (delayMax.value / 1000).toFixed(1) + 's';
  saveSettings();
});
delayMax.addEventListener('input', function() {
  if (parseInt(delayMax.value) < parseInt(delayMin.value)) delayMin.value = delayMax.value;
  delayMinVal.textContent = (delayMin.value / 1000).toFixed(1) + 's';
  delayMaxVal.textContent = (delayMax.value / 1000).toFixed(1) + 's';
  saveSettings();
});
stealthShuffle.addEventListener('change', saveSettings);
stealthReferer.addEventListener('change', saveSettings);
concurrency.addEventListener('input', function() {
  concurrencyVal.textContent = concurrency.value;
  saveSettings();
});
subFolder.addEventListener('input', saveSettings);

/* ============================================================
 * Image Filter Presets
 * ============================================================ */
document.querySelectorAll('.img-preset').forEach(function(btn) {
  btn.addEventListener('click', function() {
    imgMinWidth.value  = btn.dataset.minw || '';
    imgMinHeight.value = btn.dataset.minh || '';
    imgMaxWidth.value  = btn.dataset.maxw || '';
    imgMaxHeight.value = btn.dataset.maxh || '';
    if (btn.dataset.minw === '0') {
      imgMinWidth.value = ''; imgMinHeight.value = '';
      imgMaxWidth.value = ''; imgMaxHeight.value = '';
    }
    if (allFiles.length > 0) applyFilter();
    saveSettings();
  });
});
[imgMinWidth, imgMinHeight, imgMaxWidth, imgMaxHeight].forEach(function(el) {
  el.addEventListener('input', function() { if (allFiles.length > 0) applyFilter(); saveSettings(); });
});

/* ============================================================
 * Settings Save / Restore
 * ============================================================ */
function saveSettings() {
  var exts = getActiveExts();
  chrome.storage.local.set({
    formatExts: exts,
    stealthDelay: stealthDelay.checked,
    delayMin: delayMin.value,
    delayMax: delayMax.value,
    stealthShuffle: stealthShuffle.checked,
    stealthReferer: stealthReferer.checked,
    concurrency: concurrency.value,
    subFolder: subFolder.value,
    filterText: filterInput.value,
    filterCaseSensitiveOn: filterCaseSensitive.classList.contains('active'),
    filterWholeWordOn: filterWholeWord.classList.contains('active'),
    filterRegexOn: filterRegex.classList.contains('active'),
    imgMinW: imgMinWidth.value,
    imgMinH: imgMinHeight.value,
    imgMaxW: imgMaxWidth.value,
    imgMaxH: imgMaxHeight.value
  });
}

function restoreSettings() {
  chrome.storage.local.get([
    'formatExts', 'stealthDelay', 'delayMin', 'delayMax',
    'stealthShuffle', 'stealthReferer', 'concurrency', 'subFolder',
    'filterText', 'filterCaseSensitiveOn', 'filterWholeWordOn', 'filterRegexOn',
    'imgMinW', 'imgMinH', 'imgMaxW', 'imgMaxH'
  ], function(r) {
    if (r.formatExts) {
      formatGrid.querySelectorAll('.format-chip').forEach(function(c) {
        c.classList.toggle('active', r.formatExts.indexOf(c.dataset.ext) >= 0);
      });
    }
    if (r.stealthDelay !== undefined) stealthDelay.checked = r.stealthDelay;
    if (r.delayMin) { delayMin.value = r.delayMin; delayMinVal.textContent = (r.delayMin / 1000).toFixed(1) + 's'; }
    if (r.delayMax) { delayMax.value = r.delayMax; delayMaxVal.textContent = (r.delayMax / 1000).toFixed(1) + 's'; }
    if (r.stealthShuffle !== undefined) stealthShuffle.checked = r.stealthShuffle;
    if (r.stealthReferer !== undefined) stealthReferer.checked = r.stealthReferer;
    if (r.concurrency) { concurrency.value = r.concurrency; concurrencyVal.textContent = r.concurrency; }
    if (r.subFolder !== undefined) subFolder.value = r.subFolder;
    if (r.filterText !== undefined) filterInput.value = r.filterText;
    if (r.filterCaseSensitiveOn) filterCaseSensitive.classList.add('active');
    if (r.filterWholeWordOn) filterWholeWord.classList.add('active');
    if (r.filterRegexOn) filterRegex.classList.add('active');
    if (r.imgMinW) imgMinWidth.value = r.imgMinW;
    if (r.imgMinH) imgMinHeight.value = r.imgMinH;
    if (r.imgMaxW) imgMaxWidth.value = r.imgMaxW;
    if (r.imgMaxH) imgMaxHeight.value = r.imgMaxH;
    delayControl.style.display = stealthDelay.checked ? 'flex' : 'none';
    updateImageFilterVisibility();
  });
}

/* ============================================================
 * Scan Page
 * ============================================================ */
scanBtn.addEventListener('click', function() {
  if (isScanning) return;
  var exts = getActiveExts();
  if (exts.length === 0) {
    addLog(I18N.t('selectFormatErr'), 'error');
    return;
  }
  isScanning = true;
  scanBtn.disabled = true;
  scanBtn.querySelector('[data-i18n]').textContent = I18N.t('scanning');

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0]) {
      addLog(I18N.t('noTab'), 'error');
      resetScanBtn();
      return;
    }
    var tab = tabs[0];
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      addLog(I18N.t('internalPage'), 'error');
      resetScanBtn();
      return;
    }

    if (!chrome.scripting) {
      addLog(I18N.t('scriptingErr'), 'error');
      resetScanBtn();
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPage,
      args: [exts]
    }, function(results) {
      if (chrome.runtime.lastError) {
        addLog(I18N.fmt('scanFail', chrome.runtime.lastError.message), 'error');
        resetScanBtn();
        return;
      }
      if (!results || !results[0] || !results[0].result) {
        addLog(I18N.t('noMatch'), 'info');
        resetScanBtn();
        return;
      }
      var found = results[0].result;
      found.forEach(function(f) { f.pageUrl = tab.url; });
      allFiles = found;
      _thumbRulesSet = false; /* Reset so Referer rules get set for new scan */
      addLog(I18N.fmt('scanDone', found.length), 'success');

      /* Probe image dimensions if needed */
      var imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'tif', 'tiff', 'avif', 'svg'];
      var imgs = found.filter(function(f) {
        var ext = (f.name.split('.').pop() || '').toLowerCase();
        return imgExts.indexOf(ext) >= 0;
      });
      /* Only probe images that scanPage didn't already get dimensions for */
      var needProbe = imgs.filter(function(f) {
        return !(f.width > 0 && f.height > 0);
      });

      function afterDimensions() {
        applyFilter();
        resetScanBtn();
      }

      if (needProbe.length > 0) {
        isProbing = true;
        addLog(I18N.fmt('probingImg', needProbe.length), 'info');
        probeImageDimensions(tab.id, needProbe, function() {
          isProbing = false;
          addLog(I18N.t('probeDone'), 'success');
          afterDimensions();
        });
      } else {
        afterDimensions();
      }
    });
  });
});

function resetScanBtn() {
  isScanning = false;
  scanBtn.disabled = false;
  scanBtn.querySelector('[data-i18n]').textContent = I18N.t('scanBtn');
}

/* ---- scanPage injected into active tab ---- */
function scanPage(exts) {
  var results = [];
  var seen = {};
  var html = document.documentElement.outerHTML || '';
  var extSet = {};
  exts.forEach(function(e) { extSet[e] = true; });

  function add(url, source) {
    try {
      if (!url || typeof url !== 'string') return;
      url = url.trim();
      if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) return;
      var full = new URL(url, document.baseURI).href;
      if (seen[full]) return;
      var path = full.split('?')[0].split('#')[0];
      var name = path.split('/').pop() || '';
      if (!name) return;
      var ext = name.split('.').pop().toLowerCase();
      if (!extSet[ext]) return;
      seen[full] = true;
      results.push({ url: full, name: name, ext: ext, source: source });
    } catch (e) {}
  }

  /* Deep-add: unwrap URLs buried inside query parameters & encoded paths */
  function deepAdd(url, source) {
    add(url, source);
    try {
      if (!url || typeof url !== 'string') return;
      var full = new URL(url, document.baseURI).href;
      var u = new URL(full);
      /* Check each query param for embedded URLs */
      u.searchParams.forEach(function(val) {
        if (/^https?:\/\//i.test(val)) {
          add(val, source + '-deep');
        }
        /* Double-decode in case of URL-encoding */
        try {
          var decoded = decodeURIComponent(val);
          if (decoded !== val && /^https?:\/\//i.test(decoded)) {
            add(decoded, source + '-deep');
          }
        } catch (e) {}
      });
      /* Check if path contains encoded URL (common in CDN proxies) */
      var pathParts = u.pathname.split('/');
      pathParts.forEach(function(seg) {
        try {
          var decoded = decodeURIComponent(seg);
          if (/^https?:\/\//i.test(decoded)) {
            add(decoded, source + '-deep');
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  /* ========= 1. <a> links ========= */
  document.querySelectorAll('a[href]').forEach(function(a) {
    deepAdd(a.href, 'link');
  });

  /* ========= 2. <img> tags + srcset + all lazy-load variants ========= */
  var lazyAttrs = ['src', 'data-src', 'data-original', 'data-lazy-src',
    'data-lazy', 'data-full-size', 'data-hi-res', 'data-original-src',
    'data-zoom-src', 'data-large-file', 'data-medium-file',
    'data-fallback-src', 'data-raw-src', 'data-actualsrc', 'data-url',
    'data-image', 'data-img-src', 'data-image-src'];
  document.querySelectorAll('img').forEach(function(img) {
    lazyAttrs.forEach(function(attr) {
      var val = img.getAttribute(attr);
      if (val) add(val, 'image');
    });
    if (img.srcset) {
      img.srcset.split(',').forEach(function(s) {
        var u = s.trim().split(/\s+/)[0];
        if (u) add(u, 'srcset');
      });
    }
  });
  document.querySelectorAll('source[srcset]').forEach(function(src) {
    src.srcset.split(',').forEach(function(s) {
      var u = s.trim().split(/\s+/)[0];
      if (u) add(u, 'srcset');
    });
  });
  /* <picture> source with media queries */
  document.querySelectorAll('picture source[src]').forEach(function(s) {
    add(s.getAttribute('src'), 'image');
  });

  /* ========= 3. <video> / <audio> / <source> + poster ========= */
  document.querySelectorAll('video, audio').forEach(function(el) {
    if (el.src) add(el.src, 'media');
    if (el.poster) add(el.poster, 'media');
    if (el.getAttribute('data-src')) add(el.getAttribute('data-src'), 'media');
  });
  document.querySelectorAll('source[src]').forEach(function(el) {
    add(el.src, 'media');
  });
  /* <track> subtitles / captions */
  document.querySelectorAll('track[src]').forEach(function(el) {
    add(el.src, 'media');
  });

  /* ========= 4. <embed> / <object> / <applet> ========= */
  document.querySelectorAll('embed[src], object[data], applet[code], applet[archive]').forEach(function(el) {
    add(el.src || el.getAttribute('data') || el.getAttribute('code') || el.getAttribute('archive'), 'embed');
  });

  /* ========= 5. CSS background-image (computed) ========= */
  var allEls = document.querySelectorAll('*');
  for (var i = 0; i < Math.min(allEls.length, 2000); i++) {
    try {
      var bg = getComputedStyle(allEls[i]).backgroundImage;
      if (bg && bg !== 'none') {
        var urls = bg.match(/url\(["']?([^"')]+)["']?\)/g);
        if (urls) urls.forEach(function(u) {
          var m = u.match(/url\(["']?([^"')]+)["']?\)/);
          if (m) add(m[1], 'css-bg');
        });
      }
    } catch (e) {}
  }

  /* ========= 6. Inline style attributes ========= */
  document.querySelectorAll('[style]').forEach(function(el) {
    var st = el.getAttribute('style') || '';
    var urlMatches = st.match(/url\(["']?([^"')]+)["']?\)/gi);
    if (urlMatches) urlMatches.forEach(function(u) {
      var m = u.match(/url\(["']?([^"')]+)["']?\)/i);
      if (m) add(m[1], 'css-bg');
    });
  });

  /* ========= 7. <link> tags (preload, prefetch, icon, stylesheet) ========= */
  document.querySelectorAll('link[href]').forEach(function(el) {
    add(el.href, 'link-tag');
  });

  /* ========= 8. <meta> OG / Twitter / schema ========= */
  var metaSelectors = [
    'meta[property="og:image"]', 'meta[property="og:image:url"]',
    'meta[property="og:image:secure_url"]',
    'meta[property="og:video"]', 'meta[property="og:video:url"]',
    'meta[property="og:video:secure_url"]',
    'meta[property="og:audio"]', 'meta[property="og:audio:url"]',
    'meta[name="twitter:image"]', 'meta[name="twitter:image:src"]',
    'meta[name="twitter:player:stream"]',
    'meta[itemprop="image"]', 'meta[itemprop="contentUrl"]',
    'meta[itemprop="thumbnailUrl"]',
    'meta[name="thumbnail"]', 'meta[name="msapplication-TileImage"]'
  ];
  document.querySelectorAll(metaSelectors.join(',')).forEach(function(el) {
    var c = el.getAttribute('content');
    if (c) add(c, 'meta');
  });

  /* ========= 9. <iframe> src ========= */
  document.querySelectorAll('iframe[src]').forEach(function(el) {
    deepAdd(el.src, 'iframe');
  });

  /* ========= 10. Deep data-attribute scan on ALL elements ========= */
  var dataUrlPattern = /^(https?:)?\/\//i;
  document.querySelectorAll('*').forEach(function(el) {
    if (!el.dataset) return;
    for (var key in el.dataset) {
      try {
        var val = el.dataset[key];
        if (typeof val === 'string' && val.length > 5 && val.length < 2048) {
          if (dataUrlPattern.test(val)) {
            deepAdd(val, 'data-attr');
          }
          /* JSON array of URLs in data attributes */
          if (val.charAt(0) === '[' || val.charAt(0) === '{') {
            try {
              var obj = JSON.parse(val);
              var jsonStr = JSON.stringify(obj);
              var jsonUrls = jsonStr.match(/https?:\/\/[^\s"'<>\\]+/gi);
              if (jsonUrls) jsonUrls.forEach(function(u) { deepAdd(u, 'data-attr'); });
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  });

  /* ========= 11. <input> hidden values with URLs ========= */
  document.querySelectorAll('input[type="hidden"][value], input[data-url], input[data-src]').forEach(function(el) {
    var val = el.value || el.getAttribute('data-url') || el.getAttribute('data-src');
    if (val && dataUrlPattern.test(val)) {
      deepAdd(val, 'hidden');
    }
  });

  /* ========= 12. JSON-LD structured data ========= */
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function(el) {
    try {
      var text = el.textContent || '';
      var jsonUrls = text.match(/https?:\/\/[^\s"'<>\\]+/gi);
      if (jsonUrls) jsonUrls.forEach(function(u) {
        u = u.replace(/\\u002[Ff]/g, '/').replace(/\\+$/, '').replace(/"+$/, '');
        deepAdd(u, 'json-ld');
      });
    } catch (e) {}
  });

  /* ========= 13. Inline <script> variable / JSON sniffing ========= */
  document.querySelectorAll('script:not([src]):not([type="application/ld+json"])').forEach(function(el) {
    try {
      var text = el.textContent || '';
      if (text.length < 20 || text.length > 500000) return;
      /* Build regex for exact extensions to avoid massive false positives */
      var scriptPattern = new RegExp(
        '(?:https?:)?//[^\\s"\'<>\\\\]+\\.(' + exts.join('|') + ')(?:[?#][^\\s"\'<>\\\\]*)?',
        'gi'
      );
      var found = text.match(scriptPattern);
      if (found) found.forEach(function(u) {
        /* Clean escaped slashes from JSON strings */
        u = u.replace(/\\\//g, '/');
        if (u.indexOf('//') === 0) u = 'https:' + u;
        deepAdd(u, 'script');
      });
    } catch (e) {}
  });

  /* ========= 14. <noscript> content ========= */
  document.querySelectorAll('noscript').forEach(function(el) {
    try {
      var inner = el.textContent || el.innerHTML || '';
      if (inner.length < 10) return;
      /* Parse for src/href attributes */
      var attrUrls = inner.match(/(?:src|href|data-src|data-original|poster)\s*=\s*["']([^"']+)["']/gi);
      if (attrUrls) attrUrls.forEach(function(m) {
        var match = m.match(/=\s*["']([^"']+)["']/);
        if (match) add(match[1], 'noscript');
      });
      /* Also regex for full URLs */
      var noscriptPattern = new RegExp(
        'https?://[^\\s"\'<>]+\\.(' + exts.join('|') + ')(?:[?#][^\\s"\'<>]*)?',
        'gi'
      );
      var nUrls = inner.match(noscriptPattern);
      if (nUrls) nUrls.forEach(function(u) { add(u, 'noscript'); });
    } catch (e) {}
  });

  /* ========= 15. SVG <image> / <use> ========= */
  document.querySelectorAll('image[href], image[xlink\\:href], use[href], use[xlink\\:href]').forEach(function(el) {
    var href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href) add(href, 'svg');
  });

  /* ========= 16. CSS @import and url() in <style> tags ========= */
  document.querySelectorAll('style').forEach(function(el) {
    try {
      var css = el.textContent || '';
      var cssUrls = css.match(/url\(["']?([^"')]+)["']?\)/gi);
      if (cssUrls) cssUrls.forEach(function(u) {
        var m = u.match(/url\(["']?([^"')]+)["']?\)/i);
        if (m) add(m[1], 'css-bg');
      });
      var imports = css.match(/@import\s+["']([^"']+)["']/gi);
      if (imports) imports.forEach(function(u) {
        var m = u.match(/["']([^"']+)["']/);
        if (m) add(m[1], 'css-bg');
      });
    } catch (e) {}
  });

  /* ========= 17. Shadow DOM traversal ========= */
  function scanShadow(root) {
    try {
      root.querySelectorAll('*').forEach(function(el) {
        if (el.shadowRoot) {
          el.shadowRoot.querySelectorAll('img[src], a[href], video[src], audio[src], source[src]').forEach(function(inner) {
            var u = inner.src || inner.href;
            if (u) add(u, 'shadow');
          });
          scanShadow(el.shadowRoot);
        }
      });
    } catch (e) {}
  }
  scanShadow(document);

  /* ========= 18. Regex scan (full HTML, last resort) ========= */
  var pattern = new RegExp('https?://[^\\s"\'<>]+\\.(' + exts.join('|') + ')(?:[?#][^\\s"\'<>]*)?', 'gi');
  var matches = html.match(pattern);
  if (matches) matches.forEach(function(u) { add(u, 'regex'); });

  /* ========= 19. URL-encoded deep extraction from all found URLs ========= */
  /* Re-scan all results for wrap-style URLs (e.g. CDN/proxy) */
  var snapshot = results.slice();
  snapshot.forEach(function(item) {
    try {
      var u = new URL(item.url);
      /* Cloudflare/imgix/Akamai style: /cdn-cgi/image/w=800/https://real.com/photo.jpg */
      var pMatch = u.pathname.match(/(https?:\/\/.+)/i);
      if (pMatch) add(pMatch[1], item.source + '-unwrap');
      /* Google cache / redirectors: /url?q=https://... */
      var q = u.searchParams.get('q') || u.searchParams.get('url') || u.searchParams.get('imgurl') ||
              u.searchParams.get('target') || u.searchParams.get('redirect') || u.searchParams.get('goto') ||
              u.searchParams.get('link') || u.searchParams.get('file') || u.searchParams.get('path') ||
              u.searchParams.get('image') || u.searchParams.get('src') || u.searchParams.get('dest') ||
              u.searchParams.get('download') || u.searchParams.get('resource');
      if (q && /^https?:\/\//i.test(q)) add(q, item.source + '-unwrap');
    } catch (e) {}
  });

  /* ========= 20. Collect image dimensions from DOM ========= */
  var dimImgExts = {jpg:1,jpeg:1,png:1,gif:1,webp:1,bmp:1,ico:1,tif:1,tiff:1,avif:1,svg:1};
  var domDims = {};
  var dimLazyAttrs = ['data-src','data-original','data-lazy-src','data-lazy',
    'data-full-size','data-hi-res','data-original-src','data-zoom-src',
    'data-raw-src','data-actualsrc','data-url','data-image','data-img-src','data-image-src'];
  document.querySelectorAll('img').forEach(function(img) {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      var srcs = [img.src, img.currentSrc];
      dimLazyAttrs.forEach(function(a) {
        var v = img.getAttribute(a); if (v) srcs.push(v);
      });
      srcs.forEach(function(s) {
        if (!s) return;
        try {
          var full = new URL(s, document.baseURI).href;
          if (!domDims[full]) domDims[full] = { w: img.naturalWidth, h: img.naturalHeight };
        } catch(e) {}
      });
    }
  });
  results.forEach(function(r) {
    if (dimImgExts[r.ext]) {
      var d = domDims[r.url];
      if (d) { r.width = d.w; r.height = d.h; }
    }
  });

  return results;
}

/* ============================================================
 * Filter & Render
 * ============================================================ */
filterInput.addEventListener('input', function() { applyFilter(); saveSettings(); });

/* Toggle button handlers */
[filterCaseSensitive, filterWholeWord, filterRegex].forEach(function(btn) {
  btn.addEventListener('click', function() {
    btn.classList.toggle('active');
    applyFilter();
    saveSettings();
  });
});

/* Keyboard shortcuts: Alt+C, Alt+W, Alt+R */
filterInput.addEventListener('keydown', function(e) {
  if (e.altKey && e.key === 'c') { e.preventDefault(); filterCaseSensitive.classList.toggle('active'); applyFilter(); saveSettings(); }
  if (e.altKey && e.key === 'w') { e.preventDefault(); filterWholeWord.classList.toggle('active'); applyFilter(); saveSettings(); }
  if (e.altKey && e.key === 'r') { e.preventDefault(); filterRegex.classList.toggle('active'); applyFilter(); saveSettings(); }
});

function applyFilter() {
  var raw = filterInput.value.trim();
  var isCaseSensitive = filterCaseSensitive.classList.contains('active');
  var isWholeWord = filterWholeWord.classList.contains('active');
  var isRegex = filterRegex.classList.contains('active');
  var minW = parseInt(imgMinWidth.value) || 0;
  var minH = parseInt(imgMinHeight.value) || 0;
  var maxW = parseInt(imgMaxWidth.value) || 0;
  var maxH = parseInt(imgMaxHeight.value) || 0;

  /* Build matcher function */
  var matcher = null;
  filterError.classList.remove('show');
  filterError.textContent = '';
  filterInput.style.borderColor = '';

  if (raw) {
    try {
      if (isRegex) {
        if (raw.length > 200) {
          filterError.textContent = I18N.t('regexError');
          filterError.classList.add('show');
          filterInput.style.borderColor = '#d9534f';
          return;
        }
        var flags = isCaseSensitive ? '' : 'i';
        var pat = isWholeWord ? ('\\b' + raw + '\\b') : raw;
        var re = new RegExp(pat, flags);
        matcher = function(name) { return re.test(name); };
      } else {
        /* Plain text / glob: convert * and ? to regex equivalents */
        var hasGlob = raw.indexOf('*') >= 0 || raw.indexOf('?') >= 0;
        if (hasGlob || isWholeWord) {
          var escaped = raw.replace(/[.+^${}()|[\]\\]/g, '\\$&');
          escaped = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
          var flags2 = isCaseSensitive ? '' : 'i';
          var pat2 = isWholeWord ? ('^' + escaped + '$') : escaped;
          var re2 = new RegExp(pat2, flags2);
          matcher = function(name) { return re2.test(name); };
        } else {
          /* Simple substring */
          var kw = isCaseSensitive ? raw : raw.toLowerCase();
          matcher = function(name) {
            var n = isCaseSensitive ? name : name.toLowerCase();
            return n.indexOf(kw) >= 0;
          };
        }
      }
    } catch (e) {
      filterError.textContent = I18N.t('regexError') + ': ' + e.message;
      filterError.classList.add('show');
      filterInput.style.borderColor = '#d9534f';
      return;
    }
  }

  var dimImgExts = ['jpg','jpeg','png','gif','webp','bmp','ico','tif','tiff','avif','svg'];
  displayFiles = allFiles.filter(function(f) {
    if (matcher && !matcher(f.name)) return false;
    if (hasImageFormats && (minW || minH || maxW || maxH)) {
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      var isImage = dimImgExts.indexOf(ext) >= 0;
      if (isImage) {
        if (f.width === undefined || f.height === undefined) {
          /* Probing still in progress ¡ª keep the file temporarily */
          if (isProbing) return true;
          /* Probe finished but no dimensions (failed/timeout) ¡ª exclude */
          return false;
        }
        if (minW && f.width < minW) return false;
        if (minH && f.height < minH) return false;
        if (maxW && f.width > maxW) return false;
        if (maxH && f.height > maxH) return false;
      }
    }
    return true;
  });

  if (displayFiles.length === 0 && allFiles.length > 0) {
    fileCount.textContent = I18N.fmt('noMatchCount', allFiles.length);
  } else if (allFiles.length === 0) {
    fileCount.textContent = I18N.t('notScanned');
  } else {
    fileCount.textContent = I18N.fmt('totalFiles', displayFiles.length);
  }

  /* Before rendering, ensure Referer rules are set for image domains */
  ensureThumbReferers(function() {
    renderFileList();
  });
}

/* Set Referer rules for image thumbnails before rendering */
var _thumbRulesSet = false;
function ensureThumbReferers(callback) {
  if (_thumbRulesSet) { callback(); return; }
  var thumbExtsCheck = {jpg:1,jpeg:1,png:1,gif:1,webp:1,bmp:1,ico:1,tif:1,tiff:1,avif:1,svg:1};
  var imgUrls = allFiles.filter(function(f) {
    return thumbExtsCheck[f.ext.toLowerCase()] === 1;
  }).map(function(f) { return f.url; });
  var pageUrl = allFiles.length > 0 ? allFiles[0].pageUrl : '';
  if (imgUrls.length > 0 && pageUrl) {
    chrome.runtime.sendMessage({ action: 'setThumbReferers', urls: imgUrls, pageUrl: pageUrl }, function() {
      _thumbRulesSet = true;
      callback();
    });
  } else {
    callback();
  }
}

function renderFileList() {
  fileList.innerHTML = '';
  if (displayFiles.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'var(--text-dim)');
    svg.setAttribute('stroke-width', '1.5');
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    svg.appendChild(circle);
    var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', '21');
    ln.setAttribute('y1', '21');
    ln.setAttribute('x2', '16.65');
    ln.setAttribute('y2', '16.65');
    svg.appendChild(ln);
    empty.appendChild(svg);
    var msgDiv = document.createElement('div');
    msgDiv.textContent = allFiles.length > 0 ? I18N.t('noMatch') : I18N.t('emptyHint');
    empty.appendChild(msgDiv);
    fileList.appendChild(empty);
    updateSelectedCount();
    return;
  }
  var thumbExts = {jpg:1,jpeg:1,png:1,gif:1,webp:1,bmp:1,ico:1,tif:1,tiff:1,avif:1,svg:1};
  displayFiles.forEach(function(f, i) {
    var item = document.createElement('div');
    item.className = 'file-item';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = f.checked !== false;
    cb.addEventListener('change', function() {
      f.checked = cb.checked;
      updateSelectedCount();
    });
    item.appendChild(cb);

    /* Thumbnail for image files */
    var isImg = thumbExts[f.ext.toLowerCase()] === 1;
    if (isImg) {
      var thumb = document.createElement('img');
      thumb.className = 'file-thumb loading';
      thumb.src = f.url;
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.addEventListener('load', function() { thumb.classList.remove('loading'); });
      thumb.addEventListener('error', (function(fileObj, imgEl) {
        return function() {
          if (imgEl.dataset.retried) { imgEl.classList.add('error'); return; }
          imgEl.dataset.retried = '1';
          /* Direct load failed (anti-hotlink/CORS) - ask background to fetch with correct Referer */
          chrome.runtime.sendMessage({ action: 'fetchImageAsDataUrl', url: fileObj.url, pageUrl: fileObj.pageUrl }, function(resp) {
            if (resp && resp.dataUrl) {
              imgEl.src = resp.dataUrl;
            } else {
              imgEl.classList.add('error');
            }
          });
        };
      })(f, thumb));
      thumb.addEventListener('mouseenter', function(e) { showThumbPreview(f.url, e); });
      thumb.addEventListener('mousemove', function(e) { moveThumbPreview(e); });
      thumb.addEventListener('mouseleave', function() { hideThumbPreview(); });
      item.appendChild(thumb);
    } else {
      var ph = document.createElement('span');
      ph.className = 'file-thumb-placeholder';
      item.appendChild(ph);
    }

    var sourceSpan = document.createElement('span');
    sourceSpan.className = 'file-source src-' + f.source;
    sourceSpan.textContent = getSourceLabel(f.source);
    item.appendChild(sourceSpan);

    var nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = f.name;
    nameSpan.title = f.url;
    item.appendChild(nameSpan);

    if (f.width !== undefined && f.height !== undefined) {
      var dimSpan = document.createElement('span');
      dimSpan.className = 'file-dim';
      dimSpan.textContent = f.width + '\u00d7' + f.height;
      item.appendChild(dimSpan);
    }

    var extSpan = document.createElement('span');
    extSpan.className = 'file-ext';
    extSpan.textContent = f.ext;
    item.appendChild(extSpan);

    fileList.appendChild(item);
  });
  updateSelectedCount();
}

/* ---- Thumbnail hover preview ---- */
var _previewEl = null;
function showThumbPreview(url, e) {
  if (!_previewEl) {
    _previewEl = document.createElement('div');
    _previewEl.className = 'thumb-preview';
    _previewEl.appendChild(document.createElement('img'));
    document.body.appendChild(_previewEl);
  }
  _previewEl.querySelector('img').src = url;
  _previewEl.classList.add('show');
  moveThumbPreview(e);
}
function moveThumbPreview(e) {
  if (!_previewEl) return;
  var x = e.clientX + 12;
  var y = e.clientY + 12;
  var w = document.documentElement.clientWidth;
  var h = document.documentElement.clientHeight;
  if (x + 330 > w) x = e.clientX - 330;
  if (y + 330 > h) y = e.clientY - 330;
  if (x < 0) x = 4;
  if (y < 0) y = 4;
  _previewEl.style.left = x + 'px';
  _previewEl.style.top = y + 'px';
}
function hideThumbPreview() {
  if (_previewEl) _previewEl.classList.remove('show');
}

function getSourceLabel(src) {
  /* Normalize deep/unwrap variants to base type for display */
  var base = src.replace(/-deep$/, '').replace(/-unwrap$/, '');
  var map = {
    'link': I18N.t('srcLink'),
    'image': I18N.t('srcImage'),
    'media': I18N.t('srcMedia'),
    'css-bg': 'CSS',
    'embed': I18N.t('srcEmbed'),
    'srcset': 'srcset',
    'regex': I18N.t('srcRegex'),
    'link-tag': I18N.t('srcLinkTag'),
    'meta': I18N.t('srcMeta'),
    'iframe': 'iframe',
    'data-attr': I18N.t('srcDataAttr'),
    'hidden': I18N.t('srcHidden'),
    'json-ld': 'JSON-LD',
    'script': I18N.t('srcScript'),
    'noscript': 'noscript',
    'svg': 'SVG',
    'shadow': I18N.t('srcShadow')
  };
  var label = map[base] || map[src] || base;
  if (src.indexOf('-deep') >= 0 || src.indexOf('-unwrap') >= 0) {
    label += ' \u00b7 ' + I18N.t('srcDeep');
  }
  return label;
}

function updateSelectedCount() {
  var sel = displayFiles.filter(function(f) { return f.checked !== false; });
  selectedCount.textContent = sel.length;
  downloadBtn.disabled = sel.length === 0;
}

selectAllBtn.addEventListener('click', function() {
  displayFiles.forEach(function(f) { f.checked = true; });
  renderFileList();
});
deselectAllBtn.addEventListener('click', function() {
  displayFiles.forEach(function(f) { f.checked = false; });
  renderFileList();
});

/* ============================================================
 * Batch Thumbnail Fetching (via background service worker)
 * ============================================================
 * Background service worker has full <all_urls> host permissions.
 * It fetches each image, uses createImageBitmap + OffscreenCanvas
 * to generate a small JPEG data-URL thumbnail. Data URLs are
 * always loadable by <img> regardless of CSP or CORS.
 * ============================================================ */
function batchFetchThumbnails(imgs, callback) {
  var BATCH = 3;
  var idx = 0;
  function nextBatch() {
    if (idx >= imgs.length) { callback(); return; }
    var batch = imgs.slice(idx, idx + BATCH);
    idx += BATCH;
    var urls = batch.map(function(f) { return f.url; });
    chrome.runtime.sendMessage({ action: 'probeImages', urls: urls }, function(results) {
      if (chrome.runtime.lastError) results = {};
      if (!results) results = {};
      batch.forEach(function(f) {
        var r = results[f.url];
        if (r && r.thumbUrl) {
          f.thumbUrl = r.thumbUrl;
          /* Also fill in dimensions if still missing */
          if (!(f.width > 0) && r.width > 0) f.width = r.width;
          if (!(f.height > 0) && r.height > 0) f.height = r.height;
        }
      });
      nextBatch();
    });
  }
  nextBatch();
}

/* ============================================================
 * Image Dimension Probing (via content script + background)
 * ============================================================
 * 1. Ask content script for DOM-based dimensions (instant)
 * 2. For remaining images, ask background (service worker) to
 *    fetch & probe — it has full host permissions (bypasses CORS)
 * ============================================================ */
function probeImageDimensions(tabId, imgs, callback) {
  var urls = imgs.map(function(f) { return f.url; });

  /* Phase 1: content script DOM lookup */
  chrome.tabs.sendMessage(tabId, { action: 'probeImageDimensions', urls: urls }, function(csResults) {
    if (chrome.runtime.lastError) csResults = {};
    if (!csResults) csResults = {};

    var remaining = [];
    imgs.forEach(function(f) {
      var dim = csResults[f.url];
      if (dim && dim.width > 0 && dim.height > 0) {
        f.width = dim.width;
        f.height = dim.height;
      } else {
        remaining.push(f);
      }
    });

    if (remaining.length === 0) { callback(); return; }

    /* Phase 2: background service worker fetch (has host permissions) */
    var remUrls = remaining.map(function(f) { return f.url; });
    var pageUrl = remaining.length > 0 ? remaining[0].pageUrl : '';
    chrome.runtime.sendMessage({ action: 'probeImages', urls: remUrls, pageUrl: pageUrl }, function(bgResults) {
      if (chrome.runtime.lastError) bgResults = {};
      if (!bgResults) bgResults = {};

      remaining.forEach(function(f) {
        var dim = bgResults[f.url];
        if (dim && dim.width > 0 && dim.height > 0) {
          f.width = dim.width;
          f.height = dim.height;
          f.thumbUrl = dim.thumbUrl || null;
        } else {
          f.width = -1;
          f.height = -1;
          f.thumbUrl = null;
        }
      });
      callback();
    });
  });
}

/* ============================================================
 * Download
 * ============================================================ */
downloadBtn.addEventListener('click', function() {
  var selected = displayFiles.filter(function(f) { return f.checked !== false; });
  if (selected.length === 0) return;

  var settings = {
    delay: stealthDelay.checked,
    delayMin: parseInt(delayMin.value),
    delayMax: parseInt(delayMax.value),
    shuffle: stealthShuffle.checked,
    referer: stealthReferer.checked,
    concurrency: parseInt(concurrency.value),
    subFolder: subFolder.value.trim()
  };

  saveSettings();
  /* subFolder saved via saveSettings() above */

  chrome.runtime.sendMessage({
    action: (statusPolling ? 'appendQueue' : 'startQueue'),
    files: selected,
    settings: settings
  }, function(resp) {
    if (chrome.runtime.lastError) {
      addLog(I18N.fmt('startFail', chrome.runtime.lastError.message), 'error');
      return;
    }
    if (!statusPolling) {
      addLog(I18N.fmt('appendedQueue', selected.length), 'success');
    }
    showQueueUI();
    startPolling();
  });
});

/* ============================================================
 * Queue Controls
 * ============================================================ */
pauseBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'pauseQueue' });
});
resumeBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'resumeQueue' });
});
stopBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'stopQueue' });
});

function showQueueUI() {
  normalActions.style.display = 'none';
  queueActions.style.display = 'flex';
  progressArea.classList.add('active');
  logArea.classList.add('active');
  progressText.textContent = I18N.t('preparing');
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';
}

function hideQueueUI() {
  normalActions.style.display = 'flex';
  queueActions.style.display = 'none';
}

function checkQueueOnOpen() {
  chrome.runtime.sendMessage({ action: 'getQueueStatus' }, function(st) {
    if (chrome.runtime.lastError || !st) return;
    if (st.status === 'downloading' || st.status === 'paused') {
      showQueueUI();
      startPolling();
    }
  });
}

/* ---- Polling ---- */
function startPolling() {
  if (statusPolling) return;
  lastLogIdx = 0;
  statusPolling = setInterval(pollStatus, 600);
  pollStatus();
}

function stopPolling() {
  if (statusPolling) { clearInterval(statusPolling); statusPolling = null; }
}

function pollStatus() {
  chrome.runtime.sendMessage({ action: 'getQueueStatus' }, function(st) {
    if (chrome.runtime.lastError || !st) return;
    updateUIFromStatus(st);
    syncLogs(st.logs);
  });
}

function updateUIFromStatus(st) {
  if (st.status === 'downloading') {
    pauseBtn.style.display = '';
    resumeBtn.style.display = 'none';
  } else if (st.status === 'paused') {
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = '';
  }

  var done = st.completed + st.failed;
  var total = st.total || 1;
  var pct = Math.round((done / total) * 100);
  progressBar.style.width = pct + '%';
  progressPercent.textContent = pct + '%';
  progressText.textContent = I18N.fmt('progressFmt', done, total, st.completed, st.failed);

  if (st.status === 'idle' && done > 0) {
    stopPolling();
    hideQueueUI();
    progressArea.classList.add('active');
    logArea.classList.add('active');
  }
}

function syncLogs(logs) {
  if (!logs) return;
  for (var i = lastLogIdx; i < logs.length; i++) {
    var entry = logs[i];
    var line = document.createElement('div');
    line.className = 'log-item' + (entry.type ? ' ' + entry.type : '');
    line.textContent = '[' + entry.time + '] ' + entry.msg;
    logArea.appendChild(line);
  }
  lastLogIdx = logs.length;
  logArea.scrollTop = logArea.scrollHeight;
}

/* ============================================================
 * Local Log
 * ============================================================ */
function addLog(msg, type) {
  logArea.classList.add('active');
  var t = new Date().toLocaleTimeString('en-US', { hour12: false });
  var line = document.createElement('div');
  line.className = 'log-item' + (type ? ' ' + type : '');
  line.textContent = '[' + t + '] ' + msg;
  logArea.appendChild(line);
  logArea.scrollTop = logArea.scrollHeight;
}

/* ============================================================
 * Tab Switching
 * ============================================================ */
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b === btn); });
    document.querySelectorAll('.tab-content').forEach(function(tc) {
      var target = 'tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1);
      var isActive = tc.id === target;
      tc.classList.toggle('active', isActive);
      tc.style.display = isActive ? 'block' : 'none';
    });
  });
});

/* ============================================================
 * Folder Picker (File System Access API)
 * ============================================================ */
if (folderPickerBtn) {
  folderPickerBtn.addEventListener('click', async function(e) {
    e.stopPropagation();
    try {
      var dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      if (dirHandle && dirHandle.name) {
        subFolder.value = dirHandle.name;
        saveSettings();
      }
    } catch (err) {
      /* User cancelled or API not supported - silently ignore */
    }
  });
}

/* ============================================================
 * Reset All Filters
 * ============================================================ */
var DEFAULT_EXTS = ['jpg', 'png'];

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', function() {
    /* Reset format chips to defaults */
    formatGrid.querySelectorAll('.format-chip').forEach(function(c) {
      c.classList.toggle('active', DEFAULT_EXTS.indexOf(c.dataset.ext) >= 0);
    });
    /* Reset filter input */
    filterInput.value = '';
    filterCaseSensitive.classList.remove('active');
    filterWholeWord.classList.remove('active');
    filterRegex.classList.remove('active');
    filterError.classList.remove('show');
    filterError.textContent = '';
    filterInput.style.borderColor = '';
    /* Reset image dimensions */
    imgMinWidth.value = '';
    imgMinHeight.value = '';
    imgMaxWidth.value = '';
    imgMaxHeight.value = '';
    /* Reset stealth to defaults */
    stealthDelay.checked = true;
    delayMin.value = 300;
    delayMax.value = 1500;
    delayMinVal.textContent = '0.3s';
    delayMaxVal.textContent = '1.5s';
    delayControl.style.display = 'flex';
    stealthShuffle.checked = true;
    stealthReferer.checked = true;
    concurrency.value = 2;
    concurrencyVal.textContent = '2';
    subFolder.value = 'BatchDownload';
    /* Save and update */
    updateImageFilterVisibility();
    saveSettings();
    if (allFiles.length > 0) applyFilter();
    addLog(I18N.t('resetFiltersDone'), 'success');
  });
}
