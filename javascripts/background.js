//server = "http://127.0.0.1:3000";
server = "https://readermode.io";

// Open reader
function startReaderMode(tab) {
  chrome.scripting.executeScript(
    {
      target: {tabId: tab.id, allFrames: true},
      files: [
        "javascripts/readability.js",
        "javascripts/jquery-3.4.1.min.js",
        "javascripts/jquery-ui.min.js",
        "javascripts/fullscreen.min.js",
        "javascripts/tag-it.js",
        "javascripts/content.js"
      ]
    }
  );
}


function init(tab) {
  startReaderMode(tab);
}

// Listen for the extension's click
chrome.action.onClicked.addListener((tab) => {
  init(tab);
});

// Create contextMenu for user text selection
chrome.contextMenus.create({
  id: "view-selection",
  title: "View in Reader",
  contexts:["selection"]
});

// Create contextMenu for when user want to link with CR automatically
linkCMId = chrome.contextMenus.create({
  id: "view-linked-page",
  title: "View the linked page using ReaderMode",
  contexts:["link"]
});

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if(clickData.menuItemId == "view-selection") {
    chrome.tabs.query({ active: true }, function(tabs) {
      let tab = tabs[0];
      startReader(tab);
    });
  } else if(clickData.menuItemId == "view-linked-page" && clickData.linkUrl) {
    chrome.tabs.create(
      { url: clickData.linkUrl, active: false },
      function(newTab) {
        startReaderMode(newTab);
      }
    );
  } else {
  }
});

articles_checked_for_current_url = false;
