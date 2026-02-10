# Privacy Policy ！ Batch File Downloader

**Last Updated:** February 10, 2026

## Introduction

Batch File Downloader ("the Extension") is a Chrome browser extension that helps users batch download files from web pages. This Privacy Policy explains how the Extension handles user data.

## Data Collection

**The Extension does NOT collect, store, transmit, or share any personal data or browsing activity.**

Specifically, the Extension:

- Does **NOT** collect personally identifiable information (name, email, address, etc.)
- Does **NOT** track or record browsing history
- Does **NOT** use analytics, telemetry, or tracking scripts
- Does **NOT** transmit any data to external servers
- Does **NOT** use cookies for tracking purposes
- Does **NOT** contain advertisements

## Data Stored Locally

The Extension stores the following data **locally on your device only** using Chrome's `chrome.storage.local` API:

- **User preferences:** UI language selection, file type filter settings, download delay configuration, and concurrency settings.

This data:
- Never leaves your device
- Is not accessible to any third party
- Is not synced across devices
- Can be cleared by uninstalling the extension

## Permissions Explained

| Permission | Why It's Needed |
|---|---|
| `downloads` | Core functionality ！ to download files selected by the user |
| `activeTab` | To scan the current page for downloadable resources when the user clicks the extension icon |
| `scripting` | To inject a content script that reads page DOM for downloadable resource URLs and image dimensions |
| `declarativeNetRequest` | To inject Referer/Origin headers so downloads and thumbnails work on anti-hotlink protected sites |
| `storage` | To save user preferences locally (language, filter settings, etc.) |
| `tabs` | To read the active tab's URL and title for Referer headers and display purposes |
| `notifications` | To notify the user when a batch download completes |
| `host_permissions (<all_urls>)` | To scan and download resources from any website the user chooses |

## Network Requests

The Extension makes network requests **only** for the following purposes:

1. **Downloading files** ！ initiated explicitly by the user
2. **Loading image thumbnails** ！ to preview images before download
3. **Probing image dimensions** ！ to enable size-based filtering

All network requests go directly to the resource URLs on the web pages the user is viewing. **No data is sent to any server owned or operated by the developer.**

## Remote Code

The Extension does **NOT** load or execute any remote code. All scripts are bundled locally within the extension package.

## Third-Party Services

The Extension does **NOT** use any third-party services, SDKs, or APIs for data collection or processing.

## Children's Privacy

The Extension does not knowingly collect any data from children under the age of 13.

## Changes to This Policy

If this Privacy Policy is updated, the changes will be posted on this page with an updated revision date.

## Contact

If you have any questions about this Privacy Policy, please open an issue on the GitHub repository:

**GitHub:** [https://github.com/piggyy/Batch-File-Downloader](https://github.com/piggyy/Batch-File-Downloader)
