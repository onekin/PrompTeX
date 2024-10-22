const LLMManagerBackground = require('./background/LLMManagerBackground')
const PromptManager = require('./background/PromptManager')

class Background {
  constructor () {
    this.llmManager = null
    this.promptManager = null
  }
  init () {
    // Initialize LLM manager
    this.llmManager = new LLMManagerBackground()
    this.llmManager.init()
    this.promptManager = new PromptManager()
    this.promptManager.init()

    /* chrome.browserAction.onClicked.addListener(function () {
      var newURL = chrome.extension.getURL('pages/options.html')
      chrome.tabs.create({ url: newURL })
    }) */
  }
}

const background = new Background()
background.init()
