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
            let suggestion = json.suggestionForImprovement
            let sentiment = json.sentiment
            let effortLevel = json.effortLevel
            let effortDescription = json.effortDescription
            let assessmentDescription = json.assessment
            // Call CriteriaDatabaseClient to update the criterion
            let listName = window.promptex._overleafManager._currentCriteriaList
            window.promptex.storageManager.client.updateCriterion(listName, criterionLabel, cleanExcerpts, suggestion, sentiment, effortLevel, effortDescription, assessmentDescription)
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
                        window.promptex._overleafManager.displayImprovementOutlineContent()
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
                    htmlContent += `<p style="margin-top: 10px;">Suggestion for improvement: ${suggestion}</p>`
                    Alerts.infoAlert({
                      text: ` ${htmlContent}`,
                      title: `Retrieved excerpts do not match with the document text.`,
                      showCancelButton: false,
                      html: true, // Enable HTML rendering in the alert
                      callback: async () => {
                        await OverleafUtils.scrollToAnnotation(criterionLabel)
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
                        await OverleafUtils.scrollToAnnotation(criterionLabel)
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
