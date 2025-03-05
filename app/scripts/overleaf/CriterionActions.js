const OverleafUtils = require('./OverleafUtils')
const Config = require('../Config')
const Alerts = require('../utils/Alerts')
const LLMClient = require('../llm/LLMClient')
const LatexUtils = require('./LatexUtils')

class CriterionActions {
  static async askForFeedback (document, prompt, roleName, spaceMode, scopedText, roleDescription, modeInstructions, scope, sectionName) {
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
              .map(([key, action]) => `<button id="${key}-btn" class="small-btn">${action.name}</button>`)
              .join('');

            // ✅ Now the buttons are dynamically inserted!
                        let buttonSection = `
              <div id="message-container" style="margin-top: 10px; font-size: 14px; color: black; font-weight: bold;"></div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <div style="display: flex; gap: 6px;">
                  ${actionButtons} <!-- ✅ Buttons generated dynamically -->
                </div>
                <button id="add-todo-btn" class="green-btn">Add TODOs in document</button>
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
                  background: #ddd;
                }
            
                /* ✅ Fixed CSS for Green Button */
                .green-btn {
                  background: #28a745; /* ✅ Green background */
                  color: white; /* ✅ White text */
                  border: 1px solid #218838; /* ✅ Darker green border */
                  padding: 8px 14px;
                  font-size: 14px;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: background 0.2s, border-color 0.2s;
                }
                .green-btn:hover {
                  background: #218838;
                  border-color: #1e7e34;
                }
              </style>
            `;
            let scopeOfAnswer = 'Scope: '
            if (scope === 'document') {
              scopeOfAnswer += 'Full paper'
            } else if (scope === 'section') {
              scopeOfAnswer += sectionName + ' section'
            } else if (scope === 'excerpts') {
              scopeOfAnswer = scopedText
            }
            // Construct the full HTML content
                        let htmlContent = `
              <button id="title-btn" class="small-btn">${roleName}</button>
              <div style="font-size: 13px; line-height: 1.5;">
                <p style="text-align: justify; margin-bottom: 10px;">${scopeOfAnswer}</p> <!-- ✅ Justified Text -->
                <hr style="border: 0; height: 1px; background: #ccc; margin: 10px 0;">             
                <ul style="padding-left: 0; list-style-type: none; margin: 0;">${suggestionList}</ul>
                ${buttonSection} <!-- ✅ Dynamic buttons now included -->
              </div>
            `;
            Alerts.infoAlert({
              text: htmlContent,
              showCloseButton: true,
              showCancelButton: false,
              showConfirmButton: false,
              didOpen: (popup) => { // ✅ Ensure alert is rendered before attaching event listeners
                const messageContainer = popup.querySelector('#message-container')
                if (messageContainer) {
                  // ✅ Apply text justification
                  messageContainer.style.textAlign = 'justify'
                  messageContainer.style.display = 'block'
                  messageContainer.style.marginTop = '10px'
                  messageContainer.style.fontSize = '14px'
                  messageContainer.style.lineHeight = '1.5'
                }

                const updateMessage = (buttonName) => {
                  let checkedSuggestions = []
                  popup.querySelectorAll('.suggestion-checkbox:not(:disabled)').forEach((checkbox, index) => {
                    if (checkbox.checked) {
                      checkedSuggestions.push(checkbox.nextSibling.textContent.trim()); // ✅ Get the corresponding suggestion text
                    }
                  });

                  if (messageContainer) {
                    if (checkedSuggestions.length > 0) {
                      if (buttonName === 'AddTODOs') {
                        let todoComments = ''
                        checkedSuggestions.forEach(suggestion => {
                          todoComments += `%%TODO FROM PROMPTEX: ${suggestion}}\n`
                        })

                        let loadingMessages = ["Including the TODOs in the Manuscript", "Including the TODOs in the Manuscript.", "Including the TODOs in the Manuscript..", "Including the TODOs in the Manuscript..."]
                        let loadingIndex = 0
                        messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        // ✅ Loop the loading animation every 500ms
                        let loadingInterval = setInterval(() => {
                          loadingIndex = (loadingIndex + 1) % loadingMessages.length
                          messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        }, 500)
                        let updatedDocument = document
                        if (scope === 'document') {
                          // Ensure \title{...} exists before replacing
                          if (updatedDocument.match(/\\title\{.*?\}/i)) {
                            updatedDocument = updatedDocument.replace(
                              /(\\title\{.*?\})/i,
                              `$1\n${todoComments}`  // Insert TODOs on the next line
                            )
                          } else {
                            console.log('not found')
                          }
                        } else if (scope === 'section' && sectionName) {
                          // Ensure \section{sectionName} exists before replacing
                          let sectionRegex = new RegExp(`(\\\\section\\{\\s*${sectionName}\\s*\\})`, 'i'); // Match \section{Name}
                          if (updatedDocument.match(sectionRegex)) {
                            updatedDocument = updatedDocument.replace(
                              sectionRegex,
                              `$1\n${todoComments}`
                            );
                          } else {
                            console.log('not found')
                          }
                        } else if (scope === 'excerpts' && scopedText) {
                          // Ensure scopedText exists before replacing
                          if (updatedDocument.includes(scopedText)) {
                            updatedDocument = updatedDocument.replace(
                              new RegExp(`(${scopedText})`, 'i'),
                              `${todoComments}$1` // Insert TODOs before the scoped text
                            );
                          } else {
                            console.log('not found')
                            // Ensure \title{...} exists before replacing
                            if (updatedDocument.match(/\\title\{.*?\}/i)) {
                              updatedDocument = updatedDocument.replace(
                                /(\\title\{.*?\})/i,
                                `$1\n%% TODO Next suggestions apply to this excerpt:${scopedText} \n${todoComments}`  // Insert TODOs on the next line
                              )
                            } else {
                              console.log('not found')
                            }
                          }
                        }
                        setTimeout(() => {
                          OverleafUtils.removeContent(() => {
                            setTimeout(() => {
                              OverleafUtils.insertContent(updatedDocument)
                              clearInterval(loadingInterval)

                              // ✅ Close the alert **using `Alerts.closeWindow()`** instead of `swal.close()`
                              Alerts.closeWindow()

                              Alerts.showAlertToast('LaTeX document Updated with new TODOs')
                              window.promptex._overleafManager._readingDocument = false
                            }, 1000); // ✅ Delay of 1.5 seconds before executing removeContent
                          })
                        }, 1000); // ✅ Delay of 1.5 seconds before executing removeContent

                      } else {
                        let suggestions = checkedSuggestions.join('\n')
                        let action = Config.actions[buttonName].description
                        let prompt = Config.prompts.getSuggestionsFeedback
                          .replace('[CONTENT]', scopedText)
                          .replace('[ROLE]', roleDescription + ' ' + modeInstructions)
                          .replace('[SUGGESTIONS]', suggestions)
                          .replace('[ACTION]', action)

                        // ✅ Start the animated loading message
                        let loadingMessages = ["Asking LLM", "Asking LLM.", "Asking LLM..", "Asking LLM..."]
                        let loadingIndex = 0
                        messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`

                        // ✅ Loop the loading animation every 500ms
                        let loadingInterval = setInterval(() => {
                          loadingIndex = (loadingIndex + 1) % loadingMessages.length
                          messageContainer.innerHTML = `<span>${loadingMessages[loadingIndex]}</span>`
                        }, 500)

                        let callback = (json) => {
                          console.log(json);
                          clearInterval(loadingInterval); // ✅ Stop the animation
                          popup.querySelectorAll('.suggestion-checkbox').forEach((checkbox) => {
                            checkbox.disabled = true;
                          })

                          // ✅ Create new action title
                          let actionTitle = popup.ownerDocument.createElement('span');
                          actionTitle.textContent = buttonName.toUpperCase();
                          actionTitle.className = 'action-title';
                          actionTitle.style.fontWeight = 'bold';
                          actionTitle.style.display = 'block'; // Ensures it appears on a new line
                          actionTitle.style.marginTop = '10px';

                          // ✅ Generate new list of suggestions
                          let newSuggestions = json.suggestions || [];
                          let newSuggestionList = popup.ownerDocument.createElement('ul');
                          newSuggestionList.className = 'suggestion-list';
                          newSuggestionList.style.paddingLeft = '0';
                          newSuggestionList.style.listStyleType = 'none';
                          newSuggestionList.style.marginTop = '5px';

                          newSuggestions.forEach((item) => {
                            let listItem = popup.ownerDocument.createElement('li');
                            listItem.style.display = 'flex';
                            listItem.style.alignItems = 'center';
                            listItem.style.gap = '8px';
                            listItem.style.marginBottom = '6px';
                            listItem.style.fontSize = '14px';
                            listItem.style.lineHeight = '1.4';

                            let checkbox = popup.ownerDocument.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'suggestion-checkbox';
                            checkbox.style.flexShrink = '0';
                            checkbox.style.marginTop = '2px';

                            let label = popup.ownerDocument.createElement('label');
                            label.textContent = item.suggestion;
                            label.style.flexGrow = '1';
                            label.style.textAlign = 'left';

                            listItem.appendChild(checkbox);
                            listItem.appendChild(label);
                            newSuggestionList.appendChild(listItem);
                          });

                          // ✅ Find the <ul> that is right before messageContainer
                          let previousUL = messageContainer.previousElementSibling;
                          if (previousUL && previousUL.tagName.toLowerCase() === 'ul') {


                            // ✅ Insert the new title right after the <ul>
                            previousUL.parentNode.insertBefore(actionTitle, messageContainer)
                            previousUL.parentNode.insertBefore(newSuggestionList, messageContainer)
                            messageContainer.innerHTML = ''
                          }
                        };

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
                  const button = popup.querySelector(`#${actionKey}-btn`);
                  if (button) {
                    button.addEventListener('click', () => {
                      console.log(`✅ ${Config.actions[actionKey].name} Button Clicked!`);
                      updateMessage(actionKey);
                    });
                  }
                });

                popup.querySelector('#add-todo-btn').addEventListener('click', () => {
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

  static async askForAnnotations (document, prompt, roleName) {
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
            const cleanExcerpts = json.claims.map(claim => {
              // Convert the excerpt into a string with escape characters interpreted
              let cleanedExcerpt = JSON.stringify(claim.excerpt)
                .replace(/\\\\/g, '\\') // Replace double backslashes with a single backslash
                .slice(1, -1) // Remove the quotes added by JSON.stringify
              return cleanedExcerpt
            })
            console.log(cleanExcerpts)
            let foundExcerpts = []
            let notFoundExcerpts = []
            cleanExcerpts.forEach(excerpt => {
              if (document.includes(excerpt)) {
                console.log(`Excerpt found for ${roleName}: "${excerpt}"`)
                foundExcerpts.push(excerpt)
              } else {
                console.log(`Excerpt not found for ${roleName}: "${excerpt}"`)
                notFoundExcerpts.push(excerpt)
              }
            })
            // let excerpts = foundExcerpts.concat(notFoundExcerpts)
            let feedback = {}
            feedback.sentiment = json.sentiment
            feedback.comment = json.feedback
            // Call CriteriaDatabaseClient to update the
            let commentID = LatexUtils.generateId()
            let newContent = LatexUtils.addCommentsToLatexRoles(document, cleanExcerpts, feedback.sentiment, roleName, feedback, commentID)
            newContent = LatexUtils.ensurePromptexCommandExists(newContent)
            window.promptex.storageManager.client.createNewFeedback(feedback, commentID, () => {
              OverleafUtils.removeContent(async () => {
                OverleafUtils.insertContent(newContent)
                window.promptex._overleafManager._readingDocument = false
                if (foundExcerpts.length === 0) {
                  Alerts.showWarningWindow('No excerpt found in the document for ' + roleName)
                  // Create an HTML list of the found excerpts with improved styling
                  const excerptList = notFoundExcerpts
                    .map(excerpt => `<li style="margin-bottom: 8px; line-height: 1.5;">${excerpt}</li>`)
                    .join('')
                  let htmlContent = `<h4>However, this excerpts can be similar to those in the document: </h4><ul style="padding-left: 20px; list-style-type: disc;">${excerptList}</ul>`
                  // htmlContent += `<p style="margin-top: 10px;">Suggestion for improvement: ${suggestion}</p>`
                  Alerts.infoAlert({
                    text: ` ${htmlContent}`,
                    title: `Retrieved excerpts do not match with the document text.`,
                    showCancelButton: false,
                    html: true, // Enable HTML rendering in the alert
                    callback: async () => {
                      console.log('finished')
                    }
                  })
                } else {
                  // Create an HTML list of the found excerpts with improved styling
                  const excerptList = foundExcerpts
                    .map(excerpt => `<li style="margin-bottom: 8px; line-height: 1.5;">${excerpt}</li>`)
                    .join('')
                  let htmlContent = ''
                  // htmlContent += `<p style="margin-top: 10px;"><b>Suggestion for improvement:</b> ${suggestion}</p>`
                  htmlContent += `<h4>Annotated content:</h4><ul style="padding-left: 20px; list-style-type: disc;">${excerptList}</ul>`
                  if (notFoundExcerpts.length > 0) {
                    // Create an HTML list of the found excerpts with improved styling
                    const notFoundExcerptList = notFoundExcerpts
                      .map(excerpt => `<li style="margin-bottom: 8px; line-height: 1.5;">${excerpt}</li>`)
                      .join('')
                    htmlContent += `<h4>The AI also retrieved these excerpts that can be similar to those in the document: </h4><ul style="padding-left: 20px; list-style-type: disc;">${notFoundExcerptList}</ul>`
                  }
                  Alerts.infoAlert({
                    text: ` ${htmlContent}`,
                    title: `Excerpt(s) found for ${roleName}`,
                    showCancelButton: false,
                    html: true, // Enable HTML rendering in the alert
                    callback: async () => {
                      console.log('finished')
                    }
                  })
                }
              }).catch(err => {
                console.error('Failed to update criterion:', err)
              })
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
