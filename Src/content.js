// Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || window.location.href
    });
    return true;
  }
  if (request.action === 'probeImageDimensions') {
    probeImageDimensionsInPage(request.urls).then(sendResponse);
    return true; // keep message channel open for async response
  }
});

/**
 * Probe image dimensions from existing DOM <img> elements.
 * Instantly reads naturalWidth/naturalHeight — no network requests, no canvas.
 * Images not found in the DOM are left out of results (popup will handle via background).
 *
 * @param {string[]} urls - image URLs to probe
 * @returns {Promise<Object>} url -> { width, height }
 */
function probeImageDimensionsInPage(urls) {
  /* Build URL -> DOM <img> lookup */
  var urlToImg = {};
  var lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazy',
    'data-full-size', 'data-hi-res', 'data-original-src', 'data-zoom-src',
    'data-raw-src', 'data-actualsrc', 'data-url', 'data-image',
    'data-img-src', 'data-image-src'];
  document.querySelectorAll('img').forEach(function(img) {
    if (!(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return;
    var srcs = [img.src, img.currentSrc];
    lazyAttrs.forEach(function(attr) {
      var val = img.getAttribute(attr);
      if (val) srcs.push(val);
    });
    srcs.forEach(function(s) {
      if (!s) return;
      try {
        var full = new URL(s, document.baseURI).href;
        if (!urlToImg[full]) {
          urlToImg[full] = { width: img.naturalWidth, height: img.naturalHeight };
        }
      } catch (e) {}
    });
  });

  /* Match requested URLs against DOM lookup */
  var results = {};
  urls.forEach(function(url) {
    var dim = urlToImg[url];
    if (dim) {
      results[url] = dim;
    }
  });

  return Promise.resolve(results);
}
