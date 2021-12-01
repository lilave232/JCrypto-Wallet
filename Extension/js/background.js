chrome.action.onClicked.addListener((tab) => {
    console.log("Running");
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['js/content-script.js']
    });
});