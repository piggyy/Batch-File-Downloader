# Batch File Downloader

> Smart batch download files from any web page with anti-detection — Chrome Extension (Manifest V3)

![Chrome](https://img.shields.io/badge/Chrome-MV3-brightgreen) ![Languages](https://img.shields.io/badge/i18n-17%20languages-blue) ![License](https://img.shields.io/badge/license-MIT-orange)

## Features

### Intelligent Page Scanning

Automatically detects downloadable resources from **19 different sources** on any web page:

| Source | Description |
|--------|-------------|
| Links | `<a href>` hyperlinks |
| Images | `<img>` tags + 18 lazy-load attributes (`data-src`, `data-original`, etc.) |
| Srcset | `<img srcset>`, `<source srcset>`, `<picture>` |
| Media | `<video>`, `<audio>`, `<source>`, `<track>`, poster |
| Embed | `<embed>`, `<object>`, `<applet>` |
| CSS Background | Computed `background-image` from DOM + `<style>` + inline styles + `@import` |
| Link Tags | `<link href>` (preload / prefetch / icon / stylesheet) |
| Meta | Open Graph / Twitter Card / Schema.org meta tags |
| Iframe | `<iframe src>` |
| Data Attributes | All `data-*` attributes with URL detection + JSON parsing |
| Hidden Inputs | `<input type="hidden">` containing URLs |
| JSON-LD | `<script type="application/ld+json">` structured data |
| Inline Scripts | Regex-matched URLs in `<script>` blocks |
| Noscript | URLs inside `<noscript>` |
| SVG | `<image>` / `<use>` href / xlink:href |
| Shadow DOM | Recursive traversal of shadow roots |
| Regex Fallback | Full-page HTML regex scan |
| Deep URL | Nested URLs in query parameters and paths |
| CDN Unwrap | Decode CDN/proxy wrapped URLs (Cloudflare, imgix, Google cache, etc.) |

### File Format Support

**22 built-in formats** organized by category:

- **Images:** JPG, PNG, GIF, WebP, SVG, ICO
- **Documents:** PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- **Media:** MP3, MP4, WAV, AVI
- **Archives:** ZIP, RAR, 7Z
- **Custom:** Add any file extension you need

### Powerful Filtering

| Filter | Description |
|--------|-------------|
| Text Search | Filename substring matching |
| Glob Patterns | Wildcards with `*` and `?` |
| Regular Expressions | Toggle with button or `Alt+R` |
| Case Sensitive | Toggle with `Alt+C` |
| Whole Word | Toggle with `Alt+W` |
| Image Dimensions | Min/max width and height filters |
| Quick Presets | ≥100px, ≥300px, ≥500px, ≥1024×768, ≥1080p |

Image dimensions are automatically probed by loading images in the background (batch of 10, 5s timeout per image).

### ? Anti-Detection (Stealth Mode)

Avoid triggering download rate limits or bot detection:

- **Random Delay** — Configurable range from 0.1s to 5.0s between downloads
- **Random Order** — Fisher-Yates shuffle to randomize download sequence
- **Referer Spoofing** — Dynamically injects `Referer` and `Origin` headers via `declarativeNetRequest`
- **Concurrency Control** — Limit parallel downloads from 1 to 5

### Download Queue

- Multi-worker concurrent downloads
- **Pause / Resume / Stop** controls
- Append files to a running queue (auto-deduplication)
- Subfolder path support with folder picker (File System Access API)
- Filename sanitization (illegal chars, length truncation, URL decoding)
- Chrome download bar suppressed during batch downloads
- System notification on completion
- Real-time progress bar with percentage (polling every 600ms)
- Timestamped log console with color-coded entries (max 500 lines)

### 17 Languages

Auto-detects browser language with manual override:

English, 简体中文, 繁體中文, 日本語, ???, Fran?ais, Deutsch, Espa?ol, ??????, ???????, Português (BR), Русский, Bahasa Indonesia, Ti?ng Vi?t, Türk?e, Italiano, ???

### UI

- **Dual-tab layout** — Download tab + Settings tab
- **Dark mode** — Follows system `prefers-color-scheme`
- **Thumbnail previews** — Image files show thumbnails with hover zoom
- **Source labels** — Color-coded badges (Link / Image / CSS / Media, etc.)
- **Dimension labels** — Width×Height display for probed images
- **Select All / Deselect All**
- **First-use tips** — Guides users to allow automatic downloads in Chrome
- **Reset All Filters** — One-click restore to defaults
- **All settings auto-saved** and restored on next open

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any web page with files you want to download
2. Click the extension icon to open the popup
3. Select desired file formats (or add custom extensions)
4. Click **Scan** to detect all matching files on the page
5. Use filters to narrow down results
6. Optionally configure stealth settings in the **Settings** tab
7. Click **Download** to start the batch download

## Project Structure

```
BatchFileDownloader/
├── manifest.json      # Extension manifest (MV3)
├── popup.html         # Popup UI (HTML + CSS)
├── popup.js           # Popup logic (scan, filter, download, settings)
├── background.js      # Service worker (download queue, Referer injection)
├── content.js         # Content script (page info)
├── i18n.js            # Internationalization (17 languages)
└── icons/             # Extension icons (16/48/128px)
```

## Requirements

- Google Chrome 110+ (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.) should also work

## License

 MIT
