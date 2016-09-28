// Insert the migrator scripts and styles into the page DOM on extension icon click

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.executeScript(tab.id, {file:'background.js'});
    chrome.tabs.insertCSS(tab.id, {file:'background.css'});
});