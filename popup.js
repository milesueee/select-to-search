const DEFAULTS = {
  engine: "google",
  customUrl: "",
  openAdjacent: true,
  switchToTab: false,
  openDirectUrls: true,
  middleClickEnabled: true,
};

const engineRadios = document.querySelectorAll('input[name="engine"]');
const customRow = document.getElementById("customRow");
const customUrlInput = document.getElementById("customUrl");
const customError = document.getElementById("customError");
const customPreview = document.getElementById("customPreview");
const openAdjacentToggle = document.getElementById("openAdjacent");
const switchToTabToggle = document.getElementById("switchToTab");
const openDirectUrlsToggle = document.getElementById("openDirectUrls");
const middleClickToggle = document.getElementById("middleClickEnabled");
const keysEl = document.getElementById("keys");
const changeShortcutBtn = document.getElementById("changeShortcut");
const resetBtn = document.getElementById("resetBtn");
const savedEl = document.getElementById("saved");

let savedTimeout = null;

function showSaved() {
  savedEl.classList.add("show");
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => savedEl.classList.remove("show"), 1200);
}

function selectedEngine() {
  const checked = document.querySelector('input[name="engine"]:checked');
  return checked ? checked.value : DEFAULTS.engine;
}

function validateCustomUrl(value) {
  if (!value) return "Enter a search URL.";
  if (!/^https?:\/\//i.test(value))
    return "URL must start with http:// or https://";
  if (!value.includes("%s"))
    return "URL must include %s where the search text goes.";
  try {
    new URL(value.replace("%s", "test"));
  } catch {
    return "That doesn't look like a valid URL.";
  }
  return "";
}

function updateCustomUi() {
  const isCustom = selectedEngine() === "custom";
  customRow.classList.toggle("show", isCustom);
  if (!isCustom) return;

  const value = customUrlInput.value.trim();
  const error = value ? validateCustomUrl(value) : "";
  customUrlInput.classList.toggle("invalid", !!error);
  customError.textContent = error;
  customError.classList.toggle("show", !!error);
  customPreview.textContent =
    value && !error
      ? "Preview: " + value.replace("%s", encodeURIComponent("hello world"))
      : "";
}

function saveSettings() {
  const settings = {
    engine: selectedEngine(),
    openAdjacent: openAdjacentToggle.checked,
    switchToTab: switchToTabToggle.checked,
    openDirectUrls: openDirectUrlsToggle.checked,
    middleClickEnabled: middleClickToggle.checked,
  };

  const customValue = customUrlInput.value.trim();
  if (!validateCustomUrl(customValue)) {
    settings.customUrl = customValue;
  }

  chrome.storage.sync.set(settings, showSaved);
}

function applySettings(settings) {
  engineRadios.forEach((radio) => {
    radio.checked = radio.value === settings.engine;
  });
  customUrlInput.value = settings.customUrl || "";
  openAdjacentToggle.checked = settings.openAdjacent;
  switchToTabToggle.checked = settings.switchToTab;
  openDirectUrlsToggle.checked = settings.openDirectUrls;
  middleClickToggle.checked = settings.middleClickEnabled;
  updateCustomUi();
}

function renderShortcut(shortcut) {
  keysEl.innerHTML = "";
  if (!shortcut) {
    const none = document.createElement("span");
    none.className = "key";
    none.textContent = "Not set";
    keysEl.appendChild(none);
    return;
  }
  const parts = shortcut.includes("+")
    ? shortcut.split("+")
    : shortcut.split("");
  parts.forEach((part, i) => {
    if (i > 0) {
      const plus = document.createElement("span");
      plus.className = "plus";
      plus.textContent = "+";
      keysEl.appendChild(plus);
    }
    const key = document.createElement("span");
    key.className = "key";
    key.textContent = part.trim();
    keysEl.appendChild(key);
  });
}

function loadShortcut() {
  chrome.commands.getAll((commands) => {
    const cmd = commands.find((c) => c.name === "search-selection");
    renderShortcut(cmd && cmd.shortcut ? cmd.shortcut : "");
  });
}

engineRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    updateCustomUi();
    saveSettings();
  });
});

customUrlInput.addEventListener("input", () => {
  updateCustomUi();
  saveSettings();
});

[
  openAdjacentToggle,
  switchToTabToggle,
  openDirectUrlsToggle,
  middleClickToggle,
].forEach((el) => {
  el.addEventListener("change", saveSettings);
});

changeShortcutBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

resetBtn.addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULTS, () => {
    applySettings(DEFAULTS);
    showSaved();
  });
});

chrome.storage.sync.get(DEFAULTS, applySettings);
loadShortcut();
