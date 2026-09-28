const DEFAULTS = {
  engine: "google",
  customUrl: "",
  openAdjacent: true,
  switchToTab: false,
  openDirectUrls: true,
};

const ENGINE_TEMPLATES = {
  google: "https://www.google.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
  bing: "https://www.bing.com/search?q=%s",
};

function buildSearchUrl(settings, text) {
  const template =
    settings.engine === "custom" && settings.customUrl
      ? settings.customUrl
      : ENGINE_TEMPLATES[settings.engine] || ENGINE_TEMPLATES.google;

  if (template.includes("%s")) {
    return template.replace("%s", encodeURIComponent(text));
  }
  return template + encodeURIComponent(text);
}

async function openResultTab(text, tab) {
  text = text.trim();
  if (!text || !tab || !tab.id) return;

  const settings = await new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });

  const directUrl = settings.openDirectUrls ? getDirectUrl(text) : null;
  const targetUrl = directUrl || buildSearchUrl(settings, text);

  chrome.tabs.create({
    url: targetUrl,
    index: settings.openAdjacent ? tab.index + 1 : undefined,
    openerTabId: tab.id,
    active: settings.switchToTab,
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "search-selection") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  let text = "";
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        // Selected text inside input boxes / textareas
        const el = document.activeElement;
        if (
          el &&
          (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
          typeof el.selectionStart === "number"
        ) {
          return el.value.substring(el.selectionStart, el.selectionEnd);
        }
        // Normal page text
        return window.getSelection().toString();
      },
    });
    text = results.map((r) => r.result || "").find((t) => t.trim()) || "";
  } catch (err) {
    // Happens on pages Chrome blocks (chrome://, Web Store, built-in PDF viewer)
    console.warn("Could not read selection on this page:", err);
  }

  await openResultTab(text, tab);
});

// Fired by content.js when the user middle-clicks while text is selected.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === "middle-click-search" && sender.tab) {
    openResultTab(message.text || "", sender.tab);
  }
});

function cleanCandidate(text) {
  text = text.trim();
  const surrounds = [
    ['"', '"'],
    ["'", "'"],
    ["<", ">"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["“", "”"],
    ["‘", "’"],
  ];
  for (const [open, close] of surrounds) {
    if (text.startsWith(open) && text.endsWith(close) && text.length >= 2) {
      text = text.slice(open.length, text.length - close.length).trim();
      break;
    }
  }

  let prev;
  do {
    prev = text;
    // Strip trailing punctuation common in prose (.,;:!?)
    text = text.replace(/[.,;:!?]+$/, "");

    // Strip unmatched closing parens/brackets
    const pairs = [
      ["\\(", ")"],
      ["\\[", "]"],
      ["\\{", "}"],
      ["<", ">"],
    ];
    for (const [openEsc, close] of pairs) {
      while (text.endsWith(close)) {
        const openCount = (text.match(new RegExp(openEsc, "g")) || []).length;
        const closeCount = (
          text.match(new RegExp("\\" + close, "g")) || []
        ).length;
        if (closeCount > openCount) {
          text = text.slice(0, -close.length).trim();
        } else {
          break;
        }
      }
    }
    // Strip unmatched trailing quote
    if (/["'”’]$/.test(text)) {
      text = text.slice(0, -1).trim();
    }
  } while (text !== prev);

  return text;
}

function getDirectUrl(rawText) {
  if (!rawText) return null;

  const text = cleanCandidate(rawText);
  if (!text) return null;

  // URLs cannot contain whitespace
  if (/\s/.test(text)) return null;

  // 1. Explicit scheme: http://, https://, ftp://
  if (/^(https?|ftp):\/\//i.test(text)) {
    try {
      const parsed = new URL(text);
      if (parsed.hostname && parsed.hostname.length > 0) {
        return parsed.href;
      }
    } catch {
      return null;
    }
  }

  // 2. Starts with www.
  if (/^www\.[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(text)) {
    try {
      const parsed = new URL("https://" + text);
      if (parsed.hostname) return parsed.href;
    } catch {
      return null;
    }
  }

  // 3. Localhost or IPv4
  if (/^localhost(:\d+)?(\/.*)?$/i.test(text)) {
    try {
      return new URL("http://" + text).href;
    } catch {
      return "http://" + text;
    }
  }
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
  if (ipv4Regex.test(text)) {
    const ip = text.split(/[:\/]/)[0];
    const octets = ip.split(".").map(Number);
    if (octets.every((o) => o >= 0 && o <= 255)) {
      try {
        return new URL("http://" + text).href;
      } catch {
        return "http://" + text;
      }
    }
  }

  // 4. Domain name with known web TLD or path
  const domainMatch = text.match(
    /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63})(:\d+)?([\/?#].*)?$/i
  );
  if (domainMatch) {
    const tld = domainMatch[2].toLowerCase();
    const path = domainMatch[4];

    // Common web TLDs
    const validTlds = new Set([
      "com", "org", "net", "edu", "gov", "mil", "int",
      "io", "dev", "ai", "app", "co", "me", "tv", "cc", "xyz", "tech", "online",
      "site", "store", "club", "pro", "live", "space", "shop", "blog", "news",
      "cloud", "design", "link", "info", "biz", "us", "uk", "ca", "de", "jp",
      "fr", "au", "ru", "ch", "it", "nl", "se", "no", "es", "asia",
      "in", "br", "cn", "kr", "tw", "hk", "sg", "mx", "ar", "za", "ph", "id",
      "my", "vn", "th", "ie", "eu", "to", "gg", "is", "ly", "fm", "sh", "so",
      "world", "life", "today", "media", "network", "software", "digital", "global",
      "agency", "group", "team", "page", "rocks", "zone", "top", "vip", "one",
      "email", "guru", "center", "art", "bio", "chat", "fit", "run", "pub", "law",
    ]);

    // Disallow common non-website file extensions & code false-positives
    const excludedExtensions = new Set([
      "txt", "md", "json", "xml", "csv", "yaml", "yml",
      "js", "ts", "jsx", "tsx", "py", "rb", "php", "c", "cpp", "h", "cs", "java", "go", "rs", "swift", "kt",
      "html", "htm", "css", "scss", "sass", "less",
      "png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
      "mp3", "mp4", "wav", "mov", "avi", "mkv",
      "zip", "tar", "gz", "rar", "7z",
      "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
      "exe", "dll", "so", "dylib", "bin", "iso",
      "log", "conf", "cfg", "ini", "env",
    ]);

    if (excludedExtensions.has(tld)) {
      return null;
    }

    // If it has a path or query (e.g. domain.co/foo, site.uk/bar) or TLD is in validTlds
    if (validTlds.has(tld) || (path && path.length > 1)) {
      try {
        const parsed = new URL("https://" + text);
        if (parsed.hostname) return parsed.href;
      } catch {
        return null;
      }
    }
  }

  return null;
}
