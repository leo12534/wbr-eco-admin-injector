# ECO Admin Block Injector — Chrome Extension

Paste a full HTML file and automatically split it into separate page_content blocks in ECO Admin. Each `.container` or `.container-fluid` becomes its own block.

---

## Install

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder (`eco-admin-injector`)
5. The extension icon appears in your toolbar

---

## How to use

1. Navigate to an ECO Admin page editor (the page with Page Regions)
2. Click the extension icon in your toolbar
3. Paste your full HTML into the text area
4. Click **Parse blocks** — each `.container` / `.container-fluid` is detected and auto-named from its heading
5. Review and rename blocks if needed (click **preview** to see the HTML)
6. Click **Run all → CMS** — it adds each block one by one automatically

---

## Notes

- Only works on `ecoadmin.wbresearch.com`
- Works in both the classic and the v2 page editor. In v2, open the page's **Regions** tab first
- Blocks are added to the **page_content** region
- Auto-naming pulls the first `h1/h2/h3` heading inside each block
- You can stop mid-run with the **Stop** button
- If a block errors, you'll be asked whether to continue or abort

---

## Download a block's images

1. In **Download block images**, pick a section, then a block (the list comes from the live editor; click **Refresh** after changes)
2. Click **Download images as ZIP**. It collects every image the block uses (`<img src>` / `data-src`, `srcset`, `video poster`, SVG `<image>`, and `url(...)` in `style` attributes and `<style>` tags) and zips them
3. Keep the popup open until it says the ZIP is ready, then click **Save block-images-YYYY-MM-DD.zip** at the bottom-right of the ECO Admin page and choose where to save it. Images that can't be fetched are listed in `failed.txt` inside the ZIP

---

## Changelog

### 2026-11-13
- All actions (Run all → CMS, Disable, Enable, Delete, Export, sorting and Restore) now work in the new v2 page editor as well as the classic one. In v2, open the page's **Regions** tab before using the extension.
- v2 support lives in `page-v2.js`, which the popup loads into the page before each action. It uses the editor's own Add/Edit dialogs, delete and sort functions instead of clicking buttons.

### 2026-11-09
- Added a **Download block images** panel (works in both the classic and the new v2 page editor): choose a section and block, and every image it references (jpg, png, svg, webp, gif, avif) is downloaded as a ZIP. Uses a bundled copy of JSZip 3.10.1 (`jszip.min.js`).
- Added `<all_urls>` to `host_permissions` so the popup can fetch images from any CDN. Chrome will show a broader permission warning after the reload.
- The ZIP is saved through a Save button on the ECO Admin page and the system save dialog, not Chrome's downloader, so it still works when Chrome downloads are stuck.

### 2026-09-25
- Added an **Enable existing** button to bulk re-enable disabled blocks (mirrors the existing Disable button).
- Added an **Activity log** panel — every add/disable/enable/delete action is recorded locally (timestamp, section, block name), with a **Restore** link on delete entries to re-inject the saved HTML.
- Replaced the plain blue toolbar icon with a syringe design.
- Fixed the Activity log not actually saving — the extension was missing the `storage` permission it needs to write to local storage, so log entries were silently lost. Also made log writes fail-safe so a logging error can no longer abort a disable/enable/delete run partway through.
