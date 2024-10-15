const LLMManagerBackground = require('./background/LLMManagerBackground')

class Background {
  constructor () {
    this.llmManager = null
  }
  init () {
    // Initialize LLM manager
    this.llmManager = new LLMManagerBackground()
    this.llmManager.init()

    /* chrome.browserAction.onClicked.addListener(function () {
      var newURL = chrome.extension.getURL('pages/options.html')
      chrome.tabs.create({ url: newURL })
    }) */
  }
}

const background = new Background()
background.init()
