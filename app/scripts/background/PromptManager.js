const ChromeStorage = require('../utils/ChromeStorage')

class PromptManager {
  init () {
    // Initialize replier for requests related to storage
    this.initRespondent()
  }

  initRespondent () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'prompt') {
        if (request.cmd === 'getPrompt') {
          let type = request.data.type
          let searchKey = 'prompt.' + type
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, prompt) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (prompt && prompt.data) {
                let parsedPrompt = JSON.parse(prompt.data)
                sendResponse({ prompt: parsedPrompt || '' })
              } else {
                sendResponse({ prompt: '' })
              }
            }
          })
        } else if (request.cmd === 'setPrompt') {
          let prompt = request.data.prompt
          let type = request.data.type
          let searchKey = 'prompt.' + type
          ChromeStorage.setData(searchKey, { data: JSON.stringify(prompt) }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ prompt: prompt })
            }
          })
        }
        return true
      }
    })

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'definition') {
        if (request.cmd === 'getDefinition') {
          let type = request.data.type
          let searchKey = 'definition.' + type
          ChromeStorage.getData(searchKey, ChromeStorage.sync, (err, definition) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              if (definition && definition.data) {
                let parsedPrompt = JSON.parse(definition.data)
                sendResponse({ definition: parsedPrompt || '' })
              } else {
                sendResponse({ definition: '' })
              }
            }
          })
        } else if (request.cmd === 'setDefinition') {
          let definition = request.data.definition
          let type = request.data.type
          let searchKey = 'definition.' + type
          ChromeStorage.setData(searchKey, { data: JSON.stringify(definition) }, ChromeStorage.sync, (err) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ definition: definition })
            }
          })
        }
        return true
      }
    })
  }
}

module.exports = PromptManager // Use module.exports for CommonJS
