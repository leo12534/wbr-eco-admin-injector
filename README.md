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

Open an ECO Admin page editor, then click the extension icon. The popup has four tabs and remembers the last one you used. Progress, messages and the **Stop** button always appear just under the tabs.

### Add blocks — rebuild a page

1. Paste your full HTML into the text area
2. Click **Parse blocks**. Each `.container` / `.container-fluid` becomes a block, auto-named from its first heading
3. Review the names and target sections (click **preview** to see a block's HTML)
4. Leave **Disable existing blocks in these sections first** ticked to replace what's there, or untick it to add alongside the current blocks
5. Click **Run all → CMS**. The old blocks are disabled, the new ones are added, and each section is sorted with live blocks first and disabled blocks last
6. Check the live page. If something's wrong, re-enable the old blocks from **Manage**. When you're happy, delete them from **Manage → Delete disabled blocks**

If a block fails or you stop the run, click **Run all → CMS** again to add only the blocks that didn't go in. Old blocks are only disabled on the first run, so the blocks you just added stay live.

### Manage — existing blocks

Tick the sections to act on (only `page_content` is ticked when the popup opens), then:

- **Disable blocks** / **Enable blocks**: switch every block in those sections off or on
- **Export HTML**: download all blocks in those sections as one `.html` file
- **Delete disabled blocks**: permanently delete the disabled blocks only. You'll see how many will go from each section before confirming. Each deleted block's HTML is saved in the Log tab so you can restore it

### Images — download a block's images

1. Pick a section, then a block (the list comes from the live editor; click **Refresh** after changes)
2. Click **Download images as ZIP**. It collects every image the block uses (`<img src>` / `data-src`, `srcset`, `video poster`, SVG `<image>`, and `url(...)` in `style` attributes and `<style>` tags) and zips them
3. Keep the popup open until it says the ZIP is ready, then click **Save block-images-YYYY-MM-DD.zip** at the bottom-right of the ECO Admin page and choose where to save it. Images that can't be fetched are listed in `failed.txt` inside the ZIP

### Log — activity history

Every add, disable, enable, delete and restore is recorded with the time, section and block name. Deleted blocks have a **Restore** link that re-adds the saved HTML. The log is stored in this browser only, and **Clear** wipes it for good.

---

## Notes

- Only works on `ecoadmin.wbresearch.com`
- Works in both the classic and the v2 page editor. In v2, open the page's **Regions** tab first
- Only one action runs at a time. Other buttons are greyed out until it finishes, but you can still switch tabs
- If a block errors during a run, you'll be asked whether to continue or stop

---

## Changelog

### 2026-11-13 (v1.5)
- Split the popup into **Add blocks**, **Manage**, **Images** and **Log** tabs, with one shared status, progress bar and Stop button.
- **Delete live** is now **Delete disabled blocks**, in its own clean-up box on the Manage tab. The confirmation shows how many blocks will be deleted from each section.
- Added **Disable existing blocks in these sections first** to the Add blocks tab, so a rebuild is disable old → add new → sort in one run.
- Running again after an error or Stop adds only the blocks that didn't go in, instead of adding every block again.
- The Manage tab now ticks only `page_content` by default.
- Only one action can run at a time.

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
