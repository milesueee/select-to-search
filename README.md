# SELECT-TO-SEARCH

Highlight text on any page, press **Alt+G** or middle-click, and it opens in a new tab: as a search if it's plain text, or as a page if it's a link or domain.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chromium](https://img.shields.io/badge/Chromium-extension-green.svg)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Settings](#settings)
- [How direct URL detection works](#how-direct-url-detection-works)
- [Permissions and privacy](#permissions-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Two ways to trigger.** Press `Alt+G` (rebindable), or middle-click a selection. Middle-click only acts when text is selected, so autoscroll and open-link-in-new-tab behave normally everywhere else.
- **Works in form fields.** Text selected inside `<input>` and `<textarea>` elements is picked up, not just page text.
- **Opens links directly.** Selected URLs, domains, `www.` addresses, `localhost` and IP addresses open as pages instead of being searched. Surrounding quotes and brackets, and trailing punctuation, are stripped first.
- **Ignores file names.** `index.js`, `styles.css` and `data.json` are searched rather than treated as domains.
- **Choice of search engine.** Google, DuckDuckGo, Bing, or any custom URL with a `%s` placeholder.
- **Tab control.** Open results next to the current tab or at the end of the tab bar, and either stay on your page or switch to the new tab.
- **Settings popup.** Changes save automatically and sync across browsers signed in to the same account. Follows your system light or dark theme.

## Installation

The extension is distributed outside the Chrome Web Store. You can install the packaged `.crx` from a GitHub release, or load the source folder directly. It is built for Chromium-based browsers (developed in Chrome).

### Option 1: Install the .crx from Releases

1. Download the latest `.crx` file from the [Releases page](https://github.com/milesueee/select-to-search/releases/latest). If your browser tries to open it instead of saving it, right-click the link and choose **Save link as**.
2. Open your browser's extensions page:

   | Browser | Address               |
   | :------ | :-------------------- |
   | Chrome  | `chrome://extensions` |
   | Brave   | `brave://extensions`  |
   | Edge    | `edge://extensions`   |

3. Turn on **Developer mode** (top-right toggle).
4. Drag the `.crx` file onto the extensions page and confirm the prompt.

> **Note:** Chrome only trusts extensions signed by the Chrome Web Store for normal installs, so double-clicking or opening a `.crx` fails with `CRX_REQUIRED_PROOF_MISSING`. Always drag the file onto the extensions page. Depending on your browser, version and operating system, Chrome may still refuse or disable extensions installed this way. If that happens, use Option 2.

### Option 2: Load unpacked from source

1. Get the code:

   ```bash
   git clone https://github.com/milesueee/select-to-search.git
   cd select-to-search
   ```

   You can also download the repository or the release source as a ZIP and extract it.

2. Open the extensions page and turn on **Developer mode** (see the table above).
3. Click **Load unpacked** and select the folder that contains `manifest.json`.

### Updating

- **Installed from a `.crx`:** these installs do not update automatically. Download the newer `.crx` from Releases and drag it onto the extensions page again. Your settings are kept as long as the extension ID is unchanged.
- **Loaded unpacked:** pull the new code, click the reload icon on the extension's card, and refresh any tabs you want to use it in. Tabs that were open before the reload don't get the updated content script.

## Usage

1. Highlight text on a page, or inside a text field.
2. Press `Alt+G`, or middle-click the highlighted text.
3. The result opens in a new tab, following your tab settings.

### Changing the shortcut

Click the toolbar icon, then **Change** under **Shortcut**. This opens `chrome://extensions/shortcuts`, where you can set any key combination for the "Search Google for the highlighted text" command. Chrome does not let extensions rebind shortcuts themselves, so this step happens on Chrome's page. The command label says "Google" but it uses whichever search engine you selected.

## Settings

Click the toolbar icon to open the settings popup.

| Setting                  | Default | Description                                                                                                                                                                                    |
| :----------------------- | :-----: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search engine            | Google  | Google, DuckDuckGo, Bing, or Custom.                                                                                                                                                           |
| Custom URL               |  empty  | Used when Custom is selected. Must start with `http://` or `https://` and contain `%s`, for example `https://kagi.com/search?q=%s`. The popup shows a live preview and rejects invalid values. |
| Open next to current tab |   On    | Places the new tab directly after the active one instead of at the end.                                                                                                                        |
| Switch to new tab        |   Off   | When off, the result opens in the background so you keep your place.                                                                                                                           |
| Open direct URLs         |   On    | Opens links and domains directly instead of searching for them.                                                                                                                                |
| Middle-click to search   |   On    | Enables middle-click on selected text. With no selection, the click is left alone.                                                                                                             |
| Reset                    |   n/a   | Restores every setting to its default.                                                                                                                                                         |

## How direct URL detection works

Before searching, the selected text is cleaned (outer quotes or brackets removed, trailing `.,;:!?` stripped) and checked against these rules:

| Selected text                         | Result                                                          |
| :------------------------------------ | :-------------------------------------------------------------- |
| `https://example.com/docs`            | Opens as-is (`http`, `https` and `ftp` schemes).                |
| `www.example.com`                     | Opens `https://www.example.com`.                                |
| `example.com`                         | Opens, because `.com` is in the built-in list of web TLDs.      |
| `mysite.foo/page`                     | Opens, because an unlisted TLD is accepted when a path follows. |
| `localhost:3000`                      | Opens `http://localhost:3000`.                                  |
| `192.168.1.1`                         | Opens `http://192.168.1.1` (each octet must be 0-255).          |
| `(https://example.com)`               | Brackets removed, then opens.                                   |
| `index.js`, `styles.css`, `data.json` | Searched. Common code and file extensions are excluded.         |
| `some.thing`                          | Searched. Unlisted TLD with no path.                            |
| `hello world`                         | Searched. URLs cannot contain spaces.                           |

To always search and never open directly, turn off **Open direct URLs**. To recognize another TLD, add it to the `validTlds` set in [`background.js`](background.js).

## Permissions and privacy

| Permission                 | Why it is needed                                                                    |
| :------------------------- | :---------------------------------------------------------------------------------- |
| `activeTab`                | Read the selection on the current tab when the keyboard shortcut is pressed.        |
| `scripting`                | Run a small function in the active tab (including subframes) to read the selection. |
| `storage`                  | Save your settings with `chrome.storage.sync`.                                      |
| Content script on all URLs | Detect a middle-click on selected text on any page.                                 |

The content script on all URLs makes Chrome show an install warning along the lines of "Read and change all your data on all websites". The script only reads the selection at the moment you middle-click, and only sends that text to the extension's own background script. If you would rather not grant that, turn off middle-click and remove the `content_scripts` block from `manifest.json`; the keyboard shortcut works without it.

The extension has no analytics or telemetry and makes no network requests of its own. The only thing that leaves your browser is the tab it opens: when you search, the selected text is sent to the search engine you chose, under that engine's own privacy policy. Settings live in `chrome.storage.sync`, which syncs through your browser account if sync is enabled.

## Troubleshooting

**Nothing happens after I reload the extension.** Refresh the page. Content scripts are only injected into tabs loaded after the reload.

**Middle-click does nothing.** Check that "Middle-click to search" is on, and that text is still selected when you click. Open the page's DevTools console and look for `[Search Selection] content script loaded`. If it's missing, the script isn't running on that page.

**Neither trigger works on a particular page.** Chrome blocks extensions on `chrome://` pages, the Chrome Web Store, and the built-in PDF viewer.

**`Alt+G` does nothing.** Another extension or application may hold that shortcut. Check `chrome://extensions/shortcuts` and rebind it.

**My custom search URL is rejected.** It must start with `http://` or `https://` and include `%s` where the search text goes.

## Project structure

```text
.
├── manifest.json   Extension manifest (MV3): permissions, command, content script, popup
├── background.js   Service worker: shortcut handling, URL detection, search URL building, tab creation
├── content.js      Content script: middle-click detection and selection capture
├── popup.html      Settings popup markup and styles (light and dark)
├── popup.js        Settings logic: load, save, validate, reset
└── README.md
```

- [`background.js`](background.js) handles the `search-selection` command by reading the selection with `chrome.scripting.executeScript`, and listens for messages from the content script. Both paths go through one `openResultTab()` function. `cleanCandidate()` and `getDirectUrl()` implement the URL rules above.
- [`content.js`](content.js) listens for middle `mousedown` in the capture phase and calls `preventDefault()` only when text is selected, which is what keeps autoscroll working otherwise. It caches the on/off setting in a variable because `preventDefault()` must run synchronously.
- [`popup.js`](popup.js) autosaves on every change, and saves the custom URL only when it passes validation.

## Development

There is no build step and no dependencies. Edit the files, reload the extension on the extensions page, and refresh your test tab.

- **Service worker logs:** click "service worker" on the extension's card.
- **Popup:** right-click inside the popup and choose Inspect.
- **Content script:** use the DevTools console of the page you are testing on.

### Building a release

1. On the extensions page, click **Pack extension** and select the project folder. On the first build, leave **Private key file** empty. Chrome creates a `.crx` and a `.pem` file.
2. Keep the `.pem` private and out of git (add `*.pem` to `.gitignore`). On every later release, provide the same `.pem` under **Private key file**. The key determines the extension ID, so a new key means a new ID: users lose their saved settings and cannot upgrade in place.
3. Bump `version` in `manifest.json`, then attach the `.crx` (and a ZIP of the source, for Option 2) to the GitHub release.

## Contributing

Bug reports and pull requests are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Describe your change"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request.

## License

Distributed under the [MIT License](LICENSE).
