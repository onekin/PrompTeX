const ChromeStorage = require('../utils/ChromeStorage')
const Config = require('../Config')

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

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'mode') {
        if (request.cmd === 'getMode') {
          chrome.storage.local.get({ mode: 'divergent' }, function (result) {
            let err = chrome.runtime.lastError
            if (err) {
              sendResponse({ err: err.message })
              return
            }

            let mode = result && result.mode ? result.mode : 'divergent'
            sendResponse({ mode: mode })
          })
        }
        return true
      }
    })

    /* chrome.runtime.onInstalled.addListener(() => {
      // Create context menu items
      chrome.contextMenus.create({ id: 'Validate', title: 'Validate', contexts: ['selection'] })
      chrome.contextMenus.create({ id: 'Enhance', title: 'Enhance', contexts: ['selection'] })
      chrome.contextMenus.create({ id: 'Gap Filling', title: 'Gap Filling', contexts: ['selection'] })
      chrome.contextMenus.create({ id: 'Alternatives', title: 'Alternatives', contexts: ['selection'] })
      chrome.contextMenus.create({ id: 'Unify', title: 'Unify', contexts: ['selection'] })
    }) */

    chrome.runtime.onInstalled.addListener((details) => {
      chrome.storage.local.get(
        {
          mode: 'divergent',
          roleDefinitions: null
        },
        ({ mode, roleDefinitions }) => {
          // seed roleDefinitions if missing/empty
          const missing = !Array.isArray(roleDefinitions) || roleDefinitions.length === 0

          if (missing) {
            chrome.storage.local.set({ roleDefinitions: Config.roles }, () => {
              const err = chrome.runtime.lastError
              if (err) console.error('Failed to set roleDefinitions:', err.message)

              // build menus after seeding
              buildContextMenus(mode)
            })
          } else {
            buildContextMenus(mode)
          }
        }
      )
    })

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return
      if (changes.mode || changes.roleDefinitions) {
        chrome.storage.local.get({ mode: 'divergent' }, ({ mode }) => {
          buildContextMenus(mode)
        })
      }
    })

    function buildContextMenus (mode) {
      chrome.contextMenus.removeAll(() => {
        chrome.storage.local.get(
          { roleDefinitions: Config.roles },
          ({ roleDefinitions }) => {
            const roles = Array.isArray(roleDefinitions) ? roleDefinitions : Config.roles

            // mode: 'divergent'|'convergent'  -> role.mode: 'divergence'|'convergence'
            const target = mode === 'divergent' ? 'divergence' : 'convergence'

            roles
              .filter((role) => role && role.mode === target)
              .forEach((role) => {
                chrome.contextMenus.create({
                  id: role.name, // must be unique + stable
                  contexts: ['selection'],
                  title: `${role.name}: ${short(role.description, 60)}`
                })
              })
          }
        )
      })
    }

    // helper
    function short (text, n) {
      const s = String(text || '')
      return s.length > n ? s.slice(0, n - 1) + '…' : s
    }

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'roleSelected', text: info.menuItemId })
    })
  }
}

module.exports = PromptManager // Use module.exports for CommonJS
