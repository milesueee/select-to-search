console.log("[Search Selection] content script loaded");

let middleClickEnabled = true;

chrome.storage.sync.get({ middleClickEnabled: true }, (settings) => {
  middleClickEnabled = settings.middleClickEnabled;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.middleClickEnabled) {
    middleClickEnabled = changes.middleClickEnabled.newValue;
  }
});

function getSelectedText() {
  const el = document.activeElement;
  if (
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
    typeof el.selectionStart === "number" &&
    el.selectionStart !== el.selectionEnd
  ) {
    return el.value.substring(el.selectionStart, el.selectionEnd);
  }
  return window.getSelection().toString();
}

let suppressNextAuxClick = false;

document.addEventListener(
  "mousedown",
  (event) => {
    if (event.button !== 1) return;
    if (!middleClickEnabled) return;

    const text = getSelectedText().trim();
    if (!text) return;

    event.preventDefault();
    event.stopPropagation();
    suppressNextAuxClick = true;

    console.log("[Search Selection] middle-click with selection:", text);
    chrome.runtime.sendMessage({
      type: "middle-click-search",
      text: text,
    });
  },
  true,
);

document.addEventListener(
  "auxclick",
  (event) => {
    if (event.button === 1 && suppressNextAuxClick) {
      suppressNextAuxClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true,
);
