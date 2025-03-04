const OverleafUtils = require('./OverleafUtils')
const Config = require('../Config')
const Alerts = require('../utils/Alerts')
const LLMClient = require('../llm/LLMClient')
const LatexUtils = require('./LatexUtils')

class CriterionActions {
  static async askCriterionAssessment (criterionLabel, description) {
    // Fetch document content
    let editor = OverleafUtils.getActiveEditor()
    if (editor === 'Visual Editor') {
      OverleafUtils.toggleEditor()
    }
    window.promptex._overleafManager._sidebar.remove()
    Alerts.showLoadingWindowDuringProcess('Reading document content...')
    const documents = await OverleafUtils.getAllEditorContent()
    const sectionsArray = OverleafUtils.extractSections(documents)
    console.log(sectionsArray)
    let prompt = Config.prompts.annotatePrompt
    prompt = prompt.replace('[C_NAME]', criterionLabel)
    prompt = prompt.replace('[C_DESCRIPTION]', description)
    prompt = 'RESEARCH PAPER: ' + LatexUtils.processTexDocument(documents) + '\n' + prompt
    Alerts.closeLoadingWindow()
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
              if (documents.includes(excerpt)) {
                console.log(`Excerpt found for ${criterionLabel}: "${excerpt}"`)
                foundExcerpts.push(excerpt)
              } else {
                console.log(`Excerpt not found for ${criterionLabel}: "${excerpt}"`)
                notFoundExcerpts.push(excerpt)
              }
            })
            let excerpts = foundExcerpts.concat(notFoundExcerpts)
            let suggestion = json.suggestionForImprovement
            let sentiment = json.sentiment
            let effortLevel = json.effortLevel
            let effortDescription = json.effortDescription
            let assessmentDescription = json.assessment
            // Call CriteriaDatabaseClient to update the criterion
            let listName = window.promptex._overleafManager._currentCriteriaList
            window.promptex.storageManager.client.updateCriterion(listName, criterionLabel, excerpts, suggestion, sentiment, effortLevel, effortDescription, assessmentDescription)
              .then(() => {
                console.log('Criterion updated successfully')
                let newContent = LatexUtils.addCommentsToLatex(documents, cleanExcerpts, suggestion, sentiment, criterionLabel)
                newContent = LatexUtils.ensurePromptexCommandExists(newContent)
                OverleafUtils.removeContent(async () => {
                  window.promptex._overleafManager._sidebar.remove()
                  OverleafUtils.insertContent(newContent)
                  window.promptex._overleafManager._readingDocument = false
                  if (window.promptex._overleafManager._standardized) {
                    const projectId = window.promptex._overleafManager._project
                    window.promptex.storageManager.client.setStandarizedVersion(projectId, sectionsArray, (err, array) => {
                      if (err) {
                        console.error('Failed to set standarized version:', err)
                      } else {
                        console.log('Standarized version set successfully: ' + array)
                        window.promptex._overleafManager.checkAndUpdateStandardized(false)
                      }
                    })
                  }
                  if (foundExcerpts.length === 0) {
                    Alerts.showWarningWindow('No excerpt found in the document for ' + criterionLabel)
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
                        window.promptex._overleafManager.displayImprovementOutlineContent()
                        setTimeout(async () => {
                          await OverleafUtils.scrollToAnnotation(criterionLabel)
                        }, 2000)
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
                      title: `Excerpt(s) found for ${criterionLabel}`,
                      showCancelButton: false,
                      html: true, // Enable HTML rendering in the alert
                      callback: async () => {
                        window.promptex._overleafManager.displayImprovementOutlineContent()
                        setTimeout(async () => {
                          await OverleafUtils.scrollToAnnotation(criterionLabel)
                        }, 2000)
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

  static async askForFeedback (document, prompt, roleName, spaceName) {
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
            let feedback = json?.feedback || 'No feedback available.'
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
              .join('');

            let htmlContent = `
  <div style="font-size: 14px; line-height: 1.5;">
    <ul style="padding-left: 0; list-style-type: none; margin: 0;">${suggestionList}</ul>
  </div>`;

// Show alert with HTML content
            Alerts.infoAlert({
              text: htmlContent, // ✅ Use `html` instead of `text`
              title: `Suggestions for ${roleName} in the ${spaceName}`,
              showCloseButton: true,
              showCancelButton: false,
              callback: async () => {
                // Retrieve all checkboxes
                let checkedSuggestions = [];
                document.querySelectorAll('.suggestion-checkbox').forEach((checkbox, index) => {
                  if (checkbox.checked) {
                    checkedSuggestions.push(suggestions[index].suggestion);
                  }
                });

                // Log checked suggestions in the console
                console.log('Checked Suggestions:', checkedSuggestions);
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
