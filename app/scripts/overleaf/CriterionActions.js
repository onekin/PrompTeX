const OverleafUtils = require('./OverleafUtils')
const Config = require('../Config')
const Alerts = require('../utils/Alerts')
const LLMClient = require('../llm/LLMClient')
const Utils = require('../utils/Utils')
const LatexUtils = require('./LatexUtils')

class CriterionActions {
  static async askForFeedback (document, prompt, roleName, spaceMode, scopedText, roleDescription, modeInstructions, scope, sectionName, humanNote) {
    Alerts.showLoadingWindowDuringProcess('Retrieving API key...')
    chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getSelectedLLM' }, async ({ llm }) => {
      if (llm === '') {
        llm = Config.review.defaultLLM
      }
      const llmProvider = llm.modelType
      Alerts.showLoadingWindowDuringProcess('Waiting ' + llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1) + ' to answer...')
      chrome.runtime.sendMessage({ scope: 'llm', cmd: 'getAPIKEY', data: llmProvider }, ({ apiKey }) => {
        if (apiKey !== null && apiKey !== '') {
          let callback = (json) => {
            Alerts.closeLoadingWindow()
            console.log(json)

            // Ensure json has valid values
            let suggestions = json?.suggestions || []

            let batchBgColor = '#f0f0f0' // Alternate per batch
            // Generate suggestion list correctly with checkboxes aligned left and better text alignment
            const suggestionList = suggestions
              .map(
                (item, index) =>
                  `<li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 14px; line-height: 1.4;">
                  <input type="checkbox" id="suggestion-${index}" class="suggestion-checkbox" style="flex-shrink: 0; margin-top: 2px;">
                  <label for="suggestion-${index}" style="flex-grow: 1; text-align: left;">${item.suggestion}</label>
                </li>`
              )
              .join('')

            // Generate buttons dynamically
            const actionButtons = Object.entries(Config.actions)
              .map(([key, action]) => `
                <button id="${key}-btn" class="small-btn">
                    <i class="${action.icon}" aria-hidden="true"></i> ${action.name}
                </button>
            `)
              .join('') + `
              <!-- ✅ Bookmark Button -->
              <div class="tooltip-container" style="display: flex; justify-content: flex-end;">
                <button id="bookmark-btn" class="small-btn bookmark">
                    <i class="fa fa-bookmark"></i>
                </button>
                <span class="tooltip-text">Save the timestamp</span>
              </div>
          `

            // ✅ Now the buttons are dynamically inserted!
            let buttonSection = `
              <div id="message-container" style="margin-top: 10px; font-size: 14px; color: black; font-weight: bold;"></div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <div style="display: flex; gap: 6px;">
                  ${actionButtons} <!-- ✅ Buttons generated dynamically -->
                </div>
              </div>
              <style>
                .small-btn {
                  background: white;
                  color: black;
                  border: 1px solid black;
                  padding: 4px 10px;
                  font-size: 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: background 0.2s, border-color 0.2s;
                }
                .small-btn:hover {
                  background: #ddd
                }
              </style>
            `
            let scopeOfAnswer = 'Scope: '
            if (scope === 'title') {
              scopeOfAnswer += 'Full paper'
            } else if (scope === 'excerpts') {
              scopeOfAnswer = 'Fragment: ' + scopedText.replaceAll('RESEARCH_PAPER FRAGMENT: [', '').replaceAll(']', '')
            } else {
              scopeOfAnswer += sectionName + ' ' + scope
            }
            let question = roleName.toUpperCase().replaceAll('Rhetorical', '')
            if (humanNote !== '' && humanNote !== null) {
              question += ': ' + humanNote
            }
            // Construct the full HTML content
            let htmlContent = `
              <div style="font-size: 13px; line-height: 1.5;">
                <p style="text-align: justify; margin-bottom: 10px;">${scopeOfAnswer}</p> <!-- ✅ Justified Text -->
                <hr style="border: 0; height: 1px; background: #ccc; margin: 10px 0;">      
                <div class="suggestion-batch" style="background-color: ${batchBgColor}; padding: 10px;">
                <!--<div class="suggestion-batch" style="background-color: ${batchBgColor}; padding: 10px; border-radius: 6px; margin-bottom: 10px;">-->
                  <span class="title-btn">${question}</span>       
                  <ul style="padding-left: 0; list-style-type: none; margin: 0;">${suggestionList}</ul>
                  <!-- ✅ Tooltip Container to Ensure Proper Hover Effect -->
                  <div class="tooltip-container" style="display: flex; justify-content: flex-end;">
                      <button id="add-todo-btn" class="small-btn">
                          <i class="fa fa-list-alt" aria-hidden="true"></i>
                      </button>
                      <span class="tooltip-text">Add TODOs</span>
                  </div>                
            
                </div>
                ${buttonSection} <!-- ✅ Dynamic buttons now included -->
              </div>
            `
            Alerts.infoAlert({
              text: htmlContent,
              showCloseButton: true,
              showCancelButton: false,
              showConfirmButton: false,
              didOpen: (popup) => { // ✅ Ensure alert is rendered before attaching event listeners
                // ✅ Ensure event listener is attached dynamically
                const bookmarkButton = popup.querySelector('#bookmark-btn')
                if (bookmarkButton) {
                  bookmarkButton.addEventListener('click', function () {
                    bookmarkButton.classList.toggle('active') // ✅ Toggle class for color change
                  })
                }
                const messageContainer = popup.querySelector('#message-container')
                if (messageContainer) {
                  // ✅ Apply text justification
                  messageContainer.style.textAlign = 'justify'
                  messageContainer.style.display = 'block'
                  messageContainer.style.marginTop = '10px'
                  messageContainer.style.fontSize = '14px'
                  messageContainer.style.lineHeight = '1.5'
                }

                // ✅ Inject FontAwesome only if it's not already added
                if (!popup.ownerDocument.querySelector('link[href*="font-awesome"]')) {
                  let fontAwesomeLink = popup.ownerDocument.createElement('link')
                  fontAwesomeLink.rel = 'stylesheet'
                  fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
                  fontAwesomeLink.crossOrigin = 'anonymous'
                  popup.ownerDocument.head.appendChild(fontAwesomeLink) // ✅ Inject FontAwesome into the popup
                }

                const updateMessage = (buttonName) => {
                  let checkedSuggestions = []
                  popup.querySelectorAll('.suggestion-checkbox:not(:disabled)').forEach((checkbox, index) => {
                    if (checkbox.checked) {
                      checkedSuggestions.push(checkbox.nextElementSibling.textContent.trim()) // ✅ Get the corresponding suggestion text
                    }
                  })

                  if (messageContainer) {
                    if (checkedSuggestions.length > 0) {
                      if (buttonName === 'AddTODOs') {
                        let todoComments = ''
                        const isBookmarkActive = popup.ownerDocument.getElementById('bookmark-btn').classList.contains('active')
                        let target
                        if (scope === 'title') {
                          target = 'Full paper'
                        } else if (scope === 'excerpts') {
                          target = 'excerpt'
                        } else {
                          target = sectionName + ' ' + scope
                        }
                        if (isBookmarkActive) {
                          if (humanNote !== '' && humanNote !== null) {
                            todoComments += '\n%% PROMPTEX-TIMESTAMP: {' + roleName + ': ' + humanNote + '}{' + spaceMode.replace(' Mode', ' Space') + '}{' + target + '}{' + llm.modelType + ':' + llm.model + '}{' + Utils.getFormattedDateTime() + '}\n'
                          } else {
                            todoComments += '\n%% PROMPTEX-TIMESTAMP: {' + roleName + '}{' + spaceMode.replace(' Mode', ' Space') + '}{' + target + '}{' + llm.modelType + ':' + llm.model + '}{' + Utils.getFormattedDateTime() + '}\n'
                          }
                        }
                        checkedSuggestions.forEach(suggestion => {
                          todoComments += `%% PROMPTEX-COMMENT: ${suggestion}}\n`
                        })
                        let loadingMessages = ['Including the TODOs in the Manuscript', 'Including the TODOs in the Manuscript.', 'Including the TODOs in the Manuscript..', 'Including the TODOs in the Manuscript...']
                        let loadingIndex = 0
                        messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        // ✅ Loop the loading animation every 500ms
                        let loadingInterval = setInterval(() => {
                          loadingIndex = (loadingIndex + 1) % loadingMessages.length
                          messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        }, 500)
                        console.log('DOCUMENT')

                        console.log(document)
                        let updatedDocument = document
                        if (scope === 'title') {
                          // Ensure \title{...} exists before replacing
                          if (updatedDocument.match(/\\title\{.*?\}/i)) {
                            updatedDocument = updatedDocument.replace(
                              /(\\title\{.*?\})/i,
                              `$1\n${todoComments}`
                            )
                          } else {
                            console.log('not found')
                          }
                        } else if (scope === 'excerpts' && scopedText) {
                          let text = scopedText.replaceAll('RESEARCH_PAPER FRAGMENT: [', '').replaceAll(']', '')

                          // Properly escape SINGLE backslashes without doubling already escaped ones
                          if (updatedDocument.includes(text)) {
                            updatedDocument = updatedDocument.replaceAll(text, `${todoComments}${text}`)
                          } else {
                            console.log('not found')
                            // Ensure \title{...} exists before replacing
                            if (updatedDocument.match(/\\title\{.*?\}/i)) {
                              updatedDocument = updatedDocument.replace(
                                /(\\title\{.*?\})/i,
                                `$1\n%% TODO Next suggestions apply to this excerpt:${scopedText} \n${todoComments}`
                              )
                            } else {
                              console.log('not found')
                            }
                          }
                        } else {
                          // Ensure \section{sectionName} exists before replacing
                          let sectionRegex = new RegExp(`(\\\\${scope}\\{\\s*${sectionName}\\s*\\})`, 'i') // Match \section{Name}
                          if (updatedDocument.match(sectionRegex)) {
                            updatedDocument = updatedDocument.replace(
                              sectionRegex,
                              `$1\n${todoComments}`
                            )
                            console.log(updatedDocument)
                          } else {
                            console.log('not found')
                          }
                        }
                        setTimeout(() => {
                          OverleafUtils.removeContent(() => {
                            setTimeout(() => {
                              console.log(updatedDocument)
                              updatedDocument = LatexUtils.ensureHumanNoteCommandExists(updatedDocument)
                              OverleafUtils.insertContent(updatedDocument)
                              clearInterval(loadingInterval)

                              // ✅ Close the alert **using `Alerts.closeWindow()`** instead of `swal.close()`
                              Alerts.closeWindow()

                              Alerts.showAlertToast('LaTeX document Updated with new TODOs')
                              window.promptex._overleafManager._readingDocument = false
                            }, 1000) // ✅ Delay of 1.5 seconds before executing removeContent
                          })
                        }, 1000) // ✅ Delay of 1.5 seconds before executing removeContent
                      } else {
                        let suggestions = checkedSuggestions.join('\n')
                        let action = Config.actions[buttonName].description
                        let prompt = Config.prompts.getSuggestionsFeedback
                          .replace('[CONTENT]', scopedText)
                          .replace('[ROLE]', roleDescription + ' ' + modeInstructions)
                          .replace('[SUGGESTIONS]', suggestions)
                          .replace('[ACTION]', action)

                        // ✅ Start the animated loading message
                        let loadingMessages = ['Asking LLM', 'Asking LLM.', 'Asking LLM..', 'Asking LLM...']
                        let loadingIndex = 0
                        messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`

                        // ✅ Loop the loading animation every 500ms
                        let loadingInterval = setInterval(() => {
                          loadingIndex = (loadingIndex + 1) % loadingMessages.length
                          messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        }, 500)

                        let callback = (json) => {
                          console.log(json)
                          clearInterval(loadingInterval) // ✅ Stop the animation
                          popup.querySelectorAll('.suggestion-checkbox').forEach((checkbox) => {
                            checkbox.disabled = true
                          })

                          // ✅ Count existing suggestion batches to determine background color alternation
                          let existingBatchCount = popup.ownerDocument.querySelectorAll('.suggestion-batch').length
                          let batchBgColor = existingBatchCount % 2 === 0 ? '#f0f0f0' : '#d9e2f3' // Alternate per batch

                          // ✅ Create a new suggestion batch container
                          let batchContainer = popup.ownerDocument.createElement('div')
                          batchContainer.className = 'suggestion-batch'
                          batchContainer.style.backgroundColor = batchBgColor
                          batchContainer.style.padding = '10px'
                          // batchContainer.style.borderRadius = '6px'
                          // batchContainer.style.marginBottom = '10px'

                          // ✅ Create new action title dynamically as a button
                          let actionTitle = popup.ownerDocument.createElement('span')
                          actionTitle.textContent = buttonName.toUpperCase().replaceAll('Rhetorical', '')
                          actionTitle.className = 'title-btn'
                          actionTitle.style.display = 'block' // Ensures it appears on a new line

                          // ✅ Generate new list of suggestions
                          let newSuggestions = json.suggestions || []
                          let newSuggestionList = popup.ownerDocument.createElement('ul')
                          newSuggestionList.className = 'suggestion-list'
                          newSuggestionList.style.paddingLeft = '0'
                          newSuggestionList.style.listStyleType = 'none'
                          newSuggestionList.style.marginTop = '5px'

                          newSuggestions.forEach((item) => {
                            let listItem = popup.ownerDocument.createElement('li')
                            listItem.style.display = 'flex'
                            listItem.style.alignItems = 'center'
                            listItem.style.gap = '8px'
                            listItem.style.marginBottom = '6px'
                            listItem.style.fontSize = '14px'
                            listItem.style.lineHeight = '1.4'

                            let checkbox = popup.ownerDocument.createElement('input')
                            checkbox.type = 'checkbox'
                            checkbox.className = 'suggestion-checkbox'
                            checkbox.style.flexShrink = '0'
                            checkbox.style.marginTop = '2px'

                            let label = popup.ownerDocument.createElement('label')
                            label.textContent = item.suggestion
                            label.style.flexGrow = '1'
                            label.style.textAlign = 'left'

                            listItem.appendChild(checkbox)
                            listItem.appendChild(label)
                            newSuggestionList.appendChild(listItem)
                          })
                          let existingButton = popup.ownerDocument.querySelector('#add-todo-btn')
                          if (existingButton) {
                            existingButton.remove()
                          }

                          let buttonWrapper = popup.ownerDocument.createElement('div')
                          buttonWrapper.className = 'button-wrapper' // ✅ This ensures alignment

                          let tooltipContainer = popup.ownerDocument.createElement('div')
                          tooltipContainer.className = 'tooltip-container' // ✅ This controls hover

                          let addTodoButton = popup.ownerDocument.createElement('button')
                          addTodoButton.id = 'add-todo-btn'
                          addTodoButton.className = 'small-btn'
                          addTodoButton.addEventListener('click', () => {
                            console.log('✅ Add TODOs Button Clicked!')
                            updateMessage('AddTODOs')
                          })

                          let tooltipSpan = popup.ownerDocument.createElement('span')
                          tooltipSpan.className = 'tooltip-text'
                          tooltipSpan.textContent = 'Add TODOs' // ✅ Tooltip text

                          let icon = popup.ownerDocument.createElement('i')
                          icon.className = 'fa fa-list-alt' // ✅ FontAwesome icon
                          icon.setAttribute('aria-hidden', 'true')

                          addTodoButton.appendChild(icon)

                          tooltipContainer.appendChild(addTodoButton)
                          tooltipContainer.appendChild(tooltipSpan)

                          buttonWrapper.appendChild(tooltipContainer)

                          batchContainer.appendChild(actionTitle)
                          batchContainer.appendChild(newSuggestionList)
                          batchContainer.appendChild(buttonWrapper)

                          // ✅ Find the <ul> that is right before messageContainer
                          let previous = messageContainer.previousElementSibling
                          if (previous && previous.tagName.toLowerCase() === 'div') {
                            // ✅ Insert the new title right after the <ul>
                            previous.parentNode.insertBefore(batchContainer, messageContainer)
                            messageContainer.innerHTML = ''
                          }
                        }

                        LLMClient.simpleQuestion({
                          apiKey: apiKey,
                          prompt: prompt,
                          llm: llm,
                          callback: callback
                        })
                      }
                    } else {
                      messageContainer.innerHTML = `<span>No suggestions selected</span>`
                    }
                  }
                }
                Object.keys(Config.actions).forEach(actionKey => {
                  const button = popup.ownerDocument.querySelector(`#${actionKey}-btn`)
                  if (button) {
                    button.addEventListener('click', () => {
                      console.log(`✅ ${Config.actions[actionKey].name} Button Clicked!`)
                      updateMessage(actionKey)
                    })
                  }
                })

                popup.ownerDocument.querySelector('#add-todo-btn').addEventListener('click', () => {
                  console.log('✅ Add TODOs Button Clicked!')
                  updateMessage('AddTODOs')
                })
              }
            })
          }
          LLMClient.simpleQuestion({
            apiKey: apiKey,
            prompt: prompt,
            llm: llm,
            callback: callback
          })
        } else {
          Alerts.showErrorToast('No API key found for ' + llmProvider + '. Please check your configuration.')
        }
      })
    })
  }
}

module.exports = CriterionActions
